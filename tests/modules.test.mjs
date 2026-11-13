// Guarda da arquitetura: imports existem, sem ciclos, módulos "puros" sem DOM, CSS e HTML em sintonia.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "static");
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const jsFiles = walk(join(root, "js")).filter((f) => f.endsWith(".js"));
const rel = (f) => relative(join(root, "js"), f).split("\\").join("/");
const read = (f) => readFileSync(f, "utf-8");

const importsOf = (file) => {
  const src = read(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const specs = [
    ...src.matchAll(/(?:import|export)\s[^;]*?from\s+["'](\.[^"']+)["']/g),   // import { a } from "./x.js"  /  export * from "./x.js"
    ...src.matchAll(/import\s+["'](\.[^"']+)["']/g),                          // import "./x.js"
    ...src.matchAll(/import\(\s*["'](\.[^"']+)["']\s*\)/g),                  // import("./x.js")
  ].map((m) => m[1]);
  return [...new Set(specs)].map((spec) => resolve(dirname(file), spec));
};

test("todo import relativo aponta para um arquivo que existe", () => {
  for (const f of jsFiles) for (const dep of importsOf(f)) {
    assert.ok(existsSync(dep), `${rel(f)} importa ${relative(root, dep)}, que não existe`);
  }
});

test("não há ciclos de importação", () => {
  const graph = new Map(jsFiles.map((f) => [f, importsOf(f)]));
  const state = new Map();
  const visit = (f, path) => {
    if (state.get(f) === 2) return;
    assert.notEqual(state.get(f), 1, `ciclo: ${[...path, f].map((p) => rel(p)).join(" -> ")}`);
    state.set(f, 1);
    for (const d of graph.get(f) || []) visit(d, [...path, f]);
    state.set(f, 2);
  };
  jsFiles.forEach((f) => visit(f, []));
});

test("módulos puros não usam DOM nem navegador", () => {
  const pure = jsFiles.filter((f) => /^(config|format|state|info-texts)\.js$|^search\//.test(rel(f)) || rel(f) === "ui/cards.js");
  assert.ok(pure.length >= 10);
  for (const f of pure) {
    const src = read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(src, /\b(document|window|localStorage|getComputedStyle|requestAnimationFrame)\b/, `${rel(f)} usa o navegador`);
  }
});

test("o motor de busca não depende da interface", () => {
  for (const f of jsFiles.filter((f) => rel(f).startsWith("search/"))) {
    for (const d of importsOf(f)) assert.ok(rel(d).startsWith("search/"), `${rel(f)} importa ${rel(d)} (fora de search/)`);
  }
});

test("index.html carrega main.js e todos os CSS (nenhum CSS órfão, nenhum link quebrado)", () => {
  const html = read(join(root, "index.html"));
  assert.match(html, /<script type="module" src="js\/main\.js"><\/script>/);
  assert.doesNotMatch(html, /<script>[\s\S]*?\S[\s\S]*?<\/script>/, "não deve sobrar JavaScript embutido no HTML");
  const linked = [...html.matchAll(/<link rel="stylesheet" href="(css\/[^"]+)"/g)].map((m) => m[1]);
  for (const href of linked) assert.ok(existsSync(join(root, href)), `${href} não existe`);
  const onDisk = readdirSync(join(root, "css")).map((f) => `css/${f}`).sort();
  assert.deepEqual([...linked].sort(), onDisk);
});

test("responsive.css é o último CSS carregado (media queries precisam vencer as regras base)", () => {
  const html = read(join(root, "index.html"));
  const linked = [...html.matchAll(/<link rel="stylesheet" href="css\/([^"]+)"/g)].map((m) => m[1]);
  assert.equal(linked[linked.length - 1], "responsive.css");
  assert.equal(linked[0], "base.css");
});

test("todo CSS tem chaves balanceadas", () => {
  for (const f of readdirSync(join(root, "css"))) {
    const css = read(join(root, "css", f)).replace(/\/\*[\s\S]*?\*\//g, "");
    assert.equal(css.split("{").length, css.split("}").length, `${f}: chaves desbalanceadas`);
  }
});
