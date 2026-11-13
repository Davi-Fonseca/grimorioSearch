/* Facetas: quantas magias cada opção de filtro teria. A contagem de cada filtro ignora o próprio filtro
   (por isso dá para ver quantas magias você ganharia ao marcar mais uma opção). */
import { passes } from "./filters.js";

export function facetCounts(base, params) {
  const count = (facet, keysOf) => {
    const c = {};
    base.forEach((d) => {
      if (!passes(d, params, facet)) return;
      keysOf(d).forEach((k) => { c[k] = (c[k] || 0) + 1; });
    });
    return c;
  };
  return {
    levels: count("levels", (d) => [String(d.level)]),
    schools: count("schools", (d) => [d.school]),
    classes: count("classes", (d) => d.classes),
    components: count("components", (d) => d.components || []),
  };
}
