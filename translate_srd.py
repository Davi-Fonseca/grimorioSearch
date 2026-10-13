#!/usr/bin/env python3
"""Fluxo para traduzir o SRD 2024 (inglês) para português com ajuda de uma IA.

A IA só traduz os textos (nome, descrição, círculos superiores, material). Círculo, escola, classes,
componentes, concentração e ritual são copiados do SRD por código, então não há como a IA errá-los.

    python translate_srd.py export            # cria os lotes e o prompt em data/traducao/
    (cole o prompt e um lote na IA; salve cada resposta como data/traducao/saida-001.jsonl, saida-002.jsonl...)
    python translate_srd.py merge             # valida as traduções e gera data/spells-pt.jsonl
    python ingest.py --lang pt --reset        # indexa

Dá para repetir o ciclo: 'export --pendentes' gera só o que ainda não foi traduzido, e
'export --only fireball,fly' refaz magias específicas (por exemplo, as que o merge marcou com aviso).
"""
import argparse
import csv
import json
import re
import sys
from collections import Counter
from pathlib import Path

import ingest
import spells_pt as sp

BASE = Path(__file__).parent
SRD_FILE = BASE / "data" / "5e-SRD-Spells-2024.json"
GLOSSARY_FILE = BASE / "data" / "glossario.csv"
WORK_DIR = BASE / "data" / "traducao"
OUT_FILE = BASE / "data" / "spells-pt.jsonl"
NAMES_FILE = BASE / "data" / "nomes_pt.csv"

PROMPT = """Você vai traduzir magias de D&D 5ª edição (SRD 5.2, edição 2024) do inglês para o português do Brasil.

REGRAS
- Traduza com fidelidade. Não resuma, não acrescente e não omita nada. Mantenha o tom de texto de regras.
- Mantenha EXATAMENTE as expressões de dados e dano (8d6, 1d4 + 1) e todos os números.
- Converta distâncias para metros: 5 pés = 1,5 m; 10 pés = 3 m; 15 pés = 4,5 m; 20 pés = 6 m; 30 pés = 9 m;
  60 pés = 18 m; 90 pés = 27 m; 100 pés = 30 m; 120 pés = 36 m; 150 pés = 45 m (regra: pés x 0,3).
  1 milha = 1,6 km. 1 libra = 0,5 kg. Escreva "metros" por extenso ("9 metros") e "1,5 metro" no singular.
  Mantenha qualquer valor em peças de ouro, convertendo só a sigla (GP -> PO, SP -> PP, CP -> PC).
- Use obrigatoriamente os termos do GLOSSÁRIO abaixo. Para termos de regras fora dele, seja consistente.
- Nome da magia: se a entrada trouxer "nome_pt", use EXATAMENTE esse texto em "nome" (já foi revisado). Sem "nome_pt", use o nome consagrado em português, se existir (ex.: Fireball = Bola de Fogo); senão, traduza literalmente.
- Nomes próprios dentro do texto (ex.: Tasha, Bigby) não se traduzem.
- Dentro dos textos, use aspas curvas (“ ”), nunca aspas retas ("): aspas retas quebram o JSON.
- O campo "higher_level" às vezes traz um bloco de estatísticas inteiro (CA, PV, Velocidade, Ações com dados de dano). Nesse caso, traduza o bloco COMPLETO, mantendo todos os dados, e coloque-o em "circulos_superiores".
- Preserve os parágrafos (separados por \\n) e tabelas (linhas com |) exatamente na mesma estrutura.
- Não altere o campo "id".
- Responda SOMENTE com JSON Lines (uma magia por linha), sem comentários, sem blocos de código e sem texto antes ou depois.

ENTRADA (uma magia por linha): {"id", "name", "description", "higher_level", "material", "nome_pt"}
SAÍDA (uma magia por linha):   {"id", "nome", "descricao", "circulos_superiores", "material"}
- "circulos_superiores" e "material": use null quando o campo não existir ou vier vazio na entrada.

GLOSSÁRIO (inglês = português)
{glossary}

Traduza as magias abaixo:
"""

