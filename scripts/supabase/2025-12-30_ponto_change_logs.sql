-- Audit log for ANY update to `pontos`.
-- Insert is done via trigger (SECURITY DEFINER) so the app never inserts logs directly.

create table if not exists public.ponto_change_logs (
  id uuid primary key default gen_random_uuid(),
  ponto_id uuid not null references public.pontos(id) on delete cascade,
  action text not null,
  changed_at timestamptz not null default now(),
  changed_by uuid,
  before jsonb,
  after jsonb
);

create index if not exists ponto_change_logs_ponto_id_changed_at_idx
  on public.ponto_change_logs (ponto_id, changed_at desc);

alter table public.ponto_change_logs enable row level security;

-- Dev master allowlist (mirrors the minimal fallback allowlist used by the app).
-- NOTE: If you need a more scalable approach, replace this with a dedicated table.
create or replace function public.is_dev_master()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = any (
    array[
      'yuriblanke@gmail.com'
    ]
  );
$$;

-- Curators can read logs (debug/future history)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ponto_change_logs'
      AND policyname = 'Curators can select ponto_change_logs'
  ) THEN
    EXECUTE 'create policy "Curators can select ponto_change_logs" on public.ponto_change_logs for select to authenticated using (exists (select 1 from public.curators c where c.user_id = auth.uid()))';
  END IF;
END $$;

-- Dev masters can SELECT/DELETE logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ponto_change_logs'
      AND policyname = 'Dev masters can select ponto_change_logs'
  ) THEN
    EXECUTE 'create policy "Dev masters can select ponto_change_logs" on public.ponto_change_logs for select to authenticated using (public.is_dev_master())';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ponto_change_logs'
      AND policyname = 'Dev masters can delete ponto_change_logs'
  ) THEN
    EXECUTE 'create policy "Dev masters can delete ponto_change_logs" on public.ponto_change_logs for delete to authenticated using (public.is_dev_master())';
  END IF;
END $$;

-- Trigger function: log every UPDATE of `pontos`
create or replace function public.log_ponto_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ponto_change_logs (
    ponto_id,
    action,
    changed_by,
    before,
    after
  ) values (
    new.id,
    'UPDATE',
    auth.uid(),
    to_jsonb(old),
    to_jsonb(new)
  );

  return new;
end;
$$;

drop trigger if exists trg_log_ponto_update on public.pontos;
create trigger trg_log_ponto_update
after update on public.pontos
for each row
execute function public.log_ponto_update();
