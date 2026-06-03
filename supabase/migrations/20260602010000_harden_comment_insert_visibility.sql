-- Harden comment/reaction INSERT policies against IDOR.
--
-- Previously these policies only checked `auth.uid() = user_id`, so an
-- authenticated user could insert a comment or reaction referencing any
-- post/comment id (including ones they cannot see) — also triggering
-- notifications to arbitrary users. Require that the inserting user can
-- actually SEE the parent post (own it, or be a connected viewer of its owner).
-- This protects every write path, including direct-from-browser inserts.

-- Status comments: only on a status you can see ---------------------------
drop policy if exists status_comments_insert on public.status_comments;
create policy status_comments_insert on public.status_comments
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.statuses s
      where s.id = status_id
        and (
          s.owner_id = auth.uid()
          or exists (
            select 1 from public.connections c
            where c.owner_id = s.owner_id and c.viewer_id = auth.uid()
          )
        )
    )
  );

-- Status comment reactions: only on a comment of a status you can see ------
drop policy if exists status_comment_reactions_insert on public.status_comment_reactions;
create policy status_comment_reactions_insert on public.status_comment_reactions
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.status_comments sc
      join public.statuses s on s.id = sc.status_id
      where sc.id = comment_id
        and (
          s.owner_id = auth.uid()
          or exists (
            select 1 from public.connections c
            where c.owner_id = s.owner_id and c.viewer_id = auth.uid()
          )
        )
    )
  );

-- Photo comments: only on a photo you can see ------------------------------
drop policy if exists photo_comments_insert on public.photo_comments;
create policy photo_comments_insert on public.photo_comments
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.photos p
      where p.id = photo_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from public.connections c
            where c.owner_id = p.owner_id and c.viewer_id = auth.uid()
          )
        )
    )
  );

-- Photo comment reactions: only on a comment of a photo you can see --------
drop policy if exists "Users can add their own comment reactions" on public.photo_comment_reactions;
create policy "Users can add their own comment reactions" on public.photo_comment_reactions
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.photo_comments pc
      join public.photos p on p.id = pc.photo_id
      where pc.id = comment_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from public.connections c
            where c.owner_id = p.owner_id and c.viewer_id = auth.uid()
          )
        )
    )
  );
