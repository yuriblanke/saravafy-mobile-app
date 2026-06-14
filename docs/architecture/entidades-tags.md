# Entidades / Tags

> Status: generated 2026-06-12 from full read of source files. Verify before relying on as spec.

## Purpose

Provides three orthogonal taxonomy layers on top of pontos: (1) a global **entidades/orixás catalog** that classifies each ponto by spiritual entity and optionally its patron orixá; (2) **medium tags** (`terreiro_ponto_custom_tags`) that terreiro admins/curimba operators attach per-ponto per-terreiro to identify which medium channels that entity at their house; (3) generic **ponto tags** (free-text array on `pontos.tags`) used for search and display. A fourth cross-cutting mechanism—the **entidade placeholder** (`[entidade]`)—allows lyrics to defer the entity name until a collection entry resolves it at playback time.

## Files

- **Queries:** `src/queries/entidadesCatalog.ts`, `src/queries/terreiroPontoCustomTags.ts`, `src/queries/pontoEntidadeSelect.ts`, `src/queries/queryKeys.ts`
- **Domain / utils:** `src/domain/entidade.ts`, `src/domain/entidadePlaceholder.ts`, `src/utils/mergeTags.ts`
- **Components:** `src/components/TagChip.tsx`, `src/components/TagPlusChip.tsx`, `src/components/AddMediumTagSheet.tsx`, `src/components/RemoveMediumTagSheet.tsx`, `src/components/MediumTagRemoveHintBottomSheet.tsx`, `src/components/pontos/PontoEntidadeOrixaChips.tsx`, `src/components/collections/EntidadePlaceholderSheet.tsx`
- **Screens:** `src/screens/Player/components/PlayerContent.tsx`, `src/screens/Player/PlayerScreen.tsx`, `src/screens/Collection/Collection.tsx`, `src/screens/CollectionAddToCollection/AddToCollection.tsx`, `src/screens/Home/components/HomeAddToCollectionWizard.tsx`
- **Data helpers:** `src/screens/Home/data/collections_pontos.ts` (`addPontoToCollection`, `updateCollectionPontoEntidade`)
- **Queries (cross-slice):** `src/queries/collectionPontos.ts` (resolves `collectionEntidadeResolve` shape)

## Routes

No dedicated routes for taxonomy. Taxonomy UI surfaces inside existing screens:

| Surface | Screen/component | Entry point |
|---|---|---|
| Entidade picker (add-to-collection) | `EntidadePlaceholderSheet` inside `AddToCollection` / `HomeAddToCollectionWizard` | Triggered when ponto lyrics contain `[entidade]` marker |
| Entidade edit (collection player) | `EntidadePlaceholderSheet` inside `PlayerScreen` | Long-press / tap marker chip in player |
| Medium tag add | `AddMediumTagSheet` in `PlayerScreen` / `Collection` | `TagPlusChip` press (admin/curimba only) |
| Medium tag remove | `RemoveMediumTagSheet` in `PlayerScreen` / `Collection` | Long-press on medium `TagChip` (admin/curimba only) |

## Navigation

No deep links specific to taxonomy. The `EntidadePlaceholderSheet` is a full-screen `Modal` with `presentationStyle="fullScreen"` and slide animation; it has its own back chevron. All tag sheets are `BottomSheet` overlays. Users reach taxonomy surfaces via the player or collection list — no direct URL entry points.

## Contexts consumed/provided

| Context | Provided here? | Consumed by | State shape |
|---|---|---|---|
| `ToastContext` | No | `AddMediumTagSheet`, `RemoveMediumTagSheet`, `PlayerScreen`, `Collection` | `showToast(message)` |
| `QueryClientContext` (React Query) | No | All query/mutation hooks | Standard TanStack |

No context is provided by the taxonomy slice itself.

## Data flow (queries → screens)

### 1. `useEntidadesCatalogQuery`

