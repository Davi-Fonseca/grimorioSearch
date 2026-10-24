# Grimório

Busca de magias de D&D 5ª edição (SRD 5.2, edição 2024) com Elasticsearch, FastAPI e uma interface em HTML/JS.
Filtros por **círculo**, **classe** e **escola de magia**, mais busca textual.

```
navegador ──GET /api/search──▶ FastAPI (app.py) ──▶ Elasticsearch
   static/index.html              monta a consulta        índice "spells-2024"
```

## Como rodar

Pré-requisito: Docker. Não precisa instalar Python nem dependências na sua máquina.

Mantenha esta estrutura de pastas (a API procura a interface em `static/`):

```
grimorio/
├── app.py  ingest.py  vocab.py  spells_pt.py  validate_pt.py
├── docker-compose.yml  requirements.txt
├── data/5e-SRD-Spells-2024.json
└── static/index.html  static/style.css
```

```bash
docker compose up -d --build
```

É só isso. Na primeira vez ele constrói a imagem (instala as dependências uma única vez), sobe o Elasticsearch,
espera ele ficar pronto e indexa as 339 magias sozinho. Depois, `docker compose up -d` basta, e em poucos segundos
o programa está no ar, inclusive depois de desligar o computador.

Abra http://localhost:8000. Para acompanhar a subida: `docker compose logs -f web` (quando aparecer
`Uvicorn running`, está pronto). Para checar o Elasticsearch: http://localhost:8000/api/health

Os dois serviços só aceitam conexões da sua própria máquina (`127.0.0.1`), porque o Elasticsearch daqui roda
sem senha.

**Reindexar do zero** (depois de mudar `ingest.py` ou os dados):

```bash
docker compose exec web python ingest.py --reset

Para a API usar o índice em português, defina `ES_INDEX=spells-2024-pt` no serviço `web` de
`docker-compose.yml` e reinicie. Com Docker, rode os comandos com 
`docker compose exec web python ingest.py --lang pt --reset`.
```

**Desligar:** `docker compose down` (os dados continuam guardados). `docker compose down -v` apaga também o índice;
na próxima subida ele é recriado sozinho.

**Sem Docker na API:** suba só o Elasticsearch (`docker compose up -d elasticsearch`), instale
`pip install -r requirements.txt`, rode `python ingest.py --reset` e `uvicorn app:app --reload`.

Testes (não precisam do Elasticsearch):

```bash
pip install -r requirements-dev.txt
pytest
```

## Publicar de graça no Cloudflare (site estático)

A interface faz a busca e os filtros **no navegador**, a partir de `static/spells.json` e `static/search.js`.
Não precisa de FastAPI nem de Elasticsearch para o site funcionar: basta servir a pasta `static/`.

```bash
# 1. Sempre que mudar data/spells-pt.jsonl, gere o arquivo de dados e confira a busca
python build_static.py
node --test tests/search.test.mjs        # opcional (precisa do Node.js)

# 2. Teste localmente (qualquer servidor de arquivos serve)
python -m http.server 8000 --directory static

# 3. Publique (precisa de conta gratuita no Cloudflare)
npx wrangler deploy                      # usa o wrangler.jsonc deste repositório
```

Também dá para conectar o repositório do GitHub pelo painel do Cloudflare (Workers & Pages) e apontar o
diretório de saída para `static`, sem comando de build, já que `static/spells.json` vai no repositório.
Arquivos estáticos não contam no limite diário de requisições do plano gratuito.

O `docker compose up -d` continua servindo a mesma pasta, mas o Elasticsearch e a API (`app.py`) só são
necessários se você quiser a versão com servidor; a interface atual não usa `/api/search`.

## O que tem em cada arquivo

| Arquivo | Função |
|---|---|
| `data/5e-SRD-Spells-2024.json` | Magias do SRD 2024, em inglês (cópia do repositório 5e-bits/5e-database) |
| `vocab.py` | Escolas, classes e tipos de dano em português |
| `build_static.py`, `static/search.js`, `static/spells.json`, `wrangler.jsonc` | Site estático: gera os dados, busca no navegador e configuração do Cloudflare |
| `ingest.py` | Normaliza os dados, cria o índice (mapeamento e analisadores) e indexa |
| `Dockerfile` | Imagem da API, com as dependências instaladas uma vez |
| `spells_pt.py` | Esquema, validação e adaptação das magias em português, e cruzamento com o SRD |
| `validate_pt.py` | Relatório de validação do arquivo em português |
| `translate_srd.py` | Exporta o SRD em lotes para a IA traduzir, valida e junta as traduções |
| `data/glossario.csv` | Glossário de termos usado no prompt e na verificação das traduções |
| `docs/prompt-extracao.md` | Prompt para extrair as magias do PDF |
| `app.py` | API `/api/search` e `/api/health`; monta a consulta do Elasticsearch |
| `static/index.html` | Estrutura da interface e lógica (JavaScript) |
| `static/style.css` | Estilos (identidade visual, layout e responsividade) |
| `tests/` | Testes da normalização, da consulta e do endpoint |

