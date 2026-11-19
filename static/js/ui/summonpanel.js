/* Aba Invocações: cards dos blocos de estatísticas e a janela com o bloco completo
   (aberta também pelo card dentro da descrição das magias, em ui/cards.js). */
import { el } from "../dom.js";
import { SUMMONS, SUMMON_BY_ID } from "../summons.js";
import { summonTileHtml, statBlockHtml } from "./sbhtml.js";

const fold = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// o que a busca enxerga: nome, tipo, magia e as formas (aranha, fada...)
const haystack = (s) => fold([ s.name, s.kind, s.spell.name, ...(s.variants?.options || []) ].join(" "));

/* Desenha os cards, filtrando pela busca (vazia mostra todos). */
export function renderSummons(query = "") {
  const q = fold(query);
  const list = q ? SUMMONS.filter((s) => haystack(s).includes(q)) : SUMMONS;
  const n = list.length, total = SUMMONS.length;
  el.sbTotal.innerHTML = q
    ? `${n} <small>de ${total} ${total === 1 ? "invocação" : "invocações"}</small>`
    : `${n} <small>${n === 1 ? "invocação" : "invocações"}</small>`;
  el.sbGrid.innerHTML = n
    ? list.map(summonTileHtml).join("")
    : `<div class="empty-state" style="grid-column:1/-1"><strong>Nenhuma invocação encontrada</strong>Tente outro termo.</div>`;
}

/* Mostra só o que vale para a forma escolhida ("" = tudo): traços, ações e velocidades com data-only. */
function applyForm(root, form) {
  root.querySelectorAll("[data-only]").forEach((n) => { n.hidden = !!form && !n.dataset.only.split("|").includes(form); });
  root.querySelectorAll(".sb-sec").forEach((sec) => { sec.hidden = !sec.querySelector(".sb-feat:not([hidden])"); });
  root.querySelectorAll(".sb-speeds").forEach((box) => {   // sem vírgula depois da última velocidade visível
    const shown = [ ...box.querySelectorAll(".sb-sp:not([hidden])") ];
    box.querySelectorAll(".sb-sp").forEach((n) => n.classList.remove("is-last"));
    shown.at(-1)?.classList.add("is-last");
  });
  root.querySelectorAll(".sb-form").forEach((b) => b.setAttribute("aria-pressed", b.dataset.form === form));
}

/* Abre a janela com o bloco de estatísticas. */
export function openSummon(id) {
  const s = SUMMON_BY_ID[id];
  if (!s || el.sbDialog.open) return;
  el.sbBody.innerHTML = statBlockHtml(s);
  el.sbDialog.showModal();
  el.sbDialog.querySelector(".cond-sheet").scrollTop = 0;
}

export function initSummons() {
  // clique em qualquer card ou botão com data-summon (aba Invocações e descrição das magias) abre o bloco
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-summon]");
    if (!t || getSelection().toString()) return;
    openSummon(t.dataset.summon);
  });

  // botões de forma/tipo dentro da janela
  el.sbBody.addEventListener("click", (e) => {
    const b = e.target.closest(".sb-form"); if (!b) return;
    applyForm(el.sbBody, b.dataset.form);
  });

  el.sbClose.addEventListener("click", () => el.sbDialog.close());
  el.sbDialog.addEventListener("click", (e) => { if (e.target === el.sbDialog) el.sbDialog.close(); });   // clique no fundo escurecido
}
