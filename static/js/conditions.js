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

// Imagem de cada condição (opcional): caminho do arquivo. Sem imagem, o card mostra o placeholder.
const IMAGENS = {
  "Cego": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>`,
  "Enfeitiçado": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/></svg>`,
  "Envenenado": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/></svg>`,
  "Imobilizado": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v16"/><path d="m19 13 2-1a9 9 0 0 1-18 0l2 1"/><path d="M9 11h6"/><circle cx="12" cy="4" r="2"/></svg>`,
  "Inconsciente": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/></svg>`,
  "Surdo": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18.5a3.5 3.5 0 1 0 7 0c0-1.57.92-2.52 2.04-3.46"/><path d="M6 8.5c0-.75.13-1.47.36-2.14"/><path d="M8.8 3.15A6.5 6.5 0 0 1 19 8.5c0 1.63-.44 2.81-1.09 3.76"/><path d="M12.5 6A2.5 2.5 0 0 1 15 8.5M10 13a2 2 0 0 0 1.82-1.18"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`,
  "Petrificado": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.264 2.205A4 4 0 0 0 6.42 4.211l-4 8a4 4 0 0 0 1.359 5.117l6 4a4 4 0 0 0 4.438 0l6-4a4 4 0 0 0 1.576-4.592l-2-6a4 4 0 0 0-2.53-2.53z"/><path d="M11.99 22 14 12l7.822 3.184"/><path d="M14 12 8.47 2.302"/></svg>`,
  "Invisível": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18a2 2 0 0 0-4 0"/><path d="m19 11-2.11-6.657a2 2 0 0 0-2.752-1.148l-1.276.61A2 2 0 0 1 12 4H8.5a2 2 0 0 0-1.925 1.456L5 11"/><path d="M2 11h20"/><circle cx="17" cy="18" r="3"/><circle cx="7" cy="18" r="3"/></svg>`,
  "Amedrontado": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10v1"/><path d="M7.528 20.472a1.6 1.6 0 012.277 0l1.057 1.056a1.6 1.6 0 002.276 0l1.057-1.056a1.6 1.6 0 012.277 0l1.114 1.114a1.4 1.4 0 002.414-1V10a8 8 0 00-16 0v10.586a1.4 1.4 0 002.414 1z"/><path d="M9 10v1"/></svg>`,
  "Caído": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 17h6v-6"/><path d="m22 17-8.5-8.5-5 5L2 7"/></svg>`,
  "Atordoado": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 11a2 2 0 1 1-4 0 4 4 0 0 1 8 0 6 6 0 0 1-12 0 8 8 0 0 1 16 0 10 10 0 1 1-20 0 11.93 11.93 0 0 1 2.42-7.22 2 2 0 1 1 3.16 2.44"/></svg>`,
  "Paralisado": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10 20-1.25-2.5L6 18"/><path d="M10 4 8.75 6.5 6 6"/><path d="m14 20 1.25-2.5L18 18"/><path d="m14 4 1.25 2.5L18 6"/><path d="m17 21-3-6h-4"/><path d="m17 3-3 6 1.5 3"/><path d="M2 12h6.5L10 9"/><path d="m20 10-1.5 2 1.5 2"/><path d="M22 12h-6.5L14 15"/><path d="m4 10 1.5 2L4 14"/><path d="m7 21 3-6-1.5-3"/><path d="m7 3 3 6h4"/></svg>`,
  "Exaustão": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.768 5.111 13.44 2.44a1.5 1.5 0 012.474 1.561l-1.633 4.625"/><path d="m18.889 13.232.672-.672A1.5 1.5 0 0018.5 10h-2.844"/><path d="m2 2 20 20"/><path d="m7.94 7.94-3.5 3.499A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l5.5-5.5"/></svg>`,
  "Contido": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  "Incapacitado": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 18v-6"/><path d="M12 5v1.344"/><path d="M17.707 6.293A3 3 0 1012 5a3 3 0 00-4.124-2.781"/><path d="M17.997 5.125a4 4 0 012.526 5.77"/><path d="M19.644 19.644A4 4 0 0112 18a4 4 0 11-7.967-.517"/><path d="m2 2 20 20"/><path d="M20 10.536a4 4 0 011.533 5.34"/><path d="M3.477 10.895a4 4 0 011.876-5.542"/><path d="M6 18a4 4 0 01-2-7.464"/><path d="M9 13a4.17 4.17 0 002.166-1.5 4 4 0 00.138-.196"/></svg>`,

};

const slug = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const CONDITIONS = NOMES
  .map((name) => ({ id: slug(name), name, text: DESCRICOES[name] || PLACEHOLDER(name), image: IMAGENS[name] || null }))
  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

// Condições que não aparecem como opção no filtro das magias (nenhuma magia usa o padrão "condição Imobilizado").
const FORA_DO_FILTRO = ["Imobilizado"];
export const FILTER_CONDITIONS = CONDITIONS.filter((c) => !FORA_DO_FILTRO.includes(c.name));
