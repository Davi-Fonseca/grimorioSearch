# Prompt para extrair as magias do livro em português

Use este prompt com **um bloco de texto por vez** (uma magia, ou poucas páginas), nunca com o PDF inteiro.
Cole 1 magia real do seu PDF e o JSON esperado no lugar do exemplo antes de enviar.

```
Você vai converter o texto de magias de D&D 5ª edição (2024), em português, em JSON.

REGRAS
- Copie os textos literalmente. Não resuma, não traduza, não reescreva e não complete trechos faltantes.
- Se um campo não existir no texto, use null. Nunca invente valores.
- Remova cabeçalhos, rodapés e números de página que se misturaram ao texto.
- Una palavras separadas por hífen no fim da linha.
- Preserve os parágrafos do campo "descricao", separando-os por \n.
- O trecho "Em Círculos Superiores" (ou equivalente) vai no campo "circulos_superiores", fora da descrição.
- Se o bloco terminar no meio de uma magia, não a inclua; liste o nome em "incompletas".
- Responda só com JSON Lines (uma magia por linha), sem comentários e sem blocos de código.

CAMPOS (todos obrigatórios; use null quando não houver)
nome            texto
circulo         número de 0 a 9 (truque = 0)
escola          exatamente uma de: Abjuration, Conjuration, Divination, Enchantment,
                Evocation, Illusion, Necromancy, Transmutation
classes         lista, usando só: Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Warlock, Wizard
tempo_conjuracao texto, como está no livro
alcance         texto, como está no livro
componentes     lista, usando só: V, S, M
material        texto ou null
duracao         texto, como está no livro
concentracao    true ou false
ritual          true ou false
descricao       texto
circulos_superiores texto ou null
pagina          número ou null
problemas       lista de dúvidas sobre a extração (vazia se não houver)

EXEMPLO
(cole aqui 1 magia do seu PDF e o JSON esperado; veja data/exemplo-spells-pt.jsonl)
```

Escola e classes ficam nos nomes em inglês de propósito: os filtros do projeto e o cruzamento com o SRD
dependem desses valores. O texto de exibição continua em português.

Salve a saída em `data/spells-pt.jsonl` (uma magia por linha) e rode `python validate_pt.py`.