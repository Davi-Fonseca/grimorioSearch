/* Orquestração: busca, atualização da tela e ações que mudam o estado. */
import { PAGE } from "./config.js";
import { state, clearFilters, setQuery, searchParams } from "./state.js";
import { el } from "./dom.js";
import { querySpells } from "./spells.js";
import { renderControls } from "./ui/controls.js";
import { renderResults } from "./ui/results.js";

let data = { hits: [], total: 0, totalAll: 0, facets: { levels: {}, schools: {}, classes: {}, components: {} } };
let status = "loading";
let timer = null;

export async function runSearch(append = false) {
  try {
    const json = await querySpells(searchParams({ limit: PAGE, offset: append ? data.hits.length : 0 }));
    data = {
      hits: append ? data.hits.concat(json.hits) : json.hits,
      total: json.total, totalAll: json.total_all, facets: json.facets
    };
    status = "ok";
  } catch (err) {
    status = "error";
  }
  renderResults(data, status);
}

// algo mudou no estado: atualiza os controles agora e refaz a busca (com atraso opcional, para digitação)
export function changed(delay = 0) {
  renderControls();
  clearTimeout(timer);
  timer = setTimeout(() => runSearch(false), delay);
}

// muda o texto da busca; a ordenação pode trocar sozinha (relevância) e o seletor acompanha
export function applyQuery(value) {
  setQuery(value);
  el.sort.value = state.sort;
}

export function resetAll() {
  clearFilters();
  el.q.value = "";
  applyQuery("");
  changed();
}
