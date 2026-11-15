/* Acesso às magias: baixa o spells.json uma vez, monta o índice e responde às buscas. */
import { createIndex, search } from "./search/engine.js";
import { conditionsIn } from "./format.js";

let indexPromise = null;

export function loadIndex(url = "spells.json") {
  if (!indexPromise) {
    indexPromise = fetch(url, { cache: "no-cache" })
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((docs) => {   // condições citadas na descrição (usadas pelo filtro de condições)
        docs.forEach((d) => { d.conditions = conditionsIn(`${d.description || ""} ${d.higher_level || ""}`); });
        return docs;
      })
      .then(createIndex)
      .catch((err) => { indexPromise = null; throw err; });   // permite "Tentar de novo"
  }
  return indexPromise;
}

export async function querySpells(params) {
  return search(await loadIndex(), params);
}
