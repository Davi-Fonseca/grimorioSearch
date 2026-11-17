/* Cabeçalho: ao rolar para baixo, a parte de cima (logo e abas) sai da tela e fica só a barra de busca.
   Ao rolar um pouco para cima, o cabeçalho completo volta (classe "peek" no <html>), sem precisar subir a página toda.
   As alturas vêm do CSS (--head-h e --bar-h). */
import { el } from "../dom.js";

const SHOW_AFTER_UP = 40;     // px rolados para cima, em sequência, até o cabeçalho completo voltar
const HIDE_AFTER_DOWN = 24;   // px rolados para baixo, em sequência, até ele recolher de novo

const root = document.documentElement;
const px = (name) => parseFloat(getComputedStyle(root).getPropertyValue(name)) || 0;

let tick = false, lastY = window.scrollY, run = 0, peek = false;

function update() {
  tick = false;
  const y = Math.max(0, window.scrollY), dy = y - lastY;
  lastY = y;
  if (dy) run = Math.sign(dy) === Math.sign(run) ? run + dy : dy;   // soma o trecho rolado na mesma direção

  const hideAt = px("--head-h") - px("--bar-h");   // daqui para baixo o cabeçalho completo já saiu da tela
  if (y <= hideAt) peek = false;                  // perto do topo ele já aparece inteiro sozinho
  else if (run <= -SHOW_AFTER_UP) peek = true;
  else if (run >= HIDE_AFTER_DOWN) peek = false;
  root.classList.toggle("peek", peek);

  // "stuck": só a barra de busca ficou fixa (o logo e as abas saem; a busca ocupa a largura toda)
  const compactTop = px("--bar-h") - px("--head-h");
  el.header.classList.toggle("stuck", !peek && el.header.getBoundingClientRect().top <= compactTop + 1);
}

export function initHeader() {
  window.addEventListener("scroll", () => {
    if (!tick) { tick = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener("resize", update);
  el.header.addEventListener("transitionend", (e) => { if (e.propertyName === "top") update(); });   // fecha o "stuck" quando a animação de recolher termina
  update();
}
