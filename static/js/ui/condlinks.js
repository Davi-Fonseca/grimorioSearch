/* Condições citadas na descrição das magias ("condição Enfeitiçado"): o mouse mostra uma prévia,
   o clique/toque/Enter abre a mesma janela de descrição da aba Condições. */
import { el } from "../dom.js";
import { CONDITIONS } from "../conditions.js";
import { openCondition } from "./condpanel.js"; 
import { inlineText } from "../format.js";

const pop = el.condPop;
let current = null;

function place(btn) {
  const r = btn.getBoundingClientRect(), m = 8;
  const w = pop.offsetWidth, h = pop.offsetHeight;
  const left = Math.max(m, Math.min(r.left, innerWidth - w - m));
  let top = r.bottom + 6;
  if (top + h > innerHeight - m) top = Math.max(m, r.top - h - 6);
  pop.style.left = `${left}px`; pop.style.top = `${top}px`;
}

function show(btn) {
  const c = CONDITIONS.find((x) => x.id === btn.dataset.cond);
  if (!c) return;
  current = btn;
  pop.replaceChildren();
  const h = document.createElement("h3"); h.textContent = c.name;
  const p = document.createElement("p"); p.className = "preview"; p.innerHTML = inlineText(c.text.split("\n")[0]);
  const hint = document.createElement("p"); hint.className = "hint"; hint.textContent = "Clique para ler a descrição completa.";
  pop.append(h, p, hint);
  pop.hidden = false;
  place(btn);
}

function hide() { current = null; pop.hidden = true; }

export function initCondLinks() {
  const link = (e) => e.target.closest(".cond-link");

  document.addEventListener("pointerover", (e) => { const b = link(e); if (b && e.pointerType === "mouse") show(b); });
  document.addEventListener("pointerout", (e) => { if (link(e) && e.pointerType === "mouse") hide(); });
  document.addEventListener("focusin", (e) => { const b = link(e); if (b && b.matches(":focus-visible")) show(b); });
  document.addEventListener("focusout", (e) => { if (link(e)) hide(); });
  document.addEventListener("click", (e) => {
    const b = link(e); if (!b) return;
    hide();
    openCondition(b.dataset.cond);
  });
  window.addEventListener("scroll", () => { if (current) hide(); }, { passive: true });
  window.addEventListener("resize", hide);
}
