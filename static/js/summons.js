/* Invocações: blocos de estatísticas das magias Invocar Dragão, Convocar Montaria, Inseto Gigante e Animar Objetos (SRD 5.2).
   No spells.json o bloco vem colado, em texto corrido, no fim do campo "higher_level"; aqui ele está estruturado para
   virar card e bloco de estatísticas. Módulo de dados puro (sem DOM).

   Convenções dos textos:
   - *assim* vira itálico (rótulos como *Acerto:* e *Falha:*);
   - "condição Nome" vira link para a descrição da condição (mesma regra das magias);
   - "only" lista as formas em que o traço vale; sem "only", vale sempre;
   - "variants" (opcional) cria os botões que filtram o bloco por tipo/forma/tamanho;
   - "hp" pode ser texto, ou uma lista de { text, only } quando o valor muda conforme a escolha;
   - um traço/ação pode ter "choices" ([{ text, only }]): o "text" vem antes, as opções (separadas por vírgula) depois e o ponto no fim;
   - "recharge" é o texto de recarga, mostrado entre parênteses junto de "Apenas ...".

   Para acrescentar uma invocação, copie uma entrada e troque os dados (o id da magia precisa existir no spells.json). */

const ATTACK_MELEE = "*Jogada de Ataque Corpo a Corpo:* Bônus é igual ao seu modificador de ataque mágico";
const SAVE_DC = "A CD é igual à CD da sua salvaguarda de magia";

