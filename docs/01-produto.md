# 01 — Produto

Fonte: `anexos/Escopo v1 — ...md`.

## Visão
App Android (iPhone depois) em que o casal organiza as finanças do casamento: itens contratados, parcelas, prazos de decisão e lembretes. Responde a "quanto já contratamos e o que falta pagar". Funciona 100% online.

## Público
Casais brasileiros que estão planejando o casamento. O casal usa o mesmo casamento, com dois logins (dono + 1 convidado). Terceiros (cerimonialista, pais, padrinhos) ficam fora da v1.

## Proposta de valor
- Plano pronto em minutos: catálogo de 54 itens com custo, em 8 categorias, filtrado por estilo e destination.
- Prazos de decisão ajustados ao tempo que falta até a data.
- Parcelas e vencimentos com lembrete push (7, 1 e 0 dias; decisões em 15 e 3 dias).
- Dados do casal compartilhados e isolados dos demais (RLS).
- O app só registra o que foi pago; não paga boletos.

## Modelo de assinatura
| Item | Regra |
| --- | --- |
| Plano | Mensal, único, por casamento (quem criou paga, os dois usam) |
| Teste | 7 dias grátis (oferta introdutória no Play Console) |
| Loja | Google Play via RevenueCat; Apple depois |
| Sem assinatura ativa | App em somente leitura para os dois |
| Convidado | Não vê paywall; sem assinatura do casamento, vê aviso para o dono assinar |
| Preço | **Em aberto** (considerar comissão da loja; ver `questoes-em-aberto.md`) |

## Dentro da v1
Onboarding sem conta, plano gerado, login (e-mail/senha e Google), paywall, home com 4 números, itens, detalhe do item, parcelas, checklist de decisões, relatórios (gráficos + exportar PDF/planilha), casal (convite), configurações, push, anexos PDF (até 3 por item, 2 MB).

## Fora da v1
Dividir quem pagou o quê · lista de fornecedores com contato · modo escuro · terceiros no casamento · checklist geral do casamento · iPhone · plano anual.
No onboarding, ficam para a v1.1: agradecimento personalizado, depoimentos, comparativo com/sem plano, contagem regressiva animada, validação "quem planeja economiza mais" (só com fonte real). Cortadas: estado e cidade.

## Métricas que importam (proposta, não decididas)
| Métrica | Por quê |
| --- | --- |
| Desistência por tela do onboarding | O escopo prevê 1 evento por tela |
| Conversão onboarding → login → teste iniciado | Mede o funil até a receita |
| Teste → assinante pago | Mede a proposta de valor |
| Retenção mensal e cancelamentos | Receita recorrente |
| % de casamentos com convidado ativo | Mede o uso a dois |
| Itens com parcelas cadastradas por casamento | Mede uso real |
| Origem (pergunta 4) × conversão | Canal de aquisição |
