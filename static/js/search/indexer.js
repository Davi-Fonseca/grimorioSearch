/* Índice: guarda, para cada campo (nome, rótulos, texto), quais magias têm cada radical. */
import { fold, tokenize, STOP, stem } from "./text.js";

export function createIndex(docs) {
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
