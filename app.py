"""API de busca de magias (FastAPI + Elasticsearch).

    uvicorn app:app --reload
"""
import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Literal

from elastic_transport import TransportError
from elasticsearch import ApiError, Elasticsearch
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles

from vocab import CLASSES_PT, SCHOOLS_PT

ES_URL = os.getenv("ES_URL", "http://localhost:9200")  # no Docker Compose, ES_URL vem do docker-compose.yml
INDEX = os.getenv("ES_INDEX", "spells-2024")
BASE = Path(__file__).parent
STATIC_DIR = BASE / "static"


# nome da faceta na API -> campo no índice
FACETS = {"levels": "level", "schools": "school", "classes": "classes"}


@dataclass
class SearchParams:
    q: str = ""
    levels: list[int] = field(default_factory=list)
    schools: list[str] = field(default_factory=list)
    classes: list[str] = field(default_factory=list)
    concentration: bool = False
    ritual: bool = False
    sort: str = "relevance"
    limit: int = 48
    offset: int = 0


# ---------------------------------------------------------------
# Construção da consulta
# ---------------------------------------------------------------
def text_query(q: str) -> dict:
    """Busca textual: nome pesa mais, depois descrição e rótulos em português."""
    q = q.strip()
    if not q:
        return {"match_all": {}}
    return {
        "bool": {
            "should": [
                # nome exato
                {"term": {"name.raw": {"value": q.lower(), "boost": 10}}},
                # nome começando com o que foi digitado ("fire" -> Fireball)
                {"match": {"name.prefix": {"query": q, "operator": "and", "boost": 3}}},
                # texto livre, com tolerância a erros de digitação
                {
                    "multi_match": {
                        "query": q,
                        "type": "best_fields",
                        "fields": ["name^4", "description", "higher_level^0.5", "labels_pt^2"],
                        "fuzziness": "AUTO:5,9",
                        "prefix_length": 1,
                    }
                },
            ],
            "minimum_should_match": 1,
        }
    }


def filter_clauses(p: SearchParams, skip: str | None = None) -> list[dict]:
    """Filtros ativos. 'skip' ignora uma faceta (usado nas contagens)."""
    clauses = []
    if skip != "levels" and p.levels:
        clauses.append({"terms": {"level": p.levels}})
    if skip != "schools" and p.schools:
        clauses.append({"terms": {"school": p.schools}})
    if skip != "classes" and p.classes:
        clauses.append({"terms": {"classes": p.classes}})
    if p.concentration:
        clauses.append({"term": {"concentration": True}})
    if p.ritual:
        clauses.append({"term": {"ritual": True}})
    return clauses


def build_search(p: SearchParams) -> dict:
    """Monta os argumentos de es.search().

    Os filtros ficam em post_filter, assim as agregações não são afetadas por eles.
    Cada faceta recalcula suas contagens aplicando todos os filtros, exceto o dela
    (facetas disjuntivas): marcar "Mago" continua mostrando quantas magias o Clérigo tem.
    """
    sort_by = p.sort if (p.sort != "relevance" or p.q.strip()) else "name"
    sorts = {
        "relevance": [{"_score": "desc"}, {"name.raw": "asc"}],
        "name": [{"name.raw": "asc"}],
        "level": [{"level": "asc"}, {"name.raw": "asc"}],
    }
    aggs = {
        # total de documentos do índice, ignorando consulta e filtros (vem na mesma requisição)
        "all_docs": {"global": {}},
        **{
            facet: {
                "filter": {"bool": {"filter": filter_clauses(p, skip=facet)}},
                "aggs": {"values": {"terms": {"field": field_, "size": 20}}},
            }
            for facet, field_ in FACETS.items()
        },
    }
    body = {
        "query": text_query(p.q),
        "aggs": aggs,
        "sort": sorts[sort_by],
        "from_": p.offset,
        "size": p.limit,
        "track_total_hits": True,
        "source_excludes": ["labels_pt"],
    }
    active = filter_clauses(p)
    if active:
        body["post_filter"] = {"bool": {"filter": active}}
    return body


def shape_response(resp: dict) -> dict:
    """Converte a resposta do Elasticsearch no formato usado pela interface."""
    facets = {
        name: {str(b["key"]): b["doc_count"] for b in resp["aggregations"][name]["values"]["buckets"]}
        for name in FACETS
    }
    return {
        "total": resp["hits"]["total"]["value"],
        "total_all": resp["aggregations"]["all_docs"]["doc_count"],
        "hits": [h["_source"] for h in resp["hits"]["hits"]],
        "facets": facets,
    }


# ---------------------------------------------------------------
# API
# ---------------------------------------------------------------
app = FastAPI(title="Grimório")


@lru_cache
def get_es() -> Elasticsearch:
    return Elasticsearch(ES_URL)


@app.get("/api/search")
def search(
    q: str = Query("", max_length=200),
    level: list[int] = Query([]),
    school: list[str] = Query([]),
    cls: list[str] = Query([], alias="class"),
    concentration: bool = False,
    ritual: bool = False,
    sort: Literal["relevance", "name", "level"] = "relevance",
    limit: int = Query(48, ge=1, le=100),
    offset: int = Query(0, ge=0, le=1000),
    es: Elasticsearch = Depends(get_es),
):
    params = SearchParams(
        q=q,
        levels=sorted({l for l in level if 0 <= l <= 9}),
        schools=[s for s in dict.fromkeys(school) if s in SCHOOLS_PT],
        classes=[c for c in dict.fromkeys(cls) if c in CLASSES_PT],
        concentration=concentration,
        ritual=ritual,
        sort=sort,
        limit=limit,
        offset=offset,
    )
    try:
        resp = es.search(index=INDEX, **build_search(params))
        return shape_response(resp.body if hasattr(resp, "body") else resp)
    except (TransportError, ApiError) as exc:
        raise HTTPException(status_code=503, detail=f"Elasticsearch indisponível: {exc}") from exc


@app.get("/api/health")
def health(es: Elasticsearch = Depends(get_es)):
    try:
        return {"elasticsearch": True, "index": INDEX, "documents": es.count(index=INDEX)["count"]}
    except (TransportError, ApiError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


STATIC_DIR.mkdir(parents=True, exist_ok=True)
if not (STATIC_DIR / "index.html").exists():
    print(f"AVISO: {STATIC_DIR / 'index.html'} não encontrado; a interface vai dar 404. "
          "Coloque index.html e style.css dentro da pasta static/.")

# Interface estática na raiz (deve ser a última rota registrada)
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")