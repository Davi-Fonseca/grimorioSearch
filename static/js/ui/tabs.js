/* Abas do cabeçalho (Magias / Condições / Invocações): troca de painel e de busca. */
import { el } from "../dom.js";
import { renderConditions } from "./condpanel.js";
import { renderSummons } from "./summonpanel.js";

const TABS = {
  spells:     { text: "Nome ou efeito (ex.: fogo, cura)",          label: "Buscar magias",     view: el.viewSpells },
  conditions: { text: "Nome da condição",                          label: "Buscar condições",  view: el.viewConditions, render: renderConditions },
  summons:    { text: "Nome da criatura ou da magia (ex.: dragão)", label: "Buscar invocações", view: el.viewSummons,   render: renderSummons }
};

let tab = "spells";
const queries = { spells: "", conditions: "", summons: "" };   // o texto da busca de cada aba é guardado ao trocar

export const isSpellsTab = () => tab === "spells";

export function setTab(next) {
  if (next === tab || !TABS[next]) return;
  queries[tab] = el.q.value;
  tab = next;

  el.tabs.forEach((b) => {
    const on = b.dataset.tab === tab;
    b.classList.toggle("on", on);
    b.setAttribute("aria-selected", on);
    b.tabIndex = on ? 0 : -1;
  });
  Object.entries(TABS).forEach(([ name, t ]) => { t.view.hidden = name !== tab; });
  el.toggle.hidden = !isSpellsTab();   // o botão "Filtros" só existe nas magias

  const t = TABS[tab];
  el.q.placeholder = t.text;
  el.q.setAttribute("aria-label", t.label);
  el.q.value = queries[tab];
  t.render?.(queries[tab]);
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

  // busca das condições e das invocações (a das magias fica em events.js)
  el.q.addEventListener("input", () => { if (!isSpellsTab()) { queries[tab] = el.q.value; TABS[tab].render(el.q.value); } });
  el.q.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !isSpellsTab()) { el.q.value = queries[tab] = ""; TABS[tab].render(""); }
  });
}
