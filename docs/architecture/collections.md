# Collections

> Status: generated 2026-06-12 from full read of source files. Verify before relying on as spec.

## Purpose

Collections are ordered playlists of pontos. A collection can be owned by an individual user (personal) or by a terreiro (institutional). They are the primary vehicle for organising and sharing curated sets of pontos for liturgical or study purposes. Members-only terreiro collections enforce an access gate: non-members see a join-request wall instead of pontos.

## Files

- **Routes (expo-router):**
  - `app/(app)/collection/[id].tsx` — detail view (re-export of `Collection` screen)
  - `app/(app)/collection/[id]/add.tsx` — search-and-add pontos (re-export of `AddToCollection` screen)
  - `app/(app)/collection/[id]/edit.tsx` — reorder/remove pontos (re-export of `CollectionEdit` screen)
  - `app/(app)/l/colecao/[id].tsx` — deep-link resolver; validates UUID, redirects to `/collection/[id]`
  - `app/(app)/terreiro-collections/[terreiroId]/edit.tsx` — reorder/remove terreiro-level collections (re-export of `TerreiroCollectionsEdit` screen)

- **Screens:**
  - `src/screens/Collection/Collection.tsx` — main collection detail screen
  - `src/screens/Collection/CollectionNameDetailsSheet.tsx` — bottom sheet for editing title/description and deleting
  - `src/screens/CollectionEdit/CollectionEdit.tsx` — drag-to-reorder and remove pontos within a collection
  - `src/screens/CollectionEdit/draftStore.ts` — in-memory draft store and dirty-flag registry
  - `src/screens/TerreiroCollectionsEdit/TerreiroCollectionsEdit.tsx` — drag-to-reorder and remove collections within a terreiro library
  - `src/screens/EditOrderScreenBase/EditOrderScreenBase.tsx` — shared drag-and-drop scaffold used by both edit screens
  - `src/screens/CollectionAddToCollection/AddToCollection.tsx` — search pontos and add them to a collection
  - `src/screens/Home/components/HomeAddToCollectionWizard.tsx` — add-to-collection wizard embedded in Home (versao picker → entidade picker → collection picker)
  - `src/screens/Player/components/LibraryPlayerAddToCollectionModal.tsx` — full-screen add-to-collection modal launched from the player

- **Components:**
  - `src/components/collections/EntidadePlaceholderSheet.tsx` — entity resolver sheet for lyrics with `[entidade]` placeholders
  - `src/components/AddMediumTagSheet.tsx` — sheet to tag a medium against a ponto in collection context
  - `src/components/RemoveMediumTagSheet.tsx` — sheet to remove a medium tag

- **Hooks:**
  - `src/screens/Player/hooks/useCollectionPlayerData.ts` — orchestrates `useCollectionPontosQuery` with player awareness
  - `src/hooks/terreiroMembership.ts` — membership gate checks consumed by `Collection`

- **Queries:**
  - `src/queries/collections.ts` — `useAccountableCollections`, `useEditableCollections`, `useEditableTerreiroIds`, prefetch helpers
  - `src/queries/collectionPontos.ts` — `useCollectionPontosQuery`, `fetchCollectionPontosItems` (offline-aware)
  - `src/queries/collectionsCache.ts` — imperative cache patch helpers: `upsertPontoInCollectionPontosList`, `removePontoFromCollectionPontosList`, `setCollectionPontosList`, `incrementCollectionPontosCountInTerreiroLists`
  - `src/queries/terreirosCollections.ts` — `useCollectionsByTerreiroQuery`, `fetchCollectionsByTerreiro` (offline-aware)
  - `src/queries/mutationUtils.ts` — shared optimistic-update primitives
  - `src/queries/queryKeys.ts` — canonical key registry

- **Services / API:**
  - `src/screens/Home/data/collections.ts` — `createCollection`, `fetchAccessibleCollections`, `fetchAllowedTerreiros` (raw Supabase calls, no React Query)
  - `src/screens/Home/data/collections_pontos.ts` — `addPontoToCollection`, `updateCollectionPontoEntidade` (raw Supabase calls, position-race retry logic)