# palavras inglesas que não existem em português: servem para detectar trechos que ficaram sem traduzir
INGLES = {"the", "of", "and", "you", "your", "that", "with", "this", "target", "within", "each", "must",
          "is", "are", "its", "for", "can", "has", "have", "which", "when", "creature", "creatures"}
UNIDADES_EN = re.compile(r"\b(feet|foot|miles?|pounds?|lbs?)\b", re.I)


# ---------------------------------------------------------------
# Entradas
# ---------------------------------------------------------------
def load_srd(path: Path = SRD_FILE) -> dict[str, dict]:
    with open(path, encoding="utf-8") as f:
        return {s["index"]: s for s in json.load(f)}


def load_names(path: Path | None = None) -> dict[str, str]:
    path = Path(path) if path else NAMES_FILE
    names: dict[str, str] = {}
    if not path.exists():
        return names
    with open(path, encoding="utf-8-sig", newline="") as f:
        for row in csv.reader(f):
            if len(row) >= 2 and row[0].strip() and row[0].strip() != "id" and row[1].strip():
                names[row[0].strip()] = row[1].strip()
    return names


def load_glossary(path: Path | None = None) -> list[tuple[str, str]]:
    path = Path(path) if path else GLOSSARY_FILE
    terms = []
    if not path.exists():
        return terms
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.lower() == "en,pt":
            continue
        en, _, pt = line.partition(",")
        if en.strip() and pt.strip():
            terms.append((en.strip(), pt.strip()))
    return terms


# Ordem dos campos pedida no prompt; usada só para consertar aspas retas dentro dos textos
_REPARO = re.compile(
    r'^\s*\{\s*"id"\s*:\s*"(?P<id>[^"]+)"\s*,\s*"nome"\s*:\s*"(?P<nome>.*?)"\s*,\s*"descricao"\s*:\s*"(?P<desc>.*)"\s*,'
    r'\s*"circulos_superiores"\s*:\s*(?P<hl>null|".*?")\s*,\s*"material"\s*:\s*(?P<mat>null|".*")\s*\}\s*$',
    re.S,
)


def _texto(raw: str) -> str:
    """Decodifica o conteúdo de um campo, escapando as aspas retas que não estavam escapadas."""
    return json.loads('"' + re.sub(r'(?<!\\)"', r'\\"', raw) + '"')


def repair_line(line: str) -> dict | None:
    """Tenta consertar uma linha cujo único defeito são aspas retas sem escape dentro dos textos."""
    m = _REPARO.match(line)
    if not m:
        return None
    try:
        out = {"id": m["id"], "nome": _texto(m["nome"]), "descricao": _texto(m["desc"])}
        for key, grp in (("circulos_superiores", "hl"), ("material", "mat")):
            raw = m[grp]
            out[key] = None if raw == "null" else _texto(raw[1:-1])
        return out
    except json.JSONDecodeError:
        return None


def _contexto(line: str, pos: int, w: int = 35) -> str:
    return line[max(0, pos - w):pos] + " ⟦AQUI⟧ " + line[pos:pos + w]


def read_outputs(work: Path) -> tuple[list[tuple[str, int, dict]], list[str], list[str]]:
    """Lê todos os saida-*.jsonl. Tolera linhas vazias e cercas de código (```).

    Retorna (linhas lidas, erros, avisos). Linhas com aspas retas sem escape são consertadas
    automaticamente, com um aviso para você conferir.
    """
    rows, errors, notes = [], [], []
    for f in sorted(work.glob("saida-*.jsonl")):
        for n, line in enumerate(f.read_text(encoding="utf-8-sig").splitlines(), 1):
            line = line.strip()
            if not line or line.startswith("```"):
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError as exc:
                sid = (re.search(r'"id"\s*:\s*"([^"]+)"', line) or [None, None])[1]
                obj = repair_line(line)
                if obj is None:
                    errors.append(f"{f.name}, linha {n}" + (f" ({sid})" if sid else "")
                                  + f": JSON inválido ({exc.msg}) perto de: ...{_contexto(line, exc.pos)}...")
                    continue
                notes.append(f"{obj['nome']} ({sid}): havia aspas retas sem escape no JSON ({f.name}, linha {n}); "
                             "consertei sozinho, confira o texto")
            if not isinstance(obj, dict):
                errors.append(f"{f.name}, linha {n}: esperava um objeto JSON")
                continue
            rows.append((f.name, n, obj))
    return rows, errors, notes


