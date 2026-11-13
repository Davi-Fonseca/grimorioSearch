/* Abas do cabeçalho (Magias / Condições): troca de painel e de busca. */
import { el } from "../dom.js";
import { renderConditions } from "./condpanel.js";

const PLACEHOLDERS = {
  spells: { text: "Nome ou efeito (ex.: fogo, cura)", label: "Buscar magias" },
  conditions: { text: "Nome da condição", label: "Buscar condições" }
};

let tab = "spells";
let spellQuery = "";   // o texto da busca de cada aba é guardado ao trocar
let condQuery = "";

export const isSpellsTab = () => tab === "spells";

export function setTab(next) {
  if (next === tab) return;
  if (tab === "spells") spellQuery = el.q.value; else condQuery = el.q.value;
  tab = next;

  const spells = tab === "spells";
  el.tabs.forEach((b) => {
    const on = b.dataset.tab === tab;
    b.classList.toggle("on", on);
    b.setAttribute("aria-selected", on);
    b.tabIndex = on ? 0 : -1;
  });
  el.viewSpells.hidden = !spells;
  el.viewConditions.hidden = spells;
  el.toggle.hidden = !spells;   // o botão "Filtros" só existe nas magias

  const ph = PLACEHOLDERS[tab];
  el.q.placeholder = ph.text;
  el.q.setAttribute("aria-label", ph.label);
  el.q.value = spells ? spellQuery : condQuery;
  if (!spells) renderConditions(condQuery);
}

export function initTabs() {
  el.tabs.forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));

  // setas esquerda/direita, Home e End movem entre as abas
  el.tabList.addEventListener("keydown", (e) => {
    const i = el.tabs.indexOf(document.activeElement);
    if (i < 0) return;
    let j = i;
    if (e.key === "ArrowRight") j = (i + 1) % el.tabs.length;
    else if (e.key === "ArrowLeft") j = (i - 1 + el.tabs.length) % el.tabs.length;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = el.tabs.length - 1;
    else return;
    e.preventDefault();
    el.tabs[j].focus();
    setTab(el.tabs[j].dataset.tab);
  });

  // busca das condições (a das magias fica em events.js)
  el.q.addEventListener("input", () => { if (!isSpellsTab()) { condQuery = el.q.value; renderConditions(condQuery); } });
  el.q.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !isSpellsTab()) { el.q.value = condQuery = ""; renderConditions(""); }
  });
}