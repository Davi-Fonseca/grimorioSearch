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

/* Área com quadrados ao lado, como no alcance: "Esfera de 6 m de raio" → "Esfera de 6 m / 4 quadrados de raio". */
export function areaHtml(area) {
  return esc(area).replace(/(\d+(?:,\d+)?) m\b/g, (all, v) => {
    const sq = Math.round(parseFloat(v.replace(",", ".")) / 1.5);
    return sq < 1 ? all : `${all} <span class="sep">/</span> ${sq} ${sq === 1 ? "quadrado" : "quadrados"}`;
  });
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

/* Ids das condições citadas num texto (texto puro), pela mesma regra dos links; usado pelo filtro de condições. */
export const conditionsIn = (text) => {
  const ids = new Set();
  for (const m of text.matchAll(COND_RE)) for (const n of m[2].matchAll(NAME_RE)) ids.add(COND_ID[n[0]]);
  return [...ids];
};


/* ---- Dano ----
   Âncora: o dado seguido de "de dano" ("sofre 8d6 de dano de Fogo", "sofrerá 1d6 de dano Ácido", "causa 2d8 de dano extra"),
   em vez do verbo: assim valem sofre/sofrerá/sofrendo/causa e as tabelas (Rajada Prismática), e não pegam cura ("recupera 2d8")
   nem bônus ("adiciona 1d4", "O dano aumenta em 1d8"). Também aceita "dano de Fogo igual a 3d6 mais seu atributo". */
const DAMAGE_TYPES = "Ácido|Concussão|Cortante|Corte|Elétrico|Energia|Força|Fogo|Frio|Necrótico|Perfuração|Psíquico|Radiante|Trovão|Veneno";
const DICE = String.raw`\d+d\d+(?:\s*\+\s*\d+)?`;   // 8d6, e também 10d6 + 40
const DMG_A = new RegExp(`(${DICE})\\s+de\\s+dano(?:\\s+(?:de\\s+)?(${DAMAGE_TYPES}|extra))?(?![\\p{L}])`, "giu");
const DMG_B = new RegExp(`dano\\s+(?:de\\s+)?(${DAMAGE_TYPES})\\s+igual\\s+a\\s+(\\d+d\\d+)`, "giu");

const niceDice = (s) => s.toLowerCase().replace(/\s*\+\s*/, " + ");
const niceType = (s) => (!s ? "" : s.toLowerCase() === "extra" ? "extra" : s[0].toUpperCase() + s.slice(1).toLowerCase());

/* Danos citados num texto (texto puro), na ordem em que aparecem, sem repetir: [{ dice: "8d6", type: "Fogo" }].
   type vem vazio quando o tipo é à escolha ("de dano do tipo escolhido"). */
export const damageIn = (text) => {
  const found = [];
  for (const m of text.matchAll(DMG_A)) found.push({ at: m.index, dice: niceDice(m[1]), type: niceType(m[2]) });
  for (const m of text.matchAll(DMG_B)) found.push({ at: m.index, dice: niceDice(m[2]), type: niceType(m[1]) });
  const seen = new Set();
  return found.sort((a, b) => a.at - b.at)
    .filter((x) => { const k = `${x.dice}|${x.type}`; return seen.has(k) ? false : seen.add(k); })
    .map(({ dice, type }) => ({ dice, type }));
};

/* Texto do campo Dano do card: "8d6 Fogo" ou "2d10 Concussão, 4d6 Frio" (até 3; o resto vira "…"). */
export const damageText = (list) =>
  list.slice(0, 3).map((x) => (x.type ? `${x.dice} ${x.type}` : x.dice)).join(", ") + (list.length > 3 ? ", …" : "");


/* ---- Área de efeito ----
   O campo de alcance das magias não traz a área (vem só "Pessoal"), então ela é extraída da descrição: uma forma
   (Esfera, Cone, Cubo, Cilindro, Linha, Emanação, Quadrado, Círculo) seguida da medida, como em "Esfera de 6 metros de raio",
   "Cone de 18 metros" ou "Linha de 30 metros de comprimento e 1,5 metro de largura". Vale a primeira citação do texto. */
const AREA_SHAPES = "Esfera|Cone|Cubo|Cilindro|Linha|Emanação|Quadrado|Círculo";
const AREA_DIM = String.raw`\d[\d,]*\s*(?:metros?|cm|km)(?:\s+de\s+(?:raio|comprimento|largura|altura|diâmetro))?`;
const AREA_RE = new RegExp(
  `(?<![\\p{L}])(${AREA_SHAPES})(?![\\p{L}])` +
  `(?:\\s+\\p{L}+)?` +                                     // uma palavra no meio: "Emanação imóvel de 9 metros"
  `(?:\\s+de\\s+\\p{L}+(?:\\s+\\p{L}+){0,2})?` +           // "Linha de vento forte de 18 metros"
  `\\s+(?:de|até)\\s+(${AREA_DIM})` +
  `(?:\\s*(?:,|e)\\s+(${AREA_DIM}))?`,                      // segunda medida: "… e 1,5 metro de largura"
  "iu");

const niceDim = (s) => s.replace(/(\d)\s*metros?\b/gi, "$1 m");

/* "Esfera de 6 m de raio" (texto puro → texto), ou "" se a magia não tem área. */
export const areaIn = (text) => {
  const m = AREA_RE.exec(text);
  if (!m) return "";
  const shape = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
  return `${shape} de ${niceDim(m[2])}${m[3] ? ` e ${niceDim(m[3])}` : ""}`;
};
