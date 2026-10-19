# 03 — Regras de negócio

"Onde" indica onde a regra é aplicada: **banco** (constraint, gatilho, RLS, RPC), **app** ou **edge** (edge function / rotina).

| Tema | Regra | Onde |
| --- | --- | --- |
| Parcelas | Entrada opcional (`installment_no = 0`) + N parcelas, editáveis uma a uma. Ao pagar, registra valor e data pagos, que podem diferir do previsto. `paid_at` e `paid_amount` são ambos nulos ou ambos preenchidos | banco (check) + app (geração das N parcelas iguais) |
| Soma das parcelas ≠ valor fechado | O app avisa, não bloqueia | app |
| Itens próprios | O casal cria itens fora do catálogo, escolhendo a categoria (`catalog_item_id` nulo, `lead_months` nulo) | banco (grants de insert) + app |
| Casamentos por conta | Um só: `unique(user_id)` em membros e `unique(owner_id)` em casamentos | banco |
| Membros | Até 2 pessoas (dono + 1 convidado), gatilho `members_limit` | banco |
| Convite | Código de 10 caracteres, uso único, válido por 7 dias; um convite ativo por casamento (gerar outro revoga o anterior); só o dono cria | banco (`create_invite`, `accept_invite`) |
| Validação do convite | Só depois do login | app + banco |
| Autoria | `created_by`/`updated_by` em itens e parcelas; app mostra "registrado por" | banco (gatilho `touch_audited`) + app |
| Status do item | `a_decidir`, `contratado`, `pago`, `nao_se_aplica` | banco (enum) |
| "Pago" automático | Item vira `pago` quando há parcelas e todas estão pagas; volta a `contratado` se perder essa condição. Definir `pago` à mão sem isso é rejeitado. Só age em itens já `contratado`/`pago`: o app deve marcar `contratado` ao cadastrar parcelas | banco (`sync_item_status`, `items_guard`) + app |
| Decidido em | `decided_at` preenchido ao sair de `a_decidir`, limpo ao voltar | banco (`items_guard`) |
| Prazos | Prazo ajustado = padrão × min(1, meses disponíveis/12); prazo negativo (depois do casamento) não encurta | banco (`compute_deadline`) — ver `04-catalogo-e-prazos.md` |
| Prazo curto | Com menos de 4 meses até o casamento, o app avisa e prioriza os essenciais | app |
| Mudança da data | Recalcula prazos, exceto os adiados à mão e itens que não estão `a_decidir` | banco (`recalc_deadlines`) |
| Adiar prazo | Alterar `decision_deadline` marca `deadline_postponed`; push segue a nova data | banco (`items_guard`) |
| Plano do casal | Cópia do catálogo no momento da criação, filtrada por estilo e destination; mudanças futuras do catálogo não alteram planos existentes | banco (`generate_plan`) |
| Estilo e destination | Não mudam depois da criação (sem permissão de update) | banco (grants) |
| Já contratou | IDs de catálogo informados em `create_wedding` entram como `contratado` | banco + app |
| Dono | Quem criou é dono e paga. Parceiro(a) edita tudo; só o dono exclui o casamento e convida | banco (RLS, RPC) |
| Remover parceiro | Dono remove o convidado; o convidado pode sair | banco (RLS `members_delete`) |
| Transferir titularidade | Dono passa o papel ao outro membro | banco (`transfer_ownership`) |
| Exclusão de conta | `request_account_deletion` marca o pedido; casamento e arquivos são apagados após 30 dias, a menos que o dono transfira a titularidade. `cancel_account_deletion` desfaz | banco (marca) + **edge/rotina a construir** (apaga) |
| Somente leitura sem assinatura | Escrita em casamento, itens, parcelas e anexos exige `entitlement_expires_at > now()` e status ≠ `expired`; leitura continua. Ao assinar, a edição volta na hora | banco (RLS `can_edit`) + app (UI) |
| Convidado sem assinatura | Vê mensagem pedindo que o dono assine; app em somente leitura | app + banco |
| Limite de anexos | Até 3 PDFs por item, 2 MB cada, só `application/pdf` | banco (gatilho, check) + storage (bucket) + app (mensagem) |
| Acesso a anexos | Só membros do casamento (path `{wedding_id}/{item_id}/{arquivo}.pdf`) | storage (RLS) |
| Notificações | Parcelas: 7, 1 e 0 dias antes. Decisões: 15 e 3 dias antes, só itens essenciais ainda `a_decidir`. Às 9h de Brasília, para os dois parceiros, se o casamento tem assinatura ativa; cada um desliga por tipo | banco (`due_reminders`) + edge (envio) |
| Moeda e idioma | Só BRL e pt-BR, inclusive em destination | banco (numeric) + app |
| Login | E-mail e senha + Google. Apple exige login com Apple quando houver iPhone | Supabase Auth + app |