# ---------------------------------------------------------------
# export
# ---------------------------------------------------------------
def entry_for(spell: dict, names: dict[str, str] | None = None) -> dict:
    e = {"id": spell["index"], "name": spell["name"], "description": ingest.clean_text(spell["description"])}
    if names and spell["index"] in names:
        e["nome_pt"] = names[spell["index"]]
    hl = ingest.clean_text(spell.get("higher_level") or "")
    if hl:
        e["higher_level"] = hl
    mat = (spell.get("material") or "").strip()
    if mat:
        e["material"] = mat
    return e


def make_batches(entries: list[dict], budget: int) -> list[list[dict]]:
    if budget <= 0:
        return [entries] if entries else []
    batches, cur, size = [], [], 0
    for e in entries:
        n = len(json.dumps(e, ensure_ascii=False))
        if cur and size + n > budget:
            batches.append(cur)
            cur, size = [], 0
        cur.append(e)
        size += n
    if cur:
        batches.append(cur)
    return batches


def render_prompt(glossary: list[tuple[str, str]]) -> str:
    gl = "\n".join(f"{en} = {pt}" for en, pt in glossary) or "(vazio)"
    return PROMPT.replace("{glossary}", gl)


def cmd_export(args) -> int:
    srd = load_srd()
    work = Path(args.dir)
    work.mkdir(parents=True, exist_ok=True)

    ids = list(srd)
    if args.only:
        pedidos = [i.strip() for i in args.only.split(",") if i.strip()]
        desconhecidos = [i for i in pedidos if i not in srd]
        if desconhecidos:
            print("ids que não existem no SRD:", ", ".join(desconhecidos))
            return 2
        ids = pedidos
    elif args.contendo:
        termos = [t.strip().lower() for t in args.contendo.split(",") if t.strip()]
        ids = [i for i in ids if any(t in " ".join([srd[i]["description"], srd[i].get("higher_level") or "", srd[i].get("material") or ""]).lower() for t in termos)]
    elif args.pendentes:
        feitos = {o.get("id") for _, _, o in read_outputs(work)[0]}
        ids = [i for i in ids if i not in feitos]

    for old in work.glob("entrada-*.jsonl"):
        old.unlink()
    names = load_names()
    batches = make_batches([entry_for(srd[i], names) for i in ids], args.budget)
    for n, batch in enumerate(batches, 1):
        text = "\n".join(json.dumps(e, ensure_ascii=False) for e in batch) + "\n"
        (work / f"entrada-{n:03d}.jsonl").write_text(text, encoding="utf-8")
    (work / "prompt.txt").write_text(render_prompt(load_glossary()), encoding="utf-8")

    print(f"{len(ids)} magias em {len(batches)} lote(s) em {work}/ ({sum(1 for i in ids if i in names)} com nome_pt)")
    if batches:
        print("Para cada lote: cole o conteúdo de prompt.txt e, em seguida, o do entrada-NNN.jsonl na IA,")
        print("e salve a resposta (só o JSON) como saida-NNN.jsonl na mesma pasta. Depois rode 'merge'.")
    else:
        print("Nada a exportar: todas as magias já têm tradução. Rode 'merge'.")
    return 0


# ---------------------------------------------------------------
# verificação de cada tradução
# ---------------------------------------------------------------
def dice_list(text: str) -> Counter:
    return Counter(re.sub(r"\s+", "", m.lower()) for m in sp.DICE.findall(text))


def _stem_regex(pt_term: str) -> re.Pattern:
    words = sp.fold(pt_term).split()
    return re.compile(r"\b" + r"\W+".join(re.escape(w) + r"(?:s|es)?" for w in words) + r"\b")


TEXT_FIELDS = ("nome", "descricao", "circulos_superiores", "material")


def as_text(value) -> str | None:
    if value is None or isinstance(value, str):
        return value
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, list):
        return "\n".join(t for t in (as_text(v) for v in value) if t)
    if isinstance(value, dict):
        lines = []
        for k, v in value.items():
            inner = as_text(v)
            lines.append(f"{k}:\n{inner}" if isinstance(v, (dict, list)) else f"{k}: {inner}")
        return "\n".join(lines)
    return str(value)


