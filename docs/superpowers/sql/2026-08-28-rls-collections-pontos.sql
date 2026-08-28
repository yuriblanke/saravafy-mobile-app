-- ===============================================================================
--  NAO APLICADO. REQUER DECISAO E EXECUCAO DO USUARIO.
-- ===============================================================================
-- Correcoes RLS para collections_pontos, descobertas 2026-08-10.
-- Dois problemas independentes: X17 (escalacao de privilegio) e X14 (assimetria de leitura).
--
-- IMPORTANTE: As duas variantes de X14 sao MUTUAMENTE EXCLUSIVAS.
-- Escolha uma, nao as duas. Ambas estao documentadas abaixo para orientar a decisao.
-- ===============================================================================

-- ===============================================================================
-- ESTADO ATUAL DAS POLICIES (2026-08-10)
-- ===============================================================================

-- SELECT policies (CORRETAS):
--   1. collections_pontos_select_owner
--      Leitura: usuario-owned collections, sem restricao de visibility
--
--   2. collections_pontos_select_public
--      Leitura: collections com visibility = 'public' (qualquer posse)
--
--   3. collections_pontos_select_terreiro_members
--      Leitura: collections terreiro-owned + visibility = 'members'
--               + usuario e membro/admin/curimba/editor do terreiro
--
--   FALTA: collections terreiro-owned + visibility = 'private'
--          (escrita permitida, leitura proibida = assimetria)

-- INSERT policy (PARCIALMENTE CORRETA):
--   collections_pontos_insert_owner_or_terreiro_admin_editor
--   WITH CHECK: permite insercao se usuario-owner OU admin/curimba/editor do terreiro
--   PROBLEMA: nunca valida visibility. Qualquer valor passa.

-- UPDATE policy (VULNERAVEL - X17):
--   collections_pontos_update_owner_or_terreiro_admin_editor
--   USING: corretamente escopado (pode tocar linhas que o usuario possui ou gerencia)
--   WITH CHECK: LITERALMENTE 'true' - FALHA DE SEGURANCA
--   PROBLEMA: WITH CHECK nao valida o state pos-update, entao collection_id novo
--             nao e verificado. Editor de colecao A pode mover linhas para colecao B
--             sem ter direito sobre B.

-- DELETE policy (CORRETA):
--   collections_pontos_delete_owner_or_terreiro_admin_editor
--   USING: identica ao UPDATE USING, corretamente scoped
--   WITH CHECK: null (DELETE nao tem WITH CHECK)

-- ===============================================================================
-- X17 FIX: Escalacao de Privilegio — WITH CHECK do UPDATE
-- ===============================================================================
-- O predicado correto e o mesmo do USING. As policies irmas (INSERT, DELETE,
-- e a de dev_masters) ja fazem isso corretamente.

ALTER POLICY "collections_pontos_update_owner_or_terreiro_admin_editor"
  ON "public"."collections_pontos"
  USING (
    EXISTS (
      SELECT 1
      FROM collections c
      LEFT JOIN terreiro_members tm ON (
        tm.terreiro_id = c.owner_terreiro_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text])
      )
      WHERE c.id = collections_pontos.collection_id
        AND (
          c.owner_user_id = auth.uid()
          OR (c.owner_terreiro_id IS NOT NULL AND tm.user_id IS NOT NULL)
        )
    )
  )
  WITH CHECK (
    -- CORRIGIDO: repetir o predicado do USING
    EXISTS (
      SELECT 1
      FROM collections c
      LEFT JOIN terreiro_members tm ON (
        tm.terreiro_id = c.owner_terreiro_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text])
      )
      WHERE c.id = collections_pontos.collection_id
        AND (
          c.owner_user_id = auth.uid()
          OR (c.owner_terreiro_id IS NOT NULL AND tm.user_id IS NOT NULL)
        )
    )
  );

