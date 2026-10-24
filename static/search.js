/* Busca de magias no navegador (substitui a API FastAPI + Elasticsearch).
 *
 * Reproduz o que o app.py fazia:
 *   - o texto da busca só decide QUAIS magias entram (a ordem é sempre por círculo ou nome);
 *   - entra a magia cujo nome é igual ao digitado, cujo nome começa com o que foi digitado
 *     ("fir" -> "Fireball") ou que tem alguma palavra parecida (com tolerância a erros de digitação)
 *     no nome, na descrição, em "círculos superiores" ou nos rótulos (escola, classe, círculo…);
 *   - filtros: círculo/escola/classe (qualquer um dos marcados), componentes (todos os marcados),
 *     concentração e ritual;
 *   - facetas disjuntivas: a contagem de cada filtro ignora o próprio filtro.
 */
(function (root) {
  "use strict";

  const fold = (s) =>
    String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const tokenize = (s) => fold(s).split(/[^a-z0-9]+/).filter(Boolean);

  // Palavras comuns que não ajudam a achar nada (lista do analisador "portuguese", sem acentos)
  const STOP = new Set((
    "de a o que e do da em um para com nao uma os no se na por mais as dos como mas ao ele das seu sua ou " +
    "quando muito nos ja eu tambem so pelo pela ate isso ela entre depois sem mesmo aos seus quem nas me " +
    "esse eles voce essa num nem suas meu as minha numa pelos elas qual nos lhe deles essas esses pelas " +
    "este dele tu te voces vos lhes meus minhas teu tua teus tuas nosso nossa nossos nossas dela delas " +
    "esta estes estas aquele aquela aqueles aquelas isto aquilo"
  ).split(" "));

  // Radical simples: tira plural e vogal final ("chamas" e "chama" -> "cham")
  function stem(t) {
    if (t.length < 4) return t;
    if (/(oes|aes)$/.test(t)) t = t.slice(0, -3) + "ao";
    else if (/ais$/.test(t)) t = t.slice(0, -3) + "al";
    else if (/eis$/.test(t)) t = t.slice(0, -3) + "el";
    else if (t.endsWith("s") && t.length > 3) t = t.slice(0, -1);
    if (t.length >= 5 && /[aeo]$/.test(t)) t = t.slice(0, -1);
    return t;
  }

  // Distância de edição (inclui troca de letras vizinhas) com limite
  function within(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return false;
    const n = a.length, m = b.length;
    let prev2 = null;
    let prev = Array.from({ length: m + 1 }, (_, j) => j);
    for (let i = 1; i <= n; i++) {
      const cur = [i];
      let rowMin = i;
      for (let j = 1; j <= m; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          v = Math.min(v, prev2[j - 2] + 1);
        }
        cur[j] = v;
        if (v < rowMin) rowMin = v;
      }
      if (rowMin > max) return false;
      prev2 = prev; prev = cur;
    }
    return prev[m] <= max;
  }

  // 0 a 4 letras: exato; 5 a 8: 1 erro; 9 ou mais: 2 erros (como o fuzziness AUTO:5,9)
  const maxEdits = (len) => (len < 5 ? 0 : len < 9 ? 1 : 2);

  function createIndex(docs) {
    const vocab = new Map(); // radical -> conjunto de posições das magias
    const names = [];        // por magia: nome sem acento e suas palavras
    const add = (stemmed, i) => {
      let set = vocab.get(stemmed);
      if (!set) vocab.set(stemmed, (set = new Set()));
      set.add(i);
    };
    docs.forEach((d, i) => {
      const nameTokens = tokenize(d.name);
      names.push({ raw: fold(d.name).trim(), tokens: nameTokens });
      [d.name, d.description, d.higher_level, d.labels_pt].forEach((field) => {
        tokenize(field).forEach((t) => { if (!STOP.has(t)) add(stem(t), i); });
      });
    });
    return { docs, vocab, names, cache: new Map() };
  }

  function textMatches(index, q) {
    const text = (q || "").trim();
    if (!text) return null; // sem busca: todas as magias
    if (index.cache.has(text)) return index.cache.get(text);

    const out = new Set();
    const folded = fold(text).trim();
    const raw = tokenize(text);

    // 1) nome igual ao digitado
    index.names.forEach((n, i) => { if (n.raw === folded) out.add(i); });

    // 2) nome começando com o digitado (todas as palavras digitadas, mínimo 2 letras cada)
    if (raw.length && raw.every((t) => t.length >= 2 && t.length <= 15)) {
      index.names.forEach((n, i) => {
        if (raw.every((t) => n.tokens.some((w) => w.startsWith(t)))) out.add(i);
      });
    }

    // 3) alguma palavra parecida em qualquer campo de texto
    let terms = raw.filter((t) => !STOP.has(t));
    if (!terms.length) terms = raw;
    terms.forEach((t) => {
      const s = stem(t);
      const max = maxEdits(s.length);
      const exact = index.vocab.get(s);
      if (exact) exact.forEach((i) => out.add(i));
      if (max === 0) return;
      index.vocab.forEach((set, v) => {
        if (v === s || v[0] !== s[0]) return;
        if (within(s, v, max)) set.forEach((i) => out.add(i));
      });
    });

    index.cache.set(text, out);
    return out;
  }

  const passes = (d, p, skip) =>
    (skip === "levels" || !p.levels.length || p.levels.includes(d.level)) &&
    (skip === "schools" || !p.schools.length || p.schools.includes(d.school)) &&
    (skip === "classes" || !p.classes.length || d.classes.some((c) => p.classes.includes(c))) &&
    (skip === "components" || !p.components.length || p.components.every((c) => (d.components || []).includes(c))) &&
    (!p.concentration || d.concentration) &&
    (!p.ritual || d.ritual);

  function search(index, params) {
    const p = Object.assign(
      { q: "", levels: [], schools: [], classes: [], components: [], concentration: false,
        ritual: false, sort: "level", limit: 48, offset: 0 },
      params
    );
    p.levels = [...p.levels].map(Number);
    const matched = textMatches(index, p.q);
    const base = [];
    index.docs.forEach((d, i) => { if (!matched || matched.has(i)) base.push(d); });

    const hits = base.filter((d) => passes(d, p, null));

    const count = (facet, keysOf) => {
      const c = {};
      base.forEach((d) => {
        if (!passes(d, p, facet)) return;
        keysOf(d).forEach((k) => { c[k] = (c[k] || 0) + 1; });
      });
      return c;
    };
    const facets = {
      levels: count("levels", (d) => [String(d.level)]),
      schools: count("schools", (d) => [d.school]),
      classes: count("classes", (d) => d.classes),
      components: count("components", (d) => d.components || []),
    };

    const key = (d) => fold(d.name);
    const byName = (a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);
    hits.sort(p.sort === "name" ? byName : (a, b) => a.level - b.level || byName(a, b));

    return {
      total: hits.length,
      total_all: index.docs.length,
      hits: hits.slice(p.offset, p.offset + p.limit),
      facets,
    };
  }

  const api = { createIndex, search, fold, stem };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GrimorioSearch = api;
})(typeof window !== "undefined" ? window : globalThis);
