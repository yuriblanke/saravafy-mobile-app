# Pontos

> Status: generated 2026-06-12 from full read of source files. Verify before relying on as spec.

## Purpose
Browse, search, listen to, submit, edit and correct Umbanda chants ("pontos"). This is the core content domain of the app: the Home feed of the Pontos tab, fulltext search via Postgres RPC, the user-facing submission workflow (new ponto, correction, optional audio attachment), the versioning layer (`ponto_versoes`) that holds the canonical lyrics row, and the entidade/orixá chip integration. Curator-side review of those submissions lives in the curator-review slice; this slice only produces them.

## Files

### Routes (expo-router)
- `app/(app)/(tabs)/(pontos)/_layout.tsx` — headerless Stack, transparent content background, `animation: "none"`. Single child screen.
- `app/(app)/(tabs)/(pontos)/index.tsx` — thin re-export of `src/screens/Home/Home`.
- `app/(app)/l/ponto/[id].tsx` — deep-link target. Validates UUID via `isUuid`, then `router.replace`s to `/player` with `{ source: "all", pontoId }`.
- `app/(app)/l/[tipo]/[id].tsx` — generic deep-link bridge. Normalizes `tipo` (NFD-strips accents) and routes `ponto/pontos`, `colecao/colecoes`, `terreiro/terreiros`, `collection/collections` to the right screen. For ponto, replaces to `/player?source=all&pontoId=:id`.
- `app/(app)/ponto-audio-upload.tsx` — re-exports `PlayerAudioUpload` (the dedicated full-screen audio upload flow for an existing ponto). Mounted as a modal Stack route by `(app)/_layout.tsx`.

### Screens
- `src/screens/Home/Home.tsx` — the Pontos tab body: search bar, feed list, "Enviar ponto" CTA, add-to-collection wizard, edit/correction modal mount points. **Owns its own local `useState<Ponto[]>` populated by `fetchAllPontos()` — does not go through React Query for the main feed list.**
- `src/screens/Home/data/ponto.ts` — `fetchAllPontos()` direct select from `pontos` + canonical `ponto_versoes!inner`.
- `src/screens/PlayerAudioUpload/PlayerAudioUpload.tsx` — full-screen modal for uploading audio to an existing ponto. Drives `PontoAudioUploadController` with a picked file.
- `src/screens/Player/components/PlayerSearchModal.tsx` — alternate consumer of `usePontosSearch` (search sheet inside the Player).

### Components
- `src/components/pontos/PontoUpsertModal.tsx` — universal modal for `mode = "create" | "edit" | "correction"`. Owns rights-consent bottom sheet, terms-of-use bottom sheet, tag chip editor, optional audio attachment for `create`, hand-off to `PlayerAudioUpload` for `edit`.
- `src/components/pontos/PontoAudioUploadController.tsx` — render-prop controller: init upload edge function → signed PUT to storage → finalize RPC.
- `src/components/pontos/PontoEntidadeOrixaChips.tsx` — tiny render component: emits a primary `TagChip` for entidade and a secondary one for orixá (only when both present).
- `src/components/SubmitPontoModal.tsx` — thin wrapper around `PontoUpsertModal` with `mode="create"`. Mounted by `Home.tsx`.

### Contexts
- None provided here. Consumes `AuthContext`, `PreferencesContext`, `ToastContext`, `RootPagerContext`, `LoginPromptContext`, `CuratorModeContext`, `GestureBlockContext`.

### Hooks
- `src/hooks/usePontosSearch.ts` — debounced (300ms) wrapper around `searchPontos` RPC; gates on min 4 chars; returns `{ canSearch, isLoading, results, error, lastSearched }`. **Not React Query** — local `useState` + race-guard against query string changing between debounce and response.
- `src/hooks/pontoAudio.ts` — `usePontoAudioMetaById`, `useLatestPontoAudioMetaByPontoIds`, `usePontoAudios`, `useHasAnyUploadedPontoAudio`, `useInitPontoAudioUploadMutation`, `useCompletePontoAudioUploadMutation`. Plays into Home's per-card interpreter badge.

### Queries (React Query)
- `src/queries/pontosFeed.ts` — `fetchHomeFeedPontos`, `useHomeFeedPontos`, `prefetchHomeFeedPontos`. Currently only `prefetchHomeFeedPontos` is wired (boot warm-up at `app/_layout.tsx:323`); `useHomeFeedPontos` is **declared but unused**.
- `src/queries/pontoSubmissions.ts` — `usePendingPontoSubmissions` (curator slice), `usePontoSubmissionById` (curator slice), `useApprovedPontoAudioSubmission` (Player), plus fetcher exports.
- `src/queries/pontoVersoes.ts` — `fetchActivePontoVersoesByPontoIds`: batched select of all active `ponto_versoes` for a list of `ponto_id`s, grouped + sorted by `versao_num`. Consumed by `CollectionAddToCollection`.
- `src/queries/pontoEntidadeSelect.ts` — PostgREST fragments `PONTOS_ENTIDADE_ORIXA_EMBED` and `COLLECTIONS_PONTOS_ENTIDADE_EMBED` for entidade/orixá embeds.
- `src/queries/entidadesCatalog.ts` — paged catalog query.
- `src/queries/queryKeys.ts` — registry: `queryKeys.pontos.feed(userId)`, `queryKeys.pontosSubmissions.pending()`, `queryKeys.pontosSubmissions.byId(submissionId)`, `queryKeys.pontosSubmissions.approvedAudioByPontoId(pontoId)`, `queryKeys.pontosSubmissions.approvedAudioByPontoAndVersao(pontoId, pontoVersaoId)`, `queryKeys.pontoAudios.byPontoId`, `queryKeys.pontoAudios.byPontoIdsHash`, `queryKeys.pontoAudios.hasAnyUploadedByPontoId`, `queryKeys.entidades.catalog()`.

