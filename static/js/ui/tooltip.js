/* Balão de dica dos botões (Filtragem reversa / Limpar filtros): texto vem de data-tip. */
import { el } from "../dom.js";

const tip = el.tip;
let tipTimer = null;

function showTip(t) {
  clearTimeout(tipTimer);
  tip.textContent = t.dataset.tip; tip.hidden = false;
  const r = t.getBoundingClientRect(), m = 8, w = tip.offsetWidth, h = tip.offsetHeight;
  const left = Math.max(m, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - m));
  let top = r.bottom + 8;
  if (top + h > innerHeight - m) top = r.top - h - 8;
  tip.style.left = `${left}px`; tip.style.top = `${top}px`;
}

function hideTip() { clearTimeout(tipTimer); tip.hidden = true; }

export function initTooltips() {
  document.addEventListener("pointerover", (e) => {
    const t = e.target.closest("[data-tip]");
    if (t && e.pointerType === "mouse") showTip(t);
  });
  document.addEventListener("pointerout", (e) => {
    const t = e.target.closest("[data-tip]");
    if (t && !(e.relatedTarget && t.contains(e.relatedTarget))) hideTip();
  });
  document.addEventListener("pointerdown", (e) => {  // toque: mostra por um instante
    const t = e.target.closest("[data-tip]");
    if (t && e.pointerType !== "mouse") { showTip(t); tipTimer = setTimeout(hideTip, 1400); }
  });
  document.addEventListener("focusin", (e) => {
    const t = e.target.closest("[data-tip]");
    if (t && e.target.matches(":focus-visible")) showTip(t);
  });
  document.addEventListener("focusout", hideTip);
  window.addEventListener("scroll", hideTip, { passive: true });
  window.addEventListener("resize", hideTip);
}
