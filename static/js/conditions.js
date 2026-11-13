/* Condições do jogo. Troque o texto de cada uma em DESCRICOES (as chaves são os nomes). */

const NOMES = [
  "Amedrontado", "Enfeitiçado", "Inconsciente", "Atordoado", "Envenenado",
  "Invisível", "Caído", "Exaustão", "Paralisado", "Cego",
  "Imobilizado", "Petrificado", "Contido", "Incapacitado", "Surdo"
];

// Texto placeholder: substitua pela descrição completa (\n separa parágrafos).
const PLACEHOLDER = (nome) =>
  `Descrição placeholder da condição ${nome}. Substitua este texto pela descrição completa da condição.\n` +
  `Segundo parágrafo de exemplo, para mostrar como um texto mais longo aparece na janela.`;

const DESCRICOES = {
  "Amedrontado":
`**Testes de Atributo e Ataques Afetados.** Você tem Desvantagem em testes de atributo e jogadas de ataque enquanto a fonte do medo estiver dentro da linha de visão.
**Não Pode Se Aproximar.** Você não pode se aproximar voluntariamente da fonte do medo.`,

  "Atordoado":
`**Incapacitado.** Você tem a condição Incapacitado.
**Salvaguardas Afetadas.** Você falha automaticamente em salvaguardas de Força e Destreza.
**Ataques Afetados**. Jogadas de ataque contra você têm Vantagem.`,

  "Caído":
`**Movimento Restrito.** Suas únicas opções de movimento são rastejar ou gastar uma quantidade de movimento equivalente à metade do seu Deslocamento (arredondado para baixo) para se levantar e, assim, encerrar a condição. Se seu Deslocamento for 0, você não consegue se levantar.
**Ataques Afetados.** Você tem Desvantagem em jogadas de ataque. Uma jogada de ataque contra você tem Vantagem se o atacante estiver a até 1,5 metro de você. Caso contrário, essa jogada de ataque tem Desvantagem.`,

  "Cego":
`**Não Pode Ver.** Você não consegue ver e falha automaticamente em qualquer teste de atributo que dependa da visão.
**Ataques Afetados.** Jogadas de ataque contra você têm Vantagem, enquanto suas jogadas de ataque têm Desvantagem.`,

  "Contido":
`**Deslocamento 0.** Seu Deslocamento é 0 e não pode aumentar.
**Ataques Afetados.** Jogadas de ataque contra você têm Vantagem e suas jogadas de ataque têm Desvantagem.
**Salvaguardas Afetadas.** Você tem Desvantagem em salvaguardas de Destreza.`,

  "Enfeitiçado":
`**Não Pode Atacar Quem o Enfeitiçou.** Você não pode atacar quem o enfeitiçou nem o ter como alvo de ataques que utilizem atributos ou efeitos mágicos.
**Vantagem Social.** Quem o enfeitiçou tem Vantagem em qualquer teste de atributo para interações sociais com você.`,

  "Envenenado":
`**Testes de Atributo e Ataques Afetados.** Você tem Desvantagem em jogadas de ataque e testes de atributo.`,

  "Exaustão":
`**Níveis de Exaustão.** Essa condição é acumulativa. Cada vez que você a adquire, recebe 1 nível de Exaustão. Você morre se seu nível de Exaustão atingir 6.
**Testes de D20 Afetados.** Ao realizar um Teste de D20, o resultado é reduzido em 2 vezes o seu nível de Exaustão.
**Deslocamento Reduzido.** Seu Deslocamento é reduzido por uma quantidade de metros igual a 1,5 vezes o seu nível de Exaustão.
**Remoção de Níveis de Exaustão.** Completar um Descanso Longo remove 1 dos seus níveis de Exaustão. Quando seu nível de Exaustão chega a 0 a condição encerra.`,

  "Imobilizado":
`**Deslocamento 0.** Seu Deslocamento é 0 e não pode aumentar.
**Ataques Afetados.** Você tem Desvantagem em jogadas de ataque contra qualquer alvo que não seja o imobilizador.
**Móvel.** O imobilizador pode arrastá-lo ou carregá-lo consigo, mas cada metro de movimento custa 1 metro adicional, a menos que você seja Minúsculo ou dois ou mais tamanhos menores que ele.`,

  "Incapacitado":
`**Inativo.** Você não pode executar nenhuma ação, Ação Bônus ou Reação.
**Sem Concentração.** Sua Concentração é interrompida.
**Sem Fala.** Você não pode falar.
**Surpresa.** Se você está Incapacitado quando joga Iniciativa, você tem Desvantagem na jogada.`,

  "Inconsciente":
`**Inerte.** Você tem as condições Caído e Incapacitado e solta qualquer coisa que estiver segurando. Quando esta condição se encerra, você continua Caído.
**Deslocamento 0.** Seu Deslocamento é 0 e não pode ser aumentado.
**Ataques Afetados.** Jogadas de ataque contra você têm Vantagem.
**Salvaguardas Afetadas.** Você falha automaticamente em salvaguardas de Força e Destreza.
**Acertos Críticos Automáticos.** Qualquer jogada de ataque que o atinge é um Acerto Crítico se o atacante estiver a até 1,5 metro de você.
**Alheio.** Você não está ciente do que está ao seu redor.`,

  "Invisível":
`**Surpresa.** Se você está Invisível quando joga Iniciativa, tem Vantagem na jogada.
**Oculto.** Você não é afetado por nenhum efeito que exija que seu alvo seja visto, a menos que o criador do efeito possa vê-lo de alguma forma. Qualquer equipamento que você estiver vestindo ou carregando também está oculto.
**Ataques Afetados.** Jogadas de ataque contra você têm Desvantagem, enquanto suas jogadas de ataque têm Vantagem. Se uma criatura puder vê-lo de alguma forma, você não recebe esse benefício contra ela.`,

  "Paralisado":
`**Incapacitado.** Você adquire a condição Incapacitado.
**Deslocamento 0.** Seu Deslocamento é 0 e não pode aumentar.
**Ataques Afetados.** Jogadas de ataque contra você têm Vantagem.
**Acertos Críticos Automáticos.** Qualquer jogada de ataque que o atinge é um Acerto Crítico se o atacante estiver a até 1,5 metro de você.
**Salvaguardas Afetadas.** Você falha automaticamente em salvaguardas de Força e Destreza.`,

  "Petrificado":
`**Transformado em Substância Inanimada.** Você é transformado, juntamente com qualquer objeto não mágico que esteja vestindo ou carregando, em uma substância sólida e inanimada (geralmente pedra). Seu peso aumenta em dez vezes e você para de envelhecer.
**Incapacitado.** Você adquire a condição Incapacitado.
**Deslocamento 0.** Seu Deslocamento é 0 e não pode aumentar.
**Ataques Afetados.** Jogadas de ataque contra você têm Vantagem.
**Salvaguardas Afetadas.** Você falha automaticamente em salvaguardas de Força e Destreza.
**Resistência a Dano.** Você tem Resistência a todos os danos.
I**munidade a Veneno.** Você tem Imunidade à condição Envenenado.`,

  "Surdo":
`**Não Pode Ouvir.** Você não pode ouvir e falha automaticamente em qualquer teste de atributo que dependa da audição.`
};

const slug = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const CONDITIONS = NOMES
  .map((name) => ({ id: slug(name), name, text: DESCRICOES[name] || PLACEHOLDER(name) }))
  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