- **queryKey:** `["entidades", "catalog"]`
- **table/rpc:** `entidades` (SELECT with self-join `orixa:entidades(id, nome, linha)`)
- **params:** none (global catalog, filtered server-side by `is_active = true`)
- **cache strategy:** `staleTime: 10 min`, `gcTime: 60 min`; paginated fetch 1 000 rows/page (loop until batch < page size); no realtime
- **screens:** `AddToCollection` (enabled always), `HomeAddToCollectionWizard` (enabled always), `PlayerScreen` (lazy-enabled only when `entidadeEditCtx` is set — i.e. user tapped the marker chip)

### 2. `useTerreiroPontosCustomTagsMap`

- **queryKey:** `["pontos", "customTags", terreiroId, pontoIdsHash]`
- **table/rpc:** `terreiro_ponto_custom_tags` (SELECT filtered by `source = "medium"` AND `template_key = "medium"`)
- **params:** `terreiroId`, `pontoIds` (hashed with FNV-1a into a stable string)
- **cache strategy:** `staleTime: 60 s`, `gcTime: 5 min`, `placeholderData: prev` (keeps stale map while revalidating)
- **screens:** `PlayerScreen` (enabled when `canSeeMediumTags && pontoIds.length > 0`), `Collection` (same gate)

### 3. Entidade embed in `collectionPontos`

- **queryKey:** `["collections", "pontos", collectionId]`
- **table/rpc:** `collections_pontos` joined with `pontos` and double self-join on `entidades`
- **select fragment:** `COLLECTIONS_PONTOS_ENTIDADE_EMBED` = `entidades:entidade_id ( id, nome, linha, orixa:entidades ( id, nome, linha ) )` (from `collections_pontos`); `PONTOS_ENTIDADE_ORIXA_EMBED` = `entidade_id, entidades ( id, nome, linha, orixa:entidades ( id, nome, linha ) )` (from `pontos`)
- **resolved shape:** `collectionEntidadeResolve: { entidadeTexto: string | null, entidadeLabelFromId: string | null }` — used by `PlayerContent` / `LyricsScroll` to substitute `[entidade]` at render time
- **screens:** `PlayerScreen` (collection context), `Collection`

### 4. Ponto tags (`pontos.tags`)

- **source:** `pontos.tags` TEXT[] column, selected as part of ponto rows in pontos feed, collection pontos, and search queries
- **no dedicated query key** — embedded in parent ponto rows
- **screens:** `PlayerContent` (renders generic `TagChip` per tag), `Collection`, `AddToCollection` (uses `normalizeTag` for deduplication)

## Supabase surface

- **Tables read:**
  - `entidades` — global entity catalog (id, nome, linha::`entidade_linha`, orixa_id self-FK, is_active)
  - `entidade_aliases` — alias names for entities (entidade_id FK → entidades); not queried from client in current code
  - `collections_pontos` — entidade_id, entidade_texto, entidade_orixa_id, entidade_linha_texto (USER-DEFINED type `entidade_linha`, nullable) columns read when loading collection items
  - `terreiro_ponto_custom_tags` — id, terreiro_id, ponto_id, tag_text, tag_text_normalized, source, template_key, created_by, created_at, updated_at
  - `pontos` — tags TEXT[] column (free-text array)

- **Tables written:**
  - `terreiro_ponto_custom_tags` — INSERT (add medium tag), DELETE by id (remove medium tag)
  - `collections_pontos` — UPDATE of entidade_id / entidade_texto / entidade_orixa_id (via `updateCollectionPontoEntidade`); also set at INSERT time via `addPontoToCollection`

- **RPCs called:** none (all direct table reads/writes)

- **Realtime channels:** none

- **Storage buckets:** none

- **Edge functions:** none

## Mutations

All mutations are imperative async functions called from component handlers (no `useMutation` wrapper).

### Add medium tag (`AddMediumTagSheet.submit`)

