# Saravafy — Schema do Banco de Dados

> Última atualização: 2025-03-29
> Banco: Supabase (PostgreSQL) — schema `public`

---

## Conceito Central — Pontos e Versões

O Saravafy cataloga **pontos** — chants da tradição oral do Candomblé e Umbanda. Como a tradição é oral, o mesmo ponto pode existir em múltiplas variações legítimas.

### Arquitetura de dados para pontos

- **`pontos`** — entidade agregadora (identidade abstrata). Contém título canônico, tags, metadados. **Não contém letra.**
- **`ponto_versoes`** — cada variação concreta do ponto. Contém letra, preview, áudio, autoria. Exatamente uma versão tem `is_canonical = true` por ponto.
- **`ponto_audios`** — áudio de uma versão específica. Aponta para `ponto_versao_id` (nunca diretamente para `ponto_id` em novos registros).

### Regra de exibição

- Busca retorna o **ponto** (não a versão)
- Ao abrir um ponto, o app exibe a versão canônica por padrão
- O usuário pode navegar entre versões
- Em collections, `ponto_versao_id` define qual versão exibir (null = exibe a canônica)

---

## Tabelas

### `pontos` — agregador de identidade

| Coluna              | Tipo        | Nulável | Default           | Notas                                                           |
| ------------------- | ----------- | ------- | ----------------- | --------------------------------------------------------------- |
| `id`                | uuid        | NO      | gen_random_uuid() | PK                                                              |
| `title`             | text        | NO      | —                 | Título canônico (fallback quando versão não tem título próprio) |
| `tags`              | text[]      | YES     | '{}'              | Tags canônicas compartilhadas entre versões                     |
| `is_active`         | boolean     | YES     | true              |                                                                 |
| `restricted`        | boolean     | NO      | false             |                                                                 |
| `is_public_domain`  | boolean     | NO      | true              |                                                                 |
| `author_name`       | text        | YES     | —                 | Autoria canônica                                                |
| `search_tsv`        | tsvector    | YES     | —                 | Alimentado por trigger a partir da versão canônica              |
| `search_text`       | text        | YES     | —                 |                                                                 |
| `search_tags_extra` | text[]      | YES     | —                 | Tags de terreiros                                               |
| `title_norm`        | text        | YES     | —                 | Título normalizado para busca                                   |
| `created_by`        | uuid        | YES     | —                 | FK → auth.users                                                 |
| `curated_by`        | uuid        | YES     | —                 | FK → auth.users                                                 |
| `created_at`        | timestamptz | YES     | now()             |                                                                 |
| `updated_at`        | timestamptz | YES     | now()             |                                                                 |

> **REMOVIDOS em 2025-03-29:** `lyrics`, `lyrics_sync`, `lyrics_preview_6`, `duration_seconds`, `cover_url`, `source_submission_id` — todos migrados para `ponto_versoes`.

---

### `ponto_versoes` — variações concretas

| Coluna                 | Tipo        | Nulável | Default           | Notas                                         |
| ---------------------- | ----------- | ------- | ----------------- | --------------------------------------------- |
| `id`                   | uuid        | NO      | gen_random_uuid() | PK                                            |
| `ponto_id`             | uuid        | NO      | —                 | FK → pontos.id ON DELETE CASCADE              |
| `versao_num`           | integer     | NO      | —                 | Auto-incrementado por trigger (1, 2, 3...)    |
| `is_canonical`         | boolean     | NO      | false             | Unique parcial: apenas uma canônica por ponto |
| `title`                | text        | YES     | —                 | Null = herda pontos.title                     |
| `lyrics`               | text        | NO      | —                 | Letra desta variação                          |
| `lyrics_preview_6`     | text        | YES     | —                 | Primeiras 6 linhas, calculado por trigger     |
| `lyrics_sync`          | jsonb       | YES     | —                 | Dados de karaokê                              |
| `tags`                 | text[]      | NO      | '{}'              | Tags adicionais desta versão                  |
| `author_name`          | text        | YES     | —                 | Null = herda pontos.author_name               |
| `is_public_domain`     | boolean     | YES     | —                 | Null = herda pontos.is_public_domain          |
| `source_submission_id` | uuid        | YES     | —                 | FK → pontos_submissions.id ON DELETE SET NULL |
| `created_by`           | uuid        | NO      | —                 | FK → auth.users                               |
| `curated_by`           | uuid        | YES     | —                 | FK → auth.users                               |
| `is_active`            | boolean     | NO      | true              |                                               |
| `title_norm`           | text        | YES     | —                 | Calculado por trigger                         |
| `search_tsv`           | tsvector    | YES     | —                 | Calculado por trigger                         |
| `created_at`           | timestamptz | NO      | now()             |                                               |
| `updated_at`           | timestamptz | NO      | now()             |                                               |

