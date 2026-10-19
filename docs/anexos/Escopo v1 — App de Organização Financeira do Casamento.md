# Escopo v1 — Wedflux, App de Organização Financeira do Casamento

Oct 18, 2026 · @Bruno Henrique

## Visão geral

A v1 é um app Android (iPhone depois) em que o casal organiza as finanças do casamento: itens contratados, parcelas, prazos de decisão e lembretes. Funciona 100% online e é vendido por assinatura mensal, com foco em receita recorrente.

- **Usuários:** o casal compartilha o mesmo casamento, com dois logins. O cadastro é feito sozinho, pela loja.
- **Stack:** Expo (React Native) com TypeScript, Supabase (login, banco, storage e edge functions), RevenueCat (assinaturas) e `expo-notifications` (FCM no Android; APNs no iOS depois).
- **iPhone:** o EAS Build compila o iOS na nuvem, sem precisar de Mac. A conta Apple Developer (US$ 99/ano) só entra na hora de lançar.
- **Pagamentos:** o app apenas registra o que o casal pagou. Não há integração para pagar boletos.
- **Segurança:** dados financeiros protegidos com RLS (Row Level Security) no Supabase, para que um casal nunca veja os dados de outro.

## Fluxo principal

O novo usuário responde ao onboarding sem ter conta, vê o resumo do plano, faz login, assina e chega à home. Quem entra por convite pula o onboarding e o paywall. O detalhe tela a tela está em Fluxo de onboarding.

1. **Onboarding:** perguntas de perfil, data, local, convidados, orçamento e estilo. As respostas ficam no aparelho até o login.
2. **Plano gerado:** carregamento curto e resumo com o nº de itens por grupo e os próximos passos.
3. **Login / cadastro:** e-mail e senha (ou Google). Aqui o casamento é criado e as respostas são gravadas.
4. **Paywall:** 7 dias grátis e depois plano mensal.
5. **Home:** visão consolidada com os números principais e os próximos vencimentos.

**Convite do parceiro(a):** quem criou a conta convida o outro por link ou código. O convidado usa a opção "Tenho um convite" na tela de boas-vindas, faz login, entra no mesmo casamento, vê os mesmos dados e não passa pelo onboarding nem pelo paywall.

## Fluxo de onboarding

O onboarding da v1 tem 12 telas de pergunta, mais plano, notificações, login e paywall. Cada pergunta guarda um dado que muda o plano, a home ou a análise de marketing; o que só enfeita fica para a v1.1.

| # | Tela | Dado guardado | O que muda no app |
| --- | --- | --- | --- |
| 1 | Nome | Nome | Personaliza os textos |
| 2 | Boas-vindas: "Prazer em te conhecer, Nome!" | Nenhum | Opção "Tenho um convite" leva ao login e ao casamento do parceiro(a) |
| 3 | Quem é você? Noiva, Noivo ou Outro(a) | Papel | Textos |
| 4 | Onde você ouviu falar da gente? | Origem | Mede de onde vêm os usuários |
| 5 | Data do casamento (pode ser aproximada) | Data | Calcula os prazos de decisão e mostra quantos dias faltam |
| 6 | Destination wedding ou perto de onde moram? | Tipo de local | Muda a lista de itens |
| 7 | Quantos convidados? | Nº de convidados | Base das estimativas do plano |
| 8 | Orçamento total | Orçamento | Alimenta o Orçamento restante da home |
| 9 | O que mais te preocupa? (marcar uma ou mais opções) | Preocupações | Textos e ordem da home |
| 10 | Já contratou algum fornecedor? Sim ou Não | Sim/Não | Se sim, marca quais na lista do plano |
| 11 | Como você quer o grande dia? Completo, minimalista ou só o necessário | Estilo | Define quais itens adicionais entram na lista |
| 12 | Como você quer usar o app? (marcar uma ou mais opções) | Objetivos de uso | Textos e ordem da home |
| 13 | Montando o plano, depois resumo por grupos e próximos passos | Nenhum | Mostra o valor antes do login |
| 14 | Permissão de notificações | Autorização | Habilita os lembretes |
| 15 | Login / cadastro | Conta | Cria o casamento e grava as respostas |
| 16 | Paywall | Assinatura | Libera o app (7 dias grátis) |

