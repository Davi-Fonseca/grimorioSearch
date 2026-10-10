import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import app as grimorio
from app import SearchParams, build_search, filter_clauses, shape_response, text_query


# ---------- construção da consulta ----------
def test_sem_busca_usa_match_all_e_ordena_por_nome():
    b = build_search(SearchParams())
    assert b["query"] == {"match_all": {}}
    assert b["sort"] == [{"name.raw": "asc"}]          # relevância sem texto cai para nome
    assert "post_filter" not in b
    assert b["from_"] == 0 and b["size"] == 48


def test_busca_textual_ordena_por_relevancia():
    b = build_search(SearchParams(q="fire"))
    assert b["sort"][0] == {"_score": "desc"}
    fields = b["query"]["bool"]["should"][2]["multi_match"]["fields"]
    assert "name^4" in fields and "labels_pt^2" in fields


def test_filtros_vao_para_post_filter():
    p = SearchParams(levels=[1, 3], schools=["Evocation"], classes=["Wizard", "Cleric"],
                     concentration=True)
    b = build_search(p)
    f = b["post_filter"]["bool"]["filter"]
    assert {"terms": {"level": [1, 3]}} in f
    assert {"terms": {"school": ["Evocation"]}} in f
    assert {"terms": {"classes": ["Wizard", "Cleric"]}} in f
    assert {"term": {"concentration": True}} in f


def test_facetas_disjuntivas_ignoram_o_proprio_filtro():
    p = SearchParams(levels=[1], schools=["Evocation"], classes=["Wizard"], ritual=True)
    b = build_search(p)
    por_faceta = {n: a["filter"]["bool"]["filter"] for n, a in b["aggs"].items() if n != "all_docs"}
    assert {"terms": {"level": [1]}} not in por_faceta["levels"]
    assert {"terms": {"school": ["Evocation"]}} in por_faceta["levels"]
    assert {"terms": {"school": ["Evocation"]}} not in por_faceta["schools"]
    assert {"terms": {"level": [1]}} in por_faceta["schools"]
    assert {"terms": {"classes": ["Wizard"]}} not in por_faceta["classes"]
    # filtros booleanos valem para todas as facetas
    assert all({"term": {"ritual": True}} in v for v in por_faceta.values())


def test_ordenar_por_circulo():
    b = build_search(SearchParams(sort="level"))
    assert b["sort"] == [{"level": "asc"}, {"name.raw": "asc"}]


def test_text_query_vazio():
    assert text_query("   ") == {"match_all": {}}


# ---------- resposta ----------
ES_RESP = {
    "hits": {"total": {"value": 2, "relation": "eq"},
             "hits": [{"_source": {"id": "fireball", "name": "Fireball"}},
                      {"_source": {"id": "fire-bolt", "name": "Fire Bolt"}}]},
    "aggregations": {
        "all_docs": {"doc_count": 339},
        "levels": {"values": {"buckets": [{"key": 0, "doc_count": 1}, {"key": 3, "doc_count": 1}]}},
        "schools": {"values": {"buckets": [{"key": "Evocation", "doc_count": 2}]}},
        "classes": {"values": {"buckets": [{"key": "Wizard", "doc_count": 2}]}},
    },
}


def test_shape_response():
    out = shape_response(ES_RESP)
    assert out["total"] == 2 and out["total_all"] == 339
    assert [h["id"] for h in out["hits"]] == ["fireball", "fire-bolt"]
    assert out["facets"]["levels"] == {"0": 1, "3": 1}
    assert out["facets"]["schools"] == {"Evocation": 2}


# ---------- endpoint com Elasticsearch falso ----------
class FakeES:
    def __init__(self):
        self.calls = []

    def search(self, index, **kwargs):
        self.calls.append((index, kwargs))
        return ES_RESP

    def count(self, index):
        return {"count": 339}


@pytest.fixture
def client():
    fake = FakeES()
    grimorio.app.dependency_overrides[grimorio.get_es] = lambda: fake
    yield TestClient(grimorio.app), fake
    grimorio.app.dependency_overrides.clear()


def test_endpoint_repassa_parametros(client):
    c, fake = client
    r = c.get("/api/search", params=[("q", "fogo"), ("level", 3), ("level", 99), ("school", "Evocation"),
                                     ("school", "Inventada"), ("class", "Wizard"), ("ritual", "true"),
                                     ("sort", "level"), ("limit", 10), ("offset", 20)])
    assert r.status_code == 200
    assert r.json()["total"] == 2
    _, kw = fake.calls[0]
    f = kw["post_filter"]["bool"]["filter"]
    assert {"terms": {"level": [3]}} in f                 # 99 descartado
    assert {"terms": {"school": ["Evocation"]}} in f       # "Inventada" descartada
    assert kw["from_"] == 20 and kw["size"] == 10


def test_endpoint_valida_entradas(client):
    c, _ = client
    assert c.get("/api/search", params={"limit": 1000}).status_code == 422
    assert c.get("/api/search", params={"sort": "aleatorio"}).status_code == 422
    assert c.get("/api/search", params={"q": "x" * 300}).status_code == 422


def test_endpoint_es_fora_do_ar():
    from elastic_transport import ConnectionError as ESConnectionError

    class Down:
        def search(self, **_):
            raise ESConnectionError("sem conexão")

        def count(self, **_):
            raise ESConnectionError("sem conexão")

    grimorio.app.dependency_overrides[grimorio.get_es] = lambda: Down()
    try:
        r = TestClient(grimorio.app).get("/api/search")
        assert r.status_code == 503
    finally:
        grimorio.app.dependency_overrides.clear()


def test_total_do_indice_acompanha_a_resposta_sem_cache(client):
    c, fake = client
    assert c.get("/api/search").json()["total_all"] == 339
    # o índice mudou (ex.: nova ingestão): o valor novo deve aparecer na hora
    fake_resp = {**ES_RESP, "aggregations": {**ES_RESP["aggregations"], "all_docs": {"doc_count": 400}}}
    fake.search = lambda index, **kw: fake_resp
    assert c.get("/api/search").json()["total_all"] == 400


def test_consulta_pede_o_total_global():
    b = build_search(SearchParams(q="fogo", levels=[1]))
    assert b["aggs"]["all_docs"] == {"global": {}}