### Services / API
- `src/services/pontosSearch.ts` — `searchPontos` (RPC `search_pontos`), constants `PONTOS_SEARCH_MIN_CHARS = 4`, `PONTOS_SEARCH_DEBOUNCE_MS = 300`, `PONTOS_SEARCH_DEFAULT_LIMIT = 20`, `PONTOS_SEARCH_DEFAULT_OFFSET = 0`, `normalizePontosSearchQueryGate`. Also enriches search results with entidade/orixá in a second query.
- `src/api/pontoAudio.ts` — `initPontoAudioUpload`, `uploadToSignedUpload`, `completePontoAudioUpload`, `completeUploadWithRetry`, `finalizeAudioUploadAndCreateSubmission`, `getPontoAudioPlaybackUrlPublic`, `getPontoAudioPlaybackUrlReviewBySubmission`, `getReviewPlaybackUrlEnsured`, `prefetchReviewPlaybackUrl`, `getPontoAudioDurationMs`, `tryPersistPontoAudioDurationMs`.
- `lib/pontosSubmissions.ts` — `createPontoSubmission` and `submitPontoCorrection` insert directly into `pontos_submissions` from the client (not via RPC).
- `supabase/functions/ponto-audio-complete-upload/index.ts` — Deno edge function that marks `ponto_audios.upload_status = 'uploaded'` after the signed PUT.

### Domain / utils
- `src/domain/ponto.ts` — `PontoVersao`, `PontoWithVersao`, `PontoSubmissionKind = "new" | "correction" | "issue" | "audio_upload" | "variation"`.
- `src/domain/entidade.ts` — `EntidadeSimples`, `EntidadeComOrixa`, `parseEntidadeChipFieldsFromPontoRow`, `resolveEntidadeLabel`, `buildEntidadeComOrixaFromEmbed`.
- `src/utils/pontoCode.ts` — only `isUuid(value)` (regex check; not version-strict).

## Routes

| Route | Screen | Params | Guard |
|---|---|---|---|
| `/(app)/(tabs)/(pontos)` | `Home` (via subtree) | — | inherited from `(app)/_layout.tsx` auth gate |
| `/(app)/(tabs)/(pontos)/index` | `Home` | — | same |
| `/(app)/l/ponto/[id]` | deep-link redirector | `id: uuid` | UUID-checked; redirects to `/(app)/player?source=all&pontoId=:id`. Bad UUID → toast + `/` |
| `/(app)/l/[tipo]/[id]` | deep-link bridge | `tipo`, `id` | normalizes `tipo`; routes `ponto/pontos` → `/player`. Unknown → toast + `/(app)` |
| `/(app)/ponto-audio-upload` | `PlayerAudioUpload` | `pontoId?`, `pontoVersaoId?`, `pontoTitle?` | inherited; modal presentation; disables global swipe overlay (per foundation rules) |

Notable: the `(pontos)` group has its **own Stack layout** with `animation: "none"` and a transparent content background. It currently has a single child screen, so the Stack is structural / future-proofing only.

## Navigation

### Entry
- Default landing for authenticated users — `(app)/index.tsx` redirects to `/(app)/(tabs)/(pontos)` (foundation rule).
- Tab swipe from Terreiros tab (foundation pager).
- Deep link `saravafy://l/ponto/:id` or `https://saravafy.com.br/l/ponto/:id`.

### Exits
- Press a ponto card → `router.push("/player", { source: "all", q: searchQuery, initialPontoId: item.id })`.
- Press "Adicionar à coleção" (per card) → opens the add-to-collection wizard modal; this stays in-tab (not a real route).
- "Enviar ponto" button → `requireAuth(() => setSubmitModalVisible(true))`. Opens the `SubmitPontoModal` (no route change).
- Edit (curator only) → opens `PontoUpsertModal mode="edit"` in-tab.
- From `PontoUpsertModal mode="edit"`, "Adicionar áudio" → `router.push("/ponto-audio-upload", { pontoId, pontoTitle })`. The inline picker is bypassed by a toast: "Envio de áudio agora é feito pela tela dedicada." (`PontoUpsertModal.tsx:424`).
- Deep links — see above.

