#!/usr/bin/env python3
"""Lê as magias do SRD 2024, normaliza e indexa no Elasticsearch.

Uso:
    python ingest.py --reset                 # SRD 2024 em inglês: apaga e recria o índice
    python ingest.py                         # cria o índice se não existir
    python ingest.py --if-empty              # só indexa se o índice não existir ou estiver vazio
    python ingest.py --lang pt --reset       # livro em português (data/spells-pt.jsonl)
    python ingest.py --lang pt --reset --mapa data/nomes_pt_en.csv --somente-srd   # só o que está no SRD
"""
import argparse
import copy
import json
import os
import re
import sys
from pathlib import Path

from vocab import CLASSES_PT, DAMAGE_PT, SCHOOLS_PT

DATA_FILE = Path(__file__).parent / "data" / "5e-SRD-Spells-2024.json"
ES_URL = os.getenv("ES_URL", "http://localhost:9200")
INDEX = os.getenv("ES_INDEX", "spells-2024")

# ---------------------------------------------------------------
# Índice: analisadores e mapeamento
# ---------------------------------------------------------------
INDEX_BODY = {
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
        "analysis": {
            "filter": {
                "prefix_filter": {"type": "edge_ngram", "min_gram": 2, "max_gram": 15},
            },
            "analyzer": {
                # Indexa prefixos do nome ("fir" encontra "Fireball")
                "name_prefix": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": ["lowercase", "asciifolding", "prefix_filter"],
                },
                # Sem stemming, ignora acentos: usado nas buscas em português
                "fold": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": ["lowercase", "asciifolding"],
                },
            },
            "normalizer": {
                "lc": {"type": "custom", "filter": ["lowercase", "asciifolding"]},
            },
        },
    },
    "mappings": {
        # Campos não listados ficam só no _source (usados para exibição)
        "dynamic": False,
        "properties": {
            "name": {
                "type": "text",
                "analyzer": "english",
                "fields": {
                    "prefix": {"type": "text", "analyzer": "name_prefix", "search_analyzer": "fold"},
                    "raw": {"type": "keyword", "normalizer": "lc"},
                },
            },
            "description": {"type": "text", "analyzer": "english"},
            "higher_level": {"type": "text", "analyzer": "english"},
            "labels_pt": {"type": "text", "analyzer": "fold"},
            "level": {"type": "byte"},
            "school": {"type": "keyword"},
            "classes": {"type": "keyword"},
            "concentration": {"type": "boolean"},
            "ritual": {"type": "boolean"},
            "damage_type": {"type": "keyword"},
            "components": {"type": "keyword"},
        },
    },
}

def index_body(lang: str = "en") -> dict:
    """Mapeamento do índice. Para textos em português, usa o analisador 'portuguese'."""
    body = copy.deepcopy(INDEX_BODY)
    if lang == "pt":
        for campo in ("name", "description", "higher_level"):
            body["mappings"]["properties"][campo]["analyzer"] = "portuguese"
    return body


# ---------------------------------------------------------------
# Tradução dos campos curtos (tempo, alcance, duração)
# ---------------------------------------------------------------
UNIT_PT = {
    "minute": "minuto", "minutes": "minutos",
    "hour": "hora", "hours": "horas",
    "round": "rodada", "rounds": "rodadas",
    "day": "dia", "days": "dias",
}
UNIT_RE = r"(minutes?|hours?|rounds?|days?)"


def _fmt(n: float) -> str:
    return f"{n:g}".replace(".", ",")


def _units(text: str) -> str:
    return re.sub(UNIT_RE, lambda m: UNIT_PT[m.group(1).lower()], text, flags=re.I)


def tr_casting_time(raw: str) -> str:
    t = raw.strip()
    low = t.lower()
    if low.startswith("bonus action"):
        return "1 ação bônus"
    if low.startswith("reaction"):
        return "1 reação"
    if low == "action":
        return "1 ação"
    t = re.sub(r"^Action\b", "1 ação", t)
    t = re.sub(r"\bor\b", "ou", t)
    return _units(t)


def tr_range(raw: str) -> str:
    # Alguns registros da fonte trazem "Component: V, S" colado no alcance
    t = re.sub(r"\s*Component:.*$", "", raw).strip()
    low = t.lower()
    fixed = {"self": "Pessoal", "touch": "Toque", "sight": "Visão",
             "unlimited": "Ilimitado", "special": "Especial"}
    if low in fixed:
        return fixed[low]
    m = re.fullmatch(r"(\d+)\s*(?:feet|foot|ft)", low)
    if m:
        return f"{_fmt(round(int(m.group(1)) * 0.3, 1))} m"   # 5 pés = 1,5 m
    m = re.fullmatch(r"(\d+)\s*miles?", low)
    if m:
        return f"{_fmt(round(int(m.group(1)) * 1.6, 1))} km"
    return t


def tr_duration(raw: str) -> str:
    t = raw.strip()
    low = t.lower()
    fixed = {
        "instantaneous": "Instantânea",
        "until dispelled": "Até ser dissipada",
        "until dispelled or triggered": "Até ser dissipada ou ativada",
        "special": "Especial",
    }
    if low in fixed:
        return fixed[low]
    m = re.fullmatch(rf"(?:concentration,?\s*)?(up to\s+)?(\d+)\s+{UNIT_RE}", low)
    if m:
        base = f"{m.group(2)} {UNIT_PT[m.group(3)]}"
        return f"Até {base}" if m.group(1) else base
    return t


