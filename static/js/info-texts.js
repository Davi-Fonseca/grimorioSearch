/* Textos dos balões de ajuda (o ícone do olho). A chave é o valor de data-info do botão. */

export const INFO = {
  conc: {
    title: "Concentração",
    html: `<p>Algumas magias e outros efeitos exigem que a Concentração permaneça ativa, conforme especificado em suas descrições. Se o criador do efeito perder a Concentração, o efeito termina. Se o efeito tiver uma duração máxima, a descrição do efeito indica quanto tempo o criador pode se concentrar nele: até 1 minuto, 1 hora ou outra duração. O criador pode encerrar a Concentração a qualquer momento (nenhuma ação é necessária).</p>
      <p>Os seguintes fatores interrompem a Concentração:</p>
      <p><strong>Dano.</strong> Se você sofrer dano, deve ser bem-sucedido em uma salvaguarda de Constituição para manter a Concentração. A CD é 10 ou metade do dano sofrido (arredondado para baixo), o que for maior, até uma CD máxima de 30.</p>
      <p><strong>Incapacitado ou Morto.</strong> Sua Concentração se encerra se tem a condição Incapacitado ou morrer.</p>
      <p><strong>Outro Efeito de Concentração.</strong> Você perde a Concentração em um efeito quando começa a conjurar uma magia que exige Concentração ou ativa outro efeito que também requer Concentração.</p>`
  },
  levels: {
    title: "Círculo",
    html: `<p><strong>T</strong> = truque (círculo 0). Os números de 1 a 9 são os círculos das magias. Você pode marcar vários.</p>
      <p><strong>Filtragem reversa:</strong> o que estiver marcado deixa de aparecer e todo o resto aparece.</p>`
  },
  classes: {
    title: "Classe",
    html: `<p>Mostra as magias de qualquer uma das classes marcadas.</p>
      <p><strong>Filtragem reversa:</strong> o que estiver marcado deixa de aparecer e todo o resto aparece.</p>`
  },
  components: {
    title: "Componentes",
    html: `<p>Mostra só as magias que exigem todos os componentes marcados.</p>
      <p><strong>V</strong> = verbal, <strong>S</strong> = somático, <strong>M</strong> = material.</p>
      <p><strong>Filtragem reversa:</strong> esconde as magias que exigem qualquer um dos componentes marcados.</p>`
  }
};
