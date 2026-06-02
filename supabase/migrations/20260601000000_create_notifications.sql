-- Notifications feature: in-app notifications for viewers and students (owners)
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id               uuid primary key default gen_random_uuid(),
  recipient_id     uuid not null references public.profiles(id) on delete cascade,
  actor_id         uuid references public.profiles(id) on delete set null,
  type             text not null check (type in (
                      'new_photo','new_status','new_schedule',
                      'photo_comment','photo_reaction',
                      'comment_reply','comment_reaction'
                    )),
  photo_id         uuid references public.photos(id) on delete cascade,
  comment_id       uuid references public.photo_comments(id) on delete cascade,
  status_id        uuid references public.statuses(id) on delete cascade,
  schedule_item_id uuid references public.schedule_items(id) on delete cascade,
  data             jsonb not null default '{}'::jsonb,
  read_at          timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);

create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id)
  where read_at is null;

-- Row Level Security: recipients only ----------------------------------------
alter table public.notifications enable row level security;

create policy "Recipients can view their notifications"
  on public.notifications for select
  using (auth.uid() = recipient_id);

create policy "Recipients can update their notifications"
  on public.notifications for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

create policy "Recipients can delete their notifications"
  on public.notifications for delete
  using (auth.uid() = recipient_id);
-- Note: inserts happen only via SECURITY DEFINER trigger functions below,
-- so there is intentionally no INSERT policy for end users.

-- Trigger functions ----------------------------------------------------------

-- New content from an owner -> notify all connected viewers
create or replace function public.notify_new_photo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (recipient_id, actor_id, type, photo_id, data)
  select c.viewer_id, new.owner_id, 'new_photo', new.id,
         jsonb_build_object('caption', new.caption)
  from public.connections c
  where c.owner_id = new.owner_id;
  return new;
end;
$$;

create or replace function public.notify_new_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (recipient_id, actor_id, type, status_id, data)
  select c.viewer_id, new.owner_id, 'new_status', new.id,
         jsonb_build_object('content', left(coalesce(new.content,''), 140), 'mood', new.mood)
  from public.connections c
  where c.owner_id = new.owner_id;
  return new;
end;
$$;

create or replace function public.notify_new_schedule()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (recipient_id, actor_id, type, schedule_item_id, data)
  select c.viewer_id, new.owner_id, 'new_schedule', new.id,
         jsonb_build_object('title', new.title, 'item_type', new.item_type)
  from public.connections c
  where c.owner_id = new.owner_id;
  return new;
end;
$$;

-- Comment on a photo -> notify photo owner (top level) or parent author (reply)
create or replace function public.notify_photo_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_recipient uuid;
  v_type      text;
begin
  if new.parent_id is null then
    select owner_id into v_recipient from public.photos where id = new.photo_id;
    v_type := 'photo_comment';
  else
    select user_id into v_recipient from public.photo_comments where id = new.parent_id;
    v_type := 'comment_reply';
  end if;

  if v_recipient is not null and v_recipient <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, photo_id, comment_id, data)
    values (v_recipient, new.user_id, v_type, new.photo_id, new.id,
            jsonb_build_object('content', left(coalesce(new.content,''), 140)));
  end if;
  return new;
end;
$$;

-- Reaction on a photo -> notify photo owner
create or replace function public.notify_photo_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_recipient uuid;
begin
  select owner_id into v_recipient from public.photos where id = new.photo_id;
  if v_recipient is not null and v_recipient <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, photo_id, data)
    values (v_recipient, new.user_id, 'photo_reaction', new.photo_id,
            jsonb_build_object('emoji', new.emoji));
  end if;
  return new;
end;
$$;

-- Reaction on a comment -> notify comment author
create or replace function public.notify_comment_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_recipient uuid;
  v_photo_id  uuid;
begin
  select user_id, photo_id into v_recipient, v_photo_id
  from public.photo_comments where id = new.comment_id;
  if v_recipient is not null and v_recipient <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, comment_id, photo_id, data)
    values (v_recipient, new.user_id, 'comment_reaction', new.comment_id, v_photo_id,
            jsonb_build_object('emoji', new.emoji));
  end if;
  return new;
end;
$$;

-- Triggers -------------------------------------------------------------------
drop trigger if exists trg_notify_new_photo on public.photos;
create trigger trg_notify_new_photo
  after insert on public.photos
  for each row execute function public.notify_new_photo();

drop trigger if exists trg_notify_new_status on public.statuses;
create trigger trg_notify_new_status
  after insert on public.statuses
  for each row execute function public.notify_new_status();

drop trigger if exists trg_notify_new_schedule on public.schedule_items;
create trigger trg_notify_new_schedule
  after insert on public.schedule_items
  for each row execute function public.notify_new_schedule();

drop trigger if exists trg_notify_photo_comment on public.photo_comments;
create trigger trg_notify_photo_comment
  after insert on public.photo_comments
  for each row execute function public.notify_photo_comment();

drop trigger if exists trg_notify_photo_reaction on public.photo_reactions;
create trigger trg_notify_photo_reaction
  after insert on public.photo_reactions
  for each row execute function public.notify_photo_reaction();

drop trigger if exists trg_notify_comment_reaction on public.photo_comment_reactions;
create trigger trg_notify_comment_reaction
  after insert on public.photo_comment_reactions
  for each row execute function public.notify_comment_reaction();

-- Enable Realtime ------------------------------------------------------------
alter publication supabase_realtime add table public.notifications;