# ---------------------------------------------------------------
# Normalização
# ---------------------------------------------------------------
def clean_text(text: str) -> str:
    """Remove recuos e espaços sobrando, preservando as quebras de parágrafo."""
    lines = [ln.strip() for ln in (text or "").splitlines()]
    return "\n".join(ln for ln in lines if ln)


def make_summary(desc: str, limit: int = 220) -> str:
    flat = " ".join(desc.split())
    if len(flat) <= limit:
        return flat
    cut = flat[:limit]
    end = max(cut.rfind(". "), cut.rfind("! "), cut.rfind("? "))
    if end >= 80:
        return cut[: end + 1]
    return cut.rsplit(" ", 1)[0].rstrip(",;:") + "…"


def build_doc(s: dict) -> dict:
    school = s["school"]["name"]
    classes = sorted(c["name"] for c in s["classes"])
    damage = ((s.get("damage") or {}).get("damage_type") or {}).get("name")
    description = clean_text(s["description"])
    level = s["level"]

    # Texto em português usado só na busca: permite achar "mago", "evocação", "fogo"…
    labels = [SCHOOLS_PT[school], *[CLASSES_PT[c] for c in classes]]
    labels.append("truque" if level == 0 else f"{level}º círculo")
    if s["concentration"]:
        labels.append("concentração")
    if s["ritual"]:
        labels.append("ritual")
    if damage:
        labels.append(DAMAGE_PT.get(damage, damage.lower()))

    return {
        "id": s["index"],
        "name": s["name"],
        "level": level,
        "school": school,
        "classes": classes,
        "casting_time": s["casting_time"],
        "time_pt": tr_casting_time(s["casting_time"]),
        "range": s["range"],
        "range_pt": tr_range(s["range"]),
        "duration": s["duration"],
        "duration_pt": tr_duration(s["duration"]),
        "concentration": bool(s["concentration"]),
        "ritual": bool(s["ritual"]),
        "components": s.get("components") or [],
        "material": s.get("material") or "",
        "description": description,
        "higher_level": clean_text(s.get("higher_level") or ""),
        "summary": make_summary(description),
        "damage_type": damage,
        "labels_pt": " ".join(labels),
        "lang": "en",
        "source": "SRD 5.2",
    }


def build_docs(path: Path = DATA_FILE) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        return [build_doc(s) for s in json.load(f)]


# ---------------------------------------------------------------
# Indexação
# ---------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("--reset", action="store_true", help="apaga e recria o índice")
    ap.add_argument("--lang", choices=["en", "pt"], default="en",
                    help="en: SRD 2024 em inglês (padrão); pt: livro em português (data/spells-pt.jsonl)")
    ap.add_argument("--file", help="arquivo de entrada (só para --lang pt; padrão: data/spells-pt.jsonl)")
    ap.add_argument("--if-empty", action="store_true",
                    help="só indexa se o índice não existir ou estiver vazio (usado na subida do Docker)")
    ap.add_argument("--mapa", help="CSV pt,en com os nomes das magias no SRD (só para --lang pt)")
    ap.add_argument("--somente-srd", action="store_true",
                    help="indexa só as magias do livro que existem no SRD (exige --mapa)")
    ap.add_argument("--es", default=ES_URL, help=f"URL do Elasticsearch (padrão: {ES_URL})")
    ap.add_argument("--index", help=f"nome do índice (padrão: {INDEX}, ou {INDEX}-pt com --lang pt)")
    args = ap.parse_args()
    if args.lang == "en" and (args.mapa or args.somente_srd):
        print("--mapa e --somente-srd só valem com --lang pt.")
        return 2
    index = args.index or (INDEX if args.lang == "en" else f"{INDEX}-pt")

    # Lê e valida os dados antes de mexer no Elasticsearch
    if args.lang == "pt":
        from spells_pt import PT_FILE, load_docs
        docs = load_docs(Path(args.file) if args.file else PT_FILE,
                         mapa=Path(args.mapa) if args.mapa else None, somente_srd=args.somente_srd)
    else:
        docs = build_docs()

    from elasticsearch import Elasticsearch, helpers

    es = Elasticsearch(args.es)
    try:
        es.info()
    except Exception as exc:  # noqa: BLE001
        print(f"Não consegui conectar ao Elasticsearch em {args.es}.\n"
              f"Rode 'docker compose up -d' e aguarde alguns segundos.\nDetalhe: {exc}")
        return 1

    if args.if_empty and not args.reset and es.indices.exists(index=index):
        n = es.count(index=index)["count"]
        if n > 0:
            print(f"Índice '{index}' já tem {n} magias; nada a indexar.")
            return 0

    if args.reset and es.indices.exists(index=index):
        es.indices.delete(index=index)
        print(f"Índice '{index}' apagado.")
    if not es.indices.exists(index=index):
        es.indices.create(index=index, **index_body(args.lang))
        print(f"Índice '{index}' criado.")
    else:
        print(f"Índice '{index}' já existe; documentos serão atualizados (use --reset para recriar).")

    actions = ({"_index": index, "_id": d["id"], "_source": d} for d in docs)
    ok, errors = helpers.bulk(es, actions, raise_on_error=False)
    es.indices.refresh(index=index)
    print(f"{ok} magias indexadas; {len(errors) if isinstance(errors, list) else errors} erros.")
    print(f"Total no índice: {es.count(index=index)['count']}")
    if args.lang == "pt":
        print(f"Para usar este índice, defina ES_INDEX={index} na API (veja o README).")
    return 0 if not errors else 2


if __name__ == "__main__":
    sys.exit(main())