- **Domain / utils:**
  - `src/utils/terreiroLibraryOrder.ts` — AsyncStorage persistence of the user's local terreiro-library sort order
  - `src/domain/entidadePlaceholder.ts` — `lyricsHasEntidadePlaceholder`, `applyEntidadePlaceholder`, `resolveLyricsWithCollectionEntidade`
  - `src/screens/CollectionAddToCollection/addToCollectionModel.ts` — shared model helpers for add-to-collection flows

## Routes

| Route | Screen | Params | Guard |
|---|---|---|---|
| `/collection/[id]` | `Collection` | `id` (UUID), optional `collectionTitle`, `name`, `terreiroId` | None at route level; members-only gate rendered in screen |
| `/collection/[id]/add` | `AddToCollection` | `id` (UUID) | Auth check in screen; redirects to login prompt if unauthed |
| `/collection/[id]/edit` | `CollectionEdit` | `id` (UUID), `draftKey` (opaque string) | Requires `draftKey` to be present in in-memory `draftStore`; redirects back with toast if missing |
| `/l/colecao/[id]` | `DeepLinkColecaoRoute` (inline) | `id` | Validates UUID via `isUuid`; redirects to home on invalid |
| `/terreiro-collections/[terreiroId]/edit` | `TerreiroCollectionsEdit` | `terreiroId` | Membership check (`admin` or `curimba`); navigates back with toast if unauthorized |

## Navigation

User enters a collection from:
- Terreiro screen (taps a collection card)
- Home search results or feed (via add-to-collection flow)
- Player (back navigation preserves collection context)
- Deep link `https://saravafy.com.br/l/colecao/:id` → resolves through `app/(app)/l/colecao/[id].tsx` → `router.replace("/collection/[id]")`
- Deep link scheme `saravafy://collection/:id` (handled by the same router infrastructure)

From the collection detail, the user navigates to:
- `/collection/[id]/add` — "Adicionar" button
- `/collection/[id]/edit` — "Editar" button (passes a `draftKey` written to `draftStore`)
- `/player` — tapping any ponto card
- Back: if `owner_terreiro_id` is known, returns to `/terreiro`; otherwise `router.back()`

## Contexts consumed/provided

| Context | Provided here? | Consumed by | State shape |
|---|---|---|---|
| `AuthContext` | No | `Collection`, `CollectionEdit`, `TerreiroCollectionsEdit`, `LibraryPlayerAddToCollectionModal`, `AddToCollection` | `{ user: User \| null }` |
| `ToastContext` | No | All screens and edit flows | `{ showToast(msg) }` |
| `PreferencesContext` | No | `Collection`, `EditOrderScreenBase` | `{ effectiveTheme: "light" \| "dark" }` |
| `GestureBlockContext` | No | `Collection`, `TerreiroCollectionsEdit`, `CollectionEdit` | `{ shouldBlockPress() }` |
| `TabControllerContext` | No | `Collection` (optional) | `{ goToTab(name) }` |
| `LoginPromptContext` | No | `Collection` | `{ openLoginSheet({ reason }) }` |
| `GlobalSafeAreaInsetsContext` | No | `Collection`, `EditOrderScreenBase` | `{ top, bottom, … }` |
| `RootPagerContext` | No | `LibraryPlayerAddToCollectionModal` | `{ setIsBottomSheetOpen(bool) }` |

None are provided by this slice.

## Data flow (queries → screens)

### `useAccountableCollections(userId)`
- **queryKey:** `["collections", "accountable", userId]`
- **table:** `collections` (RLS-filtered; returns all visible: personal + terreiro memberships)
- **params:** `userId`
- **cache strategy:** `staleTime: 10min`, `gcTime: 30min`; prefetched at boot via `prefetchAccountableCollections`
- **consumed by:** `LibraryPlayerAddToCollectionModal` (via `useEditableCollections` which wraps this), `Home` mutation context for optimistic patches