**Índices importantes:**

- `uq_ponto_versoes_canonical` — UNIQUE parcial em `(ponto_id)` WHERE `is_canonical = true`
- `ponto_versoes_unique_num` — UNIQUE em `(ponto_id, versao_num)`

---

### `ponto_audios` — áudios das versões

| Coluna             | Tipo                | Nulável | Default           | Notas                                    |
| ------------------ | ------------------- | ------- | ----------------- | ---------------------------------------- |
| `id`               | uuid                | NO      | gen_random_uuid() | PK                                       |
| `ponto_id`         | uuid                | YES     | —                 | FK → pontos.id (legado, nullable)        |
| `ponto_versao_id`  | uuid                | YES     | —                 | FK → ponto_versoes.id ON DELETE SET NULL |
| `storage_bucket`   | text                | NO      | 'ponto-audios'    |                                          |
| `storage_path`     | text                | NO      | —                 |                                          |
| `mime_type`        | text                | YES     | —                 |                                          |
| `size_bytes`       | bigint              | YES     | —                 |                                          |
| `duration_ms`      | integer             | YES     | —                 | Obrigatório para aprovação               |
| `created_by`       | uuid                | NO      | —                 | FK → auth.users                          |
| `interpreter_name` | text                | YES     | —                 |                                          |
| `upload_status`    | audio_upload_status | NO      | 'pending'         |                                          |
| `upload_token`     | uuid                | NO      | gen_random_uuid() |                                          |
| `uploaded_at`      | timestamptz         | YES     | —                 |                                          |
| `is_active`        | boolean             | NO      | false             | Apenas um ativo por versão               |
| `content_etag`     | text                | YES     | —                 |                                          |
| `sha256`           | text                | YES     | —                 |                                          |
| `created_at`       | timestamptz         | NO      | now()             |                                          |
| `updated_at`       | timestamptz         | YES     | now()             |                                          |

**Constraint de exclusividade:**

```sql
NOT (ponto_id IS NOT NULL AND ponto_versao_id IS NOT NULL)
```

Áudios de submissions `new` podem ter ambos null temporariamente até a aprovação.

**Convenção de paths no storage:**

- Submission `new` (antes de aprovação): `submissions/{submission_id}/{audio_id}.ext`
- Áudio de versão existente: `pontos/{ponto_id}/versoes/{ponto_versao_id}/{audio_id}.ext`

---

### `pontos_submissions` — fila de submissões