### Curator entry points (cross-slice)
Edit affordance on Home is gated by `canEditPontos = !!userId && isCurator && curatorModeEnabled === true` (`Home.tsx:149`). When false, the pencil icon is hidden but the "Adicionar à coleção" plus is always shown (after auth gate).

## Contexts consumed/provided

| Context | Provided here? | Consumed by | State shape |
|---|---|---|---|
| `AuthContext` | No | All screens/components in slice | `{ user }` |
| `PreferencesContext` | No | All screens (`effectiveTheme`) | n/a |
| `ToastContext` | No | All screens | `showToast(msg)` |
| `RootPagerContext` | No | `Home` (sets `isBottomSheetOpen` when add-to-collection sheet opens) | foundation contract |
| `LoginPromptContext` | No | `Home` — `requireAuth(action, { reason })` before submit/add-to-collection | foundation contract |
| `CuratorModeContext` | No | `Home` — to decide `canEditPontos` | `{ curatorModeEnabled }` |
| `GestureBlockContext` | No | `Home` — `shouldBlockPress()` before navigating to player | foundation contract |

## Data flow (queries → screens)

### `fetchAllPontos()` — `src/screens/Home/data/ponto.ts`
- **Table:** `pontos` with embed `ponto_versoes!inner(lyrics, lyrics_preview_6)` and `PONTOS_ENTIDADE_ORIXA_EMBED` (entidade + orixá self-FK).
- **Filters:** `is_active = true`, `restricted = false`, `ponto_versoes.is_canonical = true`. Order: `title ASC`. **No limit, no pagination.**
- **Not in React Query.** `Home.tsx` stores result in `useState<Ponto[]>` (line 430); re-runs on focus with an **8-second throttle** (`Home.tsx:516-525`).

### `fetchHomeFeedPontos({ userId, limit })` — `src/queries/pontosFeed.ts`
- **queryKey:** `["pontos", "feed", userId]` (`queryKeys.pontos.feed(userId)`).
- **Table:** `pontos` with `${PONTOS_ENTIDADE_ORIXA_EMBED}, ponto_versoes!inner(lyrics)`.
- **Filters:** `is_active = true`, `restricted = false`, `ponto_versoes.is_canonical = true`, `order title ASC`, `limit`.
- **Cache:** `staleTime: 5min`, `gcTime: 30min`, `placeholderData: prev`.
- **Consumer:** **none.** `useHomeFeedPontos` is never called. Only `prefetchHomeFeedPontos` runs at boot to warm cache. The Home screen does not read this cache.

### `searchPontos({ query, limit, offset })` — `src/services/pontosSearch.ts`
- **RPC:** `search_pontos(p_query, p_limit, p_offset)` returning `id, title, tags, lyrics_preview_6, score, ...`.
- Then enriches with a second `from("pontos").select(`id, ${PONTOS_ENTIDADE_ORIXA_EMBED}`).in("id", ids)` to add `entidadeNome` / `orixaNome` per row.
- **Not in React Query.** `usePontosSearch` (`src/hooks/usePontosSearch.ts`) owns local `useState` and a debounce ref.
- **Min chars:** 4. **Debounce:** 300ms.
- **Consumers:** `Home.tsx:434-440` (main search bar), `PlayerSearchModal.tsx:35` (in-player search sheet), `CollectionAddToCollection/AddToCollection.tsx:382` (cross-slice).

### `useApprovedPontoAudioSubmission(pontoId, { pontoVersaoId? })` — `src/queries/pontoSubmissions.ts`
- **queryKey (preferred):** `queryKeys.pontosSubmissions.approvedAudioByPontoAndVersao(pontoId, pontoVersaoId)` → `["pontosSubmissions","approvedAudio", pontoId, pontoVersaoId]`.
- **queryKey (fallback when no versao):** `queryKeys.pontosSubmissions.approvedAudioByPontoId(pontoId)` → `["pontosSubmissions","approvedAudio", pontoId]`.
- **Table:** when `pontoVersaoId` present, reads `ponto_audios` `is_active=true` ordered by `created_at DESC` `LIMIT 1`, plus a second query against `pontos_submissions` for `kind='audio_upload' AND status='pending' AND ponto_versao_id=:versao`. When no `pontoVersaoId`, reads `pontos_submissions` for `kind='audio_upload' AND status IN ('approved','pending')` and walks the rows.
- **Cache:** `staleTime: 30_000`, `gcTime: 5min`, `placeholderData: prev`.
- **Consumer:** `PlayerScreen.tsx:385`. Produces `audioState` ∈ `"AUDIO_APPROVED" | "AUDIO_IN_REVIEW" | "NO_AUDIO"`.

### `usePontoAudioMetaById(pontoAudioId)` — `src/hooks/pontoAudio.ts`
- **queryKey:** **inline** `["pontoAudios", "metaById", pontoAudioId]` (not in `queryKeys.pontoAudios.*` registry).
- **Table:** `ponto_audios` (`id, interpreter_name, mime_type, upload_status, is_active` where `id=:id AND is_active=true`).
- **Cache:** `staleTime: 30_000`, `gcTime: 5min`.

