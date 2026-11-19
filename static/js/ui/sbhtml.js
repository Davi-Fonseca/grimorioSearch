/* HTML das invocações (devolve texto; não toca no DOM): o card compacto que fica na descrição da magia,
   o card da aba Invocações e o bloco de estatísticas completo (janela). */
import { SCHOOLS, CLASSES } from "../config.js";
import { CONDITIONS } from "../conditions.js";
import { ABILITIES } from "../summons.js";
import { esc, levelLabel, rangeHtml, linkConditions } from "../format.js";

const italic = (html) => html.replace(/\*(.+?)\*/g, "<em>$1</em>");

// texto de um traço/ação: *itálico* nos rótulos e links nas condições citadas ("a condição Amedrontado")
export const sbText = (text) => linkConditions(italic(esc(text)));

const COND_ID = new Map(CONDITIONS.map((c) => [c.name, c.id]));
const COND_NAME_RE = new RegExp(`(?<![\\p{L}])(${CONDITIONS.map((c) => c.name).join("|")})(?![\\p{L}])`, "gu");

// Imunidades ("Veneno, Psíquico; Enfeitiçado, Exaustão"): cada condição citada vira o mesmo link das magias
const condList = (value) => esc(value).replace(COND_NAME_RE, (n) => `<button type="button" class="cond-link" data-cond="${COND_ID.get(n)}">${n}</button>`);

const only = (list) => (list?.length ? ` data-only="${esc(list.join("|"))}"` : "");


/* ---- card compacto (dentro da descrição da magia) ---- */
export const summonCardHtml = (s) => `<button type="button" class="sb-card" data-summon="${esc(s.id)}" aria-haspopup="dialog">
    <span class="sb-card-name">${esc(s.name)}</span>
    <span class="sb-card-kind">${esc(s.kind)}</span>
    <span class="sb-card-glance">${s.glance.map((g) => `<span><b>${esc(g.k)}</b> ${esc(g.v)}</span>`).join("")}</span>
    <span class="sb-card-hint">Abrir bloco de estatísticas</span>
  </button>`;


/* ---- card da aba Invocações (mesmo octógono dos cards das magias) ---- */
export function summonTileHtml(s) {
  const school = SCHOOLS[s.spell.school] || { pt: s.spell.school, color: "var(--muted)" };
  const tag = s.spell.concentration ? `<span class="tag">Concentração</span>` : "";
  const classes = s.spell.classes.map((c) => CLASSES[c] || c).join(", ");
  const scores = ABILITIES.map(([ k, label ]) => {
    const [ score, mod ] = s.abilities[k];
    return `<span><b>${label}</b> ${score} <i>(${mod})</i></span>`;
  }).join("");
  return `<article class="card sb-full" data-summon="${esc(s.id)}" style="--school:${school.color}">
    <div class="card-top"><span class="lvl">${levelLabel(s.spell.level)}</span><span class="tags">${tag}</span></div>
    <h2>${esc(s.name)}</h2>
    <p class="sb-kind">${esc(s.kind)}</p>
    <div class="school-row">
      <span class="school-line"><span class="losango" style="--c:${school.color};background:${school.color}"></span>${esc(school.pt)}</span>
    </div>
    <dl class="meta">
      <dt>Magia</dt><dd>${esc(s.spell.name)}</dd>
      <dt>Classe</dt><dd>${esc(classes)}</dd>
      ${s.glance.map((g) => `<dt>${esc(g.k)}</dt><dd>${esc(g.v)}</dd>`).join("")}
    </dl>
    <p class="sb-scores">${scores}</p>
    <button type="button" class="sb-open" data-summon="${esc(s.id)}" aria-haspopup="dialog">Abrir bloco de estatísticas</button>
  </article>`;
}


/* ---- bloco de estatísticas completo ---- */
const prop = (label, html) => `<p class="sb-prop"><strong>${esc(label)}</strong> ${html}</p>`;

