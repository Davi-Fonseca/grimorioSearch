// Testes de static/js/format.js (texto puro). Rode com:  node --test
import test from "node:test";
import assert from "node:assert/strict";
import { esc, levelLabel, rangeHtml, byPt } from "../static/js/format.js";
import { SCHOOLS } from "../static/js/config.js";

test("esc protege contra HTML", () => {
  assert.equal(esc(`<img src=x onerror="a()"> & 'b'`), "&lt;img src=x onerror=&quot;a()&quot;&gt; &amp; &#39;b&#39;");
  assert.equal(esc(null), "");
  assert.equal(esc(undefined), "");
  assert.equal(esc(3), "3");
});

test("levelLabel: truque e círculos", () => {
  assert.equal(levelLabel(0), "Truque");
  assert.equal(levelLabel(1), "1º círculo");
  assert.equal(levelLabel(9), "9º círculo");
});

test("rangeHtml: metros viram quadrados (1 quadrado = 1,5 m)", () => {
  const q = (r) => rangeHtml(r).replace(/<[^>]+>/g, "");
  assert.equal(q("9 m"), "9 m / 6 quadrados");
  assert.equal(q("18 m"), "18 m / 12 quadrados");
  assert.equal(q("4,5 m"), "4,5 m / 3 quadrados");
  assert.equal(q("1,5 m"), "1,5 m / 1 quadrado");   // singular
  assert.equal(q("150 m"), "150 m / 100 quadrados");
});

test("rangeHtml: o que não é em metros (ou é menor que 1 quadrado) fica como está", () => {
  for (const r of ["Toque", "Pessoal", "Visão", "Especial", "Ilimitado", "1,6 km", "800 km", "0,5 m"]) {
    assert.equal(rangeHtml(r), esc(r), r);
  }
  assert.equal(rangeHtml(""), "");
  assert.equal(rangeHtml(undefined), "");
});

test("rangeHtml escapa HTML do texto original", () => {
  assert.equal(rangeHtml("<b>Toque</b>"), "&lt;b&gt;Toque&lt;/b&gt;");
});

test("byPt ordena pelo nome em português, ignorando acentos", () => {
  const ordem = byPt(SCHOOLS).map((k) => SCHOOLS[k].pt);
  assert.deepEqual(ordem, [...ordem].sort((a, b) => a.localeCompare(b, "pt-BR")));
  assert.equal(ordem[0], "Abjuração");
  assert.equal(ordem.length, Object.keys(SCHOOLS).length);
});