### `useLatestPontoAudioMetaByPontoIds(pontoIds)` — `src/hooks/pontoAudio.ts`
- **queryKey:** `queryKeys.pontoAudios.byPontoIdsHash(idsHash)` — `idsHash` is an FNV-1a 32-bit hash of the sorted+deduped id list, base-36 (`hashIds` at `pontoAudio.ts:81-92`).
- **Table:** `ponto_audios` (`id, ponto_id, interpreter_name, created_at`), filter `is_active AND upload_status='uploaded' AND ponto_id IN (ids)`, order `created_at DESC`. Reduced client-side to first-per-ponto (newest) `Record<pontoId, { pontoAudioId, interpreterName, createdAt }>`.
- **Cache:** `staleTime: 60_000`, `gcTime: 5min`, `placeholderData: prev`.
- **Consumer:** `Home.tsx:484` keyed on `visiblePontoIds` (capped at 60, set from `onViewableItemsChanged`, viewability threshold 25%). Drives the per-card "Intérprete: …" badge.

### `usePontoAudios(pontoId)` / `useHasAnyUploadedPontoAudio(pontoId)` — `src/hooks/pontoAudio.ts`
- **queryKeys:** `queryKeys.pontoAudios.byPontoId(pontoId)`, `queryKeys.pontoAudios.hasAnyUploadedByPontoId(pontoId)`.
- **Tables:** `ponto_audios` filtered by `is_active=true AND upload_status='uploaded'`.
- **Consumer:** out-of-slice (player / preferences offline). Invalidated by audio-upload mutation on submit.

### Boot prefetch (foundation)
`app/_layout.tsx:322` (`Promise.allSettled([prefetchHomeFeedPontos(...), prefetchExploreTerreiros(...)])`) warms `["pontos","feed",userId]` with `limit:10`. As noted above, no consumer hook reads this cached data today.

## Supabase surface

- **Tables read:**
  - `pontos` — `fetchAllPontos`, `fetchHomeFeedPontos`, search-enrichment query, `Home` edit update.
  - `ponto_versoes` — embed for canonical lyrics in `fetchAllPontos`/`fetchHomeFeedPontos`; standalone `fetchActivePontoVersoesByPontoIds`; canonical lookup inside `PontoAudioUploadController` (`PontoAudioUploadController.tsx:154-159`); edit update in `PontoUpsertModal`.
  - `pontos_submissions` — `fetchPendingPontoSubmissions`, `fetchPontoSubmissionById`, `fetchApprovedPontoAudioSubmission`, also a direct `select('id, approved_ponto_id').eq('id', submissionId)` in `PontoUpsertModal.tsx:590-593` to learn the new `ponto_id` after a `create` submission was created.
  - `ponto_audios` — `usePontoAudioMetaById`, `usePontoAudios`, `useHasAnyUploadedPontoAudio`, `useLatestPontoAudioMetaByPontoIds`, `getPontoAudioDurationMs`.
  - `entidades` — embedded via PostgREST self-FK in `PONTOS_ENTIDADE_ORIXA_EMBED`; also `fetchEntidadesCatalogOptions` (paged).
- **Tables written:**
  - `pontos_submissions` — `createPontoSubmission` (kind `'new'`), `submitPontoCorrection` (kind `'correction'`). Edit path does **not** write here.
  - `pontos` — edit `UPDATE` directly from `PontoUpsertModal.tsx:673-683` (curator-only client-gated; RLS expected to enforce).
  - `ponto_versoes` — edit `UPDATE lyrics WHERE ponto_id=:id AND is_canonical=true` from `PontoUpsertModal.tsx:693-697`.
  - `ponto_audios` — written by the `ponto-audio-complete-upload` edge function (service-role) on PUT completion; `duration_ms` may be set by `tryPersistPontoAudioDurationMs` post-load.
- **RPCs called:**
  - `search_pontos(p_query, p_limit, p_offset)` — `pontosSearch.ts:34`.
  - `finalize_ponto_audio_and_create_submission(p_ponto_audio_id, p_ponto_id)` — `pontoAudio.ts:1018-1024`. Server creates the `pontos_submissions` row of `kind='audio_upload'`. Errors mapped: code `42501` → "Sem permissão para criar a submissão de revisão."; "submission not initialized/exists" → friendly retry guidance.
- **Realtime channels:** none in this slice (curator slice uses realtime on `pontos_submissions`).
- **Storage buckets:** `ponto-audios` — used by `initPontoAudioUpload` (returns signed-upload URL) and `uploadToSignedUpload` (PUT via `expo-file-system` legacy `uploadAsync` with `BINARY_CONTENT`).
- **Edge functions:**
  - `ponto-audio-init-upload` (authed) — returns `{ ponto_audio_id, upload_token, bucket, path, ponto_id, ponto_versao_id, signed_upload: { signedUrl, ... }, mime_type }`.
  - `ponto-audio-complete-upload` (authed, source in repo) — flips `upload_status` to `'uploaded'`, writes `size_bytes`, `duration_ms`, `content_etag`, `sha256`. Returns `409 storage_path_unique_conflict` on duplicate path.
  - `ponto-audio-playback-url` (authed for review / **anon-keyed for public**, no Authorization on public path) — returns `{ signed_url, resolved_url?, expires_in_seconds, mime_type }`.