### `useEditableCollections(userId)`
- **queryKey:** `["collections", "editableByUser", userId, terreiroIdsHash]`
- **tables:** `collections`, `terreiro_members`
- **params:** `userId`; internally resolves `editableTerreiroIds` first via `useEditableTerreiroIds`
- **cache strategy:** `staleTime: 5min`, `gcTime: 30min`; `placeholderData` keeps previous result while re-fetching
- **consumed by:** `LibraryPlayerAddToCollectionModal` (collection picker), `HomeAddToCollectionWizard` (collection picker step via `Home`)

### `useEditableTerreiroIds(userId)`
- **queryKey:** `["terreiros", "editableByUser", userId]`
- **table:** `terreiro_members`
- **params:** `userId`
- **cache strategy:** `staleTime: 5min`, `gcTime: 30min`

### `useCollectionPontosQuery(collectionId)`
- **queryKey:** `["collections", "pontos", collectionId]`
- **tables:** `collections_pontos` (join to `pontos`, `ponto_versao`, `entidades`)
- **params:** `collectionId`
- **cache strategy:** `staleTime: 3min`, `gcTime: 45min`; offline-aware — falls back to `terreiroPackage` from AsyncStorage if device is offline
- **consumed by:** `useCollectionPlayerData` → `Collection` (ponto list), `CollectionEdit` (via `draftStore` snapshot), `AddToCollection` (existing pontos for duplicate detection)

### `useCollectionsByTerreiroQuery(terreiroId)`
- **queryKey:** `["terreiros", "collectionsByTerreiro", terreiroId]`
- **tables:** `collections`, `collections_pontos` (count)
- **params:** `terreiroId`
- **cache strategy:** `staleTime: 1min`, `gcTime: 30min`; offline-aware; 15 s timeout per request
- **consumed by:** `TerreiroCollectionsEdit`, terreiro screen collection lists

### Collection metadata (imperative, no React Query hook)
- `Collection` screen fetches collection metadata directly via `supabase.from("collections").select(...).eq("id", collectionId).single()` inside a `useCallback` — not wrapped in a TanStack query. This is intentional for the detail view but means no automatic background refetch.

## Supabase surface

- **Tables read:**
  - `collections` — metadata (id, title, description, visibility, owner_user_id, owner_terreiro_id), joined to `terreiros` for title/cover
  - `collections_pontos` — ordered ponto list; joined to `pontos`, `ponto_versoes`, `entidades`
  - `terreiro_members` — editable-terreiro resolution and membership gate
  - `terreiros` — title and cover image (via foreign key embed)
  - `pontos` — title, tags, author_name, is_public_domain, entidade/orixa embed
  - `ponto_versoes` — canonical/active versoes per ponto

- **Tables written:**
  - `collections` — `INSERT` (create), `UPDATE` (title/description), `DELETE` (delete collection)
  - `collections_pontos` — `INSERT`/`UPSERT` (add ponto, reorder), `DELETE` (remove ponto or batch-remove on edit)
  - `collections_pontos.entidade_id / entidade_texto / entidade_orixa_id` — updated via `updateCollectionPontoEntidade`

- **RPCs called:** None. All operations are direct table mutations.

- **Realtime channels:** None.

- **Storage buckets:** None accessed directly by this slice (cover images are URLs stored in `terreiros.cover_image_url`).

- **Edge functions:** None.

## Mutations

### 1. Add ponto to collection (`addPontoToCollection` / `addToCollectionMutation`)

Called from: `LibraryPlayerAddToCollectionModal`, `Home` (via `HomeAddToCollectionWizard`), `AddToCollection` screen.

**Strategy (cache-contract compliant):**

`onMutate`:
- Cancel queries: `collections.accountable(userId)`, `collections.editableByUserPrefix(userId)`, `collections.byId(collectionId)`, `collections.pontos(collectionId)`, prefix `["terreiros","collectionsByTerreiro"]`
- Snapshot all affected queries
- Optimistically patch `updated_at` on the collection in `accountable` and `editableByUser*` lists
- Optimistically insert the ponto into `collections.pontos(collectionId)` via `upsertPontoInCollectionPontosList` (including lyrics with entity placeholder resolved)
- Increment `pontosCount` in all `collectionsByTerreiro` lists via `incrementCollectionPontosCountInTerreiroLists`

