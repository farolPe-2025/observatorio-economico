# Observatório Econômico
Portal público de notícias e leituras com foco em Pernambuco, Nordeste e Brasil.

## Publicação no Cloudflare
Conectar este repositório ao Cloudflare Pages. Sem framework, sem comando de build, diretório de saída: public.
Alternativa: Cloudflare Workers Static Assets com wrangler.jsonc.

## Curadoria diária
GitHub Actions executa scripts/collect.mjs às 10h UTC (7h America/Recife). A execução pode atrasar na fila do GitHub. O push atualiza o Cloudflare conectado.
A busca consulta índices RSS públicos para Valor, O Globo, Poder360, Diário de Pernambuco, JC e Folha de Pernambuco. Não acessa assinaturas nem republica artigos integrais.
Falhas parciais são registradas em collectionLog; falha total preserva o acervo e falha o workflow.
Não há integração com favoritos das contas nos jornais. A curadoria inicial foi importada das listas locais.
A coleta é descoberta de manchetes; síntese analítica por IA e leitura integral ainda não estão implementadas.

## Uso local
Node 22+. Servir a pasta public com um servidor HTTP.
node scripts/check.mjs
node scripts/collect.mjs

## Dados
Registros sem título original têm título reconstruído da URL. Datas do acervo podem ser inferidas da URL; sem data identificável, permanecem vazias.
Favoritos e notas pessoais ficam no localStorage do visitante, com exportação JSON. Não são públicos nem sincronizados.
Sem formulário público de edição, credenciais ou autenticação.
