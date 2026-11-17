/* Marcador de página (língua de livro): recolhe/mostra a barra de filtros para dar mais espaço aos cards. */
import { el } from "../dom.js";
import { syncRows } from "./rows.js";

export function initFoldTab() {
  const btn = el.foldTab;

  btn.addEventListener("click", () => {
    const off = el.viewSpells.classList.toggle("filters-off");
    const label = off ? "Mostrar filtros" : "Recolher filtros";
    btn.setAttribute("aria-expanded", String(!off));
    btn.setAttribute("aria-label", label);
    btn.dataset.tip = label;
    if (!el.tip.hidden) el.tip.textContent = label;   // o balão de dica já está na tela: atualiza o texto

    syncRows();   // mudou o número de colunas dos cards: refaz as alturas das linhas com card aberto
  });
}
