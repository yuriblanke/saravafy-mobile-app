-- Adds a persistent, backend-stored curator mode toggle.
-- This is a user preference stored in `profiles` and should be editable only by the profile owner.

alter table public.profiles
  add column if not exists curator_mode_enabled boolean not null default false;

-- Quick verification (SELECT-only):
-- 1) Column exists + default:
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'profiles'
--   and column_name = 'curator_mode_enabled';
--
-- 2) Confirm policy shape (SELECT-only):
-- select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename = 'profiles'
-- order by policyname;
--
-- 3) Confirm you can read your own current value (authenticated session):
-- select id, curator_mode_enabled
-- from public.profiles
-- where id = auth.uid();
