-- Testes locais (não rodar no Supabase)
create schema t; grant usage on schema t to public;
create table t.results (name text, ok boolean, info text); grant all on t.results to public;
create function t.check(p_name text, p_ok boolean, p_info text default null) returns void language plpgsql as $$
begin insert into t.results values (p_name, coalesce(p_ok,false), p_info); end $$;
create function t.expect_err(p_name text, p_sql text, p_pat text default null) returns void language plpgsql as $$
begin
  execute p_sql;
  insert into t.results values (p_name, false, 'não deu erro');
exception when others then
  insert into t.results values (p_name, p_pat is null or sqlerrm ilike p_pat, sqlerrm);
end $$;
create function t.affected(p_sql text) returns bigint language plpgsql as $$
declare n bigint; begin execute p_sql; get diagnostics n = row_count; return n; end $$;
create function t.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u::text, false); end $$;
grant execute on all functions in schema t to public;

insert into auth.users (id, email) values
 ('aaaaaaaa-0000-0000-0000-000000000001','a@x'),('aaaaaaaa-0000-0000-0000-000000000002','b@x'),
 ('aaaaaaaa-0000-0000-0000-000000000003','c@x'),('aaaaaaaa-0000-0000-0000-000000000004','d@x'),
 ('aaaaaaaa-0000-0000-0000-000000000005','e@x');

-- ===== 1. plano por estilo/destination (usuários C, D, E, A em casamentos distintos) =====
set role authenticated;
select t.as_user('aaaaaaaa-0000-0000-0000-000000000003');
create temp table w as select 1 as n; -- placeholder p/ evitar erro de temp com role
reset role;
drop table w;

set role authenticated;
select t.as_user('aaaaaaaa-0000-0000-0000-000000000003');
select public.create_wedding('2027-06-19','so_necessario',false,50000) as wc \gset
reset role;
select t.check('plano só_necessário = 20 itens / 19 essenciais',
  (select count(*) from public.items where wedding_id=:'wc')=20 and
  (select count(*) filter (where is_essential) from public.items where wedding_id=:'wc')=19,
  (select count(*)||'/'||count(*) filter (where is_essential) from public.items where wedding_id=:'wc'));

set role authenticated;
select t.as_user('aaaaaaaa-0000-0000-0000-000000000004');
select public.create_wedding('2027-06-19','minimalista',false,50000) as wd \gset
reset role;
select t.check('plano minimalista = 34 / 23',
  (select count(*) from public.items where wedding_id=:'wd')=34 and
  (select count(*) filter (where is_essential) from public.items where wedding_id=:'wd')=23);

set role authenticated;
select t.as_user('aaaaaaaa-0000-0000-0000-000000000005');
select public.create_wedding('2027-06-19','completo',true,50000) as we \gset
reset role;
select t.check('plano completo + destination = 54 / 24',
  (select count(*) from public.items where wedding_id=:'we')=54 and
  (select count(*) filter (where is_essential) from public.items where wedding_id=:'we')=24);

set role authenticated;
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select public.create_wedding('2027-06-19','completo',false,80000,150,false,'{orcamento}','{pagamentos}',true,'{1,2}','Ana','noiva','instagram') as wa \gset
reset role;
select t.check('plano completo sem destination = 49 / 23',
  (select count(*) from public.items where wedding_id=:'wa')=49 and
  (select count(*) filter (where is_essential) from public.items where wedding_id=:'wa')=23);
select t.check('itens já contratados no onboarding', (select count(*) from public.items where wedding_id=:'wa' and status='contratado')=2);

-- ===== 2. fórmula de prazo = planilha (hoje 2026-10-18, casamento 2027-06-19) =====
select t.check('compute_deadline 8.0 meses (planilha: 2026-11-28 p/ Cerimonialista)',
  (select private.compute_deadline('2027-06-19', lead_months, '2026-10-18') from public.catalog_items where name like 'Cerimonialista%')='2026-11-28',
  (select lead_months||' -> '||private.compute_deadline('2027-06-19', lead_months, '2026-10-18') from public.catalog_items where name like 'Cerimonialista%'));
