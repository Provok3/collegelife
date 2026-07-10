-- Budget tracker: private per-student list of purchases.
-- Unlike schedule_items, purchases are visible only to the owner (not viewers).
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

alter table public.purchases enable row level security;

-- SELECT: owner only (budget is private to the student)
drop policy if exists purchases_select_own on public.purchases;
create policy purchases_select_own on public.purchases
for select using (owner_id = auth.uid());

-- INSERT: owner only
drop policy if exists purchases_insert_own on public.purchases;
create policy purchases_insert_own on public.purchases
for insert with check (owner_id = auth.uid());

-- UPDATE: owner only
drop policy if exists purchases_update_own on public.purchases;
create policy purchases_update_own on public.purchases
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- DELETE: owner only
drop policy if exists purchases_delete_own on public.purchases;
create policy purchases_delete_own on public.purchases
for delete using (owner_id = auth.uid());

create index if not exists purchases_owner_created_at_idx
  on public.purchases(owner_id, created_at desc);
