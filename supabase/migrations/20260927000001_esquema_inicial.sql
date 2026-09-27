-- Esquema inicial: cuentas, categorías, movimientos, recurrentes y saldos.
-- Cada fila pertenece a un usuario (user_id) y RLS limita el acceso a su dueño.

-- ─── Cuentas ────────────────────────────────────────────────────────────────
create table public.accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('corriente', 'ahorro', 'inversion', 'efectivo')),
  currency    text not null default 'EUR' check (currency in ('EUR', 'USD')),
  is_daily    boolean not null default false,
  sync_source text not null default 'manual' check (sync_source in ('manual', 'enable_banking', 'csv')),
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Solo una cuenta "del día a día" por usuario (la del "cuánto me queda").
create unique index accounts_one_daily on public.accounts (user_id) where is_daily;

-- ─── Categorías (dos niveles: parent_id vacío = categoría principal) ────────
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  parent_id   uuid references public.categories (id) on delete restrict,
  kind        text not null check (kind in ('gasto', 'ingreso')),
  cycle_limit numeric(12, 2) check (cycle_limit > 0), -- solo subcategorías Flex
  sort        integer not null default 0,
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index categories_parent on public.categories (parent_id);

-- ─── Recurrentes (plantillas) ───────────────────────────────────────────────
create table public.recurring (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null,
  amount       numeric(12, 2) not null check (amount > 0),
  type         text not null check (type in ('gasto', 'ingreso', 'transferencia')),
  category_id  uuid references public.categories (id) on delete restrict,
  account_id   uuid not null references public.accounts (id) on delete restrict,
  to_account_id uuid references public.accounts (id) on delete restrict,
  day_of_month smallint not null check (day_of_month between 1 and 31),
  frequency    text not null check (frequency in ('mensual', 'bimestral', 'anual')),
  start_date   date not null,
  end_date     date,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  check ((type = 'transferencia') = (to_account_id is not null)),
  check (to_account_id is null or to_account_id <> account_id)
);

-- ─── Movimientos ────────────────────────────────────────────────────────────
create table public.transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id     uuid not null references public.accounts (id) on delete restrict,
  date           date not null,
  mes_imputacion date not null, -- lo completa el trigger set_mes_imputacion
  amount         numeric(12, 2) not null,
  type           text not null check (type in ('gasto', 'ingreso', 'transferencia', 'saldo_inicial', 'devolucion')),
  category_id    uuid references public.categories (id) on delete restrict,
  name           text not null default '',
  note           text,
  recurring_id   uuid references public.recurring (id) on delete set null,
  related_id     uuid references public.transactions (id) on delete set null, -- devolución → gasto original
  to_account_id  uuid references public.accounts (id) on delete restrict,     -- destino de una transferencia
  created_at     timestamptz not null default now(),
  -- Importe siempre positivo; el tipo define el signo. El saldo inicial puede ser negativo.
  check (type = 'saldo_inicial' or amount > 0),
  -- Transferencias: con destino y distinto del origen. El resto, sin destino.
  check ((type = 'transferencia') = (to_account_id is not null)),
  check (to_account_id is null or to_account_id <> account_id),
  -- Transferencias y saldo inicial no llevan categoría (no cuentan como gasto/ingreso).
  check (type not in ('transferencia', 'saldo_inicial') or category_id is null)
);

create index transactions_user_mes on public.transactions (user_id, mes_imputacion);
create index transactions_account_date on public.transactions (account_id, date);
create index transactions_to_account on public.transactions (to_account_id) where to_account_id is not null;
create index transactions_category on public.transactions (category_id);
create index transactions_recurring on public.transactions (recurring_id) where recurring_id is not null;
create index transactions_related on public.transactions (related_id) where related_id is not null;

-- ─── Saldos cargados a mano (MyInvestor, efectivo USD) ──────────────────────
create table public.balance_snapshots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id  uuid not null references public.accounts (id) on delete cascade,
  date        date not null,
  balance     numeric(14, 2) not null,
  fx_rate     numeric(12, 6) check (fx_rate > 0), -- USD → EUR
  created_at  timestamptz not null default now(),
  unique (account_id, date)
);

-- ─── mes_imputacion ─────────────────────────────────────────────────────────
-- Flex (categoría con cycle_limit): día >= 20 → mes + 2; día < 20 → mes + 1.
-- Resto: el mes de la fecha. Siempre el día 1 del mes.
create function public.set_mes_imputacion()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  is_flex boolean;
begin
  select c.cycle_limit is not null into is_flex
  from public.categories c
  where c.id = new.category_id;

  if coalesce(is_flex, false) then
    new.mes_imputacion := (date_trunc('month', new.date)
      + case when extract(day from new.date) >= 20 then interval '2 months' else interval '1 month' end)::date;
  else
    new.mes_imputacion := date_trunc('month', new.date)::date;
  end if;

  return new;
end;
$$;

create trigger transactions_mes_imputacion
  before insert or update of date, category_id on public.transactions
  for each row execute function public.set_mes_imputacion();

-- ─── Row Level Security ─────────────────────────────────────────────────────
alter table public.accounts          enable row level security;
alter table public.categories        enable row level security;
alter table public.recurring         enable row level security;
alter table public.transactions      enable row level security;
alter table public.balance_snapshots enable row level security;

create policy "solo el dueño" on public.accounts
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "solo el dueño" on public.categories
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "solo el dueño" on public.recurring
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "solo el dueño" on public.transactions
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "solo el dueño" on public.balance_snapshots
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Acceso desde la app solo para usuarios logueados (nada para anon).
grant select, insert, update, delete on
  public.accounts, public.categories, public.recurring, public.transactions, public.balance_snapshots
  to authenticated;
revoke all on
  public.accounts, public.categories, public.recurring, public.transactions, public.balance_snapshots
  from anon;