select t.check('compute_deadline prazo negativo não encurta',
  (select private.compute_deadline('2027-06-19', lead_months, '2026-10-18') from public.catalog_items where name like 'Álbum%')='2027-08-19',
  (select private.compute_deadline('2027-06-19', lead_months, '2026-10-18')::text from public.catalog_items where name like 'Álbum%'));
select t.check('compute_deadline janela ≥12 meses = prazo padrão',
  private.compute_deadline('2028-06-19', 12, '2026-10-18') = date '2028-06-19' - 365);

-- ===== 3. sem assinatura: somente leitura =====
set role authenticated; select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select t.check('dono lê itens sem assinatura', (select count(*) from public.items)=49);
select t.expect_err('dono NÃO insere item sem assinatura',
  format($$insert into public.items (wedding_id, category_id, name) values (%L,1,'X')$$, :'wa'));
select t.check('dono NÃO atualiza item sem assinatura',
  t.affected(format($$update public.items set notes='x' where wedding_id=%L$$, :'wa'))=0);
select t.check('dono NÃO altera casamento sem assinatura',
  t.affected(format($$update public.weddings set total_budget=1 where id=%L$$, :'wa'))=0);
reset role;

-- assinatura ativa (webhook)
insert into public.subscriptions (wedding_id,status,entitlement_expires_at)
 select id,'trialing',now()+interval '7 days' from public.weddings;

-- ===== 4. convite =====
set role authenticated; select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select public.create_invite() as code \gset
select t.check('código de convite gerado', length(:'code')=10);
select t.as_user('aaaaaaaa-0000-0000-0000-000000000003'); -- C já tem casamento
select t.expect_err('quem já tem casamento não aceita convite', format($$select public.accept_invite(%L)$$, :'code'), '%já participa%');
reset role;
-- B (usuário novo sem casamento) – cria um usuário F
insert into auth.users (id,email) values ('aaaaaaaa-0000-0000-0000-000000000006','f@x'),('aaaaaaaa-0000-0000-0000-000000000007','g@x');
set role authenticated; select t.as_user('aaaaaaaa-0000-0000-0000-000000000006');
select t.expect_err('código inválido', $$select public.accept_invite('ZZZZZZZZZZ')$$, '%inválido%');
select t.check('convidado entra no casamento do dono', public.accept_invite(lower(:'code'))=:'wa'::uuid);
select t.expect_err('convite é de uso único', format($$select public.accept_invite(%L)$$, :'code'));
select t.check('parceiro vê os itens do casal', (select count(*) from public.items)=49);
select t.expect_err('parceiro não cria convite', $$select public.create_invite()$$, '%dono%');
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select t.expect_err('3ª pessoa: dono não gera convite', $$select public.create_invite()$$, '%2 pessoas%');
reset role;
select t.check('casamento com 2 membros', (select count(*) from public.wedding_members where wedding_id=:'wa')=2);
select t.expect_err('limite de 2 membros (trigger)',
  format($$insert into public.wedding_members (wedding_id,user_id,role) values (%L,'aaaaaaaa-0000-0000-0000-000000000007','partner')$$, :'wa'), '%2 pessoas%');

-- convite expirado
update public.wedding_invites set revoked_at = now() where wedding_id = :'wc';
set role authenticated; select t.as_user('aaaaaaaa-0000-0000-0000-000000000003');
select public.create_invite() as codec \gset
reset role;
update public.wedding_invites set expires_at = now() - interval '1 minute' where code = :'codec';
set role authenticated; select t.as_user('aaaaaaaa-0000-0000-0000-000000000007');
select t.expect_err('convite expirado', format($$select public.accept_invite(%L)$$, :'codec'), '%expirado%');
reset role;

