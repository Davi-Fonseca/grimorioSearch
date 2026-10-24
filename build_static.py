#!/usr/bin/env python3
"""Gera static/spells.json a partir de data/spells-pt.jsonl, para o site estático.

    python build_static.py                 # valida e escreve static/spells.json
    python build_static.py --somente-srd --mapa data/nomes_pt_en.csv   # só o que está no SRD

Rode de novo sempre que mudar data/spells-pt.jsonl, e publique a pasta static/.
"""
import argparse
import json
from pathlib import Path

from spells_pt import PT_FILE, load_docs

OUT = Path(__file__).parent / "static" / "spells.json"

# Só o que a interface e a busca usam (o resto do documento do Elasticsearch fica de fora)
FIELDS = [
    "id", "name", "level", "school", "classes", "time_pt", "range_pt", "duration_pt",
    "concentration", "ritual", "components", "material", "description", "higher_level",
    "summary", "labels_pt", "lang", "source",
]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("--file", type=Path, default=PT_FILE, help="arquivo de entrada (padrão: data/spells-pt.jsonl)")
    ap.add_argument("--out", type=Path, default=OUT, help="arquivo de saída (padrão: static/spells.json)")
    ap.add_argument("--mapa", type=Path, help="CSV pt,en com os nomes das magias no SRD")
    ap.add_argument("--somente-srd", action="store_true", help="mantém só as magias do SRD (exige --mapa)")
    args = ap.parse_args()

    docs = load_docs(args.file, mapa=args.mapa, somente_srd=args.somente_srd)
    rows = [{k: d[k] for k in FIELDS} for d in docs]
    rows.sort(key=lambda r: (r["level"], r["name"].lower()))

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    fontes = sorted({r["source"] for r in rows})
    print(f"{len(rows)} magias gravadas em {args.out} ({args.out.stat().st_size / 1024:.0f} KB).")
    print(f"Fonte(s): {', '.join(fontes)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
