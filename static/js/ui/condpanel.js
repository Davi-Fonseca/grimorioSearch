/* Aba Condições: lista de cards e a janela com a descrição completa. */
import { el } from "../dom.js";
import { CONDITIONS } from "../conditions.js";
import { esc, richText } from "../format.js";

const fold = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/* Desenha os cards, filtrando pelo nome (query vazia mostra todos). */
export function renderConditions(query = "") {
  const q = fold(query);
  const list = q ? CONDITIONS.filter((c) => fold(c.name).includes(q)) : CONDITIONS;
  el.condTotal.innerHTML = q
    ? `${list.length} <small>de ${CONDITIONS.length} condições</small>`
    : `${list.length} <small>condições</small>`;
  el.condGrid.innerHTML = list.length
    ? list.map((c) => `<button type="button" class="cond-card" data-id="${c.id}" aria-haspopup="dialog"><span>${esc(c.name)}</span></button>`).join("")
    : `<div class="empty-state" style="grid-column:1/-1"><strong>Nenhuma condição encontrada</strong>Tente outro termo.</div>`;
}

/* Abre a janela com a descrição completa (usada pelos cards e pelos links nas magias). */
export function openCondition(id) {
  const c = CONDITIONS.find((x) => x.id === id);
  if (!c || el.condDialog.open) return;
  el.condTitle.textContent = c.name;
  el.condBody.innerHTML = richText(c.text);
  el.condDialog.showModal();
}

export function initConditions() {
  el.condGrid.addEventListener("click", (e) => {
    const b = e.target.closest(".cond-card"); if (b) openCondition(b.dataset.id);
  });
  el.condClose.addEventListener("click", () => el.condDialog.close());
  el.condDialog.addEventListener("click", (e) => { if (e.target === el.condDialog) el.condDialog.close(); });   // clique no fundo escurecido
}