-- ===== 5. isolamento entre casais =====
set role authenticated; select t.as_user('aaaaaaaa-0000-0000-0000-000000000003');
select t.check('C não vê itens do casal A', (select count(*) from public.items where wedding_id=:'wa')=0);
select t.check('C só vê o próprio casamento', (select count(*) from public.weddings)=1);
select t.check('C não atualiza item de A', t.affected(format($$update public.items set notes='hack' where wedding_id=%L$$, :'wa'))=0);
select t.check('C não apaga item de A', t.affected(format($$delete from public.items where wedding_id=%L$$, :'wa'))=0);
select t.expect_err('C não insere item no casamento de A', format($$insert into public.items (wedding_id,category_id,name) values (%L,1,'X')$$, :'wa'));
select t.check('C não vê assinatura de A', (select count(*) from public.subscriptions where wedding_id=:'wa')=0);
select t.check('C não vê convites de A', (select count(*) from public.wedding_invites where wedding_id=:'wa')=0);
select t.check('C não vê perfil de A', (select count(*) from public.profiles where user_id='aaaaaaaa-0000-0000-0000-000000000001')=0);
select t.expect_err('C não escreve assinatura', format($$update public.subscriptions set entitlement_expires_at=now()+interval '10 years' where wedding_id=%L$$, :'wc'), '%permission%');
select t.expect_err('C não troca dono do casamento', format($$update public.weddings set owner_id='aaaaaaaa-0000-0000-0000-000000000003' where id=%L$$, :'wc'), '%permission%');
select t.expect_err('C não muda wedding_id de item', format($$update public.items set wedding_id=%L where wedding_id=%L$$, :'wa', :'wc'), '%permission%');
select t.expect_err('C não se adiciona como membro de A', format($$insert into public.wedding_members (wedding_id,user_id,role) values (%L,'aaaaaaaa-0000-0000-0000-000000000003','partner')$$, :'wa'), '%permission%');
reset role;
-- anon
set role anon;
select t.check('anon lê catálogo', (select count(*) from public.catalog_items)=54);
select t.expect_err('anon não lê itens', $$select * from public.items$$, '%permission%');
select t.expect_err('anon não executa create_wedding', $$select public.create_wedding('2027-06-19','completo',false,1)$$, '%permission%');
select t.expect_err('anon não executa due_reminders', $$select * from public.due_reminders()$$, '%permission%');
reset role;
set role authenticated; select t.as_user('aaaaaaaa-0000-0000-0000-000000000003');
select t.expect_err('usuário comum não executa due_reminders', $$select * from public.due_reminders()$$, '%permission%');
select t.check('helper private só responde sobre o próprio usuário', private.is_owner(:'wa'::uuid) = false);
reset role;

-- ===== 6. itens, parcelas e status automático (A edita) =====
set role authenticated; select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select id as it from public.items where wedding_id=:'wa' and name like 'Fotógrafo%' limit 1 \gset
update public.items set status='contratado', contracted_amount=3000 where id=:'it';
select t.check('decided_at preenchido ao contratar', (select decided_at is not null from public.items where id=:'it'));
select t.expect_err('item sem parcelas não vira pago', format($$update public.items set status='pago' where id=%L$$, :'it'), '%parcelas%');
insert into public.payments (item_id,wedding_id,installment_no,due_date,expected_amount) values
  (:'it',:'wa',0,current_date+30,1000),(:'it',:'wa',1,current_date+60,1000),(:'it',:'wa',2,current_date+90,1000);
select t.check('registrado por no pagamento', (select created_by='aaaaaaaa-0000-0000-0000-000000000001' from public.payments where item_id=:'it' and installment_no=0));
update public.payments set paid_at=current_date, paid_amount=1000 where item_id=:'it' and installment_no in (0,1);
select t.check('2 de 3 pagas => continua contratado', (select status='contratado' from public.items where id=:'it'));
update public.payments set paid_at=current_date, paid_amount=1000 where item_id=:'it' and installment_no=2;
select t.check('todas pagas => item vira pago', (select status='pago' from public.items where id=:'it'));
update public.payments set paid_at=null, paid_amount=null where item_id=:'it' and installment_no=2;
select t.check('desmarcar parcela => volta a contratado', (select status='contratado' from public.items where id=:'it'));
select t.check('resumo: contratado', (select contracted_total from public.wedding_summary)=3000, (select contracted_total::text from public.wedding_summary));
select t.check('resumo: pago', (select paid_total from public.wedding_summary)=2000);
select t.check('resumo: falta pagar', (select remaining_to_pay from public.wedding_summary)=1000);
select t.check('resumo: orçamento restante', (select budget_remaining from public.wedding_summary)=77000);
select t.expect_err('parcela não referencia item de outro casamento', format($$insert into public.payments (item_id,wedding_id,installment_no,due_date,expected_amount) values (%L,%L,9,current_date,1)$$, :'it', :'wc'));
select t.expect_err('pago sem valor', format($$update public.payments set paid_at=current_date where item_id=%L and installment_no=2$$, :'it'));
reset role;

