alter table public.schedule_items
  add column if not exists reminder_minutes integer[] not null default '{}',
  add column if not exists import_source text,
  add column if not exists external_uid text,
  add column if not exists external_url text,
  add column if not exists location text;

alter table public.schedule_items
  drop constraint if exists schedule_items_item_type_check;

alter table public.schedule_items
  add constraint schedule_items_item_type_check
  check (item_type in ('class', 'study', 'test', 'assignment', 'work', 'social', 'other'));

create table if not exists public.calendar_sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  source_type text not null check (source_type in ('ical_file', 'ical_url', 'google', 'office365')),
  source_url text,
  color text not null default '#1a73e8',
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.calendar_sources enable row level security;

drop policy if exists calendar_sources_select on public.calendar_sources;
create policy calendar_sources_select on public.calendar_sources
for select using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.connections c
    where c.owner_id = calendar_sources.owner_id
      and c.viewer_id = auth.uid()
  )
);

drop policy if exists calendar_sources_insert_own on public.calendar_sources;
create policy calendar_sources_insert_own on public.calendar_sources
for insert with check (owner_id = auth.uid());

drop policy if exists calendar_sources_update_own on public.calendar_sources;
create policy calendar_sources_update_own on public.calendar_sources
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists calendar_sources_delete_own on public.calendar_sources;
create policy calendar_sources_delete_own on public.calendar_sources
for delete using (owner_id = auth.uid());

alter table public.schedule_items
  add column if not exists calendar_source_id uuid references public.calendar_sources(id) on delete cascade;

create index if not exists calendar_sources_owner_id_idx
  on public.calendar_sources(owner_id);

create index if not exists schedule_items_calendar_source_id_idx
  on public.schedule_items(calendar_source_id);

create index if not exists schedule_items_owner_start_date_idx
  on public.schedule_items(owner_id, start_date);

create unique index if not exists schedule_items_imported_event_unique
  on public.schedule_items(owner_id, calendar_source_id, external_uid)
  where calendar_source_id is not null and external_uid is not null;
