# Ativar a sincronização

O jornal continua público. A API permite apenas o editor GitHub de ID 311066321 (farolPe-2025). Nenhum token pessoal é necessário.

## Configuração única

1. Criar um OAuth App em https://github.com/settings/developers — OAuth Apps — New OAuth App.
2. Nome: Observatório Econômico — Editor. Homepage: https://observatorio-economico.pages.dev/ . Authorization callback URL: https://observatorio-economico.pages.dev/api/editor/callback . Device Flow desativado.
3. Na Cloudflare, projeto Pages observatorio-economico — Settings — Variables and Secrets — Production: adicionar GITHUB_CLIENT_ID (Text) com Client ID; GITHUB_CLIENT_SECRET (Secret) com o segredo gerado pelo GitHub. Não colocar o segredo no repositório ou no chat.
4. O wrangler.jsonc configura o banco D1 observatorio-editor como DB e o ID do editor. As tabelas são definidas em migrations/0001_editor.sql (inicializadas no console D1).
5. Reimplantar a última versão para carregar os valores. Abrir o jornal — Entrar como editor — autorizar a identificação GitHub. A autenticação não pede acesso a repositórios.
6. No navegador usado para avaliar antes, entrar como editor e clicar Recuperar avaliações deste navegador. Em conflitos, escolher a versão desejada. Como alternativa, exportar no navegador antigo e importar em Ver meu radar no navegador conectado.
7. Entrar com a mesma conta no celular. Uma avaliação deve aparecer nos dois após Sincronizado. Sessão dura sete dias; o jornal permanece acessível sem sessão.

## Funcionamento

Avaliações, favoritos e notas são privados. A API não retorna dados sem sessão válida. A fila local conserva alterações pendentes após falhas de conexão; novas tentativas acontecem ao reconectar, ao voltar à aba e a cada minuto com a página visível. A indicação Sincronizado só aparece após resposta do servidor. Não feche a página antes de salvar localmente se o navegador bloquear armazenamento. Exportações são cópias de segurança.

Cada campo possui revisão e alteração condicional. Uma cópia desatualizada nunca substitui silenciosamente uma versão mais recente. Exclusões preservam uma marca de revisão. Conflitos mantêm as duas versões para escolha. O banco não contém textos completos das matérias nem altera a coleta diária.

## Validação local

node scripts/test-sync.mjs
node scripts/test-sync-client.mjs

Testes cobrem autenticação, CSRF, validação de valores, OAuth com PKCE, repetição após falha de resposta, conflitos entre aparelhos, exclusões, fila offline e encerramento da sessão. O fluxo real OAuth e a sincronização entre aparelhos só estão confirmados depois da configuração e entrada do editor.
