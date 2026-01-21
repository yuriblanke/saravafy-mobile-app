-- Audit helpers for curimba + member_kind rollout

-- 1) Any remaining legacy role values?
select 'terreiro_members' as table_name, count(*) as legacy_editor_rows
from public.terreiro_members
where role = 'editor';

select 'terreiro_invites' as table_name, count(*) as legacy_editor_rows
from public.terreiro_invites
where role = 'editor';

-- 2) Member rows missing member_kind (should be 0 after migration)
select 'terreiro_members' as table_name, count(*) as member_rows_missing_kind
from public.terreiro_members
where role = 'member' and member_kind is null;

select 'terreiro_invites' as table_name, count(*) as member_invites_missing_kind
from public.terreiro_invites
where role = 'member' and member_kind is null;

-- 3) Distribution snapshot
select role, member_kind, count(*)
from public.terreiro_members
group by role, member_kind
order by role, member_kind;

select role, member_kind, status, count(*)
from public.terreiro_invites
group by role, member_kind, status
order by role, member_kind, status;