## Como a busca funciona

**Índice.** O nome da magia é indexado de três formas: texto em inglês (com *stemming*), prefixos
(`edge_ngram`, para "fire" achar "Fireball") e palavra-chave exata para ordenar. A descrição usa o analisador
`english`. Um campo extra, `labels_pt`, guarda em português a escola, as classes, o círculo e o tipo de dano
(sem acento), para que buscas como "mago", "evocação" ou "fogo" funcionem mesmo com os textos em inglês.

**Consulta.** Combina três sinais: nome exato (peso 10), nome começando com o que foi digitado (peso 3) e
texto livre em nome, descrição e rótulos, com tolerância a erros de digitação.

**Filtros e contagens.** Os filtros entram em `post_filter`, e cada faceta (círculo, escola, classe) calcula sua
contagem aplicando todos os filtros *menos o próprio*. Assim, ao marcar "Mago", o número ao lado de "Clérigo"
continua mostrando quantas magias o Clérigo teria dentro da seleção atual. Dentro de um mesmo grupo os valores
são combinados com OU, e entre grupos com E.

## Magias em português (opcional)

O índice padrão usa o SRD 5.2 em inglês. Para ter as magias em português, o caminho recomendado é **traduzir o
próprio JSON do SRD** com ajuda de uma IA. A IA só traduz os textos (nome, descrição, círculos superiores e
material); círculo, escola, classes, componentes, concentração e ritual são copiados do SRD por código, então
não há como a IA errá-los. Tempo de conjuração, alcance e duração também são convertidos por código.

```bash
# 1. (opcional) revise o glossário: data/glossario.csv, conferindo os termos com o seu livro
# 2. Gera ~24 lotes de entrada e o prompt em data/traducao/
python translate_srd.py export

# 3. Para cada lote: cole data/traducao/prompt.txt e depois o entrada-NNN.jsonl na IA,
#    e salve a resposta (só o JSON) como data/traducao/saida-NNN.jsonl

# 4. Valida as traduções e gera data/spells-pt.jsonl (pode rodar com só alguns lotes prontos)
python translate_srd.py merge

# 5. Refaz o que deu problema, ou gera só o que falta
python translate_srd.py export --only fireball,fly
python translate_srd.py export --pendentes

# 6. Guarda os nomes que você corrigiu, para não se perderem ao retraduzir (rode o merge antes)
python translate_srd.py nomes

# 7. Retraduz em um lote só as magias cujo texto contém certos termos (ex.: depois de mudar o glossário)
python translate_srd.py export --contendo "Force damage,spellcasting ability modifier" --budget 0

# 8. Indexa num índice próprio (spells-2024-pt), com o analisador "portuguese"
python ingest.py --lang pt --reset
```

Os nomes guardados em `data/nomes_pt.csv` valem por cima de qualquer tradução nova, e o `export` os envia à IA
como `nome_pt`, para ela usar exatamente aquele texto. Um arquivo `saida` com número maior substitui as traduções
de um arquivo mais antigo (a nova só entra se for válida; se falhar, a antiga continua valendo).

O `merge` recusa a tradução (erro) quando as expressões de dados mudam (8d6, 1d4 + 1) e avisa quando: sobrou
unidade em inglês, uma distância não foi convertida para metros, o texto ficou em inglês, o número de parágrafos ou
o tamanho destoam do original, ou um termo do glossário aparece sem o equivalente. Os avisos não impedem o uso, mas
vale revisar. Os nomes das magias são o ponto mais frágil: a IA pode inventar um nome que não é o do livro,
então confira a lista (`data/spells-pt.jsonl`) com o seu livro.

Para a API usar o índice em português, defina `ES_INDEX=spells-2024-pt` no serviço `web` do
`docker-compose.yml` e reinicie. Com Docker, rode os comandos com `docker compose exec web python ...`.

**Rota alternativa: extrair do PDF do livro.** Se preferir usar o texto do livro, veja `docs/prompt-extracao.md` e
`python validate_pt.py` (valida, cruza com o SRD e sugere o mapa de nomes). Indexe com
`python ingest.py --lang pt --reset` (e `--somente-srd` com o mapa de nomes, para deixar de fora o que não é do SRD).

**Licença.** O SRD 5.2 é CC BY 4.0, e essa licença vale para o conteúdo do SRD em qualquer idioma: copiar, adaptar
e traduzir são permitidos com atribuição, indicando que houve mudanças. A interface já mostra a atribuição, dizendo
que o texto foi traduzido e adaptado. Na rota da tradução própria, o texto em português é seu (feito a partir do
SRD), então não há dúvida de direitos de editora.

## Licença e créditos

This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC,
available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0
International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

Os dados em JSON vêm do projeto [5e-bits/5e-database](https://github.com/5e-bits/5e-database), cujo código é
MIT. O README desse projeto cita também a OGL 1.0a para o material de base; confira lá os termos atuais antes
de publicar.