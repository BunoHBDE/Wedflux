-- =====================================================================
-- App de organização financeira do casamento — schema v1 (RASCUNHO PARA REVISÃO)
-- Alvo: Supabase (Postgres 15+). Rodar como migração, DEPOIS de revisar.
--
-- Decisões que este arquivo implementa (todas vindas do documento do escopo):
--  * 1 casamento por conta; até 2 pessoas por casamento (dono + 1 convidado)
--  * Convite por código de uso único, válido por 7 dias
--  * Assinatura por casamento (RevenueCat app_user_id = wedding_id);
--    sem assinatura ativa => somente leitura para os dois
--  * Plano do casal = cópia do catálogo no momento da criação
--  * Prazos de decisão ajustados ao tempo disponível (mesma fórmula da planilha)
--  * Status do item: a_decidir, contratado, pago (automático), nao_se_aplica
--  * "Registrado por" em itens e parcelas
--  * Anexos: até 3 PDFs por item, 2 MB cada, storage privado
--  * Moeda: só BRL (numeric(14,2))
-- =====================================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.partner_role as enum ('noiva', 'noivo', 'outro');
create type public.member_role as enum ('owner', 'partner');
create type public.wedding_style as enum ('so_necessario', 'minimalista', 'completo');
create type public.item_status as enum ('a_decidir', 'contratado', 'pago', 'nao_se_aplica');
create type public.subscription_status as enum ('trialing', 'active', 'canceled', 'billing_issue', 'expired');

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------
create table public.profiles (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  display_name          text,
  partner_role          public.partner_role,
  acquisition_source    text,
  notify_payments       boolean not null default true,
  notify_decisions      boolean not null default true,
  deletion_requested_at timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table public.weddings (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references auth.users (id) on delete restrict,
  wedding_date        date not null,
  date_is_approximate boolean not null default false,
  guest_count         integer check (guest_count > 0),
  total_budget        numeric(14, 2) not null default 0 check (total_budget >= 0),
  style               public.wedding_style not null,
  is_destination      boolean not null default false,
  concerns            text[] not null default '{}',
  usage_goals         text[] not null default '{}',
  already_hired       boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create unique index weddings_one_per_owner on public.weddings (owner_id);

create table public.wedding_members (
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.member_role not null,
  joined_at  timestamptz not null default now(),
  primary key (wedding_id, user_id),
  unique (user_id)                                   -- 1 casamento por pessoa
);
create unique index wedding_members_one_owner on public.wedding_members (wedding_id) where role = 'owner';

create table public.wedding_invites (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references public.weddings (id) on delete cascade,
  code        text not null unique,
  created_by  uuid not null references auth.users (id) on delete cascade,
  expires_at  timestamptz not null default now() + interval '7 days',
  used_by     uuid references auth.users (id) on delete set null,
  used_at     timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);
create unique index wedding_invites_one_active on public.wedding_invites (wedding_id)
  where used_at is null and revoked_at is null;

-- Assinatura: escrita só pelo webhook do RevenueCat (service_role)
create table public.subscriptions (
  wedding_id              uuid primary key references public.weddings (id) on delete cascade,
  status                  public.subscription_status not null,
  product_id              text,
  store                   text,
  will_renew              boolean,
  entitlement_expires_at  timestamptz,   -- até quando o acesso está liberado (inclui carência)
  paid_by_user_id         uuid references auth.users (id) on delete set null,
  updated_at              timestamptz not null default now()
);

create table public.subscription_events (   -- idempotência e auditoria do webhook
  event_id    text primary key,
  wedding_id  uuid references public.weddings (id) on delete set null,
  event_type  text not null,
  payload     jsonb not null,
  received_at timestamptz not null default now()
);

-- Catálogo (templates). Legível sem login: o plano é montado antes do cadastro.
create table public.catalog_categories (
  id         smallint primary key,
  name       text not null unique,
  sort_order smallint not null
);

create table public.catalog_items (
  id               integer generated by default as identity primary key,
  category_id      smallint not null references public.catalog_categories (id),
  name             text not null unique,
  level            smallint not null check (level between 1 and 3),   -- 1 básico, 2 e 3 adicionais
  is_essential     boolean not null default false,                    -- entra no checklist
  destination_only boolean not null default false,
  lead_months      numeric(4, 1) not null,                            -- meses antes; negativo = depois
  notes            text,                                              -- dica exibida ao casal
  sort_order       integer not null,
  active           boolean not null default true
);

-- Itens do casal
create table public.items (
  id                 uuid primary key default gen_random_uuid(),
  wedding_id         uuid not null references public.weddings (id) on delete cascade,
  catalog_item_id    integer references public.catalog_items (id) on delete set null,
  category_id        smallint not null references public.catalog_categories (id),
  name               text not null check (length(btrim(name)) > 0),
  level              smallint not null default 1 check (level between 1 and 3),
  is_essential       boolean not null default false,
  lead_months        numeric(4, 1),                     -- null em item próprio
  status             public.item_status not null default 'a_decidir',
  decision_deadline  date,
  deadline_postponed boolean not null default false,    -- true quando o casal adiou à mão
  decided_at         timestamptz,
  estimated_amount   numeric(14, 2) check (estimated_amount >= 0),
  contracted_amount  numeric(14, 2) check (contracted_amount >= 0),   -- "valor fechado"
  supplier_name      text,
  notes              text,
  sort_order         integer not null default 0,
  created_by         uuid default auth.uid() references auth.users (id) on delete set null,
  updated_by         uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (id, wedding_id)
);
create unique index items_wedding_catalog_uniq on public.items (wedding_id, catalog_item_id)
  where catalog_item_id is not null;
create index items_wedding_idx on public.items (wedding_id);
create index items_deadline_idx on public.items (wedding_id, decision_deadline) where status = 'a_decidir';

create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  item_id         uuid not null,
  wedding_id      uuid not null,
  installment_no  smallint not null check (installment_no >= 0),     -- 0 = entrada
  due_date        date not null,
  expected_amount numeric(14, 2) not null check (expected_amount >= 0),
  paid_at         date,
  paid_amount     numeric(14, 2) check (paid_amount >= 0),
  created_by      uuid default auth.uid() references auth.users (id) on delete set null,
  updated_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (item_id, wedding_id) references public.items (id, wedding_id) on delete cascade,
  unique (item_id, installment_no),
  check ((paid_at is null) = (paid_amount is null))
);
create index payments_item_idx on public.payments (item_id);
create index payments_due_idx on public.payments (wedding_id, due_date) where paid_at is null;

create table public.attachments (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null,
  wedding_id   uuid not null,
  storage_path text not null unique,           -- {wedding_id}/{item_id}/{arquivo}.pdf
  file_name    text not null,
  size_bytes   integer not null check (size_bytes > 0 and size_bytes <= 2097152),
  mime_type    text not null default 'application/pdf' check (mime_type = 'application/pdf'),
  created_by   uuid default auth.uid() references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  foreign key (item_id, wedding_id) references public.items (id, wedding_id) on delete cascade,
  check (storage_path like wedding_id::text || '/' || item_id::text || '/%')
);
create index attachments_item_idx on public.attachments (item_id);

create table public.push_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  token        text not null unique,
  platform     text not null check (platform in ('android', 'ios')),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

-- ---------------------------------------------------------------------
-- Funções auxiliares (schema private, não exposto pela API)
-- ---------------------------------------------------------------------
create function private.safe_uuid(p_text text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return p_text::uuid;
exception when others then
  return null;
end $$;

create function private.is_member(p_wedding_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.wedding_members m
    where m.wedding_id = p_wedding_id and m.user_id = auth.uid()
  );
$$;

create function private.is_owner(p_wedding_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.wedding_members m
    where m.wedding_id = p_wedding_id and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

create function private.has_active_subscription(p_wedding_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s
    where s.wedding_id = p_wedding_id
      and s.status <> 'expired'
      and s.entitlement_expires_at > now()
  );
$$;

create function private.can_edit(p_wedding_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_member(p_wedding_id) and private.has_active_subscription(p_wedding_id);
$$;

create function private.shares_wedding(p_user_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.wedding_members a
    join public.wedding_members b on b.wedding_id = a.wedding_id
    where a.user_id = auth.uid() and b.user_id = p_user_id
  );
$$;

-- Prazo de decisão ajustado ao tempo disponível (mesma regra da planilha do catálogo):
--   prazo ajustado = prazo padrão x min(1, meses disponíveis / 12); prazo negativo não encurta.
create function private.compute_deadline(
  p_wedding_date date,
  p_lead_months numeric,
  p_today date default (now() at time zone 'America/Sao_Paulo')::date
) returns date
language sql stable set search_path = '' as $$
  select p_wedding_date - round(
    case
      when p_lead_months < 0 then p_lead_months
      else p_lead_months * least(1, greatest(0, (p_wedding_date - p_today))::numeric / 30.4375 / 12)
    end * 30.4375
  )::integer;
$$;

-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------
create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create function private.touch_audited() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if auth.uid() is not null then
    new.updated_by := auth.uid();
  end if;
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();
create trigger weddings_touch before update on public.weddings
  for each row execute function private.touch_updated_at();
create trigger items_touch before insert or update on public.items
  for each row execute function private.touch_audited();
create trigger payments_touch before insert or update on public.payments
  for each row execute function private.touch_audited();

-- No máximo 2 pessoas por casamento
create function private.members_limit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.wedding_members where wedding_id = new.wedding_id) >= 2 then
    raise exception 'O casamento já tem 2 pessoas' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger members_limit before insert on public.wedding_members
  for each row execute function private.members_limit();

-- No máximo 3 anexos por item
create function private.attachments_limit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.attachments where item_id = new.item_id) >= 3 then
    raise exception 'Cada item aceita até 3 anexos' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger attachments_limit before insert on public.attachments
  for each row execute function private.attachments_limit();

-- Regras do item: "pago" só quando todas as parcelas estão pagas; decided_at; "adiar prazo"
create function private.items_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'pago' and (tg_op = 'INSERT' or old.status is distinct from 'pago') then
    if not exists (select 1 from public.payments p where p.item_id = new.id)
       or exists (select 1 from public.payments p where p.item_id = new.id and p.paid_at is null) then
      raise exception 'Um item só fica "pago" quando todas as parcelas estiverem pagas'
        using errcode = 'check_violation';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'a_decidir' and new.decided_at is null then
      new.decided_at := now();
    end if;
  elsif new.status is distinct from old.status then
    if new.status = 'a_decidir' then
      new.decided_at := null;
    elsif old.status = 'a_decidir' then
      new.decided_at := now();
    end if;
  end if;

  if tg_op = 'UPDATE'
     and new.decision_deadline is distinct from old.decision_deadline
     and coalesce(current_setting('app.recalc', true), '') <> 'on' then
    new.deadline_postponed := true;
  end if;
  return new;
end $$;
create trigger items_guard before insert or update on public.items
  for each row execute function private.items_guard();

-- Parcelas => status automático do item (contratado <-> pago)
create function private.sync_item_status() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_item   uuid := coalesce(new.item_id, old.item_id);
  v_count  integer;
  v_paid   boolean;
  v_target public.item_status;
begin
  select count(*), coalesce(bool_and(paid_at is not null), false)
    into v_count, v_paid
    from public.payments where item_id = v_item;
  v_target := case when v_count > 0 and v_paid then 'pago' else 'contratado' end;
  update public.items
     set status = v_target
   where id = v_item
     and status in ('contratado', 'pago')
     and status <> v_target;
  return null;
end $$;
create trigger payments_sync_item_status
  after insert or delete or update of paid_at on public.payments
  for each row execute function private.sync_item_status();

-- Mudou a data do casamento => recalcula prazos (exceto adiados à mão e itens já decididos)
create function private.recalc_deadlines() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('app.recalc', 'on', true);
  update public.items i
     set decision_deadline = private.compute_deadline(new.wedding_date, i.lead_months)
   where i.wedding_id = new.id
     and i.lead_months is not null
     and not i.deadline_postponed
     and i.status = 'a_decidir';
  perform set_config('app.recalc', 'off', true);
  return null;
end $$;
create trigger weddings_recalc_deadlines
  after update of wedding_date on public.weddings
  for each row when (old.wedding_date is distinct from new.wedding_date)
  execute function private.recalc_deadlines();

-- ---------------------------------------------------------------------
-- Geração do plano (cópia do catálogo)
-- ---------------------------------------------------------------------
create function private.generate_plan(p_wedding_id uuid, p_contracted_catalog_ids integer[] default '{}')
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  w         public.weddings%rowtype;
  v_level   smallint;
  v_count   integer;
begin
  select * into w from public.weddings where id = p_wedding_id;
  if not found then
    raise exception 'Casamento não encontrado' using errcode = 'P0002';
  end if;
  v_level := case w.style when 'so_necessario' then 1 when 'minimalista' then 2 else 3 end;

  insert into public.items (wedding_id, catalog_item_id, category_id, name, level, is_essential,
                            lead_months, status, decision_deadline, sort_order, created_by)
  select w.id, c.id, c.category_id, c.name, c.level, c.is_essential, c.lead_months,
         case when c.id = any (coalesce(p_contracted_catalog_ids, '{}'))
              then 'contratado'::public.item_status else 'a_decidir'::public.item_status end,
         private.compute_deadline(w.wedding_date, c.lead_months),
         c.sort_order,
         auth.uid()
    from public.catalog_items c
   where c.active
     and c.level <= v_level
     and (not c.destination_only or w.is_destination)
  on conflict (wedding_id, catalog_item_id) where catalog_item_id is not null do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- ---------------------------------------------------------------------
-- RPCs expostas ao app (security definer, só usuários autenticados)
-- ---------------------------------------------------------------------
create function public.create_wedding(
  p_wedding_date date,
  p_style public.wedding_style,
  p_is_destination boolean,
  p_total_budget numeric,
  p_guest_count integer default null,
  p_date_is_approximate boolean default false,
  p_concerns text[] default '{}',
  p_usage_goals text[] default '{}',
  p_already_hired boolean default false,
  p_contracted_catalog_item_ids integer[] default '{}',
  p_display_name text default null,
  p_role public.partner_role default null,
  p_acquisition_source text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if exists (select 1 from public.wedding_members where user_id = v_uid) then
    raise exception 'Você já participa de um casamento' using errcode = 'unique_violation';
  end if;
  if p_wedding_date < (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'A data do casamento não pode estar no passado' using errcode = 'invalid_parameter_value';
  end if;

  insert into public.profiles (user_id, display_name, partner_role, acquisition_source)
  values (v_uid, p_display_name, p_role, p_acquisition_source)
  on conflict (user_id) do update
    set display_name       = coalesce(excluded.display_name, public.profiles.display_name),
        partner_role       = coalesce(excluded.partner_role, public.profiles.partner_role),
        acquisition_source = coalesce(excluded.acquisition_source, public.profiles.acquisition_source);

  insert into public.weddings (owner_id, wedding_date, date_is_approximate, guest_count, total_budget,
                               style, is_destination, concerns, usage_goals, already_hired)
  values (v_uid, p_wedding_date, p_date_is_approximate, p_guest_count, coalesce(p_total_budget, 0),
          p_style, p_is_destination, coalesce(p_concerns, '{}'), coalesce(p_usage_goals, '{}'),
          p_already_hired)
  returning id into v_id;

  insert into public.wedding_members (wedding_id, user_id, role) values (v_id, v_uid, 'owner');
  perform private.generate_plan(v_id, p_contracted_catalog_item_ids);
  return v_id;
end $$;

create function public.create_invite() returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := auth.uid();
  v_w    uuid;
  v_code text;
begin
  select wedding_id into v_w from public.wedding_members where user_id = v_uid and role = 'owner';
  if v_w is null then
    raise exception 'Apenas o dono do casamento pode convidar' using errcode = 'insufficient_privilege';
  end if;
  if (select count(*) from public.wedding_members where wedding_id = v_w) >= 2 then
    raise exception 'O casamento já tem 2 pessoas' using errcode = 'check_violation';
  end if;

  update public.wedding_invites set revoked_at = now()
   where wedding_id = v_w and used_at is null and revoked_at is null;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into public.wedding_invites (wedding_id, code, created_by) values (v_w, v_code, v_uid);
  return v_code;
end $$;

create function public.accept_invite(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.wedding_invites%rowtype;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if exists (select 1 from public.wedding_members where user_id = v_uid) then
    raise exception 'Você já participa de um casamento' using errcode = 'unique_violation';
  end if;

  select * into v_inv from public.wedding_invites where code = upper(btrim(p_code)) for update;
  if not found or v_inv.used_at is not null or v_inv.revoked_at is not null or v_inv.expires_at < now() then
    raise exception 'Convite inválido ou expirado' using errcode = 'P0002';
  end if;

  insert into public.wedding_members (wedding_id, user_id, role) values (v_inv.wedding_id, v_uid, 'partner');
  update public.wedding_invites set used_by = v_uid, used_at = now() where id = v_inv.id;
  insert into public.profiles (user_id) values (v_uid) on conflict (user_id) do nothing;
  return v_inv.wedding_id;
end $$;

create function public.transfer_ownership() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := auth.uid();
  v_w     uuid;
  v_other uuid;
begin
  select wedding_id into v_w from public.wedding_members where user_id = v_uid and role = 'owner';
  if v_w is null then
    raise exception 'Apenas o dono pode transferir a titularidade' using errcode = 'insufficient_privilege';
  end if;
  select user_id into v_other from public.wedding_members where wedding_id = v_w and user_id <> v_uid;
  if v_other is null then
    raise exception 'Não há outra pessoa no casamento' using errcode = 'check_violation';
  end if;
  update public.wedding_members set role = 'partner' where wedding_id = v_w and user_id = v_uid;
  update public.wedding_members set role = 'owner'   where wedding_id = v_w and user_id = v_other;
  update public.weddings set owner_id = v_other where id = v_w;
end $$;

create function public.register_push_token(p_token text, p_platform text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  insert into public.push_tokens (user_id, token, platform)
  values (auth.uid(), p_token, p_platform)
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, last_seen_at = now();
end $$;

-- Exclusão de conta: marca o pedido. O apagamento após 30 dias é uma rotina à parte
-- (Edge Function com service_role, que também remove os arquivos do storage).
create function public.request_account_deletion() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  insert into public.profiles (user_id, deletion_requested_at) values (auth.uid(), now())
  on conflict (user_id) do update set deletion_requested_at = now();
end $$;

create function public.cancel_account_deletion() returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set deletion_requested_at = null where user_id = auth.uid();
end $$;

-- Lembretes do dia (parcelas: 7, 1 e 0 dias; prazos de decisão: 15 e 3 dias). Só service_role.
create function public.due_reminders(
  p_today date default (now() at time zone 'America/Sao_Paulo')::date
) returns table (
  user_id uuid, wedding_id uuid, kind text, item_id uuid, item_name text,
  due_date date, days_before integer, amount numeric
)
language sql stable security definer set search_path = '' as $$
  select m.user_id, p.wedding_id, 'payment'::text, i.id, i.name, p.due_date,
         (p.due_date - p_today), p.expected_amount
    from public.payments p
    join public.items i on i.id = p.item_id
    join public.wedding_members m on m.wedding_id = p.wedding_id
    left join public.profiles pr on pr.user_id = m.user_id
   where p.paid_at is null
     and (p.due_date - p_today) in (7, 1, 0)
     and coalesce(pr.notify_payments, true)
     and private.has_active_subscription(p.wedding_id)
  union all
  select m.user_id, i.wedding_id, 'decision'::text, i.id, i.name, i.decision_deadline,
         (i.decision_deadline - p_today), null::numeric
    from public.items i
    join public.wedding_members m on m.wedding_id = i.wedding_id
    left join public.profiles pr on pr.user_id = m.user_id
   where i.is_essential
     and i.status = 'a_decidir'
     and i.decision_deadline is not null
     and (i.decision_deadline - p_today) in (15, 3)
     and coalesce(pr.notify_decisions, true)
     and private.has_active_subscription(i.wedding_id);
$$;

-- ---------------------------------------------------------------------
-- View da home (respeita a RLS de quem consulta)
-- ---------------------------------------------------------------------
create view public.wedding_summary with (security_invoker = true) as
select w.id as wedding_id,
       w.total_budget,
       c.contracted_total,
       pd.paid_total,
       c.contracted_total - pd.paid_total as remaining_to_pay,
       w.total_budget - c.contracted_total as budget_remaining,
       it.items_total,
       it.items_to_decide
  from public.weddings w
  cross join lateral (
    select coalesce(sum(i.contracted_amount), 0) as contracted_total
      from public.items i
     where i.wedding_id = w.id and i.status in ('contratado', 'pago')
  ) c
  cross join lateral (
    select coalesce(sum(p.paid_amount), 0) as paid_total
      from public.payments p where p.wedding_id = w.id
  ) pd
  cross join lateral (
    select count(*) filter (where i.status <> 'nao_se_aplica') as items_total,
           count(*) filter (where i.status = 'a_decidir') as items_to_decide
      from public.items i where i.wedding_id = w.id
  ) it;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.weddings            enable row level security;
alter table public.wedding_members     enable row level security;
alter table public.wedding_invites     enable row level security;
alter table public.subscriptions       enable row level security;
alter table public.subscription_events enable row level security;
alter table public.catalog_categories  enable row level security;
alter table public.catalog_items       enable row level security;
alter table public.items               enable row level security;
alter table public.payments            enable row level security;
alter table public.attachments         enable row level security;
alter table public.push_tokens         enable row level security;

-- Catálogo: público (inclusive anônimo)
create policy catalog_categories_read on public.catalog_categories
  for select to anon, authenticated using (true);
create policy catalog_items_read on public.catalog_items
  for select to anon, authenticated using (active);

-- Perfis
create policy profiles_select on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) or private.shares_wedding(user_id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Casamentos
create policy weddings_select on public.weddings for select to authenticated
  using (private.is_member(id));
create policy weddings_update on public.weddings for update to authenticated
  using (private.can_edit(id)) with check (private.can_edit(id));
create policy weddings_delete on public.weddings for delete to authenticated
  using (private.is_owner(id));

-- Membros: ver os dois; dono remove o convidado; convidado pode sair
create policy members_select on public.wedding_members for select to authenticated
  using (private.is_member(wedding_id));
create policy members_delete on public.wedding_members for delete to authenticated
  using (role = 'partner' and (user_id = (select auth.uid()) or private.is_owner(wedding_id)));

-- Convites: só o dono vê o código; escrita via RPC
create policy invites_select on public.wedding_invites for select to authenticated
  using (private.is_owner(wedding_id));

-- Assinatura: membros leem; escrita só service_role (ignora RLS)
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (private.is_member(wedding_id));

-- Itens, parcelas, anexos: leitura para membros; escrita exige assinatura ativa
create policy items_select on public.items for select to authenticated
  using (private.is_member(wedding_id));
create policy items_insert on public.items for insert to authenticated
  with check (private.can_edit(wedding_id));
create policy items_update on public.items for update to authenticated
  using (private.can_edit(wedding_id)) with check (private.can_edit(wedding_id));
create policy items_delete on public.items for delete to authenticated
  using (private.can_edit(wedding_id));

create policy payments_select on public.payments for select to authenticated
  using (private.is_member(wedding_id));
create policy payments_insert on public.payments for insert to authenticated
  with check (private.can_edit(wedding_id));
create policy payments_update on public.payments for update to authenticated
  using (private.can_edit(wedding_id)) with check (private.can_edit(wedding_id));
create policy payments_delete on public.payments for delete to authenticated
  using (private.can_edit(wedding_id));

create policy attachments_select on public.attachments for select to authenticated
  using (private.is_member(wedding_id));
create policy attachments_insert on public.attachments for insert to authenticated
  with check (private.can_edit(wedding_id));
create policy attachments_delete on public.attachments for delete to authenticated
  using (private.can_edit(wedding_id));

-- Tokens de push: o usuário vê e apaga os próprios; cadastro via RPC
create policy push_tokens_select on public.push_tokens for select to authenticated
  using (user_id = (select auth.uid()));
create policy push_tokens_delete on public.push_tokens for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Privilégios (menor privilégio; colunas sensíveis só por RPC/trigger)
-- ---------------------------------------------------------------------
revoke all on public.profiles, public.weddings, public.wedding_members, public.wedding_invites,
              public.subscriptions, public.subscription_events, public.catalog_categories,
              public.catalog_items, public.items, public.payments, public.attachments,
              public.push_tokens, public.wedding_summary
  from anon, authenticated;

grant select on public.catalog_categories, public.catalog_items to anon, authenticated;

grant select, insert on public.profiles to authenticated;
grant update (display_name, partner_role, acquisition_source, notify_payments, notify_decisions)
  on public.profiles to authenticated;

grant select, delete on public.weddings to authenticated;
-- style, is_destination e already_hired não mudam depois da criação na v1 (o plano já foi gerado)
grant update (wedding_date, date_is_approximate, guest_count, total_budget, concerns, usage_goals)
  on public.weddings to authenticated;

grant select, delete on public.wedding_members to authenticated;
grant select on public.wedding_invites to authenticated;
grant select on public.subscriptions to authenticated;
grant select, delete on public.push_tokens to authenticated;
grant select on public.wedding_summary to authenticated;

grant select, delete on public.items to authenticated;
grant insert (wedding_id, category_id, name, status, decision_deadline, estimated_amount,
              contracted_amount, supplier_name, notes, sort_order)
  on public.items to authenticated;
grant update (category_id, name, status, decision_deadline, estimated_amount, contracted_amount,
              supplier_name, notes, sort_order)
  on public.items to authenticated;

grant select, delete on public.payments to authenticated;
grant insert (item_id, wedding_id, installment_no, due_date, expected_amount, paid_at, paid_amount)
  on public.payments to authenticated;
grant update (installment_no, due_date, expected_amount, paid_at, paid_amount)
  on public.payments to authenticated;

grant select, delete on public.attachments to authenticated;
grant insert (item_id, wedding_id, storage_path, file_name, size_bytes, mime_type)
  on public.attachments to authenticated;

grant all on all tables in schema public to service_role;

-- Funções: nada para anon; RPCs só para autenticados; due_reminders só service_role
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;

revoke execute on function public.create_wedding(date, public.wedding_style, boolean, numeric, integer, boolean,
    text[], text[], boolean, integer[], text, public.partner_role, text) from public, anon, authenticated;
revoke execute on function public.create_invite() from public, anon, authenticated;
revoke execute on function public.accept_invite(text) from public, anon, authenticated;
revoke execute on function public.transfer_ownership() from public, anon, authenticated;
revoke execute on function public.register_push_token(text, text) from public, anon, authenticated;
revoke execute on function public.request_account_deletion() from public, anon, authenticated;
revoke execute on function public.cancel_account_deletion() from public, anon, authenticated;
revoke execute on function public.due_reminders(date) from public, anon, authenticated;

grant execute on function public.create_wedding(date, public.wedding_style, boolean, numeric, integer, boolean,
    text[], text[], boolean, integer[], text, public.partner_role, text) to authenticated, service_role;
grant execute on function public.create_invite() to authenticated, service_role;
grant execute on function public.accept_invite(text) to authenticated, service_role;
grant execute on function public.transfer_ownership() to authenticated, service_role;
grant execute on function public.register_push_token(text, text) to authenticated, service_role;
grant execute on function public.request_account_deletion() to authenticated, service_role;
grant execute on function public.cancel_account_deletion() to authenticated, service_role;
grant execute on function public.due_reminders(date) to service_role;

-- ---------------------------------------------------------------------
-- Storage: bucket privado "contratos" (PDF, até 2 MB). Caminho: {wedding_id}/{item_id}/{arquivo}.pdf
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contratos', 'contratos', false, 2097152, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy contratos_select on storage.objects for select to authenticated
  using (bucket_id = 'contratos'
         and private.is_member(private.safe_uuid((storage.foldername(name))[1])));
create policy contratos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'contratos'
              and private.can_edit(private.safe_uuid((storage.foldername(name))[1])));
create policy contratos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'contratos'
         and private.can_edit(private.safe_uuid((storage.foldername(name))[1])));

-- ---------------------------------------------------------------------
-- Índices que existem no banco aplicado (nhfujhpteolhndsyqsys) e não estavam no rascunho
-- ---------------------------------------------------------------------
create index items_category_idx on public.items (category_id);
create index items_catalog_idx on public.items (catalog_item_id);
