/* Ordenações disponíveis. `ranked` (resultado de rank) só é usado pela relevância. */
import { fold } from "./text.js";

export function buildOrders(index, ranked) {
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
  return orders;
}