| Coluna                        | Tipo                    | Nulável | Default           | Notas                                                            |
| ----------------------------- | ----------------------- | ------- | ----------------- | ---------------------------------------------------------------- |
| `id`                          | uuid                    | NO      | gen_random_uuid() | PK                                                               |
| `kind`                        | ponto_submission_kind   | NO      | —                 | new / correction / issue / audio_upload / variation              |
| `status`                      | ponto_submission_status | NO      | 'pending'         |                                                                  |
| `ponto_id`                    | uuid                    | YES     | —                 | FK → pontos.id ON DELETE SET NULL                                |
| `ponto_versao_id`             | uuid                    | YES     | —                 | FK → ponto_versoes.id ON DELETE SET NULL                         |
| `ponto_audio_id`              | uuid                    | YES     | —                 | FK → ponto_audios.id ON DELETE SET NULL                          |
| `payload`                     | jsonb                   | NO      | '{}'              | Dados da submissão (title, lyrics, tags para kind=new/variation) |
| `created_by`                  | uuid                    | NO      | auth.uid()        |                                                                  |
| `reviewed_at`                 | timestamptz             | YES     | —                 |                                                                  |
| `reviewed_by`                 | uuid                    | YES     | —                 |                                                                  |
| `review_note`                 | text                    | YES     | —                 |                                                                  |
| `ponto_is_public_domain`      | boolean                 | NO      | true              |                                                                  |
| `author_name`                 | text                    | YES     | —                 |                                                                  |
| `author_consent_granted`      | boolean                 | NO      | false             |                                                                  |
| `interpreter_name`            | text                    | YES     | —                 |                                                                  |
| `interpreter_consent_granted` | boolean                 | NO      | false             |                                                                  |
| `has_audio`                   | boolean                 | NO      | false             |                                                                  |
| `audio_bucket_id`             | text                    | YES     | —                 |                                                                  |
| `audio_object_path`           | text                    | YES     | —                 |                                                                  |
| `terms_version`               | text                    | YES     | —                 |                                                                  |
| `created_at`                  | timestamptz             | NO      | now()             |                                                                  |

**Fluxo por kind:**

- `new` → curadoria chama `approve_ponto_submission()` → cria `pontos` + `ponto_versoes` (is_canonical=true)
- `variation` → curadoria chama `approve_variation_submission()` → cria `ponto_versoes` para ponto existente
- `audio_upload` → curadoria chama `approve_audio_upload_submission()` → ativa `ponto_audios` na versão
- `correction` → curadoria chama `approve_ponto_correction_submission()` → edita campos de `ponto_versoes`

---

### `collections` — coleções de pontos

| Coluna              | Tipo                  | Nulável | Default           |
| ------------------- | --------------------- | ------- | ----------------- |
| `id`                | uuid                  | NO      | gen_random_uuid() |
| `title`             | text                  | YES     | —                 |
| `description`       | text                  | YES     | —                 |
| `visibility`        | collection_visibility | NO      | 'public'          |
| `owner_user_id`     | uuid                  | YES     | —                 |
| `owner_terreiro_id` | uuid                  | YES     | —                 |
| `is_public`         | boolean               | YES     | —                 |
| `created_at`        | timestamptz           | YES     | now()             |
| `updated_at`        | timestamptz           | YES     | now()             |

---

### `collections_pontos` — itens de coleção

| Coluna            | Tipo        | Nulável | Default | Notas                                                                  |
| ----------------- | ----------- | ------- | ------- | ---------------------------------------------------------------------- |
| `collection_id`   | uuid        | NO      | —       | FK → collections.id ON DELETE CASCADE                                  |
| `ponto_id`        | uuid        | NO      | —       | FK → pontos.id ON DELETE CASCADE                                       |
| `ponto_versao_id` | uuid        | YES     | —       | FK → ponto_versoes.id ON DELETE SET NULL. Null = exibe versão canônica |
| `position`        | integer     | NO      | —       | Auto-calculado por trigger                                             |
| `added_by`        | uuid        | NO      | —       |                                                                        |
| `added_at`        | timestamptz | NO      | now()   |                                                                        |

**Regra:** `ponto_versao_id` quando preenchido deve pertencer ao `ponto_id` da mesma linha. Validado por trigger `trg_collections_pontos_validate_versao`.

---

### `terreiros` — comunidades

| Coluna            | Tipo        | Nulável |
| ----------------- | ----------- | ------- |
| `id`              | uuid        | NO      |
| `title`           | text        | NO      |
| `about`           | text        | YES     |
| `lines_of_work`   | text        | YES     |
| `cover_image_url` | text        | YES     |
| `created_by`      | uuid        | NO      |
| `created_at`      | timestamptz | NO      |
| `updated_at`      | timestamptz | NO      |

---

### `terreiro_members` — membros

