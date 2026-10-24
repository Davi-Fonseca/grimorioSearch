// Testes da busca no navegador. Rode com:  node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { createIndex, search } = require("../static/search.js");
const docs = JSON.parse(readFileSync(new URL("../static/spells.json", import.meta.url), "utf-8"));
const index = createIndex(docs);
const names = (r) => r.hits.map((h) => h.name);
const all = (params) => search(index, { limit: 1000, ...params });

test("sem busca devolve tudo, por círculo e depois por nome", () => {
  const r = all({});
  assert.equal(r.total, docs.length);
  assert.equal(r.total_all, docs.length);
  for (let i = 1; i < r.hits.length; i++) {
    const a = r.hits[i - 1], b = r.hits[i];
    assert.ok(a.level <= b.level);
  }
});

test("ordenar por nome ignora acentos e maiúsculas", () => {
  const r = all({ sort: "name" });
  const fold = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const ns = names(r).map(fold);
  assert.deepEqual(ns, [...ns].sort());
});

test("nome exato e começo do nome", () => {
  const nome = docs.find((d) => d.name.startsWith("Bola de Fogo"))?.name ?? docs[0].name;
  assert.ok(names(all({ q: nome })).includes(nome));
  assert.ok(names(all({ q: nome.slice(0, 4).toLowerCase() })).includes(nome));
});

test("ignora acentos e maiúsculas na busca", () => {
  const com = docs.find((d) => /[áéíóúãõç]/i.test(d.name));
  assert.ok(com, "esperava ao menos um nome com acento");
  const sem = com.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  assert.ok(names(all({ q: sem })).includes(com.name));
});

test("tolera erro de digitação em palavras longas", () => {
  const alvo = docs.find((d) => /\b\w{7,}\b/.test(d.name));
  const palavra = alvo.name.match(/\b\w{7,}\b/)[0].toLowerCase();
  const errada = palavra.slice(0, 3) + palavra[4] + palavra[3] + palavra.slice(5); // troca duas letras
  assert.ok(names(all({ q: errada })).includes(alvo.name), `"${errada}" deveria achar ${alvo.name}`);
});

test("acha pelo rótulo (escola, classe, círculo)", () => {
  const r = all({ q: "evocação" });
  assert.ok(r.total > 0);
  assert.ok(r.hits.some((h) => h.school === "Evocation"));
});

test("palavras muito diferentes não casam", () => {
  assert.equal(all({ q: "xqzwvk" }).total, 0);
});

test("filtros: círculo, escola, classe, concentração e ritual", () => {
  assert.ok(all({ levels: [3] }).hits.every((h) => h.level === 3));
  assert.ok(all({ levels: [0, 1] }).hits.every((h) => h.level <= 1));
  assert.ok(all({ schools: ["Evocation"] }).hits.every((h) => h.school === "Evocation"));
  assert.ok(all({ classes: ["Wizard", "Cleric"] }).hits.every((h) => h.classes.some((c) => ["Wizard", "Cleric"].includes(c))));
  assert.ok(all({ concentration: true }).hits.every((h) => h.concentration));
  assert.ok(all({ ritual: true }).hits.every((h) => h.ritual));
});

test("componentes exigem todos os marcados", () => {
  const r = all({ components: ["V", "M"] });
  assert.ok(r.total > 0);
  assert.ok(r.hits.every((h) => h.components.includes("V") && h.components.includes("M")));
  assert.ok(r.total < all({ components: ["V"] }).total);
});

test("facetas ignoram o próprio filtro, mas respeitam os demais", () => {
  const sem = all({ ritual: true });
  const com = all({ ritual: true, schools: ["Divination"] });
  // a contagem de escolas não muda ao marcar uma escola
  assert.deepEqual(com.facets.schools, sem.facets.schools);
  // a contagem de círculos respeita a escola marcada
  const soma = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  assert.equal(soma(com.facets.levels), com.total);
  assert.ok(soma(com.facets.levels) < soma(sem.facets.levels));
});

test("paginação", () => {
  const p1 = search(index, { limit: 10, offset: 0 });
  const p2 = search(index, { limit: 10, offset: 10 });
  assert.equal(p1.hits.length, 10);
  assert.notEqual(p1.hits[0].name, p2.hits[0].name);
  assert.equal(p1.total, docs.length);
});