`onError`:
- Full rollback via `rollbackQueries(snapshot)`
- Display error toast (raw message in dev, generic in prod)

`onSuccess`:
- If `alreadyExists`, undo the optimistic ponto insert (`removePontoFromCollectionPontosList`) and decrement the count

`onSettled`:
- Invalidate: `accountable`, `editableByUserPrefix`, `byId(collectionId)`, `pontos(collectionId)`, `collectionsByTerreiro` prefix

**Position-race handling:** `addPontoToCollection` retries up to 3 times on `UNIQUE(collection_id, position)` conflicts, re-fetching `max(position)` before each attempt. Duplicate-ponto violations (PK constraint) are treated as success with `alreadyExists: true`.

### 2. Create collection (`createCollectionMutation` in `Home`)

**Strategy (partial — does not fully follow cache-contract):**

`mutationFn`: inserts into `collections`, selects back the new row.

`onMutate`: None — no optimistic update implemented.

`onSettled`: Invalidates `accountable` and `editableByUserPrefix` lists.

Note: `cache-contract.md` documents the intended optimistic pattern (insert with `tempId` → replace on success) but it is not yet implemented here.

### 3. Edit ponto order / remove pontos (`saveCollectionPontosDraft` in `CollectionEdit`)

Not wrapped in `useMutation`. Called imperatively from `EditOrderScreenBase.save()`.

**Write path:**
1. DELETE removed `ponto_id`s from `collections_pontos`
2. Two-phase UPSERT for reorder (phase 1: positions offset by 10,000 to avoid UNIQUE conflicts; phase 2: final positions 1…N)

**Cache updates after save:**
- `setCollectionPontosList` — replaces `collections.pontos(collectionId)` with the re-ordered items
- `incrementCollectionPontosCountInTerreiroLists` — adjusts count delta if pontos were removed
- `markCollectionPontosDirty(collectionId)` — sets a dirty flag in `draftStore`; on next focus of the collection screen, `consumeCollectionPontosDirty` triggers `reloadPontos()` and `loadCollection()`
- Explicit invalidations: `byId(collectionId)`, `pontos(collectionId)`, prefix `["terreiros","collectionsByTerreiro"]`

### 4. Edit collection title/description (`saveNameDetails` in `Collection`)

Not wrapped in `useMutation`. Called imperatively.

**Write path:** `supabase.from("collections").update({ title, description }).eq("id", id)` with an ownership guard (`.eq("owner_user_id", userId)` or `.eq("owner_terreiro_id", terreiroId)`)

**Cache updates:** Local `setState` on the `collection` state variable; then invalidates `accountable(userId)`, `editableByUserPrefix(userId)`, `collectionsByTerreiro(terreiroId)`.

**Schema compat fallback:** If `description` column is missing, retries with title-only payload.

### 5. Delete collection (`deleteCollection` in `Collection`)

Not wrapped in `useMutation`. Called imperatively.

**Write path:** `supabase.from("collections").delete().eq("id", id)` with ownership guard.

**Cache updates:** `removeQueries` for `byId(collectionId)` and `pontos(collectionId)`; invalidates `accountable`, `editableByUserPrefix`, `collectionsByTerreiro`.

### 6. Reorder/remove terreiro-level collections (`onSave` in `TerreiroCollectionsEdit`)

Not wrapped in `useMutation`. Called imperatively.

**Write path:**
- Saves display order locally via `saveTerreiroLibraryOrder(terreiroId, orderedIds)` — AsyncStorage key `saravafy:terreiro-library-order:<terreiroId>`
- For each removed collection ID, deletes from `collections` with `.eq("owner_terreiro_id", terreiroId)` guard
- Invalidates `collectionsByTerreiro(terreiroId)` only if removals occurred