| Coluna        | Tipo        | Nulável | Default  | Notas                    |
| ------------- | ----------- | ------- | -------- | ------------------------ |
| `terreiro_id` | uuid        | NO      | —        | PK composta com user_id  |
| `user_id`     | uuid        | NO      | —        |                          |
| `role`        | text        | NO      | —        | admin / curimba / member |
| `status`      | text        | NO      | 'active' | active / invited         |
| `email`       | text        | YES     | —        |                          |
| `created_at`  | timestamptz | NO      | now()    |                          |

---

### `terreiro_invites` — convites

| Coluna         | Tipo        | Nulável | Notas                               |
| -------------- | ----------- | ------- | ----------------------------------- |
| `id`           | uuid        | NO      | PK                                  |
| `terreiro_id`  | uuid        | NO      | FK → terreiros.id                   |
| `email`        | text        | NO      | Sempre lowercase                    |
| `role`         | text        | NO      | admin / curimba / member / follower |
| `status`       | text        | NO      | pending / accepted / rejected       |
| `created_by`   | uuid        | NO      |                                     |
| `created_at`   | timestamptz | NO      |                                     |
| `activated_at` | timestamptz | YES     |                                     |
| `activated_by` | uuid        | YES     |                                     |

---

### `terreiro_membership_requests` — pedidos de associação

| Coluna        | Tipo                               | Nulável |
| ------------- | ---------------------------------- | ------- |
| `id`          | uuid                               | NO      |
| `terreiro_id` | uuid                               | NO      |
| `user_id`     | uuid                               | NO      |
| `status`      | terreiro_membership_request_status | NO      |
| `message`     | text                               | YES     |
| `reviewed_at` | timestamptz                        | YES     |
| `reviewed_by` | uuid                               | YES     |
| `review_note` | text                               | YES     |
| `created_at`  | timestamptz                        | NO      |

---

### `profiles` — perfis de usuário

| Coluna                 | Tipo        | Nulável |
| ---------------------- | ----------- | ------- |
| `id`                   | uuid        | NO      |
| `email`                | text        | YES     |
| `full_name`            | text        | YES     |
| `avatar_url`           | text        | YES     |
| `auth_provider`        | text        | YES     |
| `email_verified`       | boolean     | YES     |
| `curator_mode_enabled` | boolean     | NO      |
| `primary_terreiro_id`  | uuid        | YES     |
| `identity_updated_at`  | timestamptz | YES     |
| `created_at`           | timestamptz | NO      |
| `updated_at`           | timestamptz | NO      |

---

### `curators` / `dev_masters` — papéis globais

| Tabela        | Colunas                      | Notas                             |
| ------------- | ---------------------------- | --------------------------------- |
| `curators`    | `user_id` (PK), `created_at` | Pode aprovar/rejeitar submissions |
| `dev_masters` | `user_id` (PK), `created_at` | Acesso total ao banco             |

---

### `terreiro_ponto_custom_tags` — tags customizadas por terreiro

| Coluna                | Tipo        | Nulável |
| --------------------- | ----------- | ------- |
| `id`                  | uuid        | NO      |
| `terreiro_id`         | uuid        | NO      |
| `ponto_id`            | uuid        | NO      |
| `tag_text`            | text        | NO      |
| `tag_text_normalized` | text        | NO      |
| `source`              | text        | YES     |
| `template_key`        | text        | YES     |
| `created_by`          | uuid        | YES     |
| `created_at`          | timestamptz | NO      |
| `updated_at`          | timestamptz | NO      |

---

### `ponto_change_logs` — auditoria de alterações

| Coluna       | Tipo        | Nulável |
| ------------ | ----------- | ------- |
| `id`         | uuid        | NO      |
| `ponto_id`   | uuid        | NO      |
| `action`     | text        | NO      |
| `changed_by` | uuid        | YES     |
| `before`     | jsonb       | YES     |
| `after`      | jsonb       | YES     |
| `changed_at` | timestamptz | NO      |

---

### `orixa_dictionary` — dicionário para auto-tag

