alter table public.weekly_plans add column if not exists x_baixa numeric(6, 2) default 4;
alter table public.weekly_plans add column if not exists x_media numeric(6, 2) default 7;
alter table public.weekly_plans add column if not exists x_alta numeric(6, 2) default 12;