## Business rules / invariants

**Ownership and edit gating:**
- A collection is editable by its `owner_user_id` (personal collections) or by any active `admin` or `curimba` member of its `owner_terreiro_id` (terreiro collections).
- The `Collection` screen checks this at the component level (`canEditCollection`) before opening the edit sheet or navigating to edit.
- `TerreiroCollectionsEdit` re-checks membership on mount and navigates back with a toast if the user lacks `admin`/`curimba` role.

**Visibility / members-only gate:**
- `visibility` is a Postgres enum `collection_visibility`; default `'public'`.
- `visibility === "members"` triggers a gate in `Collection`: non-members see a join-request card instead of pontos. Active members see pontos normally.
- If a user loses membership while the screen is open (detected via a `useEffect` watching `membership.data.isActiveMember`), a toast fires and the user is redirected to the pontos tab.
- The `useCollectionPontosQuery` is enabled only when `shouldLoadPontos` is true: `!!collection && (!isMembersOnly || isMember)`. An `allowCachedWhileDisabled` option shows stale cache while waiting for metadata to load.

**Cancellation of membership request:**
- The "Cancelar pedido" button (shown to users with a pending request) calls `showToast("Cancelamento de pedido: TODO (backend).")` — this is a confirmed stub with no backend implementation.

**Entidade placeholder resolution:**
- Collections may pin a specific `ponto_versao_id` and an entidade choice (`entidade_id` or `entidade_texto`) per row in `collections_pontos`.
- If lyrics contain `[entidade]`, the wizard intercepts after versao selection and presents `EntidadePlaceholderSheet` before the user picks a collection.
- The resolved label is applied via `resolveLyricsWithCollectionEntidade` during fetch in `collectionPontos.ts` and during optimistic cache patches.
- `entidade_linha_texto` column exists in the DB schema but is not read or written by any current code.

**Draft store (in-memory, ephemeral):**
- `putCollectionEditDraft` stores a snapshot (`{ collectionId, collectionTitle, orderedItems, createdAt }`) keyed by a unique `draftKey` (timestamp + random suffix).
- `consumeCollectionEditDraft` deletes the entry after first read — the `CollectionEdit` screen must be opened via the specific navigation path that passes `draftKey`.
- If `draftKey` is absent or stale on mount, the screen shows a toast and calls `router.back()`.
- No persistence: a foreground process kill between opening the collection and tapping "Editar" would lose the draft.

**Terreiro library order:**
- The display order of a terreiro's collections is stored locally in AsyncStorage, not in Supabase. Two devices can have different orderings for the same terreiro.
- If a collection ID in the saved order no longer exists in the query result, `applyTerreiroLibraryOrder` silently drops it. New collections appended by the server appear at the end of the list.

**Position management:**
- `collections_pontos` has a `UNIQUE(collection_id, position)` constraint.
- `addPontoToCollection` retries up to 3 times on position conflicts by re-fetching `max(position)`.
- Reorder in `CollectionEdit` uses a two-phase upsert (offset to 10,000 then to 1…N) to avoid transient UNIQUE violations without relying on a DB transaction or RPC.

**Title length cap:**
- `createCollection` caps title at 40 characters.
- `CollectionNameDetailsSheet` allows up to 80 characters (the two limits are inconsistent).

## Cross-feature dependencies

