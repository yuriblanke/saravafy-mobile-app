-- Minimal, idempotent schema for terreiro-scoped custom tags.
-- Medium tags are stored as custom tags whose label starts with "Médium:" (normalized => "medium:").

create extension if not exists pgcrypto;

-- Table
create table if not exists public.terreiro_ponto_custom_tags (
  id uuid primary key default gen_random_uuid(),
  terreiro_id uuid not null references public.terreiros(id) on delete cascade,
  ponto_id uuid not null references public.pontos(id) on delete cascade,
  tag_text text not null,
  tag_text_normalized text not null,
  source text null,
  template_key text null,
  created_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_tpc_terreiro_ponto
  on public.terreiro_ponto_custom_tags (terreiro_id, ponto_id);

create unique index if not exists uq_tpc_terreiro_ponto_tag
  on public.terreiro_ponto_custom_tags (terreiro_id, ponto_id, tag_text_normalized);

-- RLS
alter table public.terreiro_ponto_custom_tags enable row level security;

-- Policies (guarded because Postgres has no CREATE POLICY IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'terreiro_ponto_custom_tags'
      AND policyname = 'tpc_select_members'
  ) THEN
    CREATE POLICY tpc_select_members
      ON public.terreiro_ponto_custom_tags
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.terreiro_members tm
          WHERE tm.terreiro_id = terreiro_ponto_custom_tags.terreiro_id
            AND tm.user_id = auth.uid()
            AND COALESCE(tm.status, 'active') = 'active'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'terreiro_ponto_custom_tags'
      AND policyname = 'tpc_insert_admin_editor'
  ) THEN
    CREATE POLICY tpc_insert_admin_editor
      ON public.terreiro_ponto_custom_tags
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.terreiro_members tm
          WHERE tm.terreiro_id = terreiro_ponto_custom_tags.terreiro_id
            AND tm.user_id = auth.uid()
            AND tm.role = ANY (ARRAY['admin','editor'])
            AND COALESCE(tm.status, 'active') = 'active'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'terreiro_ponto_custom_tags'
      AND policyname = 'tpc_update_admin_editor'
  ) THEN
    CREATE POLICY tpc_update_admin_editor
      ON public.terreiro_ponto_custom_tags
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.terreiro_members tm
          WHERE tm.terreiro_id = terreiro_ponto_custom_tags.terreiro_id
            AND tm.user_id = auth.uid()
            AND tm.role = ANY (ARRAY['admin','editor'])
            AND COALESCE(tm.status, 'active') = 'active'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.terreiro_members tm
          WHERE tm.terreiro_id = terreiro_ponto_custom_tags.terreiro_id
            AND tm.user_id = auth.uid()
            AND tm.role = ANY (ARRAY['admin','editor'])
            AND COALESCE(tm.status, 'active') = 'active'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'terreiro_ponto_custom_tags'
      AND policyname = 'tpc_delete_admin_editor'
  ) THEN
    CREATE POLICY tpc_delete_admin_editor
      ON public.terreiro_ponto_custom_tags
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.terreiro_members tm
          WHERE tm.terreiro_id = terreiro_ponto_custom_tags.terreiro_id
            AND tm.user_id = auth.uid()
            AND tm.role = ANY (ARRAY['admin','editor'])
            AND COALESCE(tm.status, 'active') = 'active'
        )
      );
  END IF;
END $$;
