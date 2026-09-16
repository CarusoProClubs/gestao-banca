-- Multi-tenant desde o dia 1.
-- Você é a primeira organization. Clientes novos = novas rows, mesmo schema.

create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text,
  role text not null default 'owner',
  created_at timestamptz not null default now()
);

create table if not exists public.bankroll_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  salario_mensal numeric(12,2) not null default 0,
  percentual_lazer numeric(6,4) not null default 0.08,
  meta_lucro numeric(6,4) not null default 0.20,
  stake_padrao numeric(6,4) not null default 0.02,
  updated_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references public.profiles(id),
  casa text,
  id_casa text,
  codigo_booking text,
  data_hora timestamptz,
  tipo text,
  formato text,
  titulo text,
  valor_apostado numeric(12,2),
  moeda text not null default 'BRL',
  odd_bilhete numeric(10,4),
  retorno_casa numeric(12,2),
  status_print text not null default 'pendente',
  status_usuario text not null default 'pendente',
  esporte text,
  jogo text,
  payload jsonb not null default '{}'::jsonb,
  lucro numeric(12,2),
  created_at timestamptz not null default now(),
  unique (organization_id, casa, id_casa)
);

create table if not exists public.ticket_legs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  ordem int not null,
  jogo text,
  selecao text,
  mercado text,
  odd_perna numeric(10,4),
  placar_print text,
  status_print text not null default 'desconhecido',
  unique (ticket_id, ordem)
);

create index if not exists tickets_org_status_idx on public.tickets (organization_id, status_usuario);
create index if not exists tickets_org_data_idx on public.tickets (organization_id, data_hora desc);
create index if not exists legs_org_mercado_idx on public.ticket_legs (organization_id, mercado);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.bankroll_settings enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_legs enable row level security;

create or replace function public.current_org_id()
returns uuid
language sql
stable
as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

create policy "org members read org"
  on public.organizations for select
  using (id = public.current_org_id());

create policy "profiles in same org"
  on public.profiles for select
  using (organization_id = public.current_org_id());

create policy "own profile insert"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "settings by org"
  on public.bankroll_settings for all
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

create policy "tickets by org"
  on public.tickets for all
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

create policy "legs by org"
  on public.ticket_legs for all
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());
