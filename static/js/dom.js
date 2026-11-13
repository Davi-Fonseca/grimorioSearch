/* Referências aos elementos da página. Os módulos são executados depois do HTML estar pronto. */

export const $ = (sel, root = document) => root.querySelector(sel);

export const el = {
  q: $("#q"), sort: $("#sort"), total: $("#total"),
  levels: $("#levels"), schools: $("#schools"), classes: $("#classes"), components: $("#components"),
  conc: $("#f-conc"), ritual: $("#f-ritual"), optConc: $("#opt-conc"), optRitual: $("#opt-ritual"),
  chips: $("#chips"), results: $("#results"), more: $("#more"),
  filters: $("#filters"), toggle: $("#toggle-filters"), clearSide: $("#clear-side"),
  tabList: $(".tabs"), tabs: [...document.querySelectorAll(".tab")],
  viewSpells: $("#view-spells"), viewConditions: $("#view-conditions"),
  condGrid: $("#cond-grid"), condTotal: $("#cond-total"), condDialog: $("#cond-dialog"),
  condTitle: $("#cond-title"), condBody: $("#cond-body"), condClose: $("#cond-close"), condPop: $("#cond-pop"),
  header: $(".top"), footer: $("#footer"), tip: $("#tip"), infoPop: $("#info-pop")
};
