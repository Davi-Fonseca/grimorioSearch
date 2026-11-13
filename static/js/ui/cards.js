/* Card de uma magia (devolve HTML; não toca no DOM). */
import { SCHOOLS, CLASSES } from "../config.js";
import { esc, levelLabel, rangeHtml } from "../format.js";

const EYE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.6"/></svg>`;

// selectedClasses: classes marcadas nos filtros (as etiquetas de classe do card ficam "ligadas")
export function cardHtml(s, selectedClasses = new Set()) {
  const tags = [s.concentration ? "Concentração" : "", s.ritual ? "Ritual" : ""]
    .filter(Boolean).map((t) => `<span class="tag">${t}</span>`).join("");
  const classes = s.classes.map((c) =>
    `<button type="button" class="cls${selectedClasses.has(c) ? " on" : ""}" data-class="${c}" aria-pressed="${selectedClasses.has(c)}" aria-label="Filtrar pela classe ${CLASSES[c] || c}">${CLASSES[c] || esc(c)}</button>`
  ).join("");
  const school = SCHOOLS[s.school] || { pt: s.school, color: "var(--muted)" };
  const comps = (s.components || []).join(", ") + (s.material ? ` (${s.material})` : "");
  const info = s.concentration
    ? `<button type="button" class="info" data-info="conc" aria-label="O que é Concentração?" aria-expanded="false" aria-controls="info-pop">${EYE}</button>`
    : "";
  return `<article class="card" style="--school:${school.color}">
    <div class="card-top"><span class="lvl">${levelLabel(s.level)}</span><span class="tags">${tags}${info}</span></div>
    <h2>${esc(s.name)}</h2>
    <div class="school-row">
      <span class="school-line"><span class="losango" style="--c:${school.color};background:${school.color}"></span>${school.pt}</span>
      <span class="classes">${classes}</span>
    </div>
    <dl class="meta">
      <dt>Tempo</dt><dd>${esc(s.time_pt)}</dd>
      <dt>Alcance</dt><dd>${rangeHtml(s.range_pt)}</dd>
      ${comps ? `<dt>Componentes</dt><dd>${esc(comps)}</dd>` : ""}
      <dt>Duração</dt><dd>${esc(s.duration_pt)}</dd>
    </dl>
    <p class="summary">${esc(s.summary)}</p>
    <details class="more">
      <summary>${s.lang === "pt" ? "Descrição completa" : "Descrição completa (em inglês)"}</summary>
      <p class="full">${esc(s.description)}</p>
      ${s.higher_level ? `<p class="full"><strong>Em círculos superiores.</strong> ${esc(s.higher_level)}</p>` : ""}
    </details>
  </article>`;
}
