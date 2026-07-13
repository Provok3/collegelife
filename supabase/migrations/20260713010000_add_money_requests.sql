-- "Ask parents for money": a student records a money request; connected viewers
-- (parents) are notified and can pay via their own Venmo/Cash App/Zelle/Apple Cash.
-- The app never touches money -- notifications carry the student's pay handles so
-- the parent's own app opens with the amount prefilled (deep links) or the handle
-- is shown to copy (Zelle / Apple Cash have no payment URL scheme).

-- ---------------------------------------------------------------------------
-- Student pay handles. Owner-only: the profiles table is world-readable to all
-- authenticated users, so pay handles (esp. Zelle/Apple Cash phone/email PII)
-- must NOT live there. They cross to a parent only through a money_request
-- notification, and only for connected viewers.
-- ---------------------------------------------------------------------------
create table if not exists public.payment_handles (
  owner_id   uuid primary key references public.profiles(id) on delete cascade,
  venmo      text,   -- Venmo username (no leading @)
  cashtag    text,   -- Cash App $cashtag (no leading $)
  zelle      text,   -- Zelle email or phone
  apple_cash text,   -- Apple Cash phone number
  updated_at timestamptz not null default now()
);

alter table public.payment_handles enable row level security;

drop policy if exists payment_handles_select_own on public.payment_handles;
create policy payment_handles_select_own on public.payment_handles
for select using (owner_id = auth.uid());

drop policy if exists payment_handles_insert_own on public.payment_handles;
create policy payment_handles_insert_own on public.payment_handles
for insert with check (owner_id = auth.uid());

drop policy if exists payment_handles_update_own on public.payment_handles;
create policy payment_handles_update_own on public.payment_handles
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists payment_handles_delete_own on public.payment_handles;
create policy payment_handles_delete_own on public.payment_handles
for delete using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Money requests. Owner-only, like purchases/budgets. The student sees their
-- own requests and marks them received; parents never read this table directly
-- (they see the request as a notification).
-- ---------------------------------------------------------------------------
create table if not exists public.money_requests (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  amount      numeric(12, 2) not null check (amount > 0),
  note        text,
  status      text not null default 'pending' check (status in ('pending', 'received')),
  created_at  timestamptz not null default now(),
  received_at timestamptz
);

alter table public.money_requests enable row level security;

drop policy if exists money_requests_select_own on public.money_requests;
create policy money_requests_select_own on public.money_requests
for select using (owner_id = auth.uid());

drop policy if exists money_requests_insert_own on public.money_requests;
create policy money_requests_insert_own on public.money_requests
for insert with check (owner_id = auth.uid());

drop policy if exists money_requests_update_own on public.money_requests;
create policy money_requests_update_own on public.money_requests
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists money_requests_delete_own on public.money_requests;
create policy money_requests_delete_own on public.money_requests
for delete using (owner_id = auth.uid());

create index if not exists money_requests_owner_created_idx
  on public.money_requests(owner_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Allow the 'money_request' notification type. This CHECK was defined inline on
-- the notifications table and later extended for status_comment types; re-create
-- it with the full current set plus money_request.
-- ---------------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'new_photo','new_status','new_schedule',
    'photo_comment','photo_reaction',
    'comment_reply','comment_reaction',
    'status_comment','status_comment_reply','status_comment_reaction',
    'money_request'
  ));

-- ---------------------------------------------------------------------------
-- Fan a money request out to all connected viewers as a notification. Mirrors
-- notify_new_photo. SECURITY DEFINER so it can read connections/payment_handles
-- and insert notifications regardless of the caller's RLS. Handles are embedded
-- in the notification data so only connected parents receive them, only when a
-- request is actually sent.
-- ---------------------------------------------------------------------------
create or replace function public.notify_money_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  h public.payment_handles%rowtype;
begin
  select * into h from public.payment_handles where owner_id = new.owner_id;
  insert into public.notifications (recipient_id, actor_id, type, data)
  select c.viewer_id, new.owner_id, 'money_request',
         jsonb_build_object(
           'amount', new.amount,
           'note', new.note,
           'money_request_id', new.id,
           'venmo', h.venmo,
           'cashtag', h.cashtag,
           'zelle', h.zelle,
           'apple_cash', h.apple_cash
         )
  from public.connections c
  where c.owner_id = new.owner_id;
  return new;
end;
$$;

drop trigger if exists money_requests_notify on public.money_requests;
create trigger money_requests_notify
  after insert on public.money_requests
  for each row execute function public.notify_money_request();

-- Trigger-only function: not callable via the REST RPC endpoint by end users.
revoke execute on function public.notify_money_request() from public, anon, authenticated;