**Fica para a v1.1:** mensagem de agradecimento personalizada, tela de depoimentos de outras noivas, comparativo com e sem plano, contagem regressiva animada e a tela de validação "quem planeja economiza mais" (só com fonte real). **Cortadas:** estado e cidade, e a tela "Vamos montar a sua lista?" (virou o título da tela 13).

**Pontos técnicos:**

- As respostas ficam no aparelho até o login. A tabela de templates de itens precisa ser legível sem login, para gerar o plano no próprio app.
- O código de convite é validado só depois do login.
- Registrar um evento por tela mostra onde as pessoas desistem.
- O banco ganha campos para nome, papel, origem, data, tipo de local, convidados, orçamento, preocupações, estilo e objetivos de uso.

## Telas e ações

A v1 tem 11 telas, e cada uma tem poucas ações principais.

| Tela | O que tem | Botões principais |
| --- | --- | --- |
| Login / Cadastro | E-mail + senha (ou Google) | Entrar, Criar conta, Esqueci a senha |
| Questionário | Perguntas de perfil, data, local, convidados e orçamento (ver Fluxo de onboarding) | Próximo, Voltar, Gerar meu plano |
| Paywall | Plano mensal, benefícios | Assinar, Restaurar compra |
| Home | Contratado, Pago, Falta pagar, Orçamento restante, próximos 3 vencimentos, próximos prazos de decisão | Ver todos os itens, Adicionar item |
| Itens | Lista por categoria, com status (A decidir, Contratado, Pago) | Adicionar, Filtrar, Abrir item |
| Detalhe do item | Fornecedor, valor estimado vs. fechado, parcelas, anexos, prazo de decisão | Editar, Adicionar parcela, Anexar contrato, Marcar como contratado |
| Parcela | Valor, vencimento, status | Marcar como paga (com data), Editar, Excluir |
| Checklist de decisões | Prazos em ordem de data, com check | Marcar como decidido, Adiar prazo |
| Relatórios | Gráficos (gasto por categoria, pago vs. a pagar por mês) | Exportar PDF/planilha |
| Casal | Quem está no casamento | Convidar parceiro(a), Remover |
| Configurações | Notificações, assinatura, conta | Gerenciar assinatura, Sair, Excluir conta |

## Números da home

A home responde "quanto já contratamos e o que falta pagar" com quatro números.

| Número | Como é calculado |
| --- | --- |
| Contratado | Soma dos valores fechados dos itens |
| Pago | Soma das parcelas marcadas como pagas |
| Falta pagar | Contratado menos Pago |
| Orçamento restante | Orçamento total menos Contratado |

## Catálogo de itens e prazos

O plano do casal sai de um catálogo de 54 itens com custo, em 8 categorias, e os prazos de decisão se ajustam ao tempo que falta até o casamento. A planilha "Catálogo de itens v2", enviada na conversa, é a versão de referência.

- **Estrutura de cada item:** categoria, nome, nível (1 a 3), essencial (sim ou não), destination (todos ou só destination) e prazo padrão em meses antes do casamento. Prazo negativo significa meses depois do casamento.
- **Estilo do grande dia:** "Só o necessário" mostra 20 itens, "Minimalista" 34 e "Completo" 49.
- **Destination wedding:** soma 5 itens (hospedagem dos convidados e dos fornecedores, visita técnica, passagens e documentação no exterior), chegando a 54 no estilo completo.
- **Civil e religioso:** os dois aparecem para todos. O casal marca "não se aplica" no que não usar, sem pergunta no onboarding.
- **Checklist enxuto:** só os essenciais que estão no plano. São 24 no total, e cada casal vê de 19 a 24 conforme o estilo e o destination.
- **Ajuste dos prazos:** quem tem 12 meses ou mais usa o prazo padrão. Quem tem menos tem os prazos encurtados na mesma proporção, sem itens já atrasados na criação do plano. Prazos depois do casamento não são encurtados.

```latex
\text{prazo ajustado} = \text{prazo padrão} \times \min\left(1, \frac{\text{meses disponíveis}}{12}\right)
```

Exemplo: com 8 meses até o casamento, o prazo de 10 meses antes vira 6,7 meses antes, e a decisão do espaço vence em cerca de 1,3 mês. Com menos de 4 meses, o app avisa que o prazo é curto e prioriza os essenciais.

