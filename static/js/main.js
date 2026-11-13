/* Ponto de entrada: monta a página e liga tudo. */
import { state } from "./state.js";
import { el } from "./dom.js";
import { loadIndex } from "./spells.js";
import { runSearch } from "./app.js";
import { bindEvents } from "./events.js";
import { buildFacets, buildComponents, renderControls } from "./ui/controls.js";
import { initHeader } from "./ui/header.js";
import { initTooltips } from "./ui/tooltip.js";
import { initInfoPopover } from "./ui/infopop.js";
import { initRows } from "./ui/rows.js";
import { initTabs } from "./ui/tabs.js";
import { initConditions } from "./ui/condpanel.js"; 
import { initCondLinks } from "./ui/condlinks.js";

loadIndex();   // começa a baixar as magias já, enquanto a página é montada

buildFacets();
buildComponents();
el.sort.value = state.sort;   // o seletor sempre mostra a ordenação em uso

bindEvents();
initHeader();
initTabs();
initConditions(); 
initCondLinks();
initTooltips();
initInfoPopover();
initRows();

renderControls();
runSearch(false);