export const SUMMONS = [
  {
    id: "espirito-draconico",
    name: "Espírito Dracônico",
    kind: "Dragão Grande, Neutro",
    spell: { id: "invocar-dragao", name: "Invocar Dragão", level: 5, school: "Conjuration", classes: [ "Wizard" ], concentration: true },
    higherLevel: "Use o nível do espaço de magia para o nível da magia no bloco de estatísticas.",
    glance: [
      { k: "CA", v: "14 + círculo" },
      { k: "PV", v: "50, +10 por círculo acima do 5º" },
      { k: "Desl.", v: "9 m, Voo 18 m, Natação 9 m" }
    ],
    ac: "14 + o nível da magia",
    hp: "50 + 10 para cada nível de magia acima do 5º",
    speeds: [ { label: "Deslocamento", m: 9 }, { label: "Voo", m: 18 }, { label: "Natação", m: 9 } ],
    abilities: {
      for: [ 19, "+4", "+4" ], des: [ 14, "+2", "+2" ], con: [ 17, "+3", "+3" ],
      int: [ 10, "+0", "+0" ], sab: [ 14, "+2", "+2" ], car: [ 14, "+2", "+2" ]
    },
    props: [
      { label: "Resistências", value: "Ácido, Frio, Fogo, Elétrico, Veneno" },
      { label: "Imunidades", value: "Enfeitiçado, Amedrontado, Envenenado", conditions: true },
      { label: "Sentidos", value: "Visão às Cegas 9 m, Visão no Escuro 18 m; Percepção Passiva 12" },
      { label: "Idiomas", value: "Dracônico, entende os idiomas que você conhece" },
      { label: "ND", value: "Nenhum (XP 0; BP é igual ao seu Bônus de Proficiência)" }
    ],
    traits: [
      { name: "Resistências Compartilhadas", text: "Quando você invocar o espírito, escolha uma de suas Resistências. Você tem Resistência ao tipo de dano escolhido até a magia terminar." }
    ],
    actions: [
      { name: "Ataque Múltiplo", text: "O espírito faz uma quantidade de ataques de Mutilar igual à metade do nível da magia (arredondado para baixo) e usa Arma de Sopro." },
      { name: "Mutilar", text: `${ATTACK_MELEE}, alcance 3 m. *Acerto:* 1d6 + 4 + o nível da magia de dano de Perfuração.` },
      { name: "Arma de Sopro", text: `*Salvaguarda de Destreza:* ${SAVE_DC}, cada criatura em um Cone de 9 metros. *Falha:* 2d6 de dano de um tipo ao qual este espírito tem Resistência (sua escolha quando conjurar a magia). *Sucesso:* Metade do dano.` }
    ],
    bonus: []
  },

  {
    id: "montaria-de-outro-mundo",
    name: "Montaria de Outro Mundo",
    kind: "Grande, Celestial, Fada ou Corruptor (sua escolha), Neutro",
    spell: { id: "convocar-montaria", name: "Convocar Montaria", level: 2, school: "Conjuration", classes: [ "Paladin" ], concentration: false },
    higherLevel: "Use o nível do espaço de magia para o nível da magia no bloco de estatísticas.",
    variants: { label: "Tipo", all: "Todos", options: [ "Celestial", "Fada", "Corruptor" ] },
    glance: [
      { k: "CA", v: "10 + círculo" },
      { k: "PV", v: "5 + 10 por círculo" },
      { k: "Desl.", v: "18 m, Voo 18 m (círculo 4+)" }
    ],
    ac: "10 + o nível da magia",
    hp: "5 + 10 por nível de magia (a montaria tem uma quantidade de Dados de Vida [d10s] igual ao nível da magia)",
    speeds: [ { label: "Deslocamento", m: 18 }, { label: "Voo", m: 18, note: "requer magia de nível 4+" } ],
    abilities: {
      for: [ 18, "+4", "+4" ], des: [ 12, "+1", "+1" ], con: [ 14, "+2", "+2" ],
      int: [ 6, "−2", "−2" ], sab: [ 12, "+1", "+1" ], car: [ 8, "−1", "−1" ]
    },
    props: [
      { label: "Sentidos", value: "Percepção Passiva 11" },
      { label: "Idiomas", value: "Telepatia 1,6 km (funciona apenas com você)" },
      { label: "ND", value: "Nenhum (XP 0; BP é igual ao seu Bônus de Proficiência)" }
    ],
    traits: [
      { name: "Vínculo Vital", text: "Quando você recupera Pontos de Vida de uma magia de nível 1+, a montaria recupera a mesma quantidade de Pontos de Vida se você estiver a até 1,5 metro dela." }
    ],
    actions: [
      { name: "Pancada de Outro Mundo", text: `${ATTACK_MELEE}, alcance 1,5 m. *Acerto:* 1d8 mais o nível da magia de dano Radiante (Celestial), Psíquico (Fada) ou Necrótico (Corruptor).` }
    ],
    bonus: [
      { name: "Olhar Sombrio", only: [ "Corruptor" ], recharge: "Recarrega após um Descanso Longo", text: `*Salvaguarda de Sabedoria:* ${SAVE_DC}, uma criatura a até 18 metros que a montaria possa ver. *Falha:* O alvo tem a condição Amedrontado até o final do seu próximo turno.` },
      { name: "Passo Feérico", only: [ "Fada" ], recharge: "Recarrega após um Descanso Longo", text: "A montaria se teleporta, junto com seu cavaleiro, para um espaço desocupado à sua escolha a até 18 metros de si mesma." },
      { name: "Toque Curativo", only: [ "Celestial" ], recharge: "Recarrega após um Descanso Longo", text: "Uma criatura a até 1,5 metro da montaria recupera uma quantidade de Pontos de Vida igual a 2d8 mais o nível da magia." }
    ]
  },

  {
    id: "inseto-gigante",
    name: "Inseto Gigante",
    kind: "Besta Grande, Sem Tendência",
    spell: { id: "inseto-gigante", name: "Inseto Gigante", level: 4, school: "Conjuration", classes: [ "Druid" ], concentration: true },
    higherLevel: "Use o nível do espaço de magia para o nível da magia no bloco de estatísticas.",
    variants: { label: "Forma", all: "Todas", options: [ "Aranha", "Lacraia", "Vespa" ] },
    glance: [
      { k: "CA", v: "11 + círculo" },
      { k: "PV", v: "30, +10 por círculo acima do 4º" },
      { k: "Desl.", v: "12 m, Escalada 12 m, Voo 12 m (Vespa)" }
    ],
    ac: "11 + o nível da magia",
    hp: "30 + 10 para cada nível de magia acima do 4º",
    speeds: [ { label: "Deslocamento", m: 12 }, { label: "Escalada", m: 12 }, { label: "Voo", m: 12, only: [ "Vespa" ] } ],
    abilities: {
      for: [ 17, "+3", "+3" ], des: [ 13, "+1", "+1" ], con: [ 15, "+2", "+2" ],
      int: [ 4, "−3", "−3" ], sab: [ 14, "+2", "+2" ], car: [ 3, "−4", "−4" ]
    },
    props: [
      { label: "Sentidos", value: "Visão no Escuro 18 m; Percepção Passiva 12" },
      { label: "Idiomas", value: "Entende os idiomas que você conhece" },
      { label: "ND", value: "Nenhum (XP 0; BP é igual ao seu Bônus de Proficiência)" }
    ],
    traits: [
      { name: "Pata de Aranha", text: "O inseto pode escalar superfícies difíceis, incluindo ao longo de tetos, sem precisar fazer um teste de atributo." }
    ],
    actions: [
      { name: "Ataque Múltiplo", text: "O inseto faz uma quantidade de ataques igual à metade do nível desta magia (arredondado para baixo)." },
      { name: "Golpear Venenoso", text: `${ATTACK_MELEE}, alcance 3 m. *Acerto:* 1d6 + 3 mais o nível da magia de dano de Perfuração mais 1d4 de dano de Veneno.` },
      { name: "Disparo de Teia", only: [ "Aranha" ], text: "*Jogada de Ataque à Distância:* Bônus é igual ao seu modificador de ataque mágico, alcance 18 m. *Acerto:* 1d10 + 3 mais o nível da magia de dano de Concussão, e o Deslocamento do alvo é reduzido a 0 até o início do próximo turno do inseto." }
    ],
    bonus: [
      { name: "Erupção Venenosa", only: [ "Lacraia" ], text: `*Salvaguarda de Constituição:* ${SAVE_DC}, uma criatura que o inseto possa ver a até 3 metros. *Falha:* O alvo tem a condição Envenenado até o início do próximo turno do inseto.` }
    ]
  },

  {
    id: "objeto-animado",
    name: "Objeto Animado",
    kind: "Constructo Enorme ou Menor, Sem Tendência",
    spell: { id: "animar-objetos", name: "Animar Objetos", level: 5, school: "Transmutation", classes: [ "Bard", "Sorcerer", "Wizard" ], concentration: true },
    higherLevel: "O dano de Pancada do objeto aumenta em 1d4 (Médio ou menor), 1d6 (Grande) ou 1d12 (Enorme) para cada nível de espaço de magia acima do 5º.",
    variants: { label: "Tamanho", all: "Todos", options: [ "Médio ou menor", "Grande", "Enorme" ] },
    glance: [
      { k: "CA", v: "15" },
      { k: "PV", v: "10, 20 ou 40 (por tamanho)" },
      { k: "Desl.", v: "9 m" }
    ],
    ac: "15",
    hp: [
      { text: "10 (Médio ou menor)", only: [ "Médio ou menor" ] },
      { text: "20 (Grande)", only: [ "Grande" ] },
      { text: "40 (Enorme)", only: [ "Enorme" ] }
    ],
    speeds: [ { label: "Deslocamento", m: 9 } ],
    abilities: {
      for: [ 16, "+3", "+3" ], des: [ 10, "+0", "+0" ], con: [ 10, "+0", "+0" ],
      int: [ 3, "−4", "−4" ], sab: [ 3, "−4", "−4" ], car: [ 1, "−5", "−5" ]
    },
    props: [
      { label: "Imunidades", value: "Veneno, Psíquico; Enfeitiçado, Exaustão, Amedrontado, Paralisado, Envenenado", conditions: true },
      { label: "Sentidos", value: "Visão às Cegas 9 m; Percepção Passiva 6" },
      { label: "Idiomas", value: "Entende os idiomas que você conhece" },
      { label: "ND", value: "Nenhum (XP 0; BP é igual ao seu Bônus de Proficiência)" }
    ],
    traits: [],
    actions: [
      {
        name: "Pancada",
        text: `${ATTACK_MELEE}, alcance 1,5 m. *Acerto:* Dano de energia igual a`,
        choices: [
          { text: "1d4 + 3 (Médio ou menor)", only: [ "Médio ou menor" ] },
          { text: "2d6 + 3 + seu atributo de conjuração (Grande)", only: [ "Grande" ] },
          { text: "2d12 + 3 + seu atributo de conjuração (Enorme)", only: [ "Enorme" ] }
        ]
      }
    ],
    bonus: []
  }
];

export const SUMMON_BY_ID = Object.fromEntries(SUMMONS.map((s) => [ s.id, s ]));
export const SUMMON_BY_SPELL = Object.fromEntries(SUMMONS.map((s) => [ s.spell.id, s ]));

// ordem e nomes dos atributos (a ordem é a do bloco: coluna da esquerda For/Des/Con, da direita Int/Sab/Car)
export const ABILITIES = [
  [ "for", "For" ], [ "des", "Des" ], [ "con", "Con" ],
  [ "int", "Int" ], [ "sab", "Sab" ], [ "car", "Car" ]
];