Os prazos padrão vêm da agenda de tarefas de um site de casamentos usada como referência (fim de cada janela, por exemplo "10 a 12 meses" vira 10). Usamos só a estrutura e escrevemos nomes e textos próprios.

| Essencial (checklist) | Prazo padrão (meses antes) |
| --- | --- |
| Reserva para imprevistos (5 a 10% do orçamento) | 12 |
| Cerimonialista ou assessoria | 10 |
| Local da cerimônia | 10 |
| Celebrante ou juiz de paz | 10 |
| Espaço da recepção | 10 |
| Buffet ou catering | 10 |
| Fotógrafo | 10 |
| Música ou DJ da cerimônia | 10 |
| Banda ou DJ da festa | 10 |
| Visita técnica ao local (só destination) | 10 |
| Casamento civil: documentos e taxas | 7 |
| Casamento religioso: documentos e taxas | 7 |
| Vestido de noiva | 7 |
| Decoração e flores | 4 |
| Convites | 4 |
| Traje do noivo | 4 |
| Transporte dos convidados | 4 |
| Lua de mel | 4 |
| Buquê da noiva | 2 |
| Acessórios da noiva (sapatos, véu, lingerie) | 2 |
| Alianças | 2 |
| Cabelo e maquiagem | 2 |
| Carro dos noivos | 2 |
| Lembrancinhas | 2 |

## Regras de itens, parcelas e conta

Estas regras estão fechadas para a v1 e definem o schema do banco.

| Tema | Regra |
| --- | --- |
| Parcelas | Entrada opcional mais N parcelas iguais, editáveis uma a uma. Ao pagar, o casal registra valor e data pagos, que podem diferir do previsto. |
| Parcelas vs. valor fechado | Se a soma das parcelas não bater com o valor fechado do item, o app avisa, mas não bloqueia. |
| Itens próprios | O casal pode criar itens fora do catálogo, escolhendo a categoria. |
| Casamentos por conta | Um só na v1. |
| Membros e convite | Até 2 pessoas por casamento: o dono e 1 convidado(a). Convite por código ou link de uso único, válido por 7 dias. |
| Autoria | O app guarda quem criou ou alterou cada item e pagamento, e mostra "registrado por" nas parcelas. |
| Status do item | A decidir, Contratado, Pago e Não se aplica. "Pago" é automático quando todas as parcelas estão pagas. |
| Mudança da data do casamento | Os prazos recalculam, exceto os que o casal já adiou à mão e os itens já decididos. |
| Adiar prazo | O casal altera a data limite do item, e o push segue a nova data. |
| Anexos | Até 3 PDFs por item, de até 2 MB cada, em storage privado acessível só aos membros do casamento. |
| Sem assinatura ativa | O app fica em somente leitura enquanto o casamento não tiver assinatura ativa. Ao assinar, a edição volta na hora. |
| Dono e exclusão | Quem criou é o dono e paga a assinatura. O parceiro(a) edita tudo, mas só o dono exclui o casamento. Se o dono excluir a conta, o casamento é apagado após 30 dias, a menos que ele transfira a titularidade. |
| Plano do casal | É uma cópia do catálogo no momento em que é gerado. Mudanças futuras no catálogo não alteram planos existentes. |
| Número "Pago" na home | Soma o valor efetivamente pago, não o previsto. |
| Login | E-mail e senha, mais Google. Quando houver iPhone, a Apple exige também o login com Apple. |
| Moeda e idioma | Só real (BRL) e só português do Brasil na v1, inclusive em destination wedding. |

## Notificações push

O app avisa os dois parceiros sobre parcelas e prazos de decisão, e cada um pode desligar por tipo. Os avisos saem às 9h, horário de Brasília, nos prazos abaixo.

| Tipo | Quando avisa |
| --- | --- |
| Parcelas | 7 dias antes, 1 dia antes e no dia do vencimento |
| Prazos de decisão | 15 dias antes e 3 dias antes |

- **Como funciona:** uma rotina diária no Supabase (`pg_cron` + Edge Function) busca os vencimentos próximos e dispara o push para os dois parceiros.
- **Teste:** push remoto não funciona no Expo Go no Android. É preciso um development build (EAS Build).

## Assinatura e teste grátis

Há uma única assinatura mensal por casamento: um dos noivos paga e os dois usam. O teste grátis é de 7 dias.

