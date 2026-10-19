# 08 — Testes e segurança

O `03_tests.sql` (83 testes de RLS num Postgres local, citado no escopo) **não está no repositório**; os status abaixo vêm do escopo, não foram reexecutados aqui. Quando o arquivo for anexado, incluí-lo em `supabase/tests/`.

Legenda: ✅ verificado no Postgres local (segundo o escopo) · ⬜ falta · 🔎 conferido nesta preparação.

## Banco
| Teste | Status |
| --- | --- |
| Isolamento entre casais (RLS): um casal não lê nem escreve dados de outro | ✅ (escopo) |
| Somente leitura sem assinatura (itens, parcelas, anexos, casamento) | ✅ (escopo) |
| Convite: uso único, 7 dias, revogado ao gerar outro, só dono cria | ✅ (escopo) |
| Máximo 2 pessoas por casamento; 1 casamento por conta | ✅ (escopo) |
| Anexos: 3 por item, 2 MB, só PDF | ✅ (escopo) |
| Status automático (pago ↔ contratado) | ✅ (escopo) |
| Recálculo de prazos ao mudar a data; adiado não recalcula | ✅ (escopo) |
| `compute_deadline`: 2 exemplos numéricos + casos-limite no banco aplicado | 🔎 |
| Contagens do seed: 54 itens, 8 categorias, 20/34/49(+5), 24 essenciais | 🔎 |
| Política `attachments_delete` do arquivo anexo vs. banco aplicado | 🔎 divergência (ver questões) |
| `due_reminders` nas janelas 7/1/0 e 15/3 | ⬜ confirmar |
| `anon` não chama RPCs nem lê dados de casais | ⬜ confirmar |

## App e integrações (todos ⬜)
- Onboarding: respostas persistem no aparelho e chegam a `create_wedding`; plano gerado sem login.
- Convidado entra sem paywall; vê aviso quando não há assinatura.
- Somente leitura na UI (botões desabilitados) e erro tratado quando o banco recusa.
- Upload: validação de tipo/tamanho com mensagem; 4º anexo recusado.
- Aviso quando soma das parcelas ≠ valor fechado.
- Webhook RevenueCat: idempotência (mesmo `event_id` duas vezes), todos os status.
- Push: horário, destinatários, preferências por tipo, token inválido.
- Rotina de exclusão (30 dias): arquivos, casamento, usuário; cancelamento do pedido; transferência.

## Segurança
- [ ] `service_role` fora do app e do git (`.env.example` sem valores).
- [ ] Rodar `get_advisors` (segurança) no Supabase antes do lançamento.
- [ ] Revisar `security definer` com `search_path = ''` (já nas funções do schema).
- [ ] Secrets do webhook e do FCM só como secrets de edge function.

## Privacidade (LGPD) — pendências
- [ ] Política de privacidade e termos de uso (URL pública para a Play).
- [ ] Base legal e finalidades dos dados (financeiros, e-mail, origem de aquisição).
- [ ] Consentimento claro e registro, se houver analytics de funil.
- [ ] Exclusão de conta no app e fluxo web (exigência da Play) e prazo de 30 dias descrito.
- [ ] Direitos do titular: acesso/exportação, correção, eliminação.
- [ ] Retenção de backups, contratos (PDFs) e `subscription_events` (payload).
- [ ] Operadores: Supabase, RevenueCat, Google/FCM; transferência internacional (us-west-2).
- [ ] Encarregado (DPO)/contato e plano de resposta a incidentes.
