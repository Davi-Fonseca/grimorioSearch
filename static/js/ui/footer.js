/* Rodapé: no idioma das magias mostradas. */
import { esc } from "../format.js";
import { el } from "../dom.js";

const FOOTER_DEFAULT = el.footer.innerHTML;   // o que está no HTML (usado se as magias não forem em português)

export function updateFooter(spell) {
  if (!spell || spell.lang !== "pt") { el.footer.innerHTML = FOOTER_DEFAULT; return; }
  el.footer.innerHTML = `<p>Magias em português. Fonte: ${esc(spell.source)}.</p>
  <p>This work includes material from the System Reference Document 5.2 (“SRD 5.2”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd, translated and adapted into Portuguese. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.</p>`;
}