- **Vínculo:** a assinatura fica ligada ao casamento, não ao usuário. O webhook do RevenueCat grava o status em `subscriptions` com o `wedding_id`, e o app e o banco liberam o acesso olhando o casamento.
- **Parceiro(a):** entra pelo convite e não vê paywall.
- **Teste grátis:** configurado no Play Console como oferta introdutória do plano mensal, sem código extra. O RevenueCat informa se a pessoa está no período de teste.
- **Cancelamento:** se o pagante cancelar, o app vira somente leitura (os dados ficam visíveis, mas não dá para editar nem adicionar). É menos atrito que bloquear tudo e serve de gancho para reassinar.
- **Restaurar compra:** só funciona na conta Google de quem pagou. Deixar isso claro na tela do parceiro(a).
- **Cobrança:** a Google exige o sistema de compras da própria loja. Considerar a comissão (15% em programas para pequenos desenvolvedores e na renovação do assinante a partir do 2º ano) no preço.

**Convidado sem assinatura ativa:** se o parceiro(a) entrar por convite e o casamento não tiver assinatura, ele vê uma mensagem pedindo que quem criou a conta do casamento assine. Enquanto isso, o app fica em somente leitura.

## Anexos de contrato

Cada item aceita anexos em PDF de até 2 MB. O limite de tamanho e de tipo é aplicado no storage do Supabase e também validado no app, com mensagem clara.

- **Risco:** contratos escaneados pelo celular costumam passar de 2 MB, e muita gente vai querer anexar foto. Isso pode virar atrito.
- **Ajuste:** os dois limites são parâmetros. Dá para subir para 5 MB ou liberar imagem depois, sem mexer na arquitetura. Acompanhar nos primeiros usuários.
- **Acesso:** regras de storage garantem que só os membros do casamento acessem os arquivos.

## Fora da v1

Estes itens ficam para depois do primeiro uso real, quando a prioridade for decidida com dados:

- Dividir quem pagou o quê (entre os noivos ou com os pais)
- Lista de fornecedores com contato
- Modo escuro
- Terceiros no casamento (cerimonialista, pais, padrinhos)
- Checklist geral do casamento (a v1 tem só o checklist de prazos de decisão)
- iPhone
- Plano anual

No onboarding, ficam para depois: mensagem personalizada de agradecimento, depoimentos de outras noivas, comparativo com e sem plano, contagem regressiva animada e escolha de estado e cidade.

## Ordem de construção

A construção segue seis etapas, e o teste fechado na Play Store pode começar depois da quarta. Anexos e exportação são o que mais pode atrasar o lançamento, por isso ficam para o fim.

1. **Base:** login, casamento, convite e segurança dos dados (RLS).
2. **Núcleo:** questionário, itens, parcelas e home.
3. **Lembretes:** checklist de decisões e push.
4. **Assinatura:** paywall com RevenueCat.
5. **Anexos de contrato:** exige storage e regras de acesso.
6. **Gráficos e exportação:** relatórios em PDF/planilha.

**Publicação:** a conta Google Play custa US$ 25 (pagamento único). Contas pessoais novas costumam ter exigência de teste fechado com vários testadores por cerca de 14 dias antes de liberar produção. Conferir a regra atual no Play Console, porque ela afeta o cronograma. As etapas 5 e 6 podem sair como atualização.

## Próximos passos

O schema do banco já está aplicado no projeto **wedflux** do Supabase (19/10/2026), com o catálogo carregado e a segurança por casamento (RLS) testada num banco local (83 testes). Ele cobre:

- 12 tabelas, todas com RLS: perfis, casamentos, membros, convites, assinatura e seus eventos, catálogo (8 categorias, 54 itens), itens, parcelas, anexos e tokens de push.
- Convite de uso único, válido por 7 dias, com no máximo 2 pessoas por casamento.
- Plano gerado do catálogo por estilo e destination, com prazos ajustados à data do casamento.
- Sem assinatura ativa, os dois ficam em somente leitura.
- Status "pago" automático quando todas as parcelas estão pagas.
- Pasta privada de contratos: só PDF, até 2 MB e até 3 por item.

O que falta, fora do banco:

- Login (e-mail e Google) no Supabase.
- Rotina que apaga os arquivos de contrato e as contas após 30 dias.
- Webhook do RevenueCat que grava a assinatura.
- Envio diário do push (9h, Brasília) a partir da função de lembretes.
- App em Expo, começando pelo onboarding.
