/* Alturas por linha: numa linha com algum card aberto, nenhum card é esticado
   até a altura do maior. Cada um fica com a própria altura (o maior continua
   empurrando a linha seguinte) e os recolhidos mantêm todos a mesma altura. */
import { el } from "../dom.js";

const isOpen = (c) => c.querySelector("details.more").open;

export function syncRows() {
  const cards = [...el.results.querySelectorAll(".card")];
  cards.forEach((c) => { c.style.height = ""; c.style.alignSelf = ""; });
  const cols = getComputedStyle(el.results).gridTemplateColumns.split(" ").length || 1;
  for (let i = 0; i < cards.length; i += cols) {
    const row = cards.slice(i, i + cols);
    if (!row.some(isOpen)) continue;
    row.forEach((c) => { c.style.alignSelf = "start"; });
    const closed = row.filter((c) => !isOpen(c));
    const h = Math.max(0, ...closed.map((c) => c.offsetHeight));
    closed.forEach((c) => { c.style.height = `${h}px`; });
  }
}

export function initRows() {
  /* MutationObserver roda antes da pintura, então não há "pulo" visual */
  new MutationObserver(syncRows).observe(el.results, {
    subtree: true, attributes: true, attributeFilter: ["open"]
  });
  window.addEventListener("resize", syncRows);
}
