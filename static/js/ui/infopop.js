/* Balão de ajuda (o ícone do olho): abre ao passar o mouse; clique/toque/teclado deixa fixo. */
import { INFO } from "../info-texts.js";
import { el } from "../dom.js";

const pop = el.infoPop;
let popBtn = null, popPinned = false, popTimer = null;

function placePop() {
  if (!popBtn) return;
  const r = popBtn.getBoundingClientRect(), m = 8;
  const w = pop.offsetWidth, h = pop.offsetHeight;
  let left = r.left;                                   // alinha à esquerda do ícone…
  if (left + w > innerWidth - m) left = r.right - w;   // …ou à direita, se não couber
  left = Math.max(m, Math.min(left, innerWidth - w - m));
  let top = r.bottom + 6;
  if (top + h > innerHeight - m) top = Math.max(m, r.top - h - 6);
  pop.style.left = `${left}px`; pop.style.top = `${top}px`;
}

function showPop(btn) {
  clearTimeout(popTimer);
  if (popBtn && popBtn !== btn) popBtn.setAttribute("aria-expanded", "false");
  const info = INFO[btn.dataset.info];
  pop.innerHTML = `<h3>${info.title}</h3>${info.html}`;
  popBtn = btn; pop.hidden = false;
  btn.setAttribute("aria-expanded", "true");
  btn.setAttribute("aria-describedby", "info-pop");
  placePop();
}

export function hidePop() {
  clearTimeout(popTimer);
  if (popBtn) popBtn.setAttribute("aria-expanded", "false");
  popBtn = null; popPinned = false; pop.hidden = true;
}

const hidePopSoon = () => { if (!popPinned) popTimer = setTimeout(hidePop, 150); };

export function initInfoPopover() {
  document.addEventListener("pointerover", (e) => {
    const b = e.target.closest(".info");
    if (b && e.pointerType === "mouse" && !popPinned) showPop(b);
  });
  document.addEventListener("pointerout", (e) => {
    if (e.target.closest(".info") && e.pointerType === "mouse") hidePopSoon();
  });
  pop.addEventListener("pointerenter", () => clearTimeout(popTimer));
  pop.addEventListener("pointerleave", hidePopSoon);
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".info");
    if (b) {
      if (popPinned && popBtn === b) return hidePop();
      showPop(b); popPinned = true; return;
    }
    if (popBtn && !e.target.closest("#info-pop")) hidePop();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && popBtn) { popBtn.focus(); hidePop(); } });
  window.addEventListener("scroll", placePop, { passive: true });
  window.addEventListener("resize", placePop);
}
