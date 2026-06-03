-- These are trigger-only SECURITY DEFINER functions. They fire from triggers
-- regardless of EXECUTE grants, so they should not be callable via the REST RPC
-- endpoint by end users. Revoke EXECUTE from the API roles.

revoke execute on function public.notify_new_photo()       from public, anon, authenticated;
revoke execute on function public.notify_new_status()      from public, anon, authenticated;
revoke execute on function public.notify_new_schedule()    from public, anon, authenticated;
revoke execute on function public.notify_photo_comment()   from public, anon, authenticated;
revoke execute on function public.notify_photo_reaction()  from public, anon, authenticated;
revoke execute on function public.notify_comment_reaction() from public, anon, authenticated;
