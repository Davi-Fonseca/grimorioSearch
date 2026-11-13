// Testes de static/js/ui/cards.js (HTML do card; sem DOM).
import test from "node:test";
import assert from "node:assert/strict";
import { cardHtml } from "../static/js/ui/cards.js";

const spell = (extra = {}) => ({
  name: "Raio Nauseante", level: 1, school: "Necromancy", classes: ["Wizard", "Sorcerer"],
  concentration: false, ritual: false, components: ["V", "S"], material: "",
  time_pt: "1 ação", range_pt: "9 m", duration_pt: "Instantânea",
  summary: "Resumo.", description: "Descrição completa.", higher_level: "", lang: "pt", source: "SRD", ...extra,
});

test("mostra nome, círculo, escola e informações", () => {
  const h = cardHtml(spell());
  assert.match(h, /<h2>Raio Nauseante<\/h2>/);
  assert.match(h, /1º círculo/);
  assert.match(h, /Necromancia/);
  assert.match(h, /--school:#70ce47/);               // cor da escola no contorno
  assert.match(h, /9 m <span class="sep">\/<\/span> 6 quadrados/);
  assert.match(h, /<dt>Componentes<\/dt><dd>V, S<\/dd>/);
});

test("material aparece junto dos componentes", () => {
  assert.match(cardHtml(spell({ components: ["V", "S", "M"], material: "uma pena" })), /V, S, M \(uma pena\)/);
});

test("sem componentes, a linha some", () => {
  assert.doesNotMatch(cardHtml(spell({ components: [] })), /Componentes/);
});

test("concentração: etiqueta e botão do olho; sem concentração, nenhum dos dois", () => {
  const com = cardHtml(spell({ concentration: true }));
  assert.match(com, /<span class="tag">Concentração<\/span>/);
  assert.match(com, /class="info" data-info="conc"/);
  const sem = cardHtml(spell());
  assert.doesNotMatch(sem, /class="info"/);
  assert.doesNotMatch(sem, /class="tag"/);
});

test("ritual vira etiqueta", () => {
  assert.match(cardHtml(spell({ ritual: true })), /<span class="tag">Ritual<\/span>/);
});

test("classes marcadas nos filtros ficam ligadas no card", () => {
  const h = cardHtml(spell(), new Set(["Wizard"]));
  assert.match(h, /class="cls on" data-class="Wizard" aria-pressed="true"/);
  assert.match(h, /class="cls" data-class="Sorcerer" aria-pressed="false"/);
});

test("círculos superiores só aparecem quando existem", () => {
  assert.doesNotMatch(cardHtml(spell()), /Em círculos superiores/);
  assert.match(cardHtml(spell({ higher_level: "+1d6" })), /Em círculos superiores\.<\/strong> \+1d6/);
});

test("texto em inglês é avisado no botão da descrição", () => {
  assert.match(cardHtml(spell()), /<summary>Descrição completa<\/summary>/);
  assert.match(cardHtml(spell({ lang: "en" })), /Descrição completa \(em inglês\)/);
});

test("HTML vindo dos dados é escapado", () => {
  const h = cardHtml(spell({ name: `<img src=x onerror=alert(1)>`, summary: "<script>x</script>" }));
  assert.doesNotMatch(h, /<img src=x/);
  assert.doesNotMatch(h, /<script>/);
  assert.match(h, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test("escola desconhecida não quebra o card", () => {
  const h = cardHtml(spell({ school: "Chronurgy" }));
  assert.match(h, /Chronurgy/);
  assert.match(h, /--school:var\(--muted\)/);
});