## Mutations

Following `cache-contract.md` template (cancel → snapshot → optimistic → rollback on error → invalidate on settled).

### `createPontoSubmission` — submit a new ponto
- **Where:** `lib/pontosSubmissions.ts:64`. Called from `PontoUpsertModal.tsx:574`.
- **What it writes:** INSERT into `pontos_submissions` with `{ title, lyrics, tags (deduped, case-insensitive), author_name, interpreter_name, has_author_consent }`. **`kind` is not set by the client** — relies on DB default.
- **Optimistic strategy:** **none.** Pure `await` with `try/catch`. No queryKey invalidation either — the submission is invisible to the user until a curator approves it.
- **Post-success (audio path):** if `submissionAudio` was attached, `PontoUpsertModal` re-reads the submission row, picks `approved_ponto_id` from it, then drives the audio upload controller and invalidates `queryKeys.pontoAudios.byPontoId(pontoIdForAudio)`, `queryKeys.pontoAudios.hasAnyUploadedByPontoId(pontoIdForAudio)`, `queryKeys.pontosSubmissions.pending()` (`PontoUpsertModal.tsx:626-635`). NB: `approved_ponto_id` is **not in the documented `pontos_submissions` columns** (see Known issues).

### `submitPontoCorrection` — propose a fix to an existing ponto
- **Where:** `lib/pontosSubmissions.ts:97`. Called from `PontoUpsertModal.tsx:649`.
- **What it writes:** INSERT into `pontos_submissions` with `{ kind: "correction", target_ponto_id, submitter_email, issue_details, title, lyrics, tags, author_name }`. `submitter_email` is sourced from `supabase.auth.getUser()`.
- **Optimistic strategy:** none.
- **Invalidations:** none.
- **DB drift:** `target_ponto_id`, `submitter_email`, `issue_details` are not in the documented `pontos_submissions` column list (Known issues).

### Edit ponto (curator) — direct UPDATE
- **Where:** `PontoUpsertModal.tsx:673-705`. Two sequential statements:
  1. `UPDATE pontos SET title, author_name, is_public_domain, tags WHERE id=:pontoId`.
  2. `UPDATE ponto_versoes SET lyrics WHERE ponto_id=:pontoId AND is_canonical=true`.
- **Optimistic strategy:** none in the mutation itself. The parent screen (`Home.tsx:1704-1726`) patches its **local `useState`** list on `onSuccess(updated)` to keep the row in sync.
- **Pre-validation (client):** `if (!isPublicDomainValue && !authorNameValue) throw "Preencha o Autor quando não for domínio público."`.
- **No React Query invalidation.**

### Audio upload — `PontoAudioUploadController`
- **Where:** `src/components/pontos/PontoAudioUploadController.tsx`. State machine: `idle → init → upload → post_upload → done | error`.
- **Steps:**
  1. `initPontoAudioUpload({ pontoVersaoId, interpreterName, mimeType, interpreterConsent })` → edge function `ponto-audio-init-upload`. If only `pontoId` was provided, canonical version is fetched first (`PontoAudioUploadController.tsx:150-165`).
  2. `uploadToSignedUpload(...)` → PUT via `FileSystemLegacy.uploadAsync(signedUrl, ...)` with `BINARY_CONTENT`. Single retry with widened timeout (60s → 180s) — `pontoAudio.ts:716-731`.
  3. `finalizeAudioUploadAndCreateSubmission({ pontoId, pontoAudioId, uploadToken, sizeBytes, durationMs: 0, ... })` → first calls `completeUploadWithRetry` (edge `ponto-audio-complete-upload`) then RPC `finalize_ponto_audio_and_create_submission(p_ponto_audio_id, p_ponto_id)`. Both deduped per `pontoAudioId` via in-flight `Map`s.
- **Pre-flight guards (client):** `interpreterName.trim()` non-empty, `interpreterConsent === true`, `audio.uri` + `mimeType` set, `size_bytes <= 50 MB` (`MAX_AUDIO_BYTES`).
- **Mutation framing:** not a React Query mutation. The hook `useInitPontoAudioUploadMutation` / `useCompletePontoAudioUploadMutation` exist (`src/hooks/pontoAudio.ts:226-252`) but are **not used** by either consumer of `PontoAudioUploadController`.
- **Duration handling:** the client sends `durationMs: 0` from `PontoAudioUploadController.tsx:211`. Duration is **only** written back later — by `tryPersistPontoAudioDurationMs` once playback starts, or by the curator review screen before approving.

