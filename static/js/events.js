/* Ligações entre a página e o estado: cada evento muda o estado e chama changed(). */
import { state, toggle, clearFilters, clearSection, removeFilter } from "./state.js";
import { el } from "./dom.js";
import { changed, runSearch, applyQuery, resetAll } from "./app.js";
import { isSpellsTab } from "./ui/tabs.js";

export function bindEvents() {
  // busca e ordenação
  el.q.addEventListener("input", () => { if (!isSpellsTab()) return; applyQuery(el.q.value); changed(180); });
  el.q.addEventListener("keydown", (e) => { if (e.key === "Escape" && isSpellsTab()) { el.q.value = ""; applyQuery(""); changed(); } });
  el.sort.addEventListener("change", () => { state.sort = el.sort.value; changed(); });

  // filtros
  el.levels.addEventListener("click", (e) => {
    const b = e.target.closest(".circ"); if (!b) return;
    toggle(state.levels, Number(b.dataset.level)); changed();
  });
  el.schools.addEventListener("change", (e) => { toggle(state.schools, e.target.value); changed(); });
  el.classes.addEventListener("change", (e) => { toggle(state.classes, e.target.value); changed(); });
  el.components.addEventListener("change", (e) => { toggle(state.components, e.target.value); changed(); });
  el.conc.addEventListener("change", () => { state.concentration = el.conc.checked; changed(); });
  el.ritual.addEventListener("change", () => { state.ritual = el.ritual.checked; changed(); });
  el.clearSide.addEventListener("click", () => { clearFilters(); changed(); });

  // botões de cada filtro: filtragem reversa e limpar só aquele filtro
  el.filters.addEventListener("click", (e) => {
    const b = e.target.closest(".tool"); if (!b) return;
    const k = b.closest(".fs").dataset.filter;
    if (b.dataset.action === "neg") state.neg[k] = !state.neg[k];
    else clearSection(k);
    changed();
  });

  // chips de filtros ativos
  el.chips.addEventListener("click", (e) => {
    const c = e.target.closest(".chip"); if (!c) return;
    removeFilter(c.dataset.kind, c.dataset.value);
    changed();
  });

  // resultados: estado vazio, tentar de novo e etiquetas de classe dos cards
  el.results.addEventListener("click", (e) => {
    if (e.target.closest("#clear-empty")) return resetAll();
    if (e.target.closest("#retry")) return changed();
    const b = e.target.closest(".cls"); if (!b) return;
    toggle(state.classes, b.dataset.class); changed();
  });

  el.more.addEventListener("click", (e) => { if (e.target.closest("#load-more")) runSearch(true); });

  // painel de filtros no celular
  el.toggle.addEventListener("click", () => {
    const open = el.filters.classList.toggle("open");
    el.toggle.setAttribute("aria-expanded", open);
  });

  // "/" foca a busca
  document.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    if (e.key === "/" && !["input", "select", "textarea"].includes(tag)) { e.preventDefault(); el.q.focus(); }
  });
}
