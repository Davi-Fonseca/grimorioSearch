"""Magias do livro em português: esquema, validação, adaptação para o índice e cruzamento com o SRD.

Entrada: um arquivo JSON Lines (uma magia por linha) gerado pela IA a partir do PDF,
no formato descrito em docs/prompt-extracao.md.
"""
from __future__ import annotations

import csv
import json
import re
import sys
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from ingest import clean_text, make_summary
from vocab import CLASSES_PT, SCHOOLS_PT

PT_FILE = Path(__file__).parent / "data" / "spells-pt.jsonl"
SOURCE_PT = "Livro do Jogador 2024 (pt-BR)"
SOURCE_SRD_PT = "SRD 5.2 (traduzido para o português)"
COMPONENTS = {"V", "S", "M"}


def fold(s: str) -> str:
    return unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", fold(name)).strip("-")


# ---------------------------------------------------------------
# Esquema
# ---------------------------------------------------------------
class SpellPT(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    nome: str = Field(min_length=2, max_length=80)
    circulo: int = Field(ge=0, le=9)
    escola: str
    classes: list[str] = Field(min_length=1)
    tempo_conjuracao: str = Field(min_length=1)
    alcance: str = Field(min_length=1)
    componentes: list[str]
    material: str | None = None
    duracao: str = Field(min_length=1)
    concentracao: bool
    ritual: bool
    descricao: str = Field(min_length=20)
    circulos_superiores: str | None = None
    pagina: int | None = Field(default=None, ge=1)
    en_id: str | None = None          # id da magia no SRD em inglês, quando o texto foi traduzido dele
    problemas: list[str] = Field(default_factory=list)

    @field_validator("escola")
    @classmethod
    def _escola(cls, v: str) -> str:
        if v not in SCHOOLS_PT:
            raise ValueError(f"escola inválida: {v!r}. Use uma de {sorted(SCHOOLS_PT)}")
        return v

    @field_validator("classes")
    @classmethod
    def _classes(cls, v: list[str]) -> list[str]:
        ruins = [c for c in v if c not in CLASSES_PT]
        if ruins:
            raise ValueError(f"classe(s) inválida(s): {ruins}. Use {sorted(CLASSES_PT)}")
        return sorted(set(v))

    @field_validator("componentes")
    @classmethod
    def _componentes(cls, v: list[str]) -> list[str]:
        ruins = [c for c in v if c not in COMPONENTS]
        if ruins:
            raise ValueError(f"componente(s) inválido(s): {ruins}. Use V, S ou M")
        return sorted(set(v), key=["V", "S", "M"].index)

    @field_validator("material", "circulos_superiores")
    @classmethod
    def _vazio_vira_none(cls, v: str | None) -> str | None:
        return v or None


# ---------------------------------------------------------------
# Leitura e validação
# ---------------------------------------------------------------
def load_jsonl(path: Path) -> tuple[list[tuple[int, SpellPT]], list[str]]:
    """Retorna (registros válidos com o número da linha, mensagens de erro)."""
    records: list[tuple[int, SpellPT]] = []
    errors: list[str] = []
    with open(path, encoding="utf-8-sig") as f:
        for n, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
            except json.JSONDecodeError as exc:
                errors.append(f"linha {n}: JSON inválido ({exc.msg})")
                continue
            try:
                records.append((n, SpellPT.model_validate(data)))
            except ValidationError as exc:
                nome = data.get("nome", "?") if isinstance(data, dict) else "?"
                for e in exc.errors():
                    campo = ".".join(str(x) for x in e["loc"]) or "(registro)"
                    errors.append(f"linha {n} ({nome}): {campo}: {e['msg']}")
    return records, errors


def check_unique(records: list[tuple[int, SpellPT]]) -> list[str]:
    seen: dict[str, tuple[int, str]] = {}
    errors = []
    for n, s in records:
        key = slugify(s.nome)
        if key in seen:
            errors.append(f"linha {n} ({s.nome}): nome repetido (já aparece na linha {seen[key][0]})")
        else:
            seen[key] = (n, s.nome)
    return errors


def warnings_for(s: SpellPT) -> list[str]:
    """Problemas prováveis de extração que não impedem a indexação."""
    w = []
    d = s.descricao
    if len(d) < 60:
        w.append("descrição muito curta (pode ter sido cortada)")
    if re.search(r"\w-\n\w", d):
        w.append("palavra hifenizada na quebra de linha (não foi unida)")
    if re.search(r"^\s*\d{1,3}\s*$", d, re.M):
        w.append("linha só com número (provável número de página)")
    if "\f" in d:
        w.append("caractere de quebra de página no texto")
    if not re.search(r"[.)\"”:!?]\s*$", d):
        w.append("a descrição não termina em pontuação (pode estar cortada)")
    if re.search(r"(circulos?|niveis?) superiores", fold(d)):
        w.append("trecho de 'círculos superiores' ainda dentro da descrição")
    if "M" in s.componentes and not s.material:
        w.append("tem componente M, mas o campo material está vazio")
    if s.material and "M" not in s.componentes:
        w.append("tem material, mas M não está nos componentes")
    fala_conc = "concentra" in fold(s.duracao)
    if fala_conc and not s.concentracao:
        w.append("a duração cita concentração, mas concentracao=false")
    if s.concentracao and not fala_conc:
        w.append("concentracao=true, mas a duração não cita concentração")
    for p in s.problemas:
        w.append(f"a IA sinalizou: {p}")
    return w


# ---------------------------------------------------------------
# Adaptação para o formato do índice (igual ao de ingest.build_doc)
# ---------------------------------------------------------------
def to_doc(s: SpellPT, in_srd: bool = False) -> dict:
    in_srd = in_srd or bool(s.en_id)
    classes = sorted(s.classes)
    descricao = clean_text(s.descricao)

    labels = [SCHOOLS_PT[s.escola], *[CLASSES_PT[c] for c in classes]]
    labels.append("truque" if s.circulo == 0 else f"{s.circulo}º círculo")
    if s.concentracao:
        labels.append("concentração")
    if s.ritual:
        labels.append("ritual")

    return {
        "id": slugify(s.nome),
        "name": s.nome,
        "level": s.circulo,
        "school": s.escola,
        "classes": classes,
        "casting_time": s.tempo_conjuracao,
        "time_pt": s.tempo_conjuracao,       # já vêm em português no livro
        "range": s.alcance,
        "range_pt": s.alcance,
        "duration": s.duracao,
        "duration_pt": s.duracao,
        "concentration": s.concentracao,
        "ritual": s.ritual,
        "components": s.componentes,
        "material": s.material or "",
        "description": descricao,
        "higher_level": clean_text(s.circulos_superiores or ""),
        "summary": make_summary(descricao),
        "damage_type": None,
        "labels_pt": " ".join(labels),
        "lang": "pt",
        "source": SOURCE_SRD_PT if s.en_id else SOURCE_PT,
        "in_srd": in_srd,      # True quando a magia existe no SRD 5.2 (pelo mapa de nomes)
    }


def load_docs(path: Path = PT_FILE, mapa: Path | None = None, somente_srd: bool = False) -> list[dict]:
    """Valida e converte o arquivo inteiro; se houver erros, mostra e encerra.

    Com 'mapa' (CSV pt,en), marca cada magia que existe no SRD (in_srd=True).
    Com 'somente_srd', indexa apenas essas, deixando de fora as que não estão no SRD.
    """
    records, errors = load_jsonl(path)
    errors += check_unique(records)
    if errors:
        print(f"{len(errors)} erro(s) em {path}. Nada foi indexado. Corrija e tente de novo "
              f"(rode 'python validate_pt.py' para o relatório completo):")
        for e in errors[:20]:
            print("  -", e)
        if len(errors) > 20:
            print(f"  ... e mais {len(errors) - 20}")
        sys.exit(3)

    if somente_srd and not mapa:
        print("--somente-srd precisa do mapa de nomes: use --mapa data/nomes_pt_en.csv "
              "(gere uma sugestão com 'python validate_pt.py --sugerir-mapa').")
        sys.exit(3)

    in_srd: set[str] = set()
    if mapa:
        from ingest import build_docs
        look = srd_lookup(build_docs())
        names = load_mapping(mapa)
        for _, s in records:
            en = names.get(fold(s.nome))
            if en and (look.get(fold(en)) or look.get(en)):
                in_srd.add(slugify(s.nome))

    docs = [to_doc(s, in_srd=slugify(s.nome) in in_srd) for _, s in records]
    if somente_srd:
        antes = len(docs)
        docs = [d for d in docs if d["in_srd"]]
        print(f"--somente-srd: {len(docs)} de {antes} magias estão no SRD; {antes - len(docs)} ficaram de fora.")
    return docs


# ---------------------------------------------------------------
# Cruzamento com o SRD (inglês)
# ---------------------------------------------------------------
def load_mapping(path: Path) -> dict[str, str]:
    """CSV com colunas pt,en -> {nome em português (sem acento): nome ou id no SRD}."""
    out: dict[str, str] = {}
    with open(path, encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            pt, en = (row.get("pt") or "").strip(), (row.get("en") or "").strip()
            if pt and en:
                out[fold(pt)] = en
    return out


def srd_lookup(srd_docs: list[dict]) -> dict[str, dict]:
    look = {}
    for d in srd_docs:
        look[fold(d["name"])] = d
        look[d["id"]] = d
    return look


def compare(s: SpellPT, d: dict) -> list[str]:
    """Diferenças entre uma magia do livro e a correspondente do SRD."""
    diffs = []
    if s.circulo != d["level"]:
        diffs.append(f"círculo: livro={s.circulo}, SRD={d['level']}")
    if s.escola != d["school"]:
        diffs.append(f"escola: livro={s.escola}, SRD={d['school']}")
    if set(s.classes) != set(d["classes"]):
        diffs.append(f"classes: livro={sorted(s.classes)}, SRD={sorted(d['classes'])}")
    if s.concentracao != d["concentration"]:
        diffs.append(f"concentração: livro={s.concentracao}, SRD={d['concentration']}")
    if s.ritual != d["ritual"]:
        diffs.append(f"ritual: livro={s.ritual}, SRD={d['ritual']}")
    if set(s.componentes) != set(d["components"]):
        diffs.append(f"componentes: livro={s.componentes}, SRD={d['components']}")
    return diffs


DICE = re.compile(r"\b\d+d\d+(?:\s*[+\-]\s*\d+)?", re.I)


def dice(text: str) -> set[str]:
    return {re.sub(r"\s+", "", m.lower()) for m in DICE.findall(text)}


MEDIDA_PT = re.compile(r"(\d+(?:[.,]\d+)?)\s*(?:metros?|m)\b", re.I)
MEDIDA_EN = re.compile(r"(\d+(?:\.\d+)?)[\s-]*(?:feet|foot|ft)\b", re.I)


MEDIDA_CM = re.compile(r"(\d+(?:[.,]\d+)?)\s*(?:cent[ií]metros?|cm)\b", re.I)


def medidas_pt(text: str) -> set[str]:
    metros = {f"{float(m.replace(',', '.')):g}" for m in MEDIDA_PT.findall(text)}
    centimetros = {f"{round(float(m.replace(',', '.')) / 100, 2):g}" for m in MEDIDA_CM.findall(text)}
    return metros | centimetros


def medidas_en(text: str) -> set[str]:
    """Pés convertidos para metros (5 pés = 1,5 m), como no livro em português."""
    return {f"{round(float(m) * 0.3, 1):g}" for m in MEDIDA_EN.findall(text)}


def _jaccard(a: set[str], b: set[str]) -> float:
    return len(a & b) / len(a | b) if (a or b) else 0.5   # sem nada para comparar: neutro


def _score(s: SpellPT, d: dict) -> float:
    """Pontuação de 0 a 8: dados de dano (3), medidas em metros (2), círculo, escola e componentes (1 cada)."""
    pt_text = f"{s.descricao} {s.circulos_superiores or ''}"
    en_text = f"{d['description']} {d['higher_level']}"
    return (3 * _jaccard(dice(pt_text), dice(en_text))
            + 2 * _jaccard(medidas_pt(f"{s.alcance} {pt_text}"), medidas_en(f"{d['range']} {en_text}"))
            + (s.circulo == d["level"])
            + (s.escola == d["school"])
            + (set(s.componentes) == set(d["components"])))


@dataclass
class Suggestion:
    pt: str
    en: str = ""
    confidence: str = "baixa"
    score: float = 0.0
    alternatives: list[str] = field(default_factory=list)


def suggest_mapping(records: list[tuple[int, SpellPT]], srd_docs: list[dict]) -> list[Suggestion]:
    """Sugere o nome em inglês de cada magia, comparando dados de dano, medidas, círculo, escola e componentes.

    Os nomes não são usados, pois mudam na tradução. Classes, concentração e ritual ficam de fora de propósito:
    assim o cruzamento posterior (compare) continua conferindo esses campos de forma independente.
    """
    out: list[Suggestion] = []
    for _, s in records:
        ranked = sorted(((_score(s, d), d["name"]) for d in srd_docs), key=lambda x: (-x[0], x[1]))
        (best, name), (second, _) = ranked[0], ranked[1]
        margin = best - second
        if best >= 7.2 and margin >= 1.5:
            conf = "alta"
        elif best >= 5.3 and margin >= 0.75:
            conf = "média"
        else:
            conf = "baixa"
        out.append(Suggestion(s.nome, name, conf, round(best, 2), [n for _, n in ranked[1:3]]))

    # duas magias do livro apontando para a mesma do SRD: só a de maior pontuação fica
    by_en: dict[str, list[Suggestion]] = {}
    for sug in out:
        by_en.setdefault(sug.en, []).append(sug)
    for group in by_en.values():
        if len(group) > 1:
            group.sort(key=lambda x: -x.score)
            for loser in group[1:]:
                loser.confidence = "conflito"
    return out


def write_suggestions(sugs: list[Suggestion], path: Path) -> None:
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["pt", "en", "confianca", "pontuacao", "alternativas"])
        for s in sugs:
            w.writerow([s.pt, s.en, s.confidence, s.score, " | ".join(s.alternatives)])