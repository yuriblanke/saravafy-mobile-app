/*
  Public endpoint for app install URL

  - RPC: public.get_app_install_url() returns jsonb
  - Source: public.public_app_config (key = 'app_install_url')

  Security goals:
  - Do NOT expose other remoteConfig keys.
  - Remove any "select all" policy for anon/authenticated.
  - Allow anon/authenticated to read ONLY the install URL key.
  - Allow anon/authenticated to EXECUTE the RPC.
*/

-- Ensure RLS is on (safe no-op if already enabled)
alter table if exists public.public_app_config enable row level security;

-- 1) Remove dangerous policy (if it exists)
drop policy if exists "public_app_config_select_all" on public.public_app_config;

-- 2) Ensure minimal read policy exists (create only if missing)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'public_app_config'
      and policyname = 'public_app_config_read_app_install_url'
  ) then
    execute 'create policy "public_app_config_read_app_install_url" on public.public_app_config
      for select
      to anon, authenticated
      using (key = ''app_install_url'')';
  end if;
end $$;

-- 3) Public RPC to fetch the install URL
create or replace function public.get_app_install_url()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    ''key'', c.key,
    ''value'', c.value,
    ''updated_at'', c.updated_at
  )
  from public.public_app_config c
  where c.key = ''app_install_url''
  limit 1;
$$;

-- 4) Tighten EXECUTE permissions
revoke all on function public.get_app_install_url() from public;
grant execute on function public.get_app_install_url() to anon, authenticated;

-- 5) Ensure the key exists (placeholder is OK; do not overwrite existing)
insert into public.public_app_config (key, value, updated_at)
values (''app_install_url'', ''pending'', now())
on conflict (key) do nothing;
