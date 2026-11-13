# Base mundial (elencos, escudos, clubes)

Gerada a partir da Wikipedia (inglês) + Wikidata. Uso pessoal, não comercial.

```bash
node scripts/fetch-world.mjs            # baixa tudo (lento na 1ª vez: ~30-40 min, usa cache depois)
node scripts/fetch-world.mjs --only=ENG1,BRA1   # re-coleta só algumas ligas
node scripts/fetch-world.mjs --refresh  # ignora o cache dos artigos de liga (tabelas/classificação)
node scripts/build-world.mjs            # gera src/data/world.json a partir do bruto
```

Para pegar elencos novos (janela de transferências), apague `scripts/.cache/http/` e rode os dois comandos.

| Arquivo | O que é |
|---|---|
| `leagues.mjs` | Ligas importadas, artigo da temporada na Wikipedia e força base da liga |
| `rating-overrides.json` | Notas manuais para craques (`"Nome": 90`) |
| `legacy-br-meta.json` | Dados dos clubes brasileiros da versão anterior (caixa, patrocínio, torcida, notas) |
| `.cache/raw-world.json` | Dados brutos coletados |
| `../public/logos/` | Escudos baixados (PNG 128px) |

## Como as notas são estimadas
Não existe fonte aberta de "overall". A nota de cada jogador combina:
1. força base da liga (`base` em `leagues.mjs`);
2. desempenho do clube na tabela atual (pontos por jogo) + tamanho/fama do clube;
3. fama do jogador (nº de Wikipedias em que ele tem artigo), comparada ao resto do elenco;
4. idade (jovens e veteranos perdem pontos);
5. clubes brasileiros: média com as notas feitas à mão na versão anterior;
6. `rating-overrides.json` por último.