- **Operation:** `supabase.from("terreiro_ponto_custom_tags").insert({ terreiro_id, ponto_id, source: "medium", template_key: "medium", tag_text, tag_text_normalized }).select().single()`
- **onMutate (optimistic):** `queryClient.setQueriesData` with predicate `key[0] === "pontos" && key[1] === "customTags" && key[2] === terreiroId` — appends new tag object to `map[pontoId]`, deduplicating by `tagTextNormalized`
- **onError:** toast with Supabase error; handles `code 23505` (duplicate) and RLS strings explicitly
- **onSuccess:** calls `onSuccess?.(tag_text)`, then conditionally shows `MediumTagRemoveHintBottomSheet` (shown once; flag stored in `AsyncStorage` under key `hint_medium_tag_long_press_remove_shown_v1`)
- **onSettled:** no explicit invalidation — relies on optimistic patch; data re-fetched on next stale window (60 s)
- **Rollback:** none — no snapshot taken; duplicate guard in optimistic updater prevents phantom entries on error
- **RLS guard:** requires active `isActiveMember` with role `admin` or `curimba` (enforced at RLS on `terreiro_ponto_custom_tags`)

### Remove medium tag (`RemoveMediumTagSheet.remove`)

- **Operation:** `supabase.from("terreiro_ponto_custom_tags").delete().eq("id", tagId).eq("terreiro_id", terreiroId)`
- **onMutate (optimistic):** `queryClient.setQueriesData` same predicate as add — filters out tag by `id` from `map[pontoId]`
- **onError:** toast
- **onSettled:** no explicit invalidation
- **Rollback:** none

### Update collection entidade (`updateCollectionPontoEntidade`)

- **Operation:** `supabase.from("collections_pontos").update({ entidade_id, entidade_texto, entidade_orixa_id }).eq("collection_id", ...).eq("ponto_id", ...)`
- **Supports two modes:** `kind: "registered"` → writes entidade_id + optional entidade_orixa_id, nulls entidade_texto; `kind: "custom"` → writes entidade_texto, nulls entidade_id and entidade_orixa_id
- **Cache:** after success, `PlayerScreen` invalidates `queryKeys.collections.pontos(collectionId)` to refetch fresh entidade labels; `Collection` does the same
- **Optimistic:** no — waits for server response before updating UI

### Add ponto to collection with entidade (`addPontoToCollection`)

- **Operation:** upsert on `collections_pontos` with `onConflict: "collection_id,ponto_id"`, `ignoreDuplicates: true`; retries up to 3× on `UNIQUE(collection_id, position)` race
- **Entidade payload:** populated when ponto has `[entidade]` marker and user chose an entity in the wizard before confirming add

## Business rules / invariants

1. **Entidade catalog is global and read-only from the client.** Only `is_active = true` entries are fetched. The client never creates or edits entries in `entidades`.

2. **Orixá is a self-FK on `entidades`.** A row in `entidades` may point to another row via `orixa_id`; the client resolves this as a two-level embed using the alias `orixa:entidades(...)`. A third level is never needed. The comment in `pontoEntidadeSelect.ts` notes that using the hint `!entidades_orixa_fkey` in the PostgREST selector causes PGRST200; the workaround is `orixa:entidades(...)` without the hint.

3. **`resolveEntidadeLabel` priority:** `nome` (non-null) → `"${linha} de ${orixas.nome}"` (when nome is null but orixá has a name) → `linha` string. Used both in the catalog picker and in chip rendering.

4. **`[entidade]` marker is per-collection-entry, not global.** The raw lyric text in `ponto_versoes.lyrics` contains the literal string `[entidade]`. The placeholder is substituted at render time in `LyricsScroll` / `PlayerContent` using `resolveLyricsWithCollectionEntidade`. Outside a collection context the marker is shown inline as a tappable info chip.

5. **Entidade text vs. entidade ID:** `collections_pontos` stores either `entidade_id` (FK to `entidades`) or `entidade_texto` (free text), never both simultaneously (update always nulls the other). `entidade_orixa_id` is populated only for registered choices.

6. **Medium tags are terreiro-scoped.** A tag row belongs to `(terreiro_id, ponto_id)` and is filtered further by `source = "medium"` and `template_key = "medium"`. The unique constraint `uq_tpc_terreiro_ponto_tag` enforces `(terreiro_id, ponto_id, tag_text_normalized)`.

