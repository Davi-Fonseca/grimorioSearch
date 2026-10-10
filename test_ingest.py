from collections import Counter

import ingest


def docs():
    return ingest.build_docs()


def test_total_e_distribuicao():
    d = docs()
    assert len(d) == 339
    assert Counter(x["level"] for x in d)[0] == 27
    assert {x["school"] for x in d} == {
        "Abjuration", "Conjuration", "Divination", "Enchantment",
        "Evocation", "Illusion", "Necromancy", "Transmutation",
    }


def test_ids_unicos():
    ids = [x["id"] for x in docs()]
    assert len(ids) == len(set(ids))


def test_traducao_tempo():
    assert ingest.tr_casting_time("Action") == "1 ação"
    assert ingest.tr_casting_time("Bonus Action") == "1 ação bônus"
    assert ingest.tr_casting_time("Reaction, which you take when you are hit") == "1 reação"
    assert ingest.tr_casting_time("1 minute") == "1 minuto"
    assert ingest.tr_casting_time("8 hours") == "8 horas"
    assert ingest.tr_casting_time("Action (Overgrowth) or 8 hours (Enrichment)") == \
        "1 ação (Overgrowth) ou 8 horas (Enrichment)"


def test_traducao_alcance():
    assert ingest.tr_range("Self") == "Pessoal"
    assert ingest.tr_range("Touch") == "Toque"
    assert ingest.tr_range("150 feet") == "45 m"
    assert ingest.tr_range("5 feet") == "1,5 m"
    assert ingest.tr_range("15 feet") == "4,5 m"
    assert ingest.tr_range("1 mile") == "1,6 km"
    assert ingest.tr_range("500 miles") == "800 km"
    # artefato da fonte
    assert ingest.tr_range("Touch Component: V, S") == "Toque"
    assert ingest.tr_range("60 feet Component: V") == "18 m"


def test_traducao_duracao():
    assert ingest.tr_duration("Instantaneous") == "Instantânea"
    assert ingest.tr_duration("up to 1 minute") == "Até 1 minuto"
    assert ingest.tr_duration("Up to 8 hours") == "Até 8 horas"
    assert ingest.tr_duration("Concentration up to 10 minutes") == "Até 10 minutos"
    assert ingest.tr_duration("1 hour") == "1 hora"
    assert ingest.tr_duration("up to 6 rounds") == "Até 6 rodadas"
    assert ingest.tr_duration("Until dispelled") == "Até ser dissipada"


def test_nenhum_campo_curto_ficou_em_ingles_conhecido():
    for x in docs():
        for campo in ("time_pt", "range_pt", "duration_pt"):
            v = x[campo]
            assert v and "Component" not in v, (x["name"], campo, v)
        assert "feet" not in x["range_pt"] and "mile" not in x["range_pt"], x["name"]


def test_doc_fireball():
    f = next(x for x in docs() if x["id"] == "fireball")
    assert f["level"] == 3 and f["school"] == "Evocation"
    assert f["classes"] == ["Sorcerer", "Wizard"]
    assert f["range_pt"] == "45 m"
    assert "fogo" in f["labels_pt"]
    assert "mago" in f["labels_pt"].lower()


def test_resumo_curto_e_sem_quebras():
    for x in docs():
        assert len(x["summary"]) <= 225
        assert "\n" not in x["summary"]
        assert x["summary"]


def test_descricao_sem_recuo():
    for x in docs():
        for ln in x["description"].splitlines():
            assert ln == ln.strip() and ln
