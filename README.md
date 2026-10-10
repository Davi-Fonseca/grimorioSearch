# Grimório

Busca de magias de D&D 5ª edição (SRD 5.2, edição 2024) com Elasticsearch, FastAPI e uma interface em HTML.
Filtros por **círculo**, **classe** e **escola de magia**, mais busca textual.

```
navegador ──GET /api/search──▶ FastAPI (app.py) ──▶ Elasticsearch
   static/index.html              monta a consulta        índice "spells-2024"
```

## Como rodar

Pré-requisito: Docker e Python.

Mantenha esta estrutura de pastas (a API procura a interface em `static/`):

```
grimorio/
├── app.py  ingest.py  vocab.py  docker-compose.yml
├── data/5e-SRD-Spells-2024.json
└── static/index.html  static/style.css
```

```bash
# 1. Sobe o Elasticsearch e a API (a primeira vez demora, pois instala as dependências)
docker compose up -d

# 2. Aguarde ~30 s e indexe as 339 magias (roda dentro do container)
docker compose exec web python ingest.py --reset
```

Abra http://localhost:8000. Para checar a conexão com o Elasticsearch: http://localhost:8000/api/health

Se algo não funcionar, `docker compose logs web` mostra o erro da API.

Os dois serviços só aceitam conexões da sua própria máquina (`127.0.0.1`), porque o Elasticsearch
daqui roda sem senha.

**Sem Docker na API:** suba só o Elasticsearch (`docker compose up -d elasticsearch`), instale
`pip install -r requirements.txt`, rode `python ingest.py --reset` e `uvicorn app:app --reload`.

Testes (não precisam do Elasticsearch):

```bash
pip install -r requirements-dev.txt
pytest
```

## O que tem em cada arquivo

| Arquivo | Função |
|---|---|
| `data/5e-SRD-Spells-2024.json` | Magias do SRD 2024, em inglês (cópia do repositório 5e-bits/5e-database) |
| `vocab.py` | Escolas, classes e tipos de dano em português |
| `ingest.py` | Normaliza os dados, cria o índice (mapeamento e analisadores) e indexa |
| `app.py` | API `/api/search` e `/api/health`; monta a consulta do Elasticsearch |
| `static/index.html` | Estrutura da interface e lógica |
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


## Licença e créditos

This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC,
available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0
International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

Os dados em JSON vêm do projeto [5e-bits/5e-database](https://github.com/5e-bits/5e-database), cujo código é
MIT. O README desse projeto cita também a OGL 1.0a para o material de base;