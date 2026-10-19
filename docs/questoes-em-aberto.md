# Questões em aberto

Divididas por momento: o que precisa de resposta para **começar a construir** (front e back ainda não existem) e o que pode esperar até perto do lançamento.

## Para decidir ao construir (etapas 1 a 3)

| # | Pergunta | Por que importa | Sugestão | Quem decide |
| --- | --- | --- | --- | --- |
| 6 | Divergência: `attachments_delete` no anexo `01_schema.sql` usa `storage.foldername(name)`, mas a tabela `attachments` não tem coluna `name`. No banco aplicado a política é `can_edit(wedding_id)` | O arquivo do anexo não rodaria do zero | Migração do repo já usa `can_edit(wedding_id)` (igual ao banco). Atualizar o anexo | Bruno (confirmar) |
| 11 | Quem passa o item de `a_decidir` para `contratado` ao cadastrar parcelas? O gatilho só sincroniza itens já `contratado`/`pago` | Item com parcelas pode ficar `a_decidir` | App marca `contratado` ao adicionar a primeira parcela | Bruno |
| 12 | Permitir mudar estilo/destination depois? O schema bloqueia (plano já gerado) | Casais podem mudar de ideia | Manter bloqueado na v1; reavaliar | Bruno |
| 15 | Push: Expo Push Service ou FCM direto? | Arquitetura da edge function | Expo Push (menos código) | Bruno |
| 14 | Ferramenta de analytics por tela do onboarding | Escopo pede 1 evento por tela | Evento próprio em tabela Supabase ou PostHog; definir com a LGPD | Bruno |
| 8 | Divergência: escopo diz "12 telas de pergunta"; a tabela lista 11 perguntas (3–12 + nome) mais boas-vindas | Clareza na contagem | Tratar a tabela de 16 etapas como a fonte | Bruno |
| 9 | Divergência: "Contratado" no escopo = soma dos valores fechados dos itens; a view `wedding_summary` só soma itens `contratado`/`pago` | Itens `nao_se_aplica` ou `a_decidir` com valor fechado ficam de fora | Manter o SQL (mais coerente); registrar no escopo | Bruno |
| 10 | Divergência: escopo diz push de "prazos de decisão"; `due_reminders` só avisa itens **essenciais** `a_decidir` | Itens não essenciais nunca geram push | Manter (alinha com o checklist enxuto) e deixar explícito | Bruno |
| 18 | Opções das perguntas "O que mais te preocupa?", "Onde ouviu falar da gente?" e "Como quer usar o app?" | O escopo não lista as opções; o app usa textos provisórios (`src/features/onboarding/options.ts`) | Revisar os textos com você | Bruno |
| 19 | Onboarding: o app não registra evento por tela nem mostra o paywall (etapas 15–16 do fluxo) ainda | Escopo pede 1 evento por tela; paywall é a etapa 4 | Entram com analytics (questão 14) e RevenueCat | Bruno |

## Podem esperar (perto do teste fechado e do lançamento)

| # | Pergunta | Por que importa | Sugestão | Quem decide |
| --- | --- | --- | --- | --- |
| 1 | Nome e preço do plano mensal? | Receita; considerar comissão da Google (15% em programas elegíveis) | Definir após pesquisa de preço com 5–10 casais; deixar o preço fora do código (RevenueCat/Play) | Bruno |
| 2 | Política de privacidade e termos de uso | Exigência da Play e da LGPD; bloqueia publicação | Redigir com revisão jurídica antes do teste fechado | Bruno |
| 3 | Métricas de sucesso da v1 | Sem meta, não dá para avaliar | Usar as propostas de `01-produto.md`; fixar metas depois dos primeiros 50 usuários | Bruno |
| 4 | Quem são os testadores do teste fechado e quantos a Play exige hoje? | Afeta o cronograma | Recrutar entre casais de clientes do sítio; conferir o número no Play Console | Bruno |
| 5 | Conteúdo da v1.1 (depoimentos, comparativo, contagem regressiva, agradecimento) | Priorização | Decidir após dados de desistência por tela | Bruno |
| 13 | `weddings.owner_id` é `on delete restrict`: a rotina de 30 dias precisa apagar o casamento antes do usuário. E se o convidado ficar sozinho com dados? | Rotina de exclusão | Definir: apagar casamento inteiro (escopo) e avisar o convidado | Bruno |
| 16 | `03_tests.sql` (83 testes) não está no repositório | Rastreabilidade dos testes | Anexar e salvar em `supabase/tests/` | Bruno |
| 17 | Horário do cron: 9h de Brasília = 12:00 UTC (sem horário de verão atualmente) | Push no horário certo | Confirmar e agendar em UTC | Bruno |
| 7 | Divergência: o banco tem 2 índices (`items_category_idx`, `items_catalog_idx`) ausentes do anexo | Repo precisa refletir o banco | Já incluídos na migração 0001 | — (resolvido) |
