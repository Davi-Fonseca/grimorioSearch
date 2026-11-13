/* Configuração e dados fixos da interface (nada aqui toca no DOM). */

// quantas magias aparecem por vez ("Mostrar mais" carrega as próximas)
export const PAGE = 48;

export const SCHOOLS = {
  Abjuration:    { pt: "Abjuração",    color: "#4d83f0" },
  Conjuration:   { pt: "Conjuração",   color: "#f29a3a" },
  Divination:    { pt: "Adivinhação",  color: "#2fc2b0" },
  Enchantment:   { pt: "Encantamento", color: "#e86ab5" },
  Evocation:     { pt: "Evocação",     color: "#ff5a3c" },
  Illusion:      { pt: "Ilusão",       color: "#7b4fff" },
  Necromancy:    { pt: "Necromancia",  color: "#70ce47" },
  Transmutation: { pt: "Transmutação", color: "#c99a6b" }
};
export const CLASSES = {
  Bard: "Bardo", Cleric: "Clérigo", Druid: "Druida", Paladin: "Paladino",
  Ranger: "Guardião", Sorcerer: "Feiticeiro", Warlock: "Bruxo", Wizard: "Mago"
};
export const COMPONENTS = { V: "Verbal (V)", S: "Somático (S)", M: "Material (M)" };
