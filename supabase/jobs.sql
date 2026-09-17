create table if not exists public.ticket_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid references public.profiles (id),
  status text not null default 'lendo',
  image_path text,
  payload jsonb,
  error text,
  created_at timestamptz not null default now()
);

alter table public.ticket_jobs enable row level security;

drop policy if exists "jobs by org" on public.ticket_jobs;
create policy "jobs by org"
  on public.ticket_jobs
  for all
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

insert into storage.buckets (id, name, public)
values ('prints', 'prints', false)
on conflict (id) do nothing;

drop policy if exists "prints read own org" on storage.objects;
create policy "prints read own org"
  on storage.objects for select
  using (bucket_id = 'prints' and auth.role() = 'authenticated');

drop policy if exists "prints upload" on storage.objects;
create policy "prints upload"
  on storage.objects for insert
  with check (bucket_id = 'prints' and auth.role() = 'authenticated');
