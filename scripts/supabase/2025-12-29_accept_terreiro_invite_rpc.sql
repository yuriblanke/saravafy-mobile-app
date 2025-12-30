-- Accept Terreiro Invite (RPC)
--
-- Why: Invited users cannot insert into public.terreiro_members due to RLS policy
-- (insert restricted to terreiro admins). The client-side "accept" flow must
-- use a controlled backend path.
--
-- This RPC:
-- - Validates the invite belongs to the authenticated user's email
-- - Marks invite as accepted (idempotent)
-- - Inserts/upserts terreiro_members for auth.uid() (handles optional status column)
--
-- NOTE: This is designed to work with the existing strict RLS on terreiro_members
-- from scripts/supabase/2025-12-28_fix_terreiro_members_rls.sql.

begin;

create or replace function public.accept_terreiro_invite(invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_invite record;
  has_status boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_email := lower(trim((auth.jwt() ->> 'email')));
  if v_email is null or v_email = '' then
    raise exception 'Auth email missing';
  end if;

  select i.id, i.terreiro_id, i.email, i.role, i.status
    into v_invite
  from public.terreiro_invites i
  where i.id = invite_id;

  if not found then
    raise exception 'Invite not found';
  end if;

  if v_invite.email is null or lower(trim(v_invite.email)) <> v_email then
    raise exception 'Not authorized for this invite';
  end if;

  -- Mark invite accepted (idempotent).
  update public.terreiro_invites
  set status = 'accepted'
  where id = invite_id
    and status = 'pending';

  -- Upsert membership for this user.
  select exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'terreiro_members'
      and c.column_name = 'status'
  ) into has_status;

  if has_status then
    execute '
      insert into public.terreiro_members (terreiro_id, user_id, role, status)
      values ($1, $2, $3, ''active'')
      on conflict (terreiro_id, user_id)
      do update set role = excluded.role, status = excluded.status
    '
    using v_invite.terreiro_id, auth.uid(), v_invite.role;
  else
    execute '
      insert into public.terreiro_members (terreiro_id, user_id, role)
      values ($1, $2, $3)
      on conflict (terreiro_id, user_id)
      do update set role = excluded.role
    '
    using v_invite.terreiro_id, auth.uid(), v_invite.role;
  end if;
end;
$$;

revoke all on function public.accept_terreiro_invite(uuid) from public;
grant execute on function public.accept_terreiro_invite(uuid) to authenticated;

commit;
