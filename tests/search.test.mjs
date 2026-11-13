// Testes do motor de busca (static/js/search). Rode com:  node --test
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createIndex, search } from "../static/js/search/engine.js";
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

test("filtragem reversa: círculo, escola e classe escondem o que foi marcado", () => {
  const tudo = all({}).total;
  const sem3 = all({ levels: [3], exclude: ["levels"] });
  assert.ok(sem3.hits.every((h) => h.level !== 3));
  assert.equal(sem3.total + all({ levels: [3] }).total, tudo); // as duas listas se completam

  const semEvo = all({ schools: ["Evocation"], exclude: ["schools"] });
  assert.ok(semEvo.hits.every((h) => h.school !== "Evocation"));
  assert.equal(semEvo.total + all({ schools: ["Evocation"] }).total, tudo);

  const semMago = all({ classes: ["Wizard", "Cleric"], exclude: ["classes"] });
  assert.ok(semMago.hits.every((h) => !h.classes.includes("Wizard") && !h.classes.includes("Cleric")));
  assert.equal(semMago.total + all({ classes: ["Wizard", "Cleric"] }).total, tudo);
});

test("filtragem reversa de componentes esconde quem exige qualquer um dos marcados", () => {
  const r = all({ components: ["V", "M"], exclude: ["components"] });
  assert.ok(r.total > 0);
  assert.ok(r.hits.every((h) => !h.components.includes("V") && !h.components.includes("M")));
});

test("filtragem reversa de características: sem concentração e sem ritual", () => {
  assert.ok(all({ concentration: true, exclude: ["features"] }).hits.every((h) => !h.concentration));
  assert.ok(all({ ritual: true, exclude: ["features"] }).hits.every((h) => !h.ritual));
  const ambos = all({ concentration: true, ritual: true, exclude: ["features"] });
  assert.ok(ambos.hits.every((h) => !h.concentration && !h.ritual));
});

test("filtragem reversa sem nada marcado não muda nada", () => {
  const todos = ["levels", "schools", "classes", "components", "features"];
  assert.equal(all({ exclude: todos }).total, docs.length);
});

test("o reverso vale só para o filtro marcado; os outros seguem normais", () => {
  const r = all({ levels: [3], schools: ["Evocation"], exclude: ["levels"] });
  assert.ok(r.hits.every((h) => h.level !== 3 && h.school === "Evocation"));
});

test("facetas do filtro reverso ignoram o próprio filtro", () => {
  const normal = all({ levels: [3] });
  const reverso = all({ levels: [3], exclude: ["levels"] });
  assert.deepEqual(normal.facets.levels, reverso.facets.levels);
});

test("ordenações: círculo crescente/decrescente e nome A–Z/Z–A", () => {
  const fold = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const nomes = (sort) => names(all({ sort })).map(fold);

  const az = nomes("name"), za = nomes("name_desc");
  assert.deepEqual(za, [...az].reverse());
  assert.deepEqual(az, [...az].sort());

  const asc = all({ sort: "level" }).hits.map((h) => h.level);
  const desc = all({ sort: "level_desc" }).hits.map((h) => h.level);
  assert.deepEqual(asc, [...asc].sort((a, b) => a - b));
  assert.deepEqual(desc, [...desc].sort((a, b) => b - a));
  assert.equal(desc[0], Math.max(...docs.map((d) => d.level)));

  // dentro do mesmo círculo, o nome continua em ordem A–Z nas duas direções
  const d = all({ sort: "level_desc" }).hits.filter((h) => h.level === desc[0]).map((h) => fold(h.name));
  assert.deepEqual(d, [...d].sort());
});

test("ordenação desconhecida cai no padrão (círculo crescente)", () => {
  assert.deepEqual(names(all({ sort: "qualquer" })), names(all({ sort: "level" })));
});

// ---------- relevância: o nome vale mais que rótulos e descrições ----------
const fold = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const rel = (q, extra = {}) => all({ q, sort: "relevance", ...extra });

test("relevância: 'raio nauseante' acha Raio Nauseante em primeiro", () => {
  assert.equal(rel("raio nauseante").hits[0].name, "Raio Nauseante");
  assert.equal(rel("nauseante raio").hits[0].name, "Raio Nauseante"); // ordem das palavras não importa
});

test("relevância: com várias palavras, só entram magias que têm TODAS elas", () => {
  const r = rel("raio nauseante");
  assert.ok(r.total >= 1 && r.total < 10, `esperava poucas, veio ${r.total}`);
  for (const h of r.hits) {
    const t = fold(`${h.name} ${h.description} ${h.higher_level || ""} ${h.labels_pt || ""}`);
    assert.ok(t.includes("raio") && t.includes("nausea"), h.name);
  }
});

test("relevância: 'nauseante' sozinho também devolve Raio Nauseante primeiro", () => {
  assert.equal(rel("nauseante").hits[0].name, "Raio Nauseante");
});

test("relevância: palavra no nome vem antes de palavra só na descrição", () => {
  for (const q of ["raio", "fogo", "cura"]) {
    const r = rel(q);
    const noNome = (h) => fold(h.name).split(/[^a-z0-9]+/).some((w) => w.startsWith(q.slice(0, 4)));
    const flags = r.hits.map(noNome);
    const ultimoDoNome = flags.lastIndexOf(true);
    const primeiroSemNome = flags.indexOf(false);
    assert.ok(ultimoDoNome >= 0, `"${q}" deveria ter magias com a palavra no nome`);
    assert.ok(primeiroSemNome === -1 || ultimoDoNome < primeiroSemNome, `"${q}": magia sem a palavra no nome apareceu antes de uma com ela`);
  }
});

test("relevância: nome igual ao digitado vence nomes que apenas o contêm", () => {
  const nome = docs.find((d) => d.name === "Raio Solar")?.name ?? docs[0].name;
  assert.equal(rel(nome).hits[0].name, nome);
  assert.equal(rel(fold(nome).toUpperCase()).hits[0].name, nome);
});

test("relevância: nome que começa com o digitado vem antes de nome que só contém a palavra", () => {
  const r = rel("raio").hits.map((h) => h.name);
  const comecam = r.filter((n) => fold(n).startsWith("raio"));
  assert.deepEqual(r.slice(0, comecam.length).sort(), [...comecam].sort());
});

test("relevância: mesmas magias que as outras ordenações, só em outra ordem", () => {
  const a = names(all({ q: "raio", sort: "relevance" })).sort();
  const b = names(all({ q: "raio", sort: "level" })).sort();
  assert.deepEqual(a, b);
  assert.notDeepEqual(names(all({ q: "raio", sort: "relevance" })), names(all({ q: "raio", sort: "level" })));
});

test("relevância sem busca = círculo crescente; ordenações escolhidas continuam valendo com busca", () => {
  assert.deepEqual(names(all({ sort: "relevance" })), names(all({ sort: "level" })));
  const az = names(all({ q: "raio", sort: "name" })).map(fold);
  assert.deepEqual(az, [...az].sort());
});

test("relevância: erro de digitação continua achando pelo nome", () => {
  assert.equal(rel("raio nauseate").hits[0].name, "Raio Nauseante");
  assert.equal(rel("raio nausean").hits[0].name, "Raio Nauseante"); // começo da palavra
});

test("relevância: busca respeita os filtros e as facetas", () => {
  const r = rel("raio", { schools: ["Evocation"] });
  assert.ok(r.hits.every((h) => h.school === "Evocation"));
  assert.ok(r.total < rel("raio").total);
});