| Coluna          | Tipo   | Notas                        |
| --------------- | ------ | ---------------------------- |
| `key`           | text   | PK                           |
| `canonical_tag` | text   | Tag canônica gerada          |
| `variants`      | text[] | Variações que disparam a tag |

---

### `public_app_config` — configurações públicas

| Coluna       | Tipo        |
| ------------ | ----------- |
| `key`        | text (PK)   |
| `value`      | text        |
| `updated_at` | timestamptz |

DELETE bloqueado por trigger. Usado para `app_install_url`.

---

### `pontos_backup_20250329` — backup

Snapshot da tabela `pontos` feito antes da migração de 2025-03-29. **Ignorar nas queries de negócio.**

---

## Enums

| Enum                                 | Valores                                             |
| ------------------------------------ | --------------------------------------------------- |
| `audio_upload_status`                | pending, uploaded, failed, deleted                  |
| `collection_visibility`              | public, private, members                            |
| `consent_party_role`                 | author, interpreter                                 |
| `consent_status`                     | granted, denied, unknown, revoked                   |
| `consent_subject_type`               | ponto, ponto_audio                                  |
| `curator_invite_status`              | pending, accepted, rejected, cancelled, expired     |
| `ponto_submission_kind`              | new, correction, issue, audio_upload, **variation** |
| `ponto_submission_status`            | pending, approved, rejected                         |
| `terreiro_membership_request_status` | pending, approved, rejected, cancelled              |

---

## Funções de Negócio Principais

| Função                                                                           | Retorno                                         | Descrição                                                                                |
| -------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `approve_ponto_submission(p_submission_id, p_decision, ...)`                     | jsonb                                           | Aprova/rejeita submission kind=new. Cria `pontos` + `ponto_versoes` (is_canonical=true)  |
| `approve_variation_submission(p_submission_id, p_decision, ..., p_is_canonical)` | jsonb                                           | Aprova/rejeita submission kind=variation. Cria nova `ponto_versoes` para ponto existente |
| `approve_audio_upload_submission(p_submission_id)`                               | jsonb                                           | Aprova submission kind=audio_upload. Ativa `ponto_audios` na versão                      |
| `approve_ponto_correction_submission(p_submission_id)`                           | jsonb                                           | Aprova correção. Edita campos de `ponto_versoes`                                         |
| `reject_ponto_submission(p_submission_id, p_review_note)`                        | jsonb                                           | Rejeita submission com nota obrigatória                                                  |
| `reject_audio_upload_submission(p_submission_id, p_review_note)`                 | jsonb                                           | Rejeita audio_upload e desativa áudio                                                    |
| `search_pontos(p_query, p_limit, p_offset)`                                      | TABLE(id, title, tags, lyrics_preview_6, score) | Busca full-text + fallback ILIKE. Retorna lyrics_preview_6 da versão canônica            |
| `fn_create_terreiro(...)`                                                        | uuid                                            | Cria terreiro + contato + membership admin atomicamente                                  |
| `approve_terreiro_membership_request(request_id)`                                | jsonb                                           | Aprova pedido de associação                                                              |
| `reject_terreiro_membership_request(request_id, note)`                           | jsonb                                           | Rejeita pedido de associação                                                             |
| `accept_terreiro_invite(p_invite_id)`                                            | terreiro_invites                                | Aceita convite                                                                           |
| `fn_remove_terreiro_member(p_terreiro_id, p_user_id)`                            | jsonb                                           | Remove membro (guarda último admin)                                                      |
| `delete_terreiro(p_terreiro_id)`                                                 | jsonb                                           | Deleta terreiro com contagens antes da deleção                                           |
| `reorder_collection_points(p_collection_id, p_items)`                            | jsonb                                           | Reordena pontos numa coleção                                                             |
| `is_terreiro_admin(p_terreiro_id)`                                               | boolean                                         | Verifica se usuário atual é admin                                                        |
| `is_terreiro_member(p_terreiro_id)`                                              | boolean                                         | Verifica se usuário atual é membro                                                       |
| `is_dev_master()`                                                                | boolean                                         | Verifica se usuário atual é dev master                                                   |

