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
 *
 * Arquivos: text.js (palavras) · indexer.js (índice) · ranking.js (relevância) · filters.js (filtros)
 *           facets.js (contagens) · ordering.js (ordenações) · engine.js (junta tudo)
 */
import { createIndex } from "./indexer.js";
import { rank } from "./ranking.js";
import { passes } from "./filters.js";
import { facetCounts } from "./facets.js";
import { buildOrders } from "./ordering.js";

export { createIndex };
export { fold, stem } from "./text.js";

const DEFAULTS = {
  q: "", levels: [], schools: [], classes: [], components: [], concentration: false,
  ritual: false, exclude: [], sort: "level", limit: 48, offset: 0,
};

export function search(index, params) {
  const p = Object.assign({}, DEFAULTS, params);
  p.levels = [...p.levels].map(Number);

  const ranked = rank(index, p.q);
  const base = index.docs.filter((d, i) => !ranked || ranked.ids.has(i));
  const hits = base.filter((d) => passes(d, p, null));

  const orders = buildOrders(index, ranked);
  hits.sort(orders[p.sort] || orders.level);

  return {
    total: hits.length,
    total_all: index.docs.length,
    hits: hits.slice(p.offset, p.offset + p.limit),
    facets: facetCounts(base, p),
  };
}
