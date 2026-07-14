-- Monthly budgets: each student sets a spending target per calendar month.
-- Private per-student, mirroring purchases (owner-only, not visible to viewers).
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  -- First day of the month this budget applies to (e.g. 2026-07-01).
  month date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One budget per student per month.
  unique (owner_id, month)
);

alter table public.budgets enable row level security;

-- SELECT: owner only (budget is private to the student)
drop policy if exists budgets_select_own on public.budgets;
create policy budgets_select_own on public.budgets
for select using (owner_id = auth.uid());

-- INSERT: owner only
drop policy if exists budgets_insert_own on public.budgets;
create policy budgets_insert_own on public.budgets
for insert with check (owner_id = auth.uid());

-- UPDATE: owner only
drop policy if exists budgets_update_own on public.budgets;
create policy budgets_update_own on public.budgets
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- DELETE: owner only
drop policy if exists budgets_delete_own on public.budgets;
create policy budgets_delete_own on public.budgets
for delete using (owner_id = auth.uid());

create index if not exists budgets_owner_month_idx
  on public.budgets(owner_id, month desc);