### Audio upload complete (`completeUploadWithRetry`)
- **Where:** `src/api/pontoAudio.ts:849`. Calls edge `ponto-audio-complete-upload` with retries.
- **Retry policy:** up to 5 attempts with backoffs `[500, 1000, 2000, 4000, 6000]` ms, **only** when status is `409` AND response body `retryable === true`. Status `401`/`403` are fail-fast.

## Business rules / invariants

### Schema-level
- **Canonical ponto = `pontos` row + `ponto_versoes` row where `is_canonical=true`**. `pontos.title` is canonical; `ponto_versoes.title` is `NULL` when inheriting (`coalesce(versao.title, ponto.title)` per `PontoWithVersao.displayTitle`).
- **All feed queries enforce `restricted = false` AND `is_active = true`.**
- **Tags can arrive as `string[]` or as a `,|`-delimited string.** `coerceTags` handles both (`pontosFeed.ts:18-31`, `Home/data/ponto.ts:20-34`).

### Submission flow
- **Submission flow is "user creates → curator approves".** `createPontoSubmission` and `submitPontoCorrection` insert directly into `pontos_submissions` (RLS expected). The user has **no read-back of their own pending submissions** in this slice — there is no "my submissions" list, no per-card status. Only via the toast/alert "Enviado para curadoria…".
- **`PontoUpsertModal` create-mode rights gate:**
  - "Ponto tradicional / livre" toggle defaults `ON`.
  - Switching OFF the toggle opens the "Direitos de veiculação" bottom sheet (`reason: "toggle-off"`); requires "Li e estou ciente" check + "Tenho os direitos desse ponto" tap.
  - Attaching audio without confirming rights → same sheet (`reason: "audio"`).
  - Submitting with audio OR with `!isTraditional` and no rights consent → same sheet (`reason: "submit"`). On confirm, the submit is **re-triggered after `setTimeout(0)`** (`PontoUpsertModal.tsx:836-843`).
- **Author/interpreter consent:** the client sets `has_author_consent` if and only if the rights sheet was confirmed; otherwise `null`. The DB function `approve_ponto_submission` enforces a server-side rule: if `author_name` and `interpreter_name` are both present and differ (case-insensitive after trim), `has_author_consent` must be `true` (otherwise raises `missing_author_consent`).
- **Submission "audio" attachment is part of the create flow but uploaded after the submission insert:** the modal first INSERTs the submission, then reads back `approved_ponto_id` to get the new `ponto_id`, then drives `PontoAudioUploadController`. If `approved_ponto_id` is null at read time → fail-open toast "Ponto enviado, mas o áudio não foi enviado (ID do ponto indisponível). Você poderá reenviar o áudio depois." — and the modal closes anyway with `onSuccess()` (`PontoUpsertModal.tsx:609-616`).
- **Audio at submission time uses `durationMs: 0`** (`PontoAudioUploadController.tsx:211`); curator review screen UPDATEs `ponto_audios.duration_ms` before calling the approve RPC.

### Search semantics
- **Server-side fulltext via `search_pontos` RPC.** Returns `lyrics_preview_6` (6-line preview) instead of full lyrics.
- **Client gate min 4 chars** (`PONTOS_SEARCH_MIN_CHARS = 4`). Queries shorter than 4 chars return empty without calling the RPC.
- **Client gate uses `toLowerCase().trim().replace(/\s+/g, " ")` for `canSearch` check only.** The raw `query` (not the normalized one) is what gets sent to `search_pontos` as `p_query`.
- **Race-guard:** the debounce closure caches `currentQuery = query` at firing time; if `query` changes between fire and response, the result is **dropped silently** (`usePontosSearch.ts:65-67, 71-72, 77-78`).
- **Entidade/orixá enrichment for search runs as a separate `from('pontos').select(...).in('id', ids)` after the RPC returns.** This is a second round-trip per search.
- **Home's local `matchesQuery` fallback** exists (`Home.tsx:108-123`) but is not wired into the render path — the render path branches `shouldShowSearchResults` on `queryHasText && canSearch` only.

### Versioning
- **Canonical version is the unique row per ponto with `is_canonical=true`.** Edit flow updates this row only.
- **`PontoAudioUploadController` resolves canonical version on the fly when only `pontoId` is provided** (`PontoAudioUploadController.tsx:150-165`).
- **`fetchActivePontoVersoesByPontoIds` is the batch reader.** It groups by `ponto_id` and sorts by `versao_num` ascending; used by collection edit to let the user pin a specific version into the collection.

### Entidade / orixá
- **Self-FK on `entidades.orixa_id` → `entidades.id`.** PostgREST embed `entidades ( id, nome, linha, orixa:entidades ( id, nome, linha ) )` resolves both levels in one round-trip (`PONTOS_ENTIDADE_ORIXA_EMBED`).
- **Chip rules** (`parseEntidadeChipFieldsFromPontoRow`):
  - If `entidades.nome` is truthy → primary chip = `nome`; orixá chip shown **only when both `entidade.nome` and `entidade.orixas.nome` are present**.
  - If `entidades.nome` is null → primary chip = `"{linha} de {orixá.nome}"` (when orixá nome present), or just `linha` otherwise. No secondary chip.