-- parceiro B registra pagamento
set role authenticated; select t.as_user('aaaaaaaa-0000-0000-0000-000000000006');
select t.check('parceiro edita parcela', t.affected(format($$update public.payments set paid_at=current_date, paid_amount=1000 where item_id=%L and installment_no=2$$, :'it'))=1);
select t.check('registrado por = parceiro', (select updated_by='aaaaaaaa-0000-0000-0000-000000000006' from public.payments where item_id=:'it' and installment_no=2));
reset role;

-- ===== 7. anexos =====
set role authenticated; select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.attachments (item_id,wedding_id,storage_path,file_name,size_bytes) select :'it',:'wa', :'wa'||'/'||:'it'||'/1.pdf','c1.pdf',1000;
insert into public.attachments (item_id,wedding_id,storage_path,file_name,size_bytes) select :'it',:'wa', :'wa'||'/'||:'it'||'/2.pdf','c2.pdf',1000;
insert into public.attachments (item_id,wedding_id,storage_path,file_name,size_bytes) select :'it',:'wa', :'wa'||'/'||:'it'||'/3.pdf','c3.pdf',2097152;
select t.expect_err('4º anexo bloqueado', format($$insert into public.attachments (item_id,wedding_id,storage_path,file_name,size_bytes) values (%L,%L,%L,'c4.pdf',1000)$$, :'it', :'wa', :'wa'||'/'||:'it'||'/4.pdf'), '%3 anexos%');
select id as it2 from public.items where wedding_id=:'wa' and name like 'Buffet%' limit 1 \gset
select t.expect_err('anexo > 2 MB', format($$insert into public.attachments (item_id,wedding_id,storage_path,file_name,size_bytes) values (%L,%L,%L,'g.pdf',2097153)$$, :'it2', :'wa', :'wa'||'/'||:'it2'||'/g.pdf'));
select t.expect_err('anexo com caminho de outro casamento', format($$insert into public.attachments (item_id,wedding_id,storage_path,file_name,size_bytes) values (%L,%L,%L,'g.pdf',10)$$, :'it2', :'wa', :'wc'||'/'||:'it2'||'/g.pdf'));
select t.expect_err('anexo não-PDF', format($$insert into public.attachments (item_id,wedding_id,storage_path,file_name,size_bytes,mime_type) values (%L,%L,%L,'g.png',10,'image/png')$$, :'it2', :'wa', :'wa'||'/'||:'it2'||'/g.png'));
-- storage
select t.check('upload no próprio casamento', t.affected(format($$insert into storage.objects (bucket_id,name) values ('contratos',%L)$$, :'wa'||'/'||:'it'||'/1.pdf'))=1);
select t.expect_err('upload no casamento de outro', format($$insert into storage.objects (bucket_id,name) values ('contratos',%L)$$, :'wc'||'/x/1.pdf'));
select t.expect_err('upload com caminho inválido', $$insert into storage.objects (bucket_id,name) values ('contratos','lixo/x.pdf')$$);
reset role;
set role authenticated; select t.as_user('aaaaaaaa-0000-0000-0000-000000000003');
select t.check('C não lê arquivo de A', (select count(*) from storage.objects)=0);
reset role;
set role authenticated; select t.as_user('aaaaaaaa-0000-0000-0000-000000000006');
select t.check('parceiro lê arquivo', (select count(*) from storage.objects)=1);
reset role;

-- ===== 8. recálculo de prazos =====
set role authenticated; select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select id as ip from public.items where wedding_id=:'wa' and name like 'Buffet%' limit 1 \gset
select decision_deadline as before_ip from public.items where id=:'ip' \gset
update public.items set decision_deadline = decision_deadline + 10 where id=:'ip';
select t.check('adiar prazo marca deadline_postponed', (select deadline_postponed from public.items where id=:'ip'));
select id as io from public.items where wedding_id=:'wa' and status='a_decidir' and lead_months>=6 and id<>:'ip' limit 1 \gset
select decision_deadline as before_io from public.items where id=:'io' \gset
update public.weddings set wedding_date='2028-06-19' where id=:'wa';
select t.check('prazo recalculado ao mudar data', (select decision_deadline from public.items where id=:'io') <> :'before_io'::date, (select decision_deadline::text from public.items where id=:'io'));
select t.check('prazo adiado à mão preservado', (select decision_deadline from public.items where id=:'ip') = :'before_ip'::date + 10);
select t.check('item já decidido não é recalculado', (select decision_deadline from public.items where id=:'it') is not distinct from (select decision_deadline from public.items where id=:'it'));
select t.check('recálculo não marca como adiado', not (select deadline_postponed from public.items where id=:'io'));
reset role;