| Dependency | What is imported |
|---|---|
| Auth (`AuthContext`) | `user.id` for ownership checks and mutation guards |
| Terreiro membership (`src/hooks/terreiroMembership.ts`) | `useTerreiroMembershipStatus`, `useCreateTerreiroMembershipRequest` — gate rendering and join-request flow |
| Player (`src/screens/Player/hooks/useCollectionPlayerData.ts`) | `useCollectionPlayerData` (wraps `useCollectionPontosQuery`); `CollectionPlayerItem` and `PlayerPonto` types flow up into `draftStore` snapshot and `collectionsCache` helpers |
| Pontos (`src/queries/pontoVersoes.ts`) | `fetchActivePontoVersoesByPontoIds` — fetched inside `fetchCollectionPontosItems` and by wizards to populate versao picker |
| Entidades (`src/queries/entidadesCatalog.ts`) | `useEntidadesCatalogQuery` — loaded on demand when an entity placeholder is detected |
| Terreiro pontos custom tags (`src/queries/terreiroPontoCustomTags.ts`) | `useTerreiroPontosCustomTagsMap` — medium tags overlaid on ponto cards |
| Pontos audio (`src/hooks/pontoAudio.ts`) | `useLatestPontoAudioMetaByPontoIds` — interpreter name shown on ponto cards in the collection detail |
| Offline (`src/offline/terreiroPackage.ts`, `src/offline/networkCheck.ts`) | `isOffline`, `listPackages`, `getPackage` — fallback data source for `fetchCollectionPontosItems` and `fetchCollectionsByTerreiro` |
| Share utils (`src/utils/shareContent.ts`) | `buildShareMessageForColecao` — generates share message on the share button |

## Known issues / TODOs found in code

1. **Membership request cancellation is a stub.** `Collection.tsx` line 1319: `showToast("Cancelamento de pedido: TODO (backend).")` — the "Cancelar pedido" button does nothing except display a toast. No backend endpoint or mutation exists.

2. **Collection metadata fetch bypasses React Query.** The `loadCollection` function in `Collection.tsx` is a raw `async/await` inside a `useCallback`, stored in local `useState`. This means the collection title/description have no shared cache key, no background refetch, no stale-while-revalidate, and no deduplication if the same screen is mounted twice. The schema-compat fallback for the `description` column is duplicated here and in `terreirosCollections.ts`.

3. **Create collection has no optimistic update.** `cache-contract.md` documents the intended `tempId` → `realId` pattern, but `createCollectionMutation` in `Home.tsx` implements no `onMutate` at all. The list only updates after `onSettled` invalidation.

4. **Title length inconsistency.** `createCollection` (in `Home/data/collections.ts`) hard-caps at 40 chars; `CollectionNameDetailsSheet` allows 80 chars. A collection created via `createCollection` could then be renamed to a longer title via the sheet.

5. **`entidade_linha_texto` column is unused.** The DB schema has a `collections_pontos.entidade_linha_texto` column of a user-defined type, but it is never queried or written anywhere in the codebase.

6. **`is_public` column is unused.** The `collections` table has an `is_public boolean` column in the schema, but it is never referenced anywhere in the client code. The `visibility` enum is used instead.

7. **`draftStore` is ephemeral and unguarded against staleness.** There is no TTL check on drafts. A `createdAt` field is stored on the snapshot but never compared on consume. A very old draft (from a previous app session, if the JS bundle is kept alive in the background) would be consumed without warning.

8. **Terreiro library order is device-local only.** Collection ordering within a terreiro library is stored in AsyncStorage with no backend sync. A user switching devices or clearing app storage silently loses their ordering. This is architecturally intentional but undocumented as a limitation.

9. **`saveNameDetails` and `deleteCollection` are not `useMutation`.** These are plain `async` functions called from event handlers. There is no rollback on failure and no `onMutate` optimistic path — the UI only updates after the server round-trip succeeds (except for the local `setCollection` state update on success).

10. **`fetchAccountableCollections` has a duplicate `isColumnMissingError` definition.** The same function is defined locally in `Collection.tsx` (line 105), `collections.ts` (line 30), and `terreirosCollections.ts` (line 36). No shared utility is used.

11. **`getErrorMessage` is duplicated.** Defined identically in at least five files: `Collection.tsx`, `collections.ts`, `collectionPontos.ts`, `terreirosCollections.ts`, `Home/data/collections.ts`. Should live in a single utility module.

12. **`HomeAddToCollectionWizard` uses an ad-hoc query key.** The versoes query inside the wizard uses `["pontos", "versoesBatch", "homeAddWizard", pontoId]` — a key that is not registered in `queryKeys.ts` and is not invalidated by any mutation.
