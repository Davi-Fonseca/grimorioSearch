/* Controles dos filtros: monta as opções, reflete o estado marcado, os chips de filtros ativos e as contagens. */
import { SCHOOLS, CLASSES, COMPONENTS } from "../config.js";
import { esc, byPt, levelLabel } from "../format.js";
import { state, activeCount } from "../state.js";
import { el, $ } from "../dom.js";

const option = (attr, key, label, color) =>
  `<label class="opt" data-${attr}="${key}"><input class="sr" type="checkbox" value="${key}">
       <span class="losango box"${color ? ` style="--c:${color}"` : ""}></span>
       <span class="name">${label}</span><span class="count"></span></label>`;

export function buildFacets() {
  el.levels.innerHTML = Array.from({ length: 10 }, (_, l) =>
    `<button type="button" class="circ" data-level="${l}" aria-pressed="false" aria-label="${levelLabel(l)}">${l === 0 ? "T" : l}</button>`
  ).join("");
  el.schools.innerHTML = byPt(SCHOOLS).map((k) => option("school", k, SCHOOLS[k].pt, SCHOOLS[k].color)).join("");
  el.classes.innerHTML = byPt(CLASSES).map((k) => option("class", k, CLASSES[k])).join("");
}

export function buildComponents() {
  el.components.innerHTML = Object.keys(COMPONENTS).map((k) => option("component", k, COMPONENTS[k])).join("");
}

function chipHtml(kind, value, label, neg = false) {
  const text = neg ? `Sem ${label}` : label;
  return `<button type="button" class="chip${neg ? " neg" : ""}" data-kind="${kind}" data-value="${esc(value)}" aria-label="Remover filtro: ${esc(text)}">${esc(text)} <span aria-hidden="true">×</span></button>`;
}

// marca/desmarca as opções de um grupo conforme o estado
function syncOptions(container, attr, selected) {
  container.querySelectorAll(".opt").forEach((o) => {
    const on = selected.has(o.dataset[attr]);
    o.querySelector("input").checked = on; o.classList.toggle("on", on);
  });
}

export function renderControls() {
  el.levels.querySelectorAll(".circ").forEach((b) =>
    b.setAttribute("aria-pressed", state.levels.has(Number(b.dataset.level))));
  syncOptions(el.schools, "school", state.schools);
  syncOptions(el.classes, "class", state.classes);
  syncOptions(el.components, "component", state.components);
  el.conc.checked = state.concentration;
  el.ritual.checked = state.ritual;
  el.optConc.classList.toggle("on", state.concentration);
  el.optRitual.classList.toggle("on", state.ritual);

  const has = { levels: state.levels.size, schools: state.schools.size, classes: state.classes.size,
    components: state.components.size, features: (state.concentration ? 1 : 0) + (state.ritual ? 1 : 0) };
  document.querySelectorAll(".fs[data-filter]").forEach((fs) => {
    const k = fs.dataset.filter;
    fs.classList.toggle("neg", state.neg[k]);
    fs.querySelector('[data-action="neg"]').setAttribute("aria-pressed", state.neg[k]);
    fs.querySelector('[data-action="clear"]').classList.toggle("idle", !has[k] && !state.neg[k]);
  });

  const chips = [];
  [...state.levels].sort((a, b) => a - b).forEach((l) => chips.push(chipHtml("levels", l, levelLabel(l), state.neg.levels)));
  [...state.schools].forEach((k) => chips.push(chipHtml("schools", k, SCHOOLS[k].pt, state.neg.schools)));
  [...state.classes].forEach((k) => chips.push(chipHtml("classes", k, CLASSES[k], state.neg.classes)));
  [...state.components].forEach((k) => chips.push(chipHtml("components", k, COMPONENTS[k], state.neg.components)));
  if (state.concentration) chips.push(chipHtml("concentration", "", "Concentração", state.neg.features));
  if (state.ritual) chips.push(chipHtml("ritual", "", "Ritual", state.neg.features));
  el.chips.innerHTML = chips.join("");

  const act = activeCount();
  el.toggle.textContent = act ? `Filtros (${act})` : "Filtros";
}

// contagens de cada opção (vêm do motor de busca, já ignorando o próprio filtro)
function syncCounts(container, attr, counts) {
  container.querySelectorAll(".opt").forEach((o) => {
    const n = counts[o.dataset[attr]] || 0;
    o.classList.toggle("empty", !n);
    o.querySelector(".count").textContent = n;
  });
}

export function renderFacetCounts(f) {
  el.levels.querySelectorAll(".circ").forEach((b) => {
    const n = f.levels[b.dataset.level] || 0;
    b.classList.toggle("empty", !n);
    b.title = `${levelLabel(Number(b.dataset.level))}: ${n}`;
  });
  syncCounts(el.schools, "school", f.schools);
  syncCounts(el.classes, "class", f.classes);
  syncCounts(el.components, "component", f.components || {});
}
