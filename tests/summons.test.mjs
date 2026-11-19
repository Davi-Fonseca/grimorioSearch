// Testes das invocações: dados (static/js/summons.js) e HTML (static/js/ui/sbhtml.js, ui/cards.js); sem DOM.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SUMMONS, SUMMON_BY_SPELL } from "../static/js/summons.js";
import { statBlockHtml, summonCardHtml, summonTileHtml } from "../static/js/ui/sbhtml.js";
import { cardHtml } from "../static/js/ui/cards.js";

const spells = JSON.parse(readFileSync(new URL("../static/spells.json", import.meta.url), "utf-8"));
const byId = Object.fromEntries(spells.map((s) => [s.id, s]));

test("cada invocação aponta para uma magia que existe, com o mesmo nome, círculo e classes", () => {
  assert.equal(SUMMONS.length, 4);
  for (const s of SUMMONS) {
    const sp = byId[s.spell.id];
    assert.ok(sp, `${s.spell.id} não existe no spells.json`);
    assert.equal(sp.name, s.spell.name);
    assert.equal(sp.level, s.spell.level);
    assert.equal(sp.school, s.spell.school);
    assert.equal(sp.concentration, s.spell.concentration);
    assert.deepEqual([...sp.classes].sort(), [...s.spell.classes].sort());
  }
});

test("o bloco estruturado traz o que o texto colado em higher_level trazia (atributos, ações, nomes)", () => {
  for (const s of SUMMONS) {
    const raw = byId[s.spell.id].higher_level;
    for (const [ , [ score ] ] of Object.entries(s.abilities)) assert.match(raw, new RegExp(`\\b${score}\\b`));
    for (const f of [ ...s.traits, ...s.actions, ...s.bonus ]) assert.ok(raw.includes(f.name), `${s.name}: "${f.name}" não está no texto original`);
    assert.ok(raw.startsWith(s.higherLevel), `${s.name}: a frase de círculos superiores mudou`);
  }
});

test("o card da magia troca o bloco colado por um botão que abre a invocação", () => {
  for (const s of SUMMONS) {
    const h = cardHtml(byId[s.spell.id]);
    assert.match(h, new RegExp(`class="sb-card" data-summon="${s.id}"`));
    assert.doesNotMatch(h, /MOD SALV/);
    assert.match(h, /Em círculos superiores\.<\/strong> \S/);
    assert.ok(h.length < 4500, "o texto do bloco não deve voltar para a descrição");
  }
  const outra = spells.find((x) => !SUMMON_BY_SPELL[x.id]);
  assert.doesNotMatch(cardHtml(outra), /sb-card/);               // as demais magias não ganham o botão
});

test("bloco completo: atributos, seções e links das condições", () => {
  const h = statBlockHtml(SUMMON_BY_SPELL["invocar-dragao"]);
  assert.match(h, /<h2 class="sb-name" id="sb-title">Espírito Dracônico<\/h2>/);
  assert.match(h, /<th scope="row">For<\/th><td>19<\/td><td>\+4<\/td><td>\+4<\/td>/);
  assert.match(h, /<h3>Traços<\/h3>/);
  assert.match(h, /<h3>Ações<\/h3>/);
  assert.doesNotMatch(h, /Ações Bônus/);                         // sem ações bônus, sem seção vazia
  assert.match(h, /data-cond="enfeiticado"/);                    // Imunidades: cada condição vira link
  assert.match(h, /<em>Acerto:<\/em>/);                          // rótulos em itálico
  assert.match(h, /9 m <span class="sep">\/<\/span> 6 quadrados/);
  assert.doesNotMatch(h, /sb-forms/);                            // dragão não tem formas
});

test("formas: só os traços de uma forma levam data-only, e há botões para escolher", () => {
  const h = statBlockHtml(SUMMON_BY_SPELL["inseto-gigante"]);
  assert.match(h, /<p class="sb-feat" data-only="Aranha"><strong><em>Disparo de Teia \(Apenas Aranha\)\./);
  assert.match(h, /<span class="sb-sp is-last" data-only="Vespa">Voo 12 m/);
  assert.match(h, /data-form="Lacraia"/);
  assert.match(h, /condição <button type="button" class="cond-link" data-cond="envenenado">Envenenado<\/button>/);
  const m = statBlockHtml(SUMMON_BY_SPELL["convocar-montaria"]);
  assert.match(m, /Olhar Sombrio \(Apenas Corruptor; Recarrega após um Descanso Longo\)/);
  assert.match(m, /aria-label="Tipo"/);
});

test("card da aba e card compacto mostram nome, tipo e abrem pelo id", () => {
  const s = SUMMON_BY_SPELL["convocar-montaria"];
  const tile = summonTileHtml(s);
  assert.match(tile, /<article class="card sb-full" data-summon="montaria-de-outro-mundo" style="--school:#f29a3a">/);
  assert.match(tile, /<h2>Montaria de Outro Mundo<\/h2>/);
  assert.match(tile, /2º círculo/);
  assert.doesNotMatch(tile, /Concentração/);
  assert.match(summonTileHtml(SUMMON_BY_SPELL["invocar-dragao"]), /<span class="tag">Concentração<\/span>/);
  assert.match(summonCardHtml(s), /Abrir bloco de estatísticas/);
});

test("texto das invocações é escapado", () => {
  const evil = { ...SUMMONS[0], name: "<img src=x onerror=alert(1)>", traits: [ { name: "<b>x</b>", text: "<script>x</script> *ok*" } ] };
  const h = statBlockHtml(evil) + summonTileHtml(evil) + summonCardHtml(evil);
  assert.doesNotMatch(h, /<img src=x|<script>|<b>x<\/b>/);
  assert.match(h, /&lt;script&gt;x&lt;\/script&gt; <em>ok<\/em>/);
});

test("Objeto Animado: PV e dano mudam com o tamanho escolhido", () => {
  const h = statBlockHtml(SUMMON_BY_SPELL["animar-objetos"]);
  assert.match(h, /<span class="sb-sp" data-only="Médio ou menor">10 \(Médio ou menor\)<\/span>/);
  assert.match(h, /<span class="sb-sp is-last" data-only="Enorme">40 \(Enorme\)<\/span>/);
  assert.match(h, /Dano de energia igual a <span class="sb-speeds">/);
  assert.match(h, /2d12 \+ 3 \+ seu atributo de conjuração \(Enorme\)<\/span><\/span>\.<\/p>/);
  assert.match(h, /data-cond="exaustao"/);                       // imunidades depois do ";" também viram link
  assert.doesNotMatch(h, /Ações Bônus/);
  assert.doesNotMatch(h, /Traços/);                              // sem traços, sem seção vazia
});
