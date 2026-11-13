/* Formatação de texto (puro, sem DOM). */
import { CONDITIONS } from "./conditions.js";

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

/* Marca as condições citadas no texto da magia. Vale o padrão "condição Nome" (ex.: "a condição Enfeitiçado") e listas
   depois de "condição"/"condições" ("condições Cego, Surdo e Envenenado", "condição Cego ou Surdo"): cada nome da lista
   vira um botão e "condição" continua texto comum. Recebe texto já escapado (esc) e devolve HTML.
   \b não funciona com letras acentuadas (Exaustão), por isso o uso de \p{L}. */
const NAMES = CONDITIONS.map((c) => c.name).join("|");
const SEP = ",\\s*(?:e|ou)\\s+|,\\s*|\\s+(?:e|ou)\\s+";   // ", e " / ", " / " e " / " ou "
const COND_RE = new RegExp(`(?<![\\p{L}])([Cc]ondi(?:ção|ções)\\s+)((?:${NAMES})(?:(?:${SEP})(?:${NAMES}))*)(?![\\p{L}])`, "gu");
const NAME_RE = new RegExp(`(${NAMES})`, "gu");
const COND_ID = Object.fromEntries(CONDITIONS.map((c) => [c.name, c.id]));

const button = (name) => `<button type="button" class="cond-link" data-cond="${COND_ID[name]}">${name}</button>`;

export const linkConditions = (html) =>
  html.replace(COND_RE, (_, pre, list) => pre + list.replace(NAME_RE, (name) => button(name)));

// Texto das condições: **assim** vira negrito.
export const inlineText = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

// cada linha vira um parágrafo
export const richText = (text) =>
  text.split("\n").filter(Boolean).map((p) => `<p>${inlineText(p)}</p>`).join("");