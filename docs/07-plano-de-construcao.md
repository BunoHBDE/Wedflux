# 07 — Plano de construção

O teste fechado na Play Store pode começar depois da etapa 4. Anexos e exportação (5 e 6) podem sair como atualização. Sem estimativas de prazo: o escopo não as define.

| Etapa | Entregáveis | Pronto quando |
| --- | --- | --- |
| 1. Base | Projeto Expo + TS estrito; login e-mail/senha e Google; casamento (`create_wedding`); convite (`create_invite`/`accept_invite`); tipos gerados | Duas contas entram no mesmo casamento e uma terceira não vê nada deles |
| 2. Núcleo | Onboarding (16 etapas), plano, lista de itens, detalhe, parcelas, home com 4 números | Fluxo do onboarding ao home completo, números batem com `wedding_summary` |
| 3. Lembretes | Checklist de decisões (marcar/adiar), registro de push token, edge function + `pg_cron` às 9h | Push chega nos dois aparelhos nos prazos 7/1/0 e 15/3 |
| 4. Assinatura | Paywall RevenueCat, webhook, somente leitura, restaurar compra | Compra em teste libera edição na hora; cancelamento vira somente leitura |
| 5. Anexos | Upload de PDF (≤ 2 MB, ≤ 3 por item), validação com mensagem clara | Membro anexa e abre; outro casal não acessa |
| 6. Gráficos e exportação | Relatórios (gasto por categoria; pago vs. a pagar por mês), PDF/planilha | Exportação confere com a home |

## Pendências fora do banco
- Configurar login (e-mail e Google) no Supabase (+ provedor Google no Google Cloud).
- Rotina que apaga arquivos de contrato e contas após 30 dias.
- Webhook do RevenueCat gravando `subscriptions`.
- Envio diário do push (9h Brasília) a partir de `due_reminders`.
- App Expo, começando pelo onboarding.
- Registrar as migrações como aplicadas na CLI (`supabase migration repair`).

## Publicação na Google Play
| Item | Detalhe |
| --- | --- |
| Conta | Google Play Console, US$ 25 pagamento único |
| Teste fechado | Contas pessoais novas costumam exigir teste fechado com vários testadores por cerca de 14 dias antes da produção. **Conferir a regra atual no Play Console** (número de testadores e dias) |
| Assinatura | Produto mensal + oferta introdutória de 7 dias; ligar ao RevenueCat |
| Conferir no console | Política de privacidade (URL), formulário de segurança dos dados, classificação etária, país/idioma, permissão de notificações, formulário de exclusão de conta (exigido pela Play), prints e descrição |
| Build | EAS Build gera o AAB; assinatura gerenciada pelo EAS |
| iPhone (depois) | Conta Apple Developer US$ 99/ano; login com Apple obrigatório |
