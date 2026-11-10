/* Busca de magias no navegador (substitui a API FastAPI + Elasticsearch).
 *
 * Quem entra na lista:
 *   - magias com alguma palavra parecida (tolera erros de digitação e plural) no nome, nos rótulos
 *     (escola, classe, círculo…) ou na descrição; nomes que começam com o que foi digitado ("fir" -> "Fireball");
 *   - se a busca tem 2 ou mais palavras e existem magias com TODAS elas, só essas entram
 *     ("raio nauseante" não traz mais todas as magias com "raio").
 *
 * Como são ordenadas (ordenação "relevance"): o NOME pesa muito mais que rótulos, que pesam mais que a descrição.
 *   nome igual ao digitado > nome começando com ele > todas as palavras no nome > cada palavra no nome
 *   > rótulos > descrição. Empates seguem círculo e nome.
 *
 * Filtros: círculo/escola/classe (qualquer um dos marcados), componentes (todos os marcados), concentração
 * e ritual; cada filtro pode virar "reverso" (p.exclude): o que está marcado some.
 * Facetas disjuntivas: a contagem de cada filtro ignora o próprio filtro.
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

  // Pontos por palavra digitada, conforme onde ela aparece (o nome vale muito mais que a descrição)
  const W = { nameExact: 100, namePrefix: 85, nameFuzzy: 55, labelExact: 25, labelFuzzy: 15, textExact: 10, textFuzzy: 5 };

  function createIndex(docs) {
    const vName = new Map(), vLabel = new Map(), vText = new Map(); // radical -> posições das magias
    const names = [];                                               // por magia: nome sem acento e palavras
    const add = (map, stemmed, i) => {
      let set = map.get(stemmed);
      if (!set) map.set(stemmed, (set = new Set()));
      set.add(i);
    };
    const feed = (map, field, i) => tokenize(field).forEach((t) => { if (!STOP.has(t)) add(map, stem(t), i); });
    docs.forEach((d, i) => {
      names.push({ raw: fold(d.name).trim(), tokens: tokenize(d.name) });
      feed(vName, d.name, i);
      feed(vLabel, d.labels_pt, i);
      feed(vText, d.description, i);
      feed(vText, d.higher_level, i);
    });
    return { docs, pos: new Map(docs.map((d, i) => [d, i])), vName, vLabel, vText, names, cache: new Map() };
  }

  // Magias que casam com UMA palavra digitada -> pontos (o melhor lugar onde a palavra aparece)
  function matchTerm(index, t) {
    const s = stem(t), max = maxEdits(s.length), out = new Map();
    const put = (docs, w) => docs.forEach((i) => { if ((out.get(i) || 0) < w) out.set(i, w); });
    const scan = (vocab, exactW, fuzzyW) => {
      const exact = vocab.get(s);
      if (exact) put(exact, exactW);
      if (!max) return;
      vocab.forEach((set, v) => { if (v !== s && v[0] === s[0] && within(s, v, max)) put(set, fuzzyW); });
    };
    scan(index.vName, W.nameExact, W.nameFuzzy);
    if (t.length >= 3) {  // começo de palavra do nome: "nausea" -> "Nauseante"
      index.names.forEach((n, i) => { if (n.tokens.some((w) => w.length > t.length && w.startsWith(t))) put([i], W.namePrefix); });
    }
    scan(index.vLabel, W.labelExact, W.labelFuzzy);
    scan(index.vText, W.textExact, W.textFuzzy);
    return out;
  }

  // Devolve { ids: magias que entram, score: pontos de cada uma } (ou null, sem busca)
  function rank(index, q) {
    const text = (q || "").trim();
    if (!text) return null;
    if (index.cache.has(text)) return index.cache.get(text);

    const folded = fold(text).trim();
    const raw = tokenize(text);
    let terms = raw.filter((t) => !STOP.has(t));
    if (!terms.length) terms = raw;

    const score = new Map(), found = new Map(), inName = new Map();
    terms.map((t) => matchTerm(index, t)).forEach((m) => m.forEach((w, i) => {
      score.set(i, (score.get(i) || 0) + w);
      found.set(i, (found.get(i) || 0) + 1);
      if (w >= W.nameFuzzy) inName.set(i, (inName.get(i) || 0) + 1);
    }));

    const strong = new Set();   // nomes iguais ao digitado ou que começam com as palavras digitadas
    const prefixable = raw.length > 0 && raw.every((t) => t.length >= 2 && t.length <= 15);
    index.names.forEach((n, i) => {
      let bonus = 0;
      if (n.raw === folded) { bonus += 2000; strong.add(i); }
      else if (n.raw.startsWith(folded)) bonus += 200;
      if (prefixable && raw.every((t) => n.tokens.some((w) => w.startsWith(t)))) { bonus += 150; strong.add(i); }
      if (raw.length > 1 && (" " + n.raw + " ").includes(" " + folded + " ")) bonus += 300;   // a frase inteira no nome
      if (inName.get(i) === terms.length) bonus += 300;                                       // todas as palavras no nome
      if (terms.some((t) => n.tokens[0] && n.tokens[0].startsWith(t))) bonus += 40;           // nome começa com a palavra
      if (bonus) score.set(i, (score.get(i) || 0) + bonus);
    });

    // várias palavras: se há magias com TODAS elas, só essas entram
    let ids;
    const all = terms.length > 1 ? [...found].filter(([, n]) => n === terms.length).map(([i]) => i) : [];
    ids = all.length ? new Set([...all, ...strong]) : new Set(score.keys());
    ids.forEach((i) => score.set(i, score.get(i) - 2 * index.names[i].tokens.length));        // nomes curtos primeiro

    const result = { ids, score };
    index.cache.set(text, result);
    return result;
  }

  // Filtragem reversa (p.exclude): no filtro marcado como reverso, o que foi selecionado NÃO aparece.
  // Círculo, escola e classe: some quem tiver qualquer um dos marcados.
  // Componentes: some quem exigir qualquer um dos marcados.
  // Características: some quem tiver concentração/ritual (conforme o que estiver marcado).
  const passes = (d, p, skip) => {
    const neg = (k) => p.exclude.includes(k);
    const comps = d.components || [];
    return (
      (skip === "levels" || !p.levels.length || p.levels.includes(d.level) !== neg("levels")) &&
      (skip === "schools" || !p.schools.length || p.schools.includes(d.school) !== neg("schools")) &&
      (skip === "classes" || !p.classes.length || d.classes.some((c) => p.classes.includes(c)) !== neg("classes")) &&
      (skip === "components" || !p.components.length ||
        (neg("components") ? !p.components.some((c) => comps.includes(c)) : p.components.every((c) => comps.includes(c)))) &&
      (!p.concentration || Boolean(d.concentration) !== neg("features")) &&
      (!p.ritual || Boolean(d.ritual) !== neg("features"))
    );
  };

  function search(index, params) {
    const p = Object.assign(
      { q: "", levels: [], schools: [], classes: [], components: [], concentration: false,
        ritual: false, exclude: [], sort: "level", limit: 48, offset: 0 },
      params
    );
    p.levels = [...p.levels].map(Number);
    const ranked = rank(index, p.q);
    const base = [];
    index.docs.forEach((d, i) => { if (!ranked || ranked.ids.has(i)) base.push(d); });

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
    const orders = {
      level: (a, b) => a.level - b.level || byName(a, b),       // círculo crescente
      level_desc: (a, b) => b.level - a.level || byName(a, b),  // círculo decrescente
      name: byName,                                             // A–Z
      name_desc: (a, b) => byName(b, a),                        // Z–A
    };
    // relevância: mais pontos primeiro; empate (e busca vazia) segue círculo e nome
    orders.relevance = (a, b) =>
      (ranked ? ranked.score.get(index.pos.get(b)) - ranked.score.get(index.pos.get(a)) : 0) || orders.level(a, b);
    hits.sort(orders[p.sort] || orders.level);

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
