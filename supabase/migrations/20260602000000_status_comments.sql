-- Comments + threaded replies + reactions for status updates, mirroring the
-- photo comment system, plus notifications for the status owner / comment authors.
-- ---------------------------------------------------------------------------

create table if not exists public.status_comments (
  id         uuid primary key default gen_random_uuid(),
  status_id  uuid not null references public.statuses(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  parent_id  uuid references public.status_comments(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists status_comments_status_idx on public.status_comments (status_id, created_at);
create index if not exists status_comments_parent_idx on public.status_comments (parent_id);

create table if not exists public.status_comment_reactions (
  id         uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.status_comments(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  emoji      text not null check (emoji = any (array['heart','like','star','smile'])),
  created_at timestamptz not null default now(),
  unique (comment_id, user_id, emoji)
);
create index if not exists status_comment_reactions_comment_idx on public.status_comment_reactions (comment_id);

-- Row Level Security ---------------------------------------------------------
alter table public.status_comments enable row level security;
alter table public.status_comment_reactions enable row level security;

-- You can see a status's comments if you can see the status: you own it, or
-- you're a connected viewer of its owner.
create policy status_comments_select on public.status_comments
  for select to authenticated
  using (
    exists (
      select 1 from public.statuses s
      where s.id = status_comments.status_id
        and (
          s.owner_id = auth.uid()
          or exists (
            select 1 from public.connections c
            where c.owner_id = s.owner_id and c.viewer_id = auth.uid()
          )
        )
    )
  );

create policy status_comments_insert on public.status_comments
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy status_comments_delete_own on public.status_comments
  for delete to authenticated
  using (auth.uid() = user_id);

create policy status_comment_reactions_select on public.status_comment_reactions
  for select to authenticated using (true);

create policy status_comment_reactions_insert on public.status_comment_reactions
  for insert to authenticated with check (auth.uid() = user_id);

create policy status_comment_reactions_delete_own on public.status_comment_reactions
  for delete to authenticated using (auth.uid() = user_id);

-- Notifications --------------------------------------------------------------
alter table public.notifications
  add column if not exists status_comment_id uuid
  references public.status_comments(id) on delete cascade;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'new_photo','new_status','new_schedule',
  'photo_comment','photo_reaction','comment_reply','comment_reaction',
  'status_comment','status_comment_reply','status_comment_reaction'
));

-- Comment on a status -> notify status owner (top level) or parent author (reply)
create or replace function public.notify_status_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_recipient uuid;
  v_type      text;
begin
  if new.parent_id is null then
    select owner_id into v_recipient from public.statuses where id = new.status_id;
    v_type := 'status_comment';
  else
    select user_id into v_recipient from public.status_comments where id = new.parent_id;
    v_type := 'status_comment_reply';
  end if;

  if v_recipient is not null and v_recipient <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, status_id, status_comment_id, data)
    values (v_recipient, new.user_id, v_type, new.status_id, new.id,
            jsonb_build_object('content', left(coalesce(new.content,''), 140)));
  end if;
  return new;
end;
$$;
revoke execute on function public.notify_status_comment() from public, anon, authenticated;

-- Reaction on a status comment -> notify comment author
create or replace function public.notify_status_comment_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_recipient uuid;
  v_status    uuid;
begin
  select user_id, status_id into v_recipient, v_status
  from public.status_comments where id = new.comment_id;
  if v_recipient is not null and v_recipient <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, status_id, status_comment_id, data)
    values (v_recipient, new.user_id, 'status_comment_reaction', v_status, new.comment_id,
            jsonb_build_object('emoji', new.emoji));
  end if;
  return new;
end;
$$;
revoke execute on function public.notify_status_comment_reaction() from public, anon, authenticated;

drop trigger if exists trg_notify_status_comment on public.status_comments;
create trigger trg_notify_status_comment
  after insert on public.status_comments
  for each row execute function public.notify_status_comment();

drop trigger if exists trg_notify_status_comment_reaction on public.status_comment_reactions;
create trigger trg_notify_status_comment_reaction
  after insert on public.status_comment_reactions
  for each row execute function public.notify_status_comment_reaction();