def normalize_translation(tr: dict) -> tuple[dict, list[str]]:
    out, notes = dict(tr), []
    for field in TEXT_FIELDS:
        v = tr.get(field)
        if v is not None and not isinstance(v, str):
            kind = "lista" if isinstance(v, list) else "objeto" if isinstance(v, dict) else type(v).__name__
            out[field] = as_text(v)
            notes.append(f"o campo '{field}' veio como {kind} e foi convertido em texto")
    extras = sorted(k for k in tr if k != "id" and k not in TEXT_FIELDS)
    if extras:
        notes.append(f"campos ignorados por não fazerem parte do formato: {extras}")
    return out, notes


def _resumo(value) -> str:
    if not isinstance(value, str) or not value.strip():
        return "vazio ou nulo"
    return f"{len(value)} caracteres, {sum(dice_list(value).values())} dados"


def check_translation(en: dict, tr: dict, glossary) -> tuple[list[str], list[str]]:
    """Retorna (erros, avisos). Erro impede o uso da tradução; aviso é para você revisar."""
    errors, warns = [], []
    nome = tr.get("nome")
    desc = tr.get("descricao")
    if not isinstance(nome, str) or not nome.strip():
        errors.append("falta o campo 'nome'")
    if not isinstance(desc, str) or len(desc.strip()) < 20:
        errors.append("falta o campo 'descricao' (ou está curto demais)")
        return errors, warns

    en_desc = ingest.clean_text(en["description"])
    en_hl = ingest.clean_text(en.get("higher_level") or "")
    en_mat = (en.get("material") or "").strip()
    hl = tr.get("circulos_superiores")
    mat = tr.get("material")
    pt_all = desc + ("\n" + hl if isinstance(hl, str) else "")
    en_all = en_desc + ("\n" + en_hl if en_hl else "")

    # dados e dano: precisam ser idênticos
    a, b = dice_list(en_all), dice_list(pt_all)
    if a != b:
        faltam, sobram = sorted((a - b).elements()), sorted((b - a).elements())
        errors.append(
            f"dados diferentes do original (faltam: {faltam or '-'}; a mais: {sobram or '-'}). "
            f"No original: {sorted(a.elements())}. Na tradução: {sorted(b.elements())}. "
            f"Campos lidos: descricao ({len(desc)} caracteres, {sum(dice_list(desc).values())} dados); "
            f"circulos_superiores ({_resumo(hl)}); no original, o higher_level tem {len(en_hl)} caracteres "
            f"e {sum(dice_list(en_hl).values())} dados"
        )

    # unidades em inglês e medidas
    if UNIDADES_EN.search(pt_all):
        warns.append(f"unidade em inglês sobrando: {sorted({m.lower() for m in UNIDADES_EN.findall(pt_all)})}")
    esperadas = sp.medidas_en(en_all) - sp.medidas_pt(pt_all)
    if esperadas:
        warns.append(f"medidas possivelmente não convertidas (esperado em metros: {sorted(esperadas, key=float)})")

    # estrutura e tamanho
    if len(en_desc.splitlines()) != len(ingest.clean_text(desc).splitlines()):
        warns.append("número de parágrafos diferente do original")
    ratio = len(pt_all) / max(len(en_all), 1)
    if not 0.75 <= ratio <= 1.7:
        warns.append(f"tamanho incomum em relação ao original ({ratio:.2f}x)")

    # texto que ficou em inglês
    palavras = re.findall(r"[a-zA-Z']+", pt_all.lower())
    if palavras and sum(p in INGLES for p in palavras) / len(palavras) > 0.03:
        warns.append("parece haver trechos ainda em inglês")

    # campos opcionais
    if en_mat and not (isinstance(mat, str) and mat.strip()):
        warns.append("o original tem material, mas a tradução não")
    if en_hl and not (isinstance(hl, str) and hl.strip()):
        warns.append("o original tem 'higher_level', mas a tradução não tem 'circulos_superiores'")

    # glossário
    en_text = f"{en_all}\n{en_mat}"
    pt_text = sp.fold(f"{pt_all}\n{mat if isinstance(mat, str) else ''}")
    for en_term, pt_term in glossary:
        flags = 0 if en_term[0].isupper() else re.I
        if re.search(rf"\b{re.escape(en_term)}\b", en_text, flags) and not _stem_regex(pt_term).search(pt_text):
            warns.append(f"termo '{en_term}' sem o equivalente '{pt_term}'")
    return errors, warns