// Lista separada por vírgulas em que cada item pode valer só para uma forma/tamanho (data-only). O último item visível leva
// "is-last" (sem vírgula depois); o script que filtra por forma refaz essa marca.
const listHtml = (items) => `<span class="sb-speeds">${items.map((it, i) =>
  `<span class="sb-sp${i === items.length - 1 ? " is-last" : ""}"${only(it.only)}>${it.html}</span>`
).join("")}</span>`;

// Deslocamento: o primeiro item é o próprio deslocamento (o rótulo já está na linha); metros ganham os quadrados, como no alcance das magias.
const speedsHtml = (list) => listHtml(list.map((sp, i) => ({
  only: sp.only,
  html: `${i ? `${esc(sp.label)} ` : ""}${rangeHtml(`${sp.m} m`)}${sp.note ? ` (${esc(sp.note)})` : ""}`
})));

// PV: texto, ou lista que muda com a escolha (tamanho)
const hpHtml = (hp) => (Array.isArray(hp) ? listHtml(hp.map((h) => ({ only: h.only, html: esc(h.text) }))) : esc(hp));

function abilitiesHtml(abilities) {
  const cell = ([ k, label ]) => {
    const [ score, mod, save ] = abilities[k];
    return `<th scope="row">${label}</th><td>${score}</td><td>${mod}</td><td>${save}</td>`;
  };
  const head = `<th></th><th></th><th>Mod</th><th>Salv</th>`;
  const rows = [ 0, 1, 2 ].map((i) => `<tr>${cell(ABILITIES[i])}${cell(ABILITIES[i + 3])}</tr>`).join("");
  return `<table class="sb-abil"><thead><tr>${head}${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

function featHtml(f) {
  const tags = [ f.only?.length ? `Apenas ${f.only.join(" ou ")}` : "", f.recharge || "" ].filter(Boolean);
  const head = esc(f.name) + (tags.length ? ` (${esc(tags.join("; "))})` : "");
  const choices = f.choices ? ` ${listHtml(f.choices.map((c) => ({ only: c.only, html: sbText(c.text) })))}.` : "";
  return `<p class="sb-feat"${only(f.only)}><strong><em>${head}.</em></strong> ${sbText(f.text)}${choices}</p>`;
}

const section = (title, list) =>
  list.length ? `<section class="sb-sec"><h3>${title}</h3>${list.map(featHtml).join("")}</section>` : "";

// botões que mostram só o que vale para a forma/tipo escolhido na conjuração (o script está em ui/summonpanel.js)
const formsHtml = (v) => `<div class="sb-forms" role="group" aria-label="${esc(v.label)}">
    <span class="sb-forms-label">${esc(v.label)}:</span>
    <button type="button" class="sb-form" data-form="" aria-pressed="true">${esc(v.all)}</button>
    ${v.options.map((o) => `<button type="button" class="sb-form" data-form="${esc(o)}" aria-pressed="false">${esc(o)}</button>`).join("")}
  </div>`;

export const statBlockHtml = (s) => `<div class="sb">
    <h2 class="sb-name" id="sb-title">${esc(s.name)}</h2>
    <p class="sb-kind">${esc(s.kind)}</p>
    <p class="sb-spell">Magia: <button type="button" class="sb-goto" data-goto-spell="${esc(s.spell.name)}">${esc(s.spell.name)}</button> · ${levelLabel(s.spell.level)}</p>
    ${s.variants ? formsHtml(s.variants) : ""}
    <hr class="sb-rule">
    ${prop("CA", esc(s.ac))}
    ${prop("PV", hpHtml(s.hp))}
    ${prop("Deslocamento", speedsHtml(s.speeds))}
    <hr class="sb-rule">
    ${abilitiesHtml(s.abilities)}
    <hr class="sb-rule">
    ${s.props.map((p) => prop(p.label, p.conditions ? condList(p.value) : esc(p.value))).join("")}
    ${section("Traços", s.traits)}
    ${section("Ações", s.actions)}
    ${section("Ações Bônus", s.bonus)}
    ${s.higherLevel ? `<p class="sb-note"><strong>Em círculos superiores.</strong> ${esc(s.higherLevel)}</p>` : ""}
  </div>`;