---

## Triggers Relevantes

| Trigger                                       | Tabela             | Evento               | Função                                                 |
| --------------------------------------------- | ------------------ | -------------------- | ------------------------------------------------------ |
| `trg_ponto_versoes_set_versao_num`            | ponto_versoes      | BEFORE INSERT        | Auto-incrementa versao_num por ponto                   |
| `trg_ponto_versoes_refresh_derived`           | ponto_versoes      | BEFORE INSERT/UPDATE | Calcula lyrics_preview_6, title_norm, search_tsv       |
| `trg_ponto_versoes_set_updated_at`            | ponto_versoes      | BEFORE UPDATE        | Atualiza updated_at                                    |
| `trg_sync_ponto_search_from_canonical_versao` | ponto_versoes      | AFTER INSERT/UPDATE  | Atualiza pontos.search_tsv quando versão canônica muda |
| `trg_collections_pontos_validate_versao`      | collections_pontos | BEFORE INSERT/UPDATE | Valida que ponto_versao_id pertence ao ponto_id        |
| `trg_guard_ponto_audio_set_active`            | ponto_audios       | BEFORE INSERT/UPDATE | Bloqueia ativação sem submission aprovada              |
| `trg_prevent_last_admin_change`               | terreiro_members   | BEFORE DELETE/UPDATE | Impede remoção do último admin                         |
| `aaa_pontos_autotag`                          | pontos             | BEFORE INSERT/UPDATE | Auto-tag por orixa_dictionary                          |
| `trg_log_ponto_update`                        | pontos             | AFTER UPDATE         | Auditoria em ponto_change_logs                         |
| `enforce_audio_duration_on_approval`          | pontos_submissions | BEFORE UPDATE        | Exige duration_ms preenchido ao aprovar                |

---

## Edge Functions (Supabase)

| Função                        | Descrição                                                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `ponto-audio-init-upload`     | Inicia upload de áudio para versão existente. Recebe `ponto_versao_id`. Cria `ponto_audios` + submission kind=audio_upload          |
| `ponto-audio-complete-upload` | Finaliza upload. Marca `upload_status = uploaded` e vincula à submission                                                            |
| `ponto-audio-playback-url`    | Gera signed URL para playback. Branch `approved`: busca por versão canônica ou `ponto_versao_id`. Branch `submission`: curator-only |
| `ponto-new-with-audio-init`   | Inicia submission kind=new com áudio. Cria submission + `ponto_audios` (ambos sem ponto_id/versao_id até aprovação)                 |
| `verify-edit-password`        | Verificação de senha para edição                                                                                                    |

---

## Regras de Negócio para o Frontend

1. **Busca:** chamar `search_pontos(query, limit, offset)`. Retorna `(id, title, tags, lyrics_preview_6, score)`.

2. **Exibição de ponto:** buscar `pontos` + JOIN `ponto_versoes WHERE is_canonical = true` para exibição padrão. Título: `COALESCE(versao.title, ponto.title)`.

3. **Variações:** listar `ponto_versoes WHERE ponto_id = X AND is_active = true ORDER BY versao_num`.

4. **Collections:** ao exibir ponto numa coleção, verificar `collections_pontos.ponto_versao_id`. Se preenchido, exibir aquela versão. Se null, exibir a canônica.

5. **Áudio:** buscar `ponto_audios WHERE ponto_versao_id = versao.id AND is_active = true`. Nunca buscar por `ponto_id` diretamente.

6. **Tags de exibição:** `ponto.tags || versao.tags` (união). A busca usa apenas `pontos.search_tsv`.

7. **Upload de áudio para ponto existente:** chamar edge function `ponto-audio-init-upload` com `ponto_versao_id` (não `ponto_id`).

8. **Playback de ponto:** chamar edge function `ponto-audio-playback-url` com `kind=approved` + `ponto_versao_id` ou `ponto_id` (neste caso busca versão canônica automaticamente).