-- ===============================================================================
-- X14 FIX: Assimetria de Leitura — Duas variantes (ESCOLHER UMA)
-- ===============================================================================
-- Problema: uma colecao terreiro-owned com visibility = 'private' e escrita-permitida
-- mas nao-leitura-permitida.
--
-- Estado atual de colecoes (2026-08-10): 22 public+terreiro, 1 public+usuario,
-- 1 private+usuario. Nenhuma private+terreiro hoje, mas 'private' e valor valido.
--
-- Escolha A: adicionar SELECT para terreiro-owned + private
--   Implicacao: 'private' para colecoes de terreiro significa "membros do terreiro
--               apenas". Mesmo nivel de acesso que 'members'.
--   Risco: de produto — quem edita 'visibility' na criacao/edicao?
--
-- Escolha B: restringir escrita — 'private' so valido para usuario-owned
--   Implicacao: colecoes privadas sao sempre do usuario, nunca do terreiro.
--   Risco: tecnico — adicionar validacao de visibility em INSERT/UPDATE.

-- ===============================================================================
-- X14 VARIANTE A: Adicionar SELECT para terreiro-owned + private
-- ===============================================================================
-- Use esta opcao se 'private' para colecoes de terreiro deve funcionar como 'members'
-- (so membros do terreiro podem ler). Deixa a semantica de 'visibility' simples.

-- CRIAR POLICY (escolher A):
CREATE POLICY "collections_pontos_select_terreiro_private"
  ON "public"."collections_pontos"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM collections c
      JOIN terreiro_members tm ON tm.terreiro_id = c.owner_terreiro_id
      WHERE c.id = collections_pontos.collection_id
        AND c.visibility = 'private'::collection_visibility
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text, 'member'::text])
    )
  );

-- ===============================================================================
-- X14 VARIANTE B: Restringir escrita — 'private' so para usuario-owned
-- ===============================================================================
-- Use esta opcao se 'private' deve ser restrito a colecoes do usuario,
-- nunca do terreiro. Simplifica a logica de permissoes mas adiciona validacao.
--
-- LIMITACAO: Esta politica valida apenas o acesso aos PONTOS dentro de uma colecao.
-- Ela NAO impede que uma colecao terreiro-owned com visibility = 'private' seja
-- CRIADA na tabela collections. O resultado seria uma colecao vazia, nao-editavel.
-- Enforcar completamente que 'private' e so para usuario-owned requer um CHECK
-- constraint ou uma politica RLS na tabela 'collections' (fora do escopo deste arquivo).

-- MODIFICAR INSERT POLICY (escolher B):
ALTER POLICY "collections_pontos_insert_owner_or_terreiro_admin_editor"
  ON "public"."collections_pontos"
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM collections c
      LEFT JOIN terreiro_members tm ON (
        tm.terreiro_id = c.owner_terreiro_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text])
      )
      WHERE c.id = collections_pontos.collection_id
        AND (
          c.owner_user_id = auth.uid()
          OR (
            c.owner_terreiro_id IS NOT NULL
            AND tm.user_id IS NOT NULL
            AND c.visibility != 'private'::collection_visibility
          )
        )
    )
  );

-- MODIFICAR UPDATE POLICY (escolher B):
ALTER POLICY "collections_pontos_update_owner_or_terreiro_admin_editor"
  ON "public"."collections_pontos"
  USING (
    EXISTS (
      SELECT 1
      FROM collections c
      LEFT JOIN terreiro_members tm ON (
        tm.terreiro_id = c.owner_terreiro_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text])
      )
      WHERE c.id = collections_pontos.collection_id
        AND (
          c.owner_user_id = auth.uid()
          OR (c.owner_terreiro_id IS NOT NULL AND tm.user_id IS NOT NULL)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM collections c
      LEFT JOIN terreiro_members tm ON (
        tm.terreiro_id = c.owner_terreiro_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text])
      )
      WHERE c.id = collections_pontos.collection_id
        AND (
          c.owner_user_id = auth.uid()
          OR (
            c.owner_terreiro_id IS NOT NULL
            AND tm.user_id IS NOT NULL
            AND c.visibility != 'private'::collection_visibility
          )
        )
    )
  );

-- ===============================================================================
-- RESUMO DAS MUDANCAS
-- ===============================================================================
-- X17: Obrigatorio (seguranca). 1 ALTER POLICY (UPDATE WITH CHECK).
-- X14: Decisao de produto.
--      - Variante A: 1 CREATE POLICY (novo SELECT).
--      - Variante B: 2 ALTER POLICY (INSERT e UPDATE WITH CHECK, ambos adicionam restricao de visibility).
--
-- NOTA: As tres instrucoes ALTER POLICY foram corrigidas 2026-08-28 (fix round 1):
-- removido o 'FOR UPDATE' / 'FOR INSERT' que nao e valido em ALTER POLICY.