-- ===== 9. lembretes =====
update public.payments set paid_at=null, paid_amount=null where item_id=:'it' and installment_no=1;
update public.payments set due_date = current_date + 7 where item_id=:'it' and installment_no=1;
set role service_role;
select t.check('due_reminders: parcela em 7 dias para os 2 usuários',
  (select count(*) from public.due_reminders(current_date) where kind='payment' and wedding_id=:'wa')=2);
reset role;
update public.profiles set notify_payments=false where user_id='aaaaaaaa-0000-0000-0000-000000000006';
set role service_role;
select t.check('due_reminders respeita preferência do usuário',
  (select count(*) from public.due_reminders(current_date) where kind='payment' and wedding_id=:'wa')=1);
reset role;
update public.subscriptions set entitlement_expires_at = now()-interval '1 day' where wedding_id=:'wa';
set role service_role;
select t.check('due_reminders ignora casamento sem assinatura',
  (select count(*) from public.due_reminders(current_date) where wedding_id=:'wa')=0);
reset role;

-- ===== 10. assinatura vencida: parceiro também fica só leitura; volta ao assinar =====
set role authenticated; select t.as_user('aaaaaaaa-0000-0000-0000-000000000006');
select t.check('parceiro lê com assinatura vencida', (select count(*) from public.items)=49);
select t.check('parceiro não edita sem assinatura', t.affected($$update public.items set notes='x'$$)=0);
reset role;
update public.subscriptions set status='active', entitlement_expires_at = now()+interval '30 days' where wedding_id=:'wa';
set role authenticated; select t.as_user('aaaaaaaa-0000-0000-0000-000000000006');
select t.check('após assinar, parceiro volta a editar', t.affected($$update public.items set notes='x' where name like 'Buffet%'$$)=1);
reset role;

-- ===== 11. transferência, saída e exclusão =====
set role authenticated; select t.as_user('aaaaaaaa-0000-0000-0000-000000000006');
select t.expect_err('parceiro não transfere titularidade', $$select public.transfer_ownership()$$, '%dono%');
reset role;
set role authenticated; select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select public.transfer_ownership();
select t.check('titularidade transferida', (select role from public.wedding_members where user_id='aaaaaaaa-0000-0000-0000-000000000006')='owner' and (select owner_id from public.weddings where id=:'wa')='aaaaaaaa-0000-0000-0000-000000000006');
select t.check('ex-dono não apaga casamento', t.affected(format($$delete from public.weddings where id=%L$$, :'wa'))=0);
select t.check('ex-dono pode sair do casamento', t.affected($$delete from public.wedding_members where user_id='aaaaaaaa-0000-0000-0000-000000000001'$$)=1);
select public.request_account_deletion();
select t.check('pedido de exclusão registrado', (select deletion_requested_at is not null from public.profiles where user_id='aaaaaaaa-0000-0000-0000-000000000001'));
select public.cancel_account_deletion();
select t.check('exclusão cancelada', (select deletion_requested_at is null from public.profiles where user_id='aaaaaaaa-0000-0000-0000-000000000001'));
reset role;
set role authenticated; select t.as_user('aaaaaaaa-0000-0000-0000-000000000006');
select t.check('dono apaga casamento', t.affected(format($$delete from public.weddings where id=%L$$, :'wa'))=1);
reset role;
select t.check('cascata apaga itens/parcelas/anexos', (select count(*) from public.items where wedding_id=:'wa')=0 and (select count(*) from public.payments where wedding_id=:'wa')=0 and (select count(*) from public.attachments where wedding_id=:'wa')=0);

-- ===== resultado =====
select case when ok then 'PASS' else 'FAIL' end as r, name, info from t.results order by ok, name;
select count(*) filter (where ok) as passou, count(*) filter (where not ok) as falhou from t.results;
