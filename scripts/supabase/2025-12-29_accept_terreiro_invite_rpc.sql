-- Terreiro Invites (RPC)
--
-- Why: Under strict RLS, the invited user cannot:
-- - insert/upsert into public.terreiro_members
-- - update public.terreiro_invites
-- Therefore accept/reject must be done via SECURITY DEFINER RPCs.
--
-- Contract (frontend expectation):
-- - public.accept_terreiro_invite(invite_id uuid) returns jsonb
-- - public.reject_terreiro_invite(invite_id uuid) returns jsonb
-- Both validate auth.uid() and JWT email, lock the invite (FOR UPDATE),
-- update status + activated_at + activated_by, and return {"ok": true}.

begin;

create or replace function public.accept_terreiro_invite(invite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_invite public.terreiro_invites%rowtype;
  has_status boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_email := lower(trim((auth.jwt() ->> 'email')));
  if v_email is null or v_email = '' then
    raise exception 'Auth email missing';
  end if;

  -- Lock the invite row to avoid double-accept/reject.
  select *
    into v_invite
  from public.terreiro_invites i
  where i.id = invite_id
  for update;

  if not found then
    raise exception 'Invite not found';
  end if;

  if v_invite.email is null or lower(trim(v_invite.email)) <> v_email then
    raise exception 'Not authorized for this invite';
  end if;

  if v_invite.status <> 'pending' then
    raise exception 'Invite is not pending';
  end if;

  update public.terreiro_invites
  set
    status = 'accepted',
    activated_at = now(),
    activated_by = auth.uid()
  where id = invite_id;

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

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.reject_terreiro_invite(invite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_invite public.terreiro_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_email := lower(trim((auth.jwt() ->> 'email')));
  if v_email is null or v_email = '' then
    raise exception 'Auth email missing';
  end if;

  select *
    into v_invite
  from public.terreiro_invites i
  where i.id = invite_id
  for update;

  if not found then
    raise exception 'Invite not found';
  end if;

  if v_invite.email is null or lower(trim(v_invite.email)) <> v_email then
    raise exception 'Not authorized for this invite';
  end if;

  if v_invite.status <> 'pending' then
    raise exception 'Invite is not pending';
  end if;

  update public.terreiro_invites
  set
    status = 'rejected',
    activated_at = now(),
    activated_by = auth.uid()
  where id = invite_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.accept_terreiro_invite(uuid) from public;
revoke all on function public.reject_terreiro_invite(uuid) from public;
grant execute on function public.accept_terreiro_invite(uuid) to authenticated;
grant execute on function public.reject_terreiro_invite(uuid) to authenticated;

commit;
