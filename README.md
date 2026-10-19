# Wedflux

App Android (iPhone depois) em que o casal organiza as finanças do casamento: itens contratados, parcelas, prazos de decisão e lembretes.
Funciona 100% online e é vendido por assinatura mensal (uma por casamento, 7 dias grátis). O app só registra pagamentos; não paga boletos.
Produto novo do Bruno, separado do Sítio Canto da Mata, para gerar receita recorrente.

## Stack

Expo (React Native) + TypeScript · Supabase (login, Postgres com RLS, storage, edge functions, pg_cron) · RevenueCat (Google Play; Apple depois) · expo-notifications (FCM).

## Estado atual (19/10/2026)

- Documentos de base: prontos para revisão (`docs/`).
- Banco: aplicado no projeto Supabase `wedflux` (ref `nhfujhpteolhndsyqsys`, us-west-2): 12 tabelas com RLS, 54 itens de catálogo, bucket privado `contratos`.
- App Expo: não iniciado. Começa pelo onboarding, depois que os documentos forem aprovados.

## Como rodar

A definir (ainda não há código de aplicação). Banco: ver `supabase/README.md`.

## Documentos

| Arquivo | Conteúdo |
| --- | --- |
| `CLAUDE.md` | Instruções para agentes que forem codar |
| `docs/01-produto.md` | Visão, público, assinatura, escopo da v1 |
| `docs/02-fluxos-e-telas.md` | Fluxos, onboarding (16 etapas), 11 telas |
| `docs/03-regras-de-negocio.md` | Regras fechadas e onde cada uma é aplicada |
| `docs/04-catalogo-e-prazos.md` | Catálogo de 54 itens e fórmula dos prazos |
| `docs/05-banco-de-dados.md` | Schema, RPCs, gatilhos, RLS, storage |
| `docs/06-arquitetura.md` | App, Supabase, RevenueCat, FCM |
| `docs/07-plano-de-construcao.md` | Roadmap em 6 etapas e publicação |
| `docs/08-testes-e-seguranca.md` | Checklist de testes e LGPD |
| `docs/decisoes.md` | Registro de decisões |
| `docs/questoes-em-aberto.md` | Perguntas pendentes e divergências |
| `docs/anexos/` | Fontes originais (escopo, SQL, planilha) |
