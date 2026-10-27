# Observatório Econômico

Portal público em https://observatorio-economico.pages.dev/ — código nesta conta GitHub e publicação automática no Cloudflare Pages.

## Edição e visualização
Visual de jornal, com manchete, colunas e editorias. Botões Jornal e Lista de leitura alternam a apresentação e preservam a escolha no navegador.

## Radar internacional
Busca diária em 6 veículos brasileiros e Reuters, Financial Times, BBC, The Economist, FMI, Federal Reserve e BCE. Usa manchetes indexadas publicamente. Não lê contas de assinantes nem republica artigos completos. Originais em inglês são identificados.
Os canais para o Brasil são hipóteses automáticas de leitura a partir de palavras da manchete, não resumos ou conclusões sobre a reportagem.

## Avaliações e personalização
Escala 0 (Fora do radar), 1 (Baixa), 2 (Média), 3 (Alta), 4 (Essencial). Cada nota pode ser revista na editoria Avaliadas.
O ranking combina atualidade e afinidade com avaliações de temas, canais, fontes, região e palavras. Há suavização para não extrapolar uma única nota e diversidade por fonte e assuntos internacionais. Uma parte da seleção continua exploratória.
Avaliações são armazenadas localmente sob oe-feedback-v1; não são enviadas ao servidor. Não há treinamento de um modelo de IA. A coleta obtém candidatos amplos e o navegador reordena as notícias novas segundo as preferências locais.
Exportação/importação JSON permite levar as avaliações a outro dispositivo ou compartilhá-las com o assistente. Favoritos e notas anteriores foram preservados.

## Coleta
GitHub Actions executa scripts/collect.mjs às 10h UTC (7h de Pernambuco). A fila do GitHub pode atrasar a execução. O commit de dados dispara nova publicação no Cloudflare.
Falhas parciais ficam em collectionLog; falha total preserva o acervo e falha o workflow. Fontes institucionais usam janela de 14 dias; imprensa internacional, 7; imprensa brasileira, 3. Máximo de 24 referências novas por fonte e execução.

## Publicação e validação
Cloudflare Pages: branch main, sem framework, sem build, pasta de saída public.
Node 22+: node scripts/check.mjs e node scripts/collect.mjs.


## Sincronização do editor

Consulte [SINCRONIZACAO.md](SINCRONIZACAO.md) para ativar o banco e a entrada GitHub. A sincronização requer a configuração de produção; sem ela, os dados continuam locais. O jornal permanece público.

Configuração das credenciais de produção salva em 27/10/2026. Esta revisão reaplica a implantação para carregar os secrets do editor.
