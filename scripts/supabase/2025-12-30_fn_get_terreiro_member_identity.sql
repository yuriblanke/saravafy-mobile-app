-- Returns basic member identity for a terreiro.
-- Identity fields:
-- - user_id
-- - email (canonical fallback from auth.users)
-- SECURITY: Only admins/editors of the given terreiro can call this.

create or replace function public.fn_get_terreiro_member_identity(p_terreiro_id uuid)
returns table (user_id uuid, email text)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if p_terreiro_id is null then
    raise exception 'terreiro_id is required';
  end if;

  -- Require admin/editor on this terreiro.
  if not exists (
    select 1
    from public.terreiro_members tm
    where tm.terreiro_id = p_terreiro_id
      and tm.user_id = auth.uid()
      and tm.role in ('admin', 'editor')
      and (tm.status is null or tm.status = 'active')
  ) then
    raise exception 'insufficient_privilege';
  end if;

  return query
  select
    tm.user_id,
    lower(au.email) as email
  from public.terreiro_members tm
  join auth.users au
    on au.id = tm.user_id
  where tm.terreiro_id = p_terreiro_id
    and tm.role in ('admin', 'editor', 'member')
    and (tm.status is null or tm.status = 'active')
  order by tm.created_at asc nulls last;
end;
$$;

grant execute on function public.fn_get_terreiro_member_identity(uuid) to authenticated;
