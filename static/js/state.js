/* Estado da interface: o que está marcado, a busca e a ordenação (puro, sem DOM). */

export const state = {
  q: "", levels: new Set(), schools: new Set(), classes: new Set(), components: new Set(),
  concentration: false, ritual: false, sort: "level",
  neg: { levels: false, schools: false, classes: false, components: false, features: false } // filtragem reversa por filtro
};

export const activeCount = () =>
  state.levels.size + state.schools.size + state.classes.size + state.components.size + (state.concentration ? 1 : 0) + (state.ritual ? 1 : 0);

export const toggle = (set, v) => (set.has(v) ? set.delete(v) : set.add(v));

export const clearFilters = () => {
  state.levels.clear(); state.schools.clear(); state.classes.clear(); state.components.clear();
  state.concentration = false; state.ritual = false;
  Object.keys(state.neg).forEach((k) => { state.neg[k] = false; });
};

// zera um filtro só (marcações e filtragem reversa); "features" = concentração e ritual
export const clearSection = (k) => {
  if (k === "features") { state.concentration = false; state.ritual = false; }
  else state[k].clear();
  state.neg[k] = false;
};

// remove uma marcação (usado pelos chips de filtros ativos)
export function removeFilter(kind, value) {
  if (kind === "levels") state.levels.delete(Number(value));
  else if (kind === "schools") state.schools.delete(value);
  else if (kind === "classes") state.classes.delete(value);
  else if (kind === "components") state.components.delete(value);
  else if (kind === "concentration") state.concentration = false;
  else if (kind === "ritual") state.ritual = false;
}

/* Com texto na busca a lista passa a ser por relevância (nome primeiro); ao limpar a busca, volta à ordenação anterior.
   Se você escolher outra ordenação enquanto busca, ela é mantida. */
let sortBeforeSearch = null;
export function setQuery(value) {
  const had = state.q.trim() !== "", has = value.trim() !== "";
  state.q = value;
  if (!had && has && state.sort !== "relevance") { sortBeforeSearch = state.sort; state.sort = "relevance"; }
  else if (had && !has && state.sort === "relevance") { state.sort = sortBeforeSearch || "level"; sortBeforeSearch = null; }
}

// filtros que estão em modo reverso
export const negatedSections = () => Object.keys(state.neg).filter((k) => state.neg[k]);

// parâmetros para o motor de busca
export const searchParams = ({ limit, offset }) => ({
  q: state.q,
  levels: [...state.levels],
  schools: [...state.schools],
  classes: [...state.classes],
  components: [...state.components],
  concentration: state.concentration,
  ritual: state.ritual,
  exclude: negatedSections(),
  sort: state.sort,
  limit,
  offset
});
