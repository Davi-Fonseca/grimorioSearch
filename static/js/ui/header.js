/* Cabeçalho: ao rolar, a parte de cima (logo) sai da tela e fica só a barra de busca.
   As alturas vêm do CSS (--head-h e --bar-h); aqui só marcamos quando a barra já está fixa. */
import { el } from "../dom.js";

let tick = false;

function updateStuck() {
  tick = false;
  const stuckTop = parseFloat(getComputedStyle(el.header).top) || 0;   // negativo: quanto do cabeçalho sobe
  el.header.classList.toggle("stuck", el.header.getBoundingClientRect().top <= stuckTop + 1);
}

export function initHeader() {
  window.addEventListener("scroll", () => {
    if (!tick) { tick = true; requestAnimationFrame(updateStuck); }
  }, { passive: true });
  window.addEventListener("resize", updateStuck);
  updateStuck();
}
