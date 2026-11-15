/* Balão de ajuda (o ícone do olho): abre ao passar o mouse; clique/toque/teclado deixa fixo. */
import { INFO } from "../info-texts.js";
import { el } from "../dom.js";

const pop = el.infoPop;
let popBtn = null, popPinned = false, popTimer = null;

function placePop() {
  if (!popBtn) return;
  const r = popBtn.getBoundingClientRect(), m = 8, g = 6;
  pop.style.maxHeight = "";                              // mede o tamanho natural
  const w = pop.offsetWidth, h = pop.offsetHeight;
  const clampX = (x) => Math.max(m, Math.min(x, innerWidth - w - m));
  const clampY = (y) => Math.max(m, Math.min(y, innerHeight - h - m));
  const alignX = clampX(r.left + w > innerWidth - m ? r.right - w : r.left);   // alinha à esquerda do ícone ou, se não couber, à direita
  const below = innerHeight - m - (r.bottom + g), above = r.top - g - m;

  let left, top;
  if (h <= below) { left = alignX; top = r.bottom + g; }
  else if (h <= above) { left = alignX; top = r.top - g - h; }
  else if (r.left - g - w >= m) { left = r.left - g - w; top = clampY(r.top + r.height / 2 - h / 2); }                 // ao lado esquerdo
  else if (r.right + g + w <= innerWidth - m) { left = r.right + g; top = clampY(r.top + r.height / 2 - h / 2); }     // ao lado direito
  else {                                                 // sem espaço: usa o lado maior e deixa o balão rolável
    left = alignX;
    if (below >= above) { top = r.bottom + g; pop.style.maxHeight = `${below}px`; }
    else { pop.style.maxHeight = `${above}px`; top = r.top - g - Math.min(h, above); }
  }
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
