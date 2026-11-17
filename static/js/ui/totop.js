/* Botão de voltar ao topo: aparece depois de rolar um pouco e leva de volta ao início da página. */
import { el } from "../dom.js";

const SHOW_AFTER = 500;   // px rolados até o botão aparecer

export function initToTop() {
  let tick = false;
  const update = () => { tick = false; el.toTop.classList.toggle("show", window.scrollY >= SHOW_AFTER); };

  window.addEventListener("scroll", () => {
    if (!tick) { tick = true; requestAnimationFrame(update); }
  }, { passive: true });

  el.toTop.addEventListener("click", () => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;   // sem animação para quem prefere menos movimento
    window.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
  });

  update();
}
