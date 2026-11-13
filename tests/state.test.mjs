// Testes de static/js/state.js (estado dos filtros, busca e ordenação; sem DOM).
import test from "node:test";
import assert from "node:assert/strict";
import { state, toggle, activeCount, clearFilters, clearSection, removeFilter, setQuery, negatedSections, searchParams } from "../static/js/state.js";

const reset = () => { clearFilters(); state.q = ""; state.sort = "level"; };

test("toggle liga e desliga", () => {
  const s = new Set();
  toggle(s, 3); assert.ok(s.has(3));
  toggle(s, 3); assert.ok(!s.has(3));
});

test("activeCount soma tudo o que está marcado", () => {
  reset();
  assert.equal(activeCount(), 0);
  state.levels.add(1); state.schools.add("Evocation"); state.classes.add("Wizard"); state.components.add("V");
  state.concentration = true; state.ritual = true;
  assert.equal(activeCount(), 6);
});

test("clearFilters zera marcações e filtragem reversa", () => {
  reset();
  state.levels.add(2); state.concentration = true; state.neg.schools = true;
  clearFilters();
  assert.equal(activeCount(), 0);
  assert.deepEqual(negatedSections(), []);
});

test("clearSection zera só aquele filtro (e o modo reverso dele)", () => {
  reset();
  state.levels.add(2); state.classes.add("Wizard"); state.neg.levels = true; state.neg.classes = true;
  clearSection("levels");
  assert.equal(state.levels.size, 0);
  assert.equal(state.neg.levels, false);
  assert.equal(state.classes.size, 1);          // os outros ficam
  assert.equal(state.neg.classes, true);
});

test("clearSection('features') zera concentração e ritual", () => {
  reset();
  state.concentration = true; state.ritual = true; state.neg.features = true;
  clearSection("features");
  assert.equal(state.concentration, false);
  assert.equal(state.ritual, false);
  assert.equal(state.neg.features, false);
});

test("removeFilter tira uma marcação (usado pelos chips)", () => {
  reset();
  state.levels.add(3); state.schools.add("Evocation"); state.classes.add("Wizard"); state.components.add("M");
  state.concentration = true; state.ritual = true;
  removeFilter("levels", "3");                 // vem como texto do data-value
  removeFilter("schools", "Evocation");
  removeFilter("classes", "Wizard");
  removeFilter("components", "M");
  removeFilter("concentration", "");
  removeFilter("ritual", "");
  assert.equal(activeCount(), 0);
});

test("buscar passa para relevância e limpar a busca volta à ordenação anterior", () => {
  reset(); state.sort = "name_desc";
  setQuery("r");        assert.equal(state.sort, "relevance");
  setQuery("ra");       assert.equal(state.sort, "relevance");   // continuar digitando não muda nada
  setQuery("");         assert.equal(state.sort, "name_desc");   // voltou
  assert.equal(state.q, "");
});

test("espaços não contam como busca", () => {
  reset();
  setQuery("   ");
  assert.equal(state.sort, "level");
});

test("ordenação escolhida durante a busca é mantida ao limpar", () => {
  reset();
  setQuery("raio"); assert.equal(state.sort, "relevance");
  state.sort = "name";                                      // a pessoa escolheu outra ordenação
  setQuery("");
  assert.equal(state.sort, "name");
});

test("searchParams monta os parâmetros do motor de busca", () => {
  reset();
  state.q = "raio"; state.levels.add(3); state.schools.add("Evocation"); state.components.add("V");
  state.concentration = true; state.neg.schools = true; state.sort = "relevance";
  const p = searchParams({ limit: 48, offset: 96 });
  assert.deepEqual(p, {
    q: "raio", levels: [3], schools: ["Evocation"], classes: [], components: ["V"],
    concentration: true, ritual: false, exclude: ["schools"], sort: "relevance", limit: 48, offset: 96,
  });
  // listas novas: mexer nelas não altera o estado
  p.levels.push(9);
  assert.deepEqual([...state.levels], [3]);
});
