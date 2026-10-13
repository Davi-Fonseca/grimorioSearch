#!/usr/bin/env python3
"""Valida o arquivo de magias em português extraído do livro e cruza com o SRD.

Uso:
    python validate_pt.py                          # valida data/spells-pt.jsonl
    python validate_pt.py --sugerir-mapa           # gera data/nomes_pt_en.sugestao.csv
    python validate_pt.py --mapa data/nomes_pt_en.csv   # valida e cruza com o SRD
"""
import argparse
import sys
from collections import Counter
from pathlib import Path

import ingest
import spells_pt as sp

SUGESTAO = Path(__file__).parent / "data" / "nomes_pt_en.sugestao.csv"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("arquivo", nargs="?", default=str(sp.PT_FILE), help="arquivo .jsonl (padrão: data/spells-pt.jsonl)")
    ap.add_argument("--mapa", help="CSV com colunas pt,en (nome no livro, nome no SRD) para cruzar com o SRD")
    ap.add_argument("--sugerir-mapa", action="store_true", help="gera um CSV de sugestões de nomes para você revisar")
    ap.add_argument("--max", type=int, default=30, help="máximo de itens listados por seção (padrão: 30)")
    args = ap.parse_args()

    path = Path(args.arquivo)
    if not path.exists():
        print(f"Arquivo não encontrado: {path}")
        return 2

    records, errors = sp.load_jsonl(path)
    errors += sp.check_unique(records)
    srd = ingest.build_docs()

    if args.sugerir_mapa:
        sugs = sp.suggest_mapping(records, srd)
        sp.write_suggestions(sugs, SUGESTAO)
        c = Counter(s.confidence for s in sugs)
        print(f"Sugestões gravadas em {SUGESTAO}")
        print("Confiança:", ", ".join(f"{k}: {v}" for k, v in sorted(c.items())))
        print("Revise o CSV (principalmente 'baixa' e 'conflito'). Magias que não estão no SRD ficam sem "
              "correspondente certo: apague a linha delas. Salve como data/nomes_pt_en.csv.")
        return 0

    def listar(titulo: str, itens: list[str]) -> None:
        if not itens:
            return
        print(f"\n{titulo} ({len(itens)})")
        for i in itens[: args.max]:
            print("  -", i)
        if len(itens) > args.max:
            print(f"  ... e mais {len(itens) - args.max}")

    print(f"Arquivo: {path}")
    print(f"Magias válidas: {len(records)}")
    if records:
        niv = Counter(s.circulo for _, s in records)
        print("Por círculo:", "  ".join(f"{'T' if k == 0 else k}={niv[k]}" for k in sorted(niv)))
        print("Por escola: ", "  ".join(f"{sp.SCHOOLS_PT[k]}={v}" for k, v in sorted(Counter(s.escola for _, s in records).items())))
        print("Por classe: ", "  ".join(f"{sp.CLASSES_PT[k]}={v}" for k, v in sorted(Counter(c for _, s in records for c in s.classes).items())))
        print("\nCompare estes totais com o índice do livro.")

    listar("ERROS (essas linhas não entram no índice)", errors)

    avisos = [f"{s.nome} (linha {n}): {w}" for n, s in records for w in sp.warnings_for(s)]
    listar("AVISOS (revise à mão)", avisos)

    if args.mapa:
        mapa = sp.load_mapping(Path(args.mapa))
        look = sp.srd_lookup(srd)
        usados, sem_mapa, nao_achou, divergencias = set(), [], [], []
        for n, s in records:
            en = mapa.get(sp.fold(s.nome))
            if not en:
                sem_mapa.append(s.nome)
                continue
            d = look.get(sp.fold(en)) or look.get(en)
            if not d:
                nao_achou.append(f"{s.nome} -> '{en}' não existe no SRD")
                continue
            usados.add(d["id"])
            for diff in sp.compare(s, d):
                divergencias.append(f"{s.nome} ({d['name']}), linha {n}: {diff}")
        print(f"\nCRUZAMENTO COM O SRD: {len(usados)} magias comparadas")
        listar("Divergências (provável erro de extração; confira no PDF)", divergencias)
        listar("Mapeamentos que não existem no SRD", nao_achou)
        listar("Sem mapeamento (podem ser magias fora do SRD)", sem_mapa)
        faltando = [d["name"] for d in srd if d["id"] not in usados]
        listar("Magias do SRD sem correspondente no seu arquivo (faltam no livro extraído ou no mapa)", faltando)
    else:
        print("\n(Sem --mapa: o cruzamento com o SRD não foi feito. Veja --sugerir-mapa.)")

    print(f"\nResumo: {len(errors)} erros, {len(avisos)} avisos.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())