# ---------------------------------------------------------------
# merge
# ---------------------------------------------------------------
def build_record(en: dict, tr: dict) -> dict:
    hl = tr.get("circulos_superiores")
    mat = tr.get("material")
    return {
        "nome": tr["nome"].strip(),
        "circulo": en["level"],
        "escola": en["school"]["name"],
        "classes": sorted(c["name"] for c in en["classes"]),
        "tempo_conjuracao": ingest.tr_casting_time(en["casting_time"]),
        "alcance": ingest.tr_range(en["range"]),
        "componentes": en.get("components") or [],
        "material": mat.strip() if isinstance(mat, str) and mat.strip() else None,
        "duracao": ingest.tr_duration(en["duration"]),
        "concentracao": bool(en["concentration"]),
        "ritual": bool(en["ritual"]),
        "descricao": ingest.clean_text(tr["descricao"]),
        "circulos_superiores": ingest.clean_text(hl) if isinstance(hl, str) and hl.strip() else None,
        "pagina": None,
        "en_id": en["index"],
        "problemas": [],
    }


def cmd_merge(args) -> int:
    srd = load_srd()
    glossary = load_glossary()
    work = Path(args.dir)
    rows, errors, notes = read_outputs(work)
    if not rows and not errors:
        print(f"Nenhum arquivo saida-*.jsonl em {work}/. Rode 'export' e traduza os lotes primeiro.")
        return 2

    names = load_names()
    records: dict[str, dict] = {}
    origem: dict[str, str] = {}
    slugs: dict[str, str] = {}
    trocadas: list[str] = []
    nomes_aplicados = 0
    avisos: list[str] = list(notes)
    for fname, n, tr in rows:
        sid = tr.get("id")
        where = f"{fname}, linha {n}"
        if sid not in srd:
            errors.append(f"{where}: id desconhecido {sid!r}")
            continue
        if sid in records and origem[sid] == fname:
            errors.append(f"{where} ({sid}): traduzida mais de uma vez no mesmo arquivo; mantida a primeira")
            continue
        tr, notas = normalize_translation(tr)
        if sid in names and tr.get("nome") != names[sid]:
            tr["nome"] = names[sid]
            nomes_aplicados += 1
        errs, warns = check_translation(srd[sid], tr, glossary)
        warns = notas + warns
        if errs:
            errors += [f"{where} ({sid}): {e}" for e in errs]
            errors += [f"{where} ({sid}): dica: {n}" for n in notas]
            continue
        rec = build_record(srd[sid], tr)
        slug = sp.slugify(rec["nome"])
        dono = slugs.get(slug)
        if dono is not None and dono != sid:
            errors.append(f"{where} ({sid}): o nome '{rec['nome']}' repete o de '{dono}'")
            continue
        try:
            sp.SpellPT.model_validate(rec)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{where} ({sid}): {str(exc).splitlines()[0]}")
            continue
        if sid in records:
            trocadas.append(f"{rec['nome']} ({sid}): {origem[sid]} substituída por {fname}")
        slugs = {k: v for k, v in slugs.items() if v != sid}
        slugs[slug] = sid
        records[sid] = rec
        origem[sid] = fname
        avisos += [f"{rec['nome']} ({sid}): {w}" for w in warns]

    # mantém a ordem do SRD
    ordered = [records[i] for i in srd if i in records]
    out = Path(args.out)
    out.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in ordered), encoding="utf-8")

    def listar(titulo: str, itens: list[str]) -> None:
        if itens:
            print(f"\n{titulo} ({len(itens)})")
            for i in itens[: args.max]:
                print("  -", i)
            if len(itens) > args.max:
                print(f"  ... e mais {len(itens) - args.max}")

    pendentes = [i for i in srd if i not in records]
    print(f"Traduções válidas: {len(ordered)} de {len(srd)}  ->  {out}")
    if nomes_aplicados:
        print(f"Nomes de {NAMES_FILE.name} aplicados por cima da tradução: {nomes_aplicados}")
    listar("Substituídas por um arquivo saida mais novo", trocadas)
    listar("ERROS (essas magias ficaram de fora; peça a tradução de novo)", errors)
    listar("AVISOS (revise; as magias entraram no arquivo)", avisos)
    if pendentes and len(pendentes) <= 40:
        listar("Ainda sem tradução válida", pendentes)
    elif pendentes:
        print(f"\nAinda sem tradução válida: {len(pendentes)} (rode 'export --pendentes' para gerar o que falta)")
    if errors or avisos:
        refazer = sorted({m.group(1) for m in (re.search(r"\((.+?)\)", e) for e in errors + avisos) if m and m.group(1) in srd})
        if refazer:
            print("\nPara refazer as marcadas:  python translate_srd.py export --only " + ",".join(refazer[:30]))
    if ordered:
        print("\nPróximo passo: python validate_pt.py  e  python ingest.py --lang pt --reset")
    return 1 if errors else 0


