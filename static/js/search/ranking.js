/* Relevância: quem entra na lista para um texto digitado e quantos pontos cada magia ganha.
   O nome vale muito mais que os rótulos (escola, classe), que valem mais que a descrição. */
import { fold, tokenize, STOP, stem, within, maxEdits } from "./text.js";

// Pontos por palavra digitada, conforme onde ela aparece (o nome vale muito mais que a descrição)
export const W = { nameExact: 100, namePrefix: 85, nameFuzzy: 55, labelExact: 25, labelFuzzy: 15, textExact: 10, textFuzzy: 5 };

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
export function rank(index, q) {
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
