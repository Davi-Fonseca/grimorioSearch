/* Acesso às magias: baixa o spells.json uma vez, monta o índice e responde às buscas. */
import { createIndex, search } from "./search/engine.js";

let indexPromise = null;

export function loadIndex(url = "spells.json") {
  if (!indexPromise) {
    indexPromise = fetch(url, { cache: "no-cache" })
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then(createIndex)
      .catch((err) => { indexPromise = null; throw err; });   // permite "Tentar de novo"
  }
  return indexPromise;
}

export async function querySpells(params) {
  return search(await loadIndex(), params);
}