def cmd_nomes(args) -> int:
    src = Path(args.out)
    if not src.exists():
        print(f"{src} não existe. Rode 'merge' primeiro, para o arquivo refletir os nomes que você corrigiu.")
        return 2
    atuais: dict[str, str] = {}
    for line in src.read_text(encoding="utf-8").splitlines():
        if line.strip():
            r = json.loads(line)
            if r.get("en_id") and r.get("nome"):
                atuais[r["en_id"]] = r["nome"]
    path = Path(args.names)
    existentes = load_names(path)
    novos = {i: n for i, n in atuais.items() if i not in existentes}
    divergentes = {i: n for i, n in atuais.items() if i in existentes and existentes[i] != n}
    final = {**existentes, **novos, **(divergentes if args.atualizar else {})}
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "nome"])
        for i in sorted(final):
            w.writerow([i, final[i]])
    print(f"{len(final)} nomes em {path}  (novos: {len(novos)}"
          + (f", atualizados: {len(divergentes)}" if args.atualizar else "") + ")")
    if divergentes and not args.atualizar:
        print(f"{len(divergentes)} nomes divergem do arquivo e foram mantidos como estão nele "
              f"(use --atualizar para aceitar os do {src.name}): " + ", ".join(sorted(divergentes)[:10]))
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    e = sub.add_parser("export", help="gera os lotes de entrada e o prompt")
    e.add_argument("--dir", default=str(WORK_DIR), help="pasta de trabalho (padrão: data/traducao)")
    e.add_argument("--budget", type=int, default=12000, help="tamanho máximo de cada lote, em caracteres (padrão: 12000; 0 = um lote só)")
    g = e.add_mutually_exclusive_group()
    g.add_argument("--pendentes", action="store_true", help="só as magias que ainda não aparecem em nenhum saida-*.jsonl")
    g.add_argument("--only", help="ids separados por vírgula (ex.: fireball,fly)")
    g.add_argument("--contendo", help="termos em inglês separados por vírgula; exporta as magias cujo texto contém algum deles (ex.: \"Force damage,spellcasting ability modifier\")")
    e.set_defaults(func=cmd_export)

    m = sub.add_parser("merge", help="valida as traduções e gera o arquivo final")
    m.add_argument("--dir", default=str(WORK_DIR))
    m.add_argument("--out", default=str(OUT_FILE), help="arquivo de saída (padrão: data/spells-pt.jsonl)")
    m.add_argument("--max", type=int, default=30, help="máximo de itens listados por seção")
    m.set_defaults(func=cmd_merge)

    n = sub.add_parser("nomes", help="guarda os nomes atuais das magias em data/nomes_pt.csv para não se perderem ao retraduzir")
    n.add_argument("--out", default=str(OUT_FILE), help="arquivo gerado pelo merge (padrão: data/spells-pt.jsonl)")
    n.add_argument("--names", default=str(NAMES_FILE), help="arquivo de nomes (padrão: data/nomes_pt.csv)")
    n.add_argument("--atualizar", action="store_true", help="sobrescreve os nomes já salvos pelos do arquivo atual")
    n.set_defaults(func=cmd_nomes)

    args = ap.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())