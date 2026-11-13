/* Lista de resultados: cards, contagem, "mostrar mais", estados vazio e de erro. */
import { state } from "../state.js";
import { el } from "../dom.js";
import { cardHtml } from "./cards.js";
import { renderControls, renderFacetCounts } from "./controls.js";
import { updateFooter } from "./footer.js";
import { hidePop } from "./infopop.js";

export function renderResults(data, status) {
  renderControls();
  hidePop();

  if (status === "error") {
    el.total.textContent = "";
    el.more.innerHTML = "";
    el.results.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <strong>Não foi possível carregar as magias</strong>
      A busca está indisponível no momento. Verifique sua conexão e tente novamente em instantes.<br><br>
      <button type="button" class="link-btn" id="retry">Tentar de novo</button></div>`;
    return;
  }

  renderFacetCounts(data.facets);
  if (data.hits.length) updateFooter(data.hits[0]);
  const n = data.total;
  el.total.innerHTML = `${n} ${n === 1 ? "magia" : "magias"} <small>de ${data.totalAll}</small>`;

  el.results.innerHTML = data.hits.length
    ? data.hits.map((s) => cardHtml(s, state.classes)).join("")
    : `<div class="empty-state" style="grid-column:1/-1">
         <strong>Nenhuma magia encontrada</strong>
         Tente remover algum filtro ou buscar por outra palavra.<br><br>
         <button type="button" class="link-btn" id="clear-empty">Limpar busca e filtros</button>
       </div>`;

  el.more.innerHTML = data.hits.length < data.total
    ? `<button type="button" class="more-btn" id="load-more">Mostrar mais (${data.total - data.hits.length})</button>`
    : "";
}
