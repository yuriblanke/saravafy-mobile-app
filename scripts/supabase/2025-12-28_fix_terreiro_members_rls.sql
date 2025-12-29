-- Fix RLS recursion on public.terreiro_members
--
-- Goal: eliminate "infinite recursion detected in policy for relation \"terreiro_members\"".
-- Strategy: move membership checks into SECURITY DEFINER functions and reference those
-- from policies instead of self-EXISTS queries that re-enter RLS.
--
-- IMPORTANT (per project decision): do NOT add an "id" column to terreiro_members.
-- The table uses a composite PK (terreiro_id, user_id).

begin;

-- Helper: is current auth user admin/editor of a terreiro.
create or replace function public.is_terreiro_admin_or_editor(_terreiro_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.terreiro_members tm
    where tm.terreiro_id = _terreiro_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
      and tm.role in ('admin','editor')
  );
$$;

-- Helper: is current auth user admin of a terreiro.
create or replace function public.is_terreiro_admin(_terreiro_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.terreiro_members tm
    where tm.terreiro_id = _terreiro_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
      and tm.role = 'admin'
  );
$$;

-- Permissions: keep functions callable only by authenticated users.
revoke all on function public.is_terreiro_admin_or_editor(uuid) from public;
revoke all on function public.is_terreiro_admin(uuid) from public;
grant execute on function public.is_terreiro_admin_or_editor(uuid) to authenticated;
grant execute on function public.is_terreiro_admin(uuid) to authenticated;

-- Ensure RLS is enabled.
alter table public.terreiro_members enable row level security;

-- Drop existing policies (names may vary across environments).
-- If you have additional policies you want to keep, remove the corresponding drops below.
drop policy if exists terreiro_members_select on public.terreiro_members;
drop policy if exists terreiro_members_insert on public.terreiro_members;
drop policy if exists terreiro_members_update on public.terreiro_members;
drop policy if exists terreiro_members_delete on public.terreiro_members;

-- SELECT:
-- - allow the user to see their own membership rows
-- - allow admin/editor of the same terreiro to see membership rows of that terreiro
create policy terreiro_members_select
on public.terreiro_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_terreiro_admin_or_editor(terreiro_id)
);

-- INSERT/UPDATE/DELETE:
-- restricted to admin of the terreiro (per project rule).
create policy terreiro_members_insert
on public.terreiro_members
for insert
to authenticated
with check (
  public.is_terreiro_admin(terreiro_id)
);

create policy terreiro_members_update
on public.terreiro_members
for update
to authenticated
using (
  public.is_terreiro_admin(terreiro_id)
)
with check (
  public.is_terreiro_admin(terreiro_id)
);

create policy terreiro_members_delete
on public.terreiro_members
for delete
to authenticated
using (
  public.is_terreiro_admin(terreiro_id)
);

commit;

-- Debug helpers (run manually in Supabase SQL editor):
-- select * from pg_policies where schemaname='public' and tablename='terreiro_members';
-- select public.is_terreiro_admin_or_editor('<terreiro_uuid>'::uuid);
