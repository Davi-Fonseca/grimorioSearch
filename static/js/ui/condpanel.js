/* Aba Condições: cards (octógono das magias, nome no topo e imagem embaixo, descrição ao expandir)
   e a janela com a descrição completa (usada pelos links das condições nas magias). */
import { el } from "../dom.js";
import { CONDITIONS } from "../conditions.js";
import { esc, richText } from "../format.js";

// imagem provisória; troque por um arquivo em IMAGENS (conditions.js)
const PLACEHOLDER_IMG = `<svg classh="ph" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 2"/><circle cx="9" cy="9" r="1.6"/><path d="M3 17l5-5 4 4 3-3 6 6"/></svg>`;

// SVG colado no código entra como está (herda a cor do tema); qualquer outra coisa é caminho de arquivo
const imageHtml = (img) =>
  !img ? PLACEHOLDER_IMG
  : img.trim().startsWith("<svg") ? img
  : `<img src="${esc(img)}" alt="" loading="lazy">`;

const cardHtml = (c) => `<article class="card cond-full" data-id="${c.id}">
    <h2>${esc(c.name)}</h2>
    <div class="cond-img">${imageHtml(c.image)}</div>
    <details class="more">
      <summary>Descrição completa</summary>
      <div class="cond-text">${richText(c.text)}</div>
    </details>
  </article>`;

const fold = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/* Desenha os cards, filtrando pelo nome (query vazia mostra todos). */
export function renderConditions(query = "") {
  const q = fold(query);
  const list = q ? CONDITIONS.filter((c) => fold(c.name).includes(q)) : CONDITIONS;
  el.condTotal.innerHTML = q
    ? `${list.length} <small>de ${CONDITIONS.length} condições</small>`
    : `${list.length} <small>condições</small>`;
  el.condGrid.innerHTML = list.length
    ? list.map(cardHtml).join("")
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
  // clique no fundo do card (fora do botão de descrição, de links e do texto) abre/fecha a descrição, como nas magias
  el.condGrid.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card || e.target.closest("summary, a, button, .cond-text") || getSelection().toString()) return;
    const d = card.querySelector("details.more"); d.open = !d.open;
  });
  el.condClose.addEventListener("click", () => el.condDialog.close());
  el.condDialog.addEventListener("click", (e) => { if (e.target === el.condDialog) el.condDialog.close(); });   // clique no fundo escurecido
}