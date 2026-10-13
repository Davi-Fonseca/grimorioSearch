import json
from pathlib import Path

import pytest

import ingest
import spells_pt as sp

EXEMPLO = Path(__file__).parent.parent / "data" / "exemplo-spells-pt.jsonl"


def base(**over):
    d = {"nome": "Magia Teste", "circulo": 2, "escola": "Evocation", "classes": ["Wizard"],
         "tempo_conjuracao": "Ação", "alcance": "18 metros", "componentes": ["V", "S"], "material": None,
         "duracao": "Instantânea", "concentracao": False, "ritual": False,
         "descricao": "Uma descrição suficientemente longa para passar na validação do esquema.",
         "circulos_superiores": None, "pagina": None, "problemas": []}
    d.update(over)
    return d


def escreve(tmp_path, *regs):
    p = tmp_path / "m.jsonl"
    p.write_text("\n".join(r if isinstance(r, str) else json.dumps(r) for r in regs), encoding="utf-8")
    return p


def test_exemplo_valido():
    records, errors = sp.load_jsonl(EXEMPLO)
    assert errors == [] and len(records) == 3
    assert sp.check_unique(records) == []


@pytest.mark.parametrize("campo,valor,trecho", [
    ("escola", "Evocação", "escola inválida"),
    ("classes", ["Mago"], "inválida"),
    ("classes", [], "at least 1"),
    ("circulo", 10, "less than or equal"),
    ("componentes", ["X"], "inválido"),
    ("descricao", "curta", "at least 20"),
    ("concentracao", "talvez", "boolean"),
])
def test_rejeita_valores_ruins(tmp_path, campo, valor, trecho):
    _, errors = sp.load_jsonl(escreve(tmp_path, base(**{campo: valor})))
    assert errors and trecho in errors[0]


def test_rejeita_campo_inesperado_e_json_quebrado(tmp_path):
    _, errors = sp.load_jsonl(escreve(tmp_path, base(circulos="3"), "{quebrado"))
    assert any("circulos" in e for e in errors)
    assert any("JSON inválido" in e for e in errors)


def test_nome_repetido(tmp_path):
    records, _ = sp.load_jsonl(escreve(tmp_path, base(), base(nome="MAGIA  teste")))
    assert sp.check_unique(records)


def test_avisos(tmp_path):
    ruim = base(descricao="Texto cortado sem pontuação final e com hifeniza-\nção na quebra",
                componentes=["V", "M"], duracao="Concentração, até 1 minuto", concentracao=False,
                problemas=["tabela confusa"])
    (_, s), = sp.load_jsonl(escreve(tmp_path, ruim))[0]
    w = " | ".join(sp.warnings_for(s))
    for trecho in ("hifenizada", "não termina em pontuação", "material está vazio",
                   "concentracao=false", "tabela confusa"):
        assert trecho in w


def test_to_doc_tem_os_mesmos_campos_do_srd():
    (_, s), *_ = sp.load_jsonl(EXEMPLO)[0]
    doc = sp.to_doc(s)
    assert set(ingest.build_docs()[0]) <= set(doc) | {"damage_type"}
    assert doc["lang"] == "pt" and doc["id"] == "bola-de-fogo"
    assert "evocação" in doc["labels_pt"].lower() and "mago" in doc["labels_pt"].lower()


def test_sugestao_de_mapa_usa_dados_e_medidas():
    records, _ = sp.load_jsonl(EXEMPLO)
    sugs = {x.pt: x for x in sp.suggest_mapping(records, ingest.build_docs())}
    # Bola de Fogo e Relâmpago têm círculo, escola, componentes e dano iguais (8d6): as medidas desempatam
    assert (sugs["Bola de Fogo"].en, sugs["Bola de Fogo"].confidence) == ("Fireball", "alta")
    assert (sugs["Mísseis Mágicos"].en, sugs["Mísseis Mágicos"].confidence) == ("Magic Missile", "alta")
    # Sem dados de dano nem medidas distintivas, várias magias empatam: fica "baixa", mas o certo é candidato
    dm = sugs["Detectar Magia"]
    assert dm.confidence == "baixa" and "Detect Magic" in [dm.en, *dm.alternatives]


def test_compare_detecta_divergencias():
    srd = {d["id"]: d for d in ingest.build_docs()}
    (_, s), *_ = sp.load_jsonl(EXEMPLO)[0]            # Bola de Fogo
    assert sp.compare(s, srd["fireball"]) == []
    errado = s.model_copy(update={"circulo": 4, "classes": ["Wizard"], "ritual": True})
    diffs = " | ".join(sp.compare(errado, srd["fireball"]))
    assert "círculo" in diffs and "classes" in diffs and "ritual" in diffs


def test_load_docs_com_mapa_e_somente_srd(tmp_path):
    extra = base(nome="Magia Inventada")
    arq = escreve(tmp_path, *[json.dumps(json.loads(l), ensure_ascii=False) for l in EXEMPLO.read_text(encoding="utf-8").splitlines()], extra)
    mapa = tmp_path / "mapa.csv"
    mapa.write_text("pt,en\nBola de Fogo,Fireball\nMísseis Mágicos,magic-missile\nDetectar Magia,Detect Magic\n", encoding="utf-8")
    todas = sp.load_docs(arq, mapa=mapa)
    assert len(todas) == 4 and sum(d["in_srd"] for d in todas) == 3
    so_srd = sp.load_docs(arq, mapa=mapa, somente_srd=True)
    assert [d["id"] for d in so_srd] == ["bola-de-fogo", "misseis-magicos", "detectar-magia"]


def test_somente_srd_exige_mapa(tmp_path):
    with pytest.raises(SystemExit):
        sp.load_docs(EXEMPLO, somente_srd=True)


def test_load_docs_para_com_erros(tmp_path):
    with pytest.raises(SystemExit):
        sp.load_docs(escreve(tmp_path, base(escola="Xyz")))


def test_indice_pt_usa_analisador_portugues():
    props = ingest.index_body("pt")["mappings"]["properties"]
    assert props["description"]["analyzer"] == "portuguese" and props["name"]["analyzer"] == "portuguese"
    assert ingest.index_body("en")["mappings"]["properties"]["description"]["analyzer"] == "english"
    assert ingest.INDEX_BODY["mappings"]["properties"]["description"]["analyzer"] == "english"  # original intacto