- **`PontoEntidadeOrixaChips`** renders only what `parseEntidadeChipFieldsFromPontoRow` resolved — secondary chip styled with `appearance="secondary"` (`PontoEntidadeOrixaChips.tsx:24-27`).
- **The orixá embed avoids the explicit FK hint `!entidades_orixa_fkey`** because the hint can produce PGRST200 on Supabase even with a valid FK (documented inline at `pontoEntidadeSelect.ts:6-11`).

### Audio (cross-cutting)
- **Two playback modes** in `getPontoAudioPlaybackUrlInternal` (`pontoAudio.ts:1085`):
  - `"public"`: anon-keyed `fetch`, **no Authorization header** (deliberately).
  - `"review"`: authed `fetch` with `Bearer <session.access_token>`.
- **Error mapping** (`mapPlaybackError`): 401 → "Áudio em revisão. Disponível em breve." (`noRetry: true`); 403 → "Só curators podem ouvir antes da aprovação." (`noRetry: true`); 409 / "not ready" → "Upload em processamento. Tente novamente em instantes." (retryable); 404 → "Áudio indisponível no momento." (`noRetry: true`); "failed to create signed playback url" / "object not found" → "Áudio indisponível no momento." (retryable).
- **Review playback URL cache** is module-level `Map` with `REVIEW_PLAYBACK_EXPIRY_BUFFER_MS = 5_000` and an in-flight Promise dedupe — separate from React Query.

### Home presentation
- **Viewability-driven audio meta fetch:** only the latest audio meta for currently visible pontos (capped at 60) is fetched, via the FNV-hashed key.
- **Author/interpreter line is rendered only when at least one is non-empty** (`Home.tsx:1102-1145`).
- **On focus, a throttled re-fetch (8s) of the entire `fetchAllPontos` list runs.** This is what keeps Home "live" after returning from the curator review queue.
- **Press-guard:** `shouldBlockPress()` from `GestureBlockContext` is checked before any `router.push("/player", …)` to suppress accidental taps right after a horizontal swipe.

### Deep link semantics
- **`saravafy://l/ponto/:id` and `https://saravafy.com.br/l/ponto/:id`** both land on the `(app)/l/ponto/[id].tsx` route, which redirects to `/player`. The Pontos tab is not re-entered first.
- **Bad UUID → toast "Link inválido." + `/`** (foundation root).

## Cross-feature dependencies

- **Auth** (`@/contexts/AuthContext`) — `user.id` for `requireAuth`-gated submissions, edits.
- **Preferences** (`@/contexts/PreferencesContext`) — `effectiveTheme` drives the `variant` prop everywhere.
- **Toast** (`@/contexts/ToastContext`) — user feedback on submission errors, "Enviado para curadoria", "Envio de áudio agora é feito pela tela dedicada", etc.
- **Login prompt** (`@/src/contexts/LoginPromptContext`) — `requireAuth` wraps "Enviar ponto" and "Adicionar à coleção" entry points so a logged-out user gets the login sheet.
- **Curator mode** (`@/contexts/CuratorModeContext`) + `useIsCurator` — together gate the in-card edit pencil.
- **Player** (`/(app)/player`) — every ponto card press navigates here with `{ source, q?, initialPontoId, pontoId? }`. `PlayerScreen` re-uses `PontoUpsertModal` for edit + correction, and reads `useApprovedPontoAudioSubmission` to gate audio playback.
- **Collections** — `Home.tsx` owns the add-to-collection wizard (`HomeAddToCollectionWizard`) and its full set of optimistic patches via `mutationUtils`. The mutation invalidates `queryKeys.collections.accountable(userId)`, `queryKeys.collections.editableByUserPrefix(userId)`, `queryKeys.collections.byId(vars.collectionId)`, `queryKeys.collections.pontos(vars.collectionId)`, and `["terreiros", "collectionsByTerreiro"]`.
- **Storage / edge functions** — `ponto-audio-init-upload`, `ponto-audio-complete-upload`, `ponto-audio-playback-url`, `finalize_ponto_audio_and_create_submission` RPC.
- **Curator-review slice** (`docs/architecture/curator-review.md`) — consumes `pontos_submissions` rows produced here; its approve/reject RPCs flip them from `pending` to `approved/rejected`.
- **`@saravafy/design-tokens`** via `src/theme` — `colors.brass600`, `colors.forest400`, `colors.forest700`, etc.

## Known issues / TODOs found in code

