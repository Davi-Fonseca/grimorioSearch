/* Acesso às magias: baixa o spells.json uma vez, monta o índice e responde às buscas. */
import { createIndex, search } from "./search/engine.js";
import { conditionsIn, damageIn, areaIn } from "./format.js";

let indexPromise = null;

export function loadIndex(url = "spells.json") {
  if (!indexPromise) {
    indexPromise = fetch(url, { cache: "no-cache" })
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((docs) => {   // condições (filtro), área e dano (campos do card) citados na descrição
        docs.forEach((d) => {
          d.conditions = conditionsIn(`${d.description || ""} ${d.higher_level || ""}`);
          d.area = areaIn(d.description || "");       // forma + medida da área de efeito, se tiver
          d.damage = damageIn(d.description || "");   // só a descrição: "Em círculos superiores" fala de aumento, não do dano base
        });
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
