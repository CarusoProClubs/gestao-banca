alter table public.profiles
  add column if not exists role text not null default 'cliente';

create table if not exists public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  titulo text not null,
  evento text,
  mercado text,
  odd_sugerida numeric,
  nivel text not null default 'media',
  motivo text,
  created_at timestamptz not null default now()
);

alter table public.daily_entries enable row level security;

drop policy if exists "ler boletim" on public.daily_entries;
create policy "ler boletim"
  on public.daily_entries for select
  using (auth.role() = 'authenticated');

drop policy if exists "admin escreve boletim" on public.daily_entries;
create policy "admin escreve boletim"
  on public.daily_entries for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
