-- CampusCash / Student Expense Tracker
-- Run this entire script in Supabase Dashboard > SQL Editor.
-- This starter schema is suitable for a local classroom demo. See README for security limitations.

create extension if not exists pgcrypto;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 100),
  amount numeric(12, 2) not null check (amount > 0 and amount <= 10000000),
  category text not null check (category in ('Food', 'Transport', 'Education', 'Shopping', 'Entertainment', 'Health', 'Other')),
  date date not null check (date <= current_date),
  note text null check (note is null or char_length(note) <= 250),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_date_idx on public.expenses (date desc);
create index if not exists expenses_category_idx on public.expenses (category);
create index if not exists expenses_created_at_idx on public.expenses (created_at desc);

create table if not exists public.monthly_budget (
  id smallint primary key default 1 check (id = 1),
  amount numeric(12, 2) not null default 0 check (amount >= 0 and amount <= 100000000),
  updated_at timestamptz not null default now()
);
insert into public.monthly_budget (id, amount) values (1, 0) on conflict (id) do nothing;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at before update on public.expenses
for each row execute function public.set_updated_at();

drop trigger if exists monthly_budget_set_updated_at on public.monthly_budget;
create trigger monthly_budget_set_updated_at before update on public.monthly_budget
for each row execute function public.set_updated_at();

-- RLS stays enabled. The browser never connects directly to Supabase.
-- For this no-login educational demo, the backend uses the anon key, so these
-- policies allow anon access. Do NOT deploy this shared-data policy for real users.
alter table public.expenses enable row level security;
alter table public.monthly_budget enable row level security;

drop policy if exists "Demo API can read expenses" on public.expenses;
create policy "Demo API can read expenses" on public.expenses for select to anon using (true);
drop policy if exists "Demo API can create expenses" on public.expenses;
create policy "Demo API can create expenses" on public.expenses for insert to anon with check (true);
drop policy if exists "Demo API can update expenses" on public.expenses;
create policy "Demo API can update expenses" on public.expenses for update to anon using (true) with check (true);
drop policy if exists "Demo API can delete expenses" on public.expenses;
create policy "Demo API can delete expenses" on public.expenses for delete to anon using (true);

drop policy if exists "Demo API can read budget" on public.monthly_budget;
create policy "Demo API can read budget" on public.monthly_budget for select to anon using (true);
drop policy if exists "Demo API can write budget" on public.monthly_budget;
create policy "Demo API can write budget" on public.monthly_budget for all to anon using (true) with check (true);

grant usage on schema public to anon;
grant select, insert, update, delete on public.expenses to anon;
grant select, insert, update, delete on public.monthly_budget to anon;
