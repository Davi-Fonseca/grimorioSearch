/* Formatação de texto (puro, sem DOM). */

// ordena as chaves de um mapa pelo nome em português
export const byPt = (map) => Object.keys(map).sort((a, b) => {
  const x = map[a].pt || map[a], y = map[b].pt || map[b];
  return x.localeCompare(y, "pt-BR");
});

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const levelLabel = (l) => (l === 0 ? "Truque" : `${l}º círculo`);

/* 1 quadrado = 1,5 m (5 pés). Só para alcances em metros; km, "Toque", "Pessoal" etc. ficam como estão. */
export function rangeHtml(r) {
  const base = esc(r);
  const m = /^\s*(\d+(?:[.,]\d+)?)\s*m\s*$/i.exec(r || "");
  if (!m) return base;
  const sq = Math.round(parseFloat(m[1].replace(",", ".")) / 1.5);
  if (sq < 1) return base;
  return `${base} <span class="sep">/</span> ${sq} ${sq === 1 ? "quadrado" : "quadrados"}`;
}
