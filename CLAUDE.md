# CLAUDE.md — Wedflux

## Produto
App Android (iPhone depois) de organização financeira de casamento. O casal (até 2 pessoas) controla itens, parcelas, prazos de decisão e lembretes. 100% online, assinatura mensal por casamento (7 dias grátis), sem pagamento de boletos. Só BRL e só português do Brasil na v1.

## Stack
Expo (React Native) + TypeScript estrito · Supabase (auth, Postgres + RLS, storage, edge functions, pg_cron) · RevenueCat · expo-notifications (FCM). Push remoto não funciona no Expo Go: usar development build (EAS Build).

## Estado
Banco aplicado (projeto `nhfujhpteolhndsyqsys`). App Expo com a etapa 1 (login, casamento, convite) escrita; próxima: etapa 2 (onboarding, itens, parcelas, home).

## Estrutura de pastas planejada
```
app/            rotas (expo-router)
src/
  components/   UI reutilizável
  features/     onboarding, items, payments, checklist, reports, couple, settings
  lib/          cliente Supabase, RevenueCat, notificações
  types/        tipos gerados do banco
supabase/
  migrations/   única forma de mudar o banco
  functions/    edge functions (webhook RevenueCat, push diário, limpeza de contas)
docs/           documentação (fonte de verdade do produto)
```

## Convenções
- Nomes de código (variáveis, funções, tabelas, colunas) em inglês; textos exibidos no app em português do Brasil.
- TypeScript com `strict: true`; sem `any` sem justificativa.
- Valores em BRL como `numeric(14,2)` no banco; nunca float para dinheiro no cliente (usar centavos inteiros ou lib decimal).
- Datas de negócio em `date`, fuso `America/Sao_Paulo`.
- Nenhum requisito, preço ou prazo inventado: dúvida vai para `docs/questoes-em-aberto.md`.

## Segurança (obrigatório)
- A chave `service_role` nunca vai para o app nem para o repositório.
- Toda escrita sensível passa pelas funções do banco (RPCs) ou por edge functions.
- Nenhuma tabela nova sem RLS.
- Mudanças de banco só por migração em `supabase/migrations/`; nunca editar pelo painel sem gerar migração.
- O app nunca chama `due_reminders` (só `service_role`) nem escreve em `subscriptions`/`subscription_events`.
- `.env*` fora do git (exceto `.env.example`).

## Comandos
`npm install` · `npm run typecheck` · `npx expo start` · `eas build` (a configurar) · `supabase db push` / `supabase gen types typescript`. Sem `npx expo install` neste ambiente (a API da Expo é bloqueada): usar `npm install pacote@versão` com as versões de `node_modules/expo/bundledNativeModules.json`.

## Documentos
Leia antes de codar: `docs/03-regras-de-negocio.md` e `docs/05-banco-de-dados.md`.
`docs/01-produto.md` · `02-fluxos-e-telas.md` · `04-catalogo-e-prazos.md` · `06-arquitetura.md` · `07-plano-de-construcao.md` · `08-testes-e-seguranca.md` · `decisoes.md` · `questoes-em-aberto.md`. Fontes originais em `docs/anexos/`.