- **Dead query.** `useHomeFeedPontos` is defined and prefetched at boot but **no screen consumes it** (Home uses its own `fetchAllPontos`). Either repoint Home to the query (and drop `fetchAllPontos`) or delete `useHomeFeedPontos` + `prefetchHomeFeedPontos`. (`src/queries/pontosFeed.ts:79`, prefetched at `app/_layout.tsx:323`.)
- **Schema vs code mismatch on `pontos_submissions`.** Code reads/writes columns not in `docs/schema.md`:
  - `target_ponto_id` (read by `approve_ponto_correction_submission` RPC; written by `submitPontoCorrection`).
  - `approved_ponto_id` (read by `PontoUpsertModal.tsx:590-593`; written by `approve_*` RPC bodies).
  - `submitter_email`, `issue_details` (written by `submitPontoCorrection`).
  - `has_author_consent` (written by `submitPontoCorrection`; read by RPC bodies).
  - `artist`, `author_contact` (referenced by the correction-approval RPC body).
  Documented column list ends at `ponto_versao_id` (ordinal 21). The same RPC bodies also reference `pontos.lyrics` even though `pontos` has no `lyrics` column in the doc (it lives on `ponto_versoes`), suggesting at least one RPC targets a legacy schema.
- **`createPontoSubmission` does not set `kind`.** DB column is `NOT NULL` with no default in the doc; client only sends `{ title, lyrics, tags, author_name, interpreter_name, has_author_consent }` (`lib/pontosSubmissions.ts:72-82`). The insert succeeds in practice only if the deployed DB has a column default or trigger that backfills `kind='new'`.
- **Edit ponto bypasses React Query entirely.** `PontoUpsertModal.tsx:673-705` issues two direct `UPDATE`s and the parent screen does optimistic `setPontos((prev) => …)` on its **local** array. There is **no invalidation** of `queryKeys.pontos.feed(userId)` (warmed at boot) or of any other cache that may hold this ponto (`collections.pontos(collectionId)`, etc.). Other screens with the same ponto cached will show stale data until next refetch.
- **Edit flow updates only `ponto_versoes.lyrics`.** Other versao fields (`title`, `tags`, `author_name`, `is_public_domain`) are written to the **`pontos` table**, not the canonical version.
- **`PontoAudioUploadController` accepts both `pontoVersaoId` and legacy `pontoId`.** Dual API surface adds a round-trip and is a refactor target.
- **`durationMs: 0` sent on initial complete.** Curator review screen has to UPDATE `duration_ms` before approval.
- **Inline queryKey instead of registry.** `usePontoAudioMetaById` uses `["pontoAudios", "metaById", pontoAudioId]` ad-hoc (`src/hooks/pontoAudio.ts:39`); the central `queryKeys.pontoAudios.*` has no `metaById` entry. Invalidating `queryKeys.pontoAudios.byPontoId(pontoId)` will NOT refresh this meta cache.
- **`useInitPontoAudioUploadMutation` and `useCompletePontoAudioUploadMutation` exist but are unused.** `PontoAudioUploadController` calls the underlying API functions directly with imperative `useState` instead. Candidate for deletion.
- **Submission audio creation hand-off relies on `approved_ponto_id` being populated immediately after INSERT.** `PontoUpsertModal.tsx:589-616` reads it back via `.single()`. `approved_ponto_id` is set only by the curator's approve RPC, so reading it right after a user INSERT will (in current production schema) likely return `null` — triggering the "ID do ponto indisponível" path **even though the ponto was actually submitted**. Suspected dead branch / future feature.
- **`pickAudio` (edit-mode audio attach) is a stub.** `PontoUpsertModal.tsx:415-441` short-circuits with a toast "Envio de áudio agora é feito pela tela dedicada." and routes to `/ponto-audio-upload`. The `attachedAudio` state and its UI (`PontoUpsertModal.tsx:1127-1198`) are reachable only when the user manually sets `attachedAudio` (no path does that anymore) — dead UI candidate.
- **`isTraditional` toggle is local-only in submission payload.** It never reaches `pontos_submissions` — only `has_author_consent` does. The user-visible toggle is a UX nudge to surface the rights-consent sheet, not a persisted field.
- **`PontoSubmissionKind`** in `src/domain/ponto.ts:45-50` lists `"issue"`, but the curator slice consumers use `"problem"`. Mismatch — either the domain type is renaming for client UX or it's stale.
- **`src/utils/pontoCode.ts` only contains `isUuid`.** Filename implies a ponto-code utility that no longer exists. Rename or fold into a more general `uuid` util.
- **Public-link deep target is `/player`, not a dedicated ponto detail screen.** External shares always cold-start the player.
- **`l/ponto/[id]` and `l/[tipo]/[id]` both handle `ponto`.** The specific route shadows the generic one for `tipo='ponto'`. Routing precedence (expo-router prefers specific) means `l/[tipo]/[id]` will likely never fire for `tipo='ponto'`. Dead branch in the generic handler.
- **Inline `console.log` left in production.** `PontoAudioUploadController.tsx:197-203` and `PontoUpsertModal.tsx:621-623` log without `__DEV__` gating. Audit before shipping.
- **`fetchAllPontos` has no limit.** Returns the entire catalog filtered by `is_active AND !restricted AND canonical`. The on-disk dataset is small today but this query has no upper bound — paginate before content scales.