7. **Read access to medium tags is public within a terreiro context.** `canSeeMediumTags = !!terreiroId` — any user viewing a terreiro's player sees medium tags. Write access (`canEditCustomTags`) requires `isActiveMember && (role === "admin" || role === "curimba")`.

8. **Generic ponto tags** (`pontos.tags`) are a free-text TEXT[] column set at ponto creation/edit time (`PontoUpsertModal`). They are comma-delimited in the input, normalized (trimmed, deduplicated case-insensitively) client-side, and stored as an array. No dedicated API for tag-only updates; they are always updated as part of a full `pontos.update`.

9. **Medium tag remove hint:** shown once after the first successful medium tag add, if the adding user is also eligible to remove. Stored in AsyncStorage; not synced to server.

10. **`entidade_linha_texto`** column (`entidade_linha` enum type) on `collections_pontos` is present in the schema but is never written or read by any current client code — it appears to be a legacy or planned column.

## Cross-feature dependencies

| Dependency | Why |
|---|---|
| **Auth / `useTerreiroMembershipStatus`** | `canEditCustomTags` gate (role `admin` or `curimba`) for medium tag writes |
| **Collections (`collectionPontos`)** | `fetchCollectionPlayerItems` resolves `collectionEntidadeResolve` shape; invalidated after entidade update |
| **Player** | `PlayerContent` / `LyricsScroll` consume `collectionEntidadeResolve` and render `[entidade]` inline; `PlayerScreen` hosts `AddMediumTagSheet`, `RemoveMediumTagSheet`, `EntidadePlaceholderSheet` |
| **Pontos** | `pontos.tags` TEXT[] and `pontos.entidade_id` FK are read everywhere pontos are fetched; `PontoUpsertModal` edits generic tags |
| **`queryKeys`** | `entidades.catalog()` and `pontos.customTagsByTerreiro(...)` keys defined centrally |
| **`mutationUtils`** | Not used here — mutations are imperative async functions; helpers from `mutationUtils.ts` are not called in this slice |

## Known issues / TODOs found in code

1. **`isMediumTag` and `mergeCustomAndPointTags` are dead code.** Both are exported from `src/utils/mergeTags.ts` but have zero import sites in the current codebase. Only `normalizeTag` is imported (by `AddToCollection`). `isMediumTag` uses a stale heuristic (`n.startsWith("medium:")`) that does not match any production data format.

2. **No rollback on medium tag mutations.** Neither `AddMediumTagSheet` nor `RemoveMediumTagSheet` snapshots query state before the optimistic patch. A network error leaves the UI in the patched state until the next stale refetch (60 s window).

3. **`entidade_linha_texto` column is unused.** The `collections_pontos` table has an `entidade_linha_texto` column of type `entidade_linha` (a database enum). No client code reads or writes it. Purpose is unclear — possibly a planned denormalization or legacy migration artifact.

4. **`entidade_aliases` table is never queried from the client.** The table exists in the schema with a FK to `entidades` and a `nome_unique` constraint, suggesting it was intended for alias/alternate-name lookup. No query in `src/` touches it.

5. **Catalog fetch is not lazy-preloaded.** `useEntidadesCatalogQuery` is only mounted when a component that needs the picker renders. There is no global prefetch call (e.g., in app startup or a root layout). First open of the entidade picker on a cold session always triggers a network fetch.

6. **`useTerreiroPontosCustomTagsMap` query key is disabled when `idsHash` is empty, but returns `[]` for key.** When `enabled = false`, the hook passes `queryKey: []` to React Query. This is a non-standard pattern; the empty array key could collide with other queries if `enabled` logic has a bug.

7. **`canEditCustomTags` in `PlayerScreen` requires role `admin` or `curimba` but the comment says "curimba".** The `curimba` role exists specifically for operators who manage the sound desk during rituals. The `editor` role (present on other screens for collection editing) does NOT grant medium tag write access, which is intentional but not documented in code.

8. **No invalidation after medium tag add/remove.** After the optimistic patch, the query is never explicitly invalidated in `onSettled`. If the server write fails silently (non-error response), the cache diverges permanently until the 60-second stale timer fires.
