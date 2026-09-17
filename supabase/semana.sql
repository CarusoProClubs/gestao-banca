-- Rode no SQL Editor do Supabase depois do schema.sql / boletim.sql

create table if not exists public.alavancagem_metas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  inicio date not null,
  nivel text not null default 'segura',
  valor_investido numeric(12, 2) not null default 0,
  multiplo_min numeric(6, 2) not null default 3,
  multiplo_max numeric(6, 2) not null default 5,
  created_at timestamptz not null default now(),
  unique (organization_id, inicio)
);

create table if not exists public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  inicio date not null unique,
  nivel text not null default 'segura',
  multiplo_min numeric(6, 2) not null default 3,
  multiplo_max numeric(6, 2) not null default 5,
  qtd_eventos integer not null default 0,
  status text not null default 'publicado',
  nota text,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_events (
  id uuid primary key default gen_random_uuid(),
  inicio date not null,
  data_evento date,
  horario text,
  esporte text,
  evento text not null,
  mercado text,
  odd_sugerida numeric(10, 4),
  nivel text not null default 'segura',
  status text not null default 'ativo',
  motivo text,
  motivo_alteracao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists weekly_events_inicio_idx on public.weekly_events (inicio, data_evento);

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  titulo text not null,
  corpo text,
  link text,
  inicio_semana date,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_reads (
  notification_id uuid not null references public.app_notifications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

alter table public.alavancagem_metas enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.weekly_events enable row level security;
alter table public.app_notifications enable row level security;
alter table public.notification_reads enable row level security;

drop policy if exists "metas da org" on public.alavancagem_metas;
create policy "metas da org" on public.alavancagem_metas
  for all using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

drop policy if exists "ler plano semana" on public.weekly_plans;
create policy "ler plano semana" on public.weekly_plans
  for select using (auth.role() = 'authenticated');

drop policy if exists "admin plano semana" on public.weekly_plans;
create policy "admin plano semana" on public.weekly_plans
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "ler eventos semana" on public.weekly_events;
create policy "ler eventos semana" on public.weekly_events
  for select using (auth.role() = 'authenticated');

drop policy if exists "admin eventos semana" on public.weekly_events;
create policy "admin eventos semana" on public.weekly_events
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "ler avisos" on public.app_notifications;
create policy "ler avisos" on public.app_notifications
  for select using (auth.role() = 'authenticated');

drop policy if exists "admin cria avisos" on public.app_notifications;
create policy "admin cria avisos" on public.app_notifications
  for insert with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "ler reads" on public.notification_reads;
create policy "ler reads" on public.notification_reads
  for select using (user_id = auth.uid());

drop policy if exists "marcar lido" on public.notification_reads;
create policy "marcar lido" on public.notification_reads
  for insert with check (user_id = auth.uid());
