# Player & Audio

> Status: generated 2026-06-12 from full read of source files. Verify before relying on as spec.

## Purpose

Allows users to read lyrics and play audio recordings of *pontos* (Afro-Brazilian religious chants) either from a personal/terreiro collection or from the full public library. Users can also submit new audio recordings for community review, and the system can cache entire terreiro packages (collections + audio files) for offline playback.

## Files

- **Routes (expo-router):**
  - `app/(app)/player.tsx` — thin re-export of `PlayerScreen`
  - `app/(app)/ponto-audio-upload.tsx` — thin re-export of `PlayerAudioUpload`

- **Screens:**
  - `src/screens/Player/PlayerScreen.tsx` — main player screen; horizontal-paging FlatList over all pontos in the active context
  - `src/screens/PlayerAudioUpload/PlayerAudioUpload.tsx` — audio submission form screen

- **Components:**
  - `src/screens/Player/components/AudioPlayerFooter.tsx` — playback controls bar (play/pause, seek slider, metadata, state messages)
  - `src/screens/Player/components/PlayerContent.tsx` — per-ponto page: title, version selector, tag chips, entidade chips, lyrics scroll
  - `src/screens/Player/components/LyricsScroll.tsx` — scrollable lyrics with inline `[entidade]` placeholder rendering
  - `src/screens/Player/components/PlayerSearchModal.tsx` — bottom-sheet search over public pontos
  - `src/screens/Player/components/LibraryPlayerAddToCollectionModal.tsx` — full-screen modal to add the active ponto to an editable collection
  - `src/components/pontos/PontoAudioUploadController.tsx` — headless render-prop controller managing the 4-phase upload state machine
  - `src/components/AudioProgressSlider.tsx` — seek slider consumed by `AudioPlayerFooter`

- **Hooks (Player-local):**
  - `src/screens/Player/hooks/useCollectionPlayerData.ts` — dual-mode data hook (collection mode vs all-library mode); assembles `CollectionPlayerItem[]`
  - `src/screens/Player/hooks/usePlayerAudio.ts` — **legacy stub** (`export {}`; playback now lives in RNTP service)

- **Audio service (RNTP):**
  - `src/audio/rntpService.ts` — singleton React Native Track Player service: URL resolution, `loadAndPlay`, `togglePlayPause`, `pause`, `seekToSeconds`, `useRntpPlayback` hook, auto-renewal on playback error
  - `src/audio/trackPlayer.ts` — low-level RNTP bootstrap (`ensureTrackPlayerReady`, `resetAndStop`, `resetAndLoadTrack`, back-compat `setupTrackPlayerOnce`)

- **API layer:**
  - `src/api/pontoAudio.ts` — all audio-related HTTP calls: `initPontoAudioUpload`, `uploadToSignedUpload`, `completePontoAudioUpload`, `completeUploadWithRetry`, `finalizeAudioUploadAndCreateSubmission`, `getPontoAudioPlaybackUrlPublic`, `getPontoAudioPlaybackUrlReviewBySubmission`, `getReviewPlaybackUrlEnsured`, `prefetchReviewPlaybackUrl`, `getPontoAudioDurationMs`, `tryPersistPontoAudioDurationMs`

- **Hooks (audio queries):**
  - `src/hooks/pontoAudio.ts` — `usePontoAudioMetaById`, `useLatestPontoAudioMetaByPontoIds`, `usePontoAudios`, `useHasAnyUploadedPontoAudio`, `useInitPontoAudioUploadMutation`, `useCompletePontoAudioUploadMutation`

- **Queries:**
  - `src/queries/pontoSubmissions.ts` — `useApprovedPontoAudioSubmission`, `usePendingPontoSubmissions`, `usePontoSubmissionById`, `fetchApprovedPontoAudioSubmission`
  - `src/queries/pontoVersoes.ts` — `fetchActivePontoVersoesByPontoIds`; supplies `PontoVersaoPlayerRow`
  - `src/queries/collectionPontos.ts` — `useCollectionPontosQuery`, `fetchCollectionPontosItems`; offline fallback via `tryOfflineFallback`

- **Offline / caching:**
  - `src/offline/audioCache.ts` — `downloadAudiosForPackage`, `resolveLocalAudioForPonto`, `clearAudiosForTerreiro`; files stored under `{documentDirectory}/saravafy/terreiros/{terreiroId}/audios/`
  - `src/offline/terreiroPackage.ts` — `syncTerreiroPackage`, `getPackage`, `savePackage`, `listPackages`, `removePackage`; serialised to AsyncStorage with key `@saravafy:offline:terreiro:{id}`
  - `src/offline/networkCheck.ts` — `isOffline()` via `@react-native-community/netinfo`
  - `src/hooks/useOfflineAutoSync.ts` — auto-syncs all saved terreiro packages on app mount and foreground resume (30-min debounce)

- **Lib helpers:**
  - `src/lib/audioDurationAutoHeal.ts` — session-only in-memory set tracking which `ponto_audio_id`s have already had a best-effort `duration_ms` write attempted

- **Domain / types:**
  - `src/queries/queryKeys.ts` — canonical key factory for `pontoAudios.*`, `pontosSubmissions.*`, `collections.pontos`, `offline.*`

## Routes

| Route | Screen | Key params | Auth guard |
|---|---|---|---|
| `/(app)/player` | `PlayerScreen` | `collectionId`, `initialPontoId`, `initialPosition`, `source` (`"all"` = library mode), `q` (search query), `terreiroId`, `addFlowCollectionId` | None (public read) |
| `/(app)/ponto-audio-upload` | `PlayerAudioUpload` | `pontoId`, `pontoVersaoId?`, `pontoTitle?` | `requireAuth()` called before navigating from PlayerScreen |

## Navigation

**Entry paths:**
- Collection player: pushed from collection detail screen with `collectionId` + optional `initialPontoId`/`initialPosition`
- Library player (`source=all`): pushed from the Pontos tab, optionally with `q` for a pre-filtered search
- Add-flow player: pushed with `addFlowCollectionId` so the back button returns to the collection's "add ponto" screen instead of the stack history
- Deep link `/(app)/l/ponto/[id]` — resolved in `app/(app)/l/ponto/[id].tsx`; navigates to player with `initialPontoId`
- Audio upload: launched via `router.push("/ponto-audio-upload")` from PlayerScreen's "Enviar áudio" action (report sheet, no-audio modal, or in-review modal)

**Exit paths:**
- Android hardware back: overridden by `BackHandler` inside `useFocusEffect`; calls `handlePlayerNavigateBack`
- `handlePlayerNavigateBack` logic (priority order):
  1. If `addFlowCollectionId` present → `router.replace("/collection/[id]/add")`
  2. If library player → align tab/pager to `pontos`, then `router.back()` or `router.replace("/(app)/(tabs)/(pontos)")`
  3. If `router.canGoBack()` → `router.back()`
  4. If `collectionId` → `router.replace("/collection/[id]")`
  5. Fallback: align tab/pager to `pontos` and replace to pontos tab

**Deep links:** scheme `saravafy://` / `https://saravafy.com.br/l/ponto/[id]`

## Contexts consumed/provided

| Context | Provided here? | Consumed by | State shape |
|---|---|---|---|
| `AuthContext` | No | `PlayerScreen` | `{ user }` |
| `PreferencesContext` | No | `PlayerScreen`, `AudioPlayerFooter`, `PlayerAudioUpload` | `{ effectiveTheme, curimbaEnabled, setCurimbaEnabled, curimbaOnboardingDismissed, setCurimbaOnboardingDismissed }` |
| `CuratorModeContext` | No | `PlayerScreen` | `{ curatorModeEnabled }` |
| `TabControllerContext` | No | `PlayerScreen` | `{ goToTab }` |
| `RootPagerContext` | No | `PlayerScreen`, `LibraryPlayerAddToCollectionModal` | `{ setActiveKey, setIsBottomSheetOpen }` |
| `ToastContext` | No | `PlayerScreen`, `PlayerAudioUpload` | `{ showToast }` |
| `LoginPromptContext` | No | `PlayerScreen` | `{ requireAuth }` |
| `NetworkContext` | No | `useOfflineAutoSync` | `{ isConnected }` |

## Data flow (queries → screens)

### 1. Collection pontos (collection mode)

- **queryKey:** `["collections", "pontos", collectionId]` (`queryKeys.collections.pontos`)
- **table/rpc:** `collections_pontos` joined to `pontos`, `entidades`, `ponto_versoes` (canonical + pinned); then `ponto_versoes` bulk-fetched via `fetchActivePontoVersoesByPontoIds`
- **params:** `collectionId`
- **cache strategy:** `staleTime: 3 min`, `gcTime: 45 min`; offline fallback reads from AsyncStorage terreiro package when `isOffline()` is true
- **consumed by:** `PlayerScreen` → `useCollectionPlayerData({ collectionId })` → `useCollectionPontosQuery`

### 2. All public pontos (library mode)

- **queryKey:** `["pontos", "all", "public"]`
- **table/rpc:** `pontos` (filtered `is_active=true`, `restricted=false`) joined `ponto_versoes!inner` (canonical only); then `fetchActivePontoVersoesByPontoIds` for all versoes
- **params:** none (full library; client-side text filter applied in `matchesQuery`)
- **cache strategy:** `staleTime: 3 min`, `gcTime: 45 min`
- **consumed by:** `PlayerScreen` → `useCollectionPlayerData({ mode: "all", query })`

### 3. Approved audio submission

- **queryKey (no versao):** `["pontosSubmissions", "approvedAudio", pontoId]`
- **queryKey (with versao):** `["pontosSubmissions", "approvedAudio", pontoId, pontoVersaoId]`
- **table/rpc:** `ponto_audios` (when versao provided: filter by `ponto_versao_id`) + `pontos_submissions` (kind=`audio_upload`, status in `approved|pending`)
- **params:** `pontoId`, optional `pontoVersaoId`
- **cache strategy:** `staleTime: 30 s`, `gcTime: 5 min`; `placeholderData` carries previous value
- **consumed by:** `PlayerScreen` (`useApprovedPontoAudioSubmission`) → drives `audioState` enum passed to `AudioPlayerFooter`

### 4. Ponto audio metadata

- **queryKey:** `["pontoAudios", "metaById", pontoAudioId]`
- **table/rpc:** `ponto_audios` (select `id, interpreter_name, mime_type, upload_status, is_active`)
- **params:** `pontoAudioId`
- **cache strategy:** `staleTime: 30 s`, `gcTime: 5 min`
- **consumed by:** `AudioPlayerFooter` (`usePontoAudioMetaById`) → displays interpreter name

### 5. Terreiro custom tags map

- **queryKey:** `["pontos", "customTags", terreiroId, pontoIdsHash]`
- **params:** `terreiroId`, set of `pontoIds` (hashed for stable key)
- **consumed by:** `PlayerScreen` → `useTerreiroPontosCustomTagsMap` → passed to `PlayerContent` as `mediumTags`
- **guard:** only enabled when `canSeeMediumTags` (`!!terreiroId`) and list is non-empty

### 6. Entidades catalog (for editing)

- **queryKey:** `["entidades", "catalog"]`
- **consumed by:** `PlayerScreen` (for `EntidadePlaceholderSheet`) and `LibraryPlayerAddToCollectionModal`
- **guard:** enabled only when `entidadeEditCtx` is set (lazy)

### 7. Editable collections (add-to-collection modal)

- **consumed by:** `LibraryPlayerAddToCollectionModal` via `useEditableCollections(userId)` and `useMyEditableTerreirosQuery`

### 8. Ponto audio duration (direct API call, not React Query)

- **API:** `getPontoAudioDurationMs(pontoAudioId)` — direct `supabase.from("ponto_audios").select("duration_ms")`
- **consumed by:** `AudioPlayerFooter` inside a `useEffect`; result stored in local state `backendDurationMs` to pre-populate the seek bar before RNTP reports its own duration

## Supabase surface

- **Tables read:**
  - `pontos` — title, tags, author_name, is_public_domain, entidade joins (library mode)
  - `ponto_versoes` — id, versao_num, is_canonical, title, lyrics, lyrics_preview_6 (both modes)
  - `collections_pontos` — position, ponto_versao_id, entidade_id, entidade_texto, entidade_orixa_id (collection mode)
  - `entidades` — entidade/orixa names (embedded via PONTOS_ENTIDADE_ORIXA_EMBED)
  - `ponto_audios` — id, ponto_id, ponto_versao_id, upload_status, is_active, duration_ms, interpreter_name, mime_type, storage_path, storage_bucket
  - `pontos_submissions` — id, kind, status, ponto_audio_id, ponto_versao_id, interpreter_name, reviewed_at, created_at (audio approval check)
  - `terreiros` — id, title, cover_image_url (offline package sync)

- **Tables written:**
  - `ponto_audios` — `duration_ms` updated by `tryPersistPontoAudioDurationMs` (best-effort auto-heal, conditional: only when `duration_ms IS NULL OR duration_ms <= 0`)

- **RPCs called:**
  - `finalize_ponto_audio_and_create_submission(p_ponto_audio_id, p_ponto_id)` — called after upload completes; creates the `pontos_submissions` review record; returns submission ID

- **Realtime channels:** none

- **Storage buckets:**
  - `ponto-audios` — audio files uploaded by users via signed URL PUT; the bucket name is declared as a type literal in `InitUploadResponse` but the actual signed URL is obtained from the `ponto-audio-init-upload` edge function

- **Edge functions:**
  - `ponto-audio-init-upload` (authed POST) — initialises upload; returns `ponto_audio_id`, `upload_token`, signed upload URL for Storage PUT
  - `ponto-audio-complete-upload` (authed POST) — marks upload as complete; accepts `upload_token`, `size_bytes`, `duration_ms`, `content_etag`, `sha256`; has retry logic (409 with `retryable: true`)
  - `ponto-audio-playback-url` (public POST or authed POST) — returns a signed playback URL; public mode sends no `Authorization` header; review/curator mode sends bearer token; response includes `signed_url`, optional `resolved_url`, `resolved_head_status`, `expires_in_seconds`, `mime_type`

## Mutations

### `addToCollectionMutation` (`LibraryPlayerAddToCollectionModal`)

- **mutationFn:** `addPontoToCollection({ collectionId, pontoId, addedBy, pontoVersaoId, entidade })`
- **optimistic update (`onMutate`):**
  - Cancels and snapshots: `collections.accountable(userId)`, `collections.editableByUserPrefix(userId)`, `collections.byId(collectionId)`, `collections.pontos(collectionId)`, `["terreiros", "collectionsByTerreiro"]`
  - Patches `updated_at` on accountable and editable lists
  - Calls `upsertPontoInCollectionPontosList` to insert the ponto into the collection pontos cache
  - Calls `incrementCollectionPontosCountInTerreiroLists` (+1) if the ponto was newly inserted
- **rollback (`onError`):** `rollbackQueries(queryClient, snapshot)` with all snapshotted keys
- **`onSuccess`:** If `alreadyExists`, reverses the optimistic insert (`removePontoFromCollectionPontosList`) and decrements the count
- **invalidations (`onSettled`):** `collections.accountable`, `collections.editableByUserPrefix`, `collections.byId`, `collections.pontos`, `["terreiros", "collectionsByTerreiro"]`

### `updateCollectionPontoEntidade` (imperative call in `PlayerScreen.onConfirmEntidadeEdit`)

- No `useMutation` wrapper; called directly as `await updateCollectionPontoEntidade({...})`
- On success: `queryClient.invalidateQueries({ queryKey: queryKeys.collections.pontos(collectionId) })`

### `patchPontoById` (local cache write in `useCollectionPlayerData`)

- Not a server mutation; only updates client cache when `PontoUpsertModal` (mode=`"edit"`) succeeds
- Updates both `["collections", "pontos", collectionId]` and `["pontos", "all", "public"]` caches simultaneously via `queryClient.setQueryData`
- Canonical versao lyrics are patched in-place; non-canonical versaos are left unchanged

### Audio upload (imperative flow in `PontoAudioUploadController`)

- Not a React Query mutation; managed by a local state machine (`phase`: `idle → init → upload → post_upload → done | error`)
- **Phase 1 – init:** `initPontoAudioUpload` → Edge function `ponto-audio-init-upload`
- **Phase 2 – upload:** `uploadToSignedUpload` → PUT to Supabase Storage signed URL (60 s timeout, one auto-retry at 180 s)
- **Phase 3 – post_upload:** `finalizeAudioUploadAndCreateSubmission` → Edge function `ponto-audio-complete-upload` (with 5-attempt exponential backoff on 409-retryable) → then `finalize_ponto_audio_and_create_submission` RPC
- **On done:** `PlayerAudioUpload` invalidates `pontoAudios.byPontoId`, `pontoAudios.hasAnyUploadedByPontoId`, `pontosSubmissions.pending`

## Business rules / invariants

**Audio playback states:** Each active ponto can be in exactly one of three `PlayerAudioState` values:
- `"AUDIO_APPROVED"` — `useApprovedPontoAudioSubmission` found an approved `ponto_audio_id`
- `"AUDIO_IN_REVIEW"` — no approved audio but a pending submission exists
- `"NO_AUDIO"` — neither; user is invited to upload

**Modo Curimba:** When `curimbaEnabled === true`, audio playback is blocked: the RNTP service is paused immediately, the play button shows an `Alert`, and the seek progress bar is hidden. This is a user-preference feature (stored in `PreferencesContext`) intended for situations where only lyrics are needed.

**Version (versao) resolution order:**
1. User-selected versao (`versaoIdByPontoId` local state)
2. Collection-pinned versao (`collectionPinnedVersaoId` from `collections_pontos.ponto_versao_id`)
3. Canonical versao (`is_canonical = true`)
4. First versao by `versao_num`

**URL resolution for playback (offline-first):**
`rntpService.resolveUrl` checks `resolveLocalAudioForPonto` before calling the edge function. If a local file exists (from a terreiro offline package), it is used directly without any network call.

**URL renewal on playback error:** When RNTP fires a `PlaybackError` event, `rntpService` attempts exactly one auto-renewal per `(kind, id)` pair per session: it re-fetches the signed URL and re-loads the track at the previous position. Only one renewal inflight at a time (`renewalInFlight` promise).

**Duration auto-heal:** When the player loads a track whose `duration_ms` in the database is null or ≤ 0, `AudioPlayerFooter` writes the real duration back via `tryPersistPontoAudioDurationMs`. The attempt is tracked in the `DURATION_AUTO_HEAL_TRIED` in-memory set so it fires at most once per `ponto_audio_id` per app session.

**Upload gate:** `pontoVersaoId` takes precedence in upload; if not provided, `PontoAudioUploadController` fetches the canonical versao via `ponto_versoes.is_canonical = true` before calling init. Upload is blocked if the user has no active session.

**Terreiro medium tags:** Visible to any user viewing a ponto in a terreiro context (`!!terreiroId`). Edit (add/remove) requires active membership with role `admin` or `curimba`. If permissions change while the player is open, editing sheets are closed immediately via a `useEffect`.

**Entidade placeholder:** The `[entidade]` token in lyrics is rendered differently based on context:
- In a collection: shows a tappable chip that opens `EntidadePlaceholderSheet` to assign/change the entidade for that entry
- Outside a collection: shows an info chip that opens a read-only explanation sheet
- The resolved label is applied inline in `LyricsScroll` after substitution via `resolveLyricsWithCollectionEntidade`

**Curator edit:** `canEditPontos = isCurator && curatorModeEnabled`. Only curators with curator mode active can open `PontoUpsertModal` in `"edit"` mode directly from the player header.

**Upload file constraints:** mp3, m4a, aac, ogg, wav formats only; maximum 50 MB; validated client-side in `PlayerAudioUpload.validateSelected` and again inside `PontoAudioUploadController.start`.

**Offline auto-sync:** `useOfflineAutoSync` syncs saved terreiro packages (text/metadata only, no audio) on app mount and foreground resume, with a 30-minute minimum interval between syncs. Audio files are only downloaded on explicit user action (`downloadAudiosForPackage`).

## Cross-feature dependencies

- **Collections slice:** `useCollectionPontosQuery`, `addPontoToCollection`, `useEditableCollections`, collection cache utilities (`upsertPontoInCollectionPontosList`, `incrementCollectionPontosCountInTerreiroLists`, `removePontoFromCollectionPontosList`)
- **Pontos / PontoUpsert:** `PontoUpsertModal` (correction and edit modes) launched from `PlayerScreen`
- **Terreiros:** `useTerreiroMembershipStatus` for medium-tag permission; `terreiroPackage` and `audioCache` for offline support; `useMyEditableTerreirosQuery` in add-to-collection modal
- **Auth:** `AuthContext` for user identity; `supabase.auth.getSession()` required at upload initiation and completion
- **Preferences:** `PreferencesContext` provides theme, Curimba mode, and Curimba onboarding state
- **Entidades:** `entidadesCatalog`, `EntidadePlaceholderSheet`, `parseEntidadeChipFieldsFromPontoRow`, `resolveLyricsWithCollectionEntidade`, `lyricsHasEntidadePlaceholder`
- **Search:** `usePontosSearch` (and underlying `pontosSearch` service) consumed by `PlayerSearchModal`
- **Submission review:** `pontos_submissions` table and `useApprovedPontoAudioSubmission` query sit at the boundary between the player slice and the curator review slice (`review-submissions/` routes)

## Known issues / TODOs found in code

1. **`usePlayerAudio.ts` is a dead stub.** The file contains only `export {}` with a comment saying it is kept "for path stability." Any import of this hook will get nothing. Should be deleted or the comment should clarify which imports it is stabilising.

2. **`durationMs: 0` passed to `finalizeAudioUploadAndCreateSubmission`.** In `PontoAudioUploadController.start`, the `durationMs` argument is always hardcoded to `0` (the audio duration is not measured client-side before upload). The auto-heal mechanism in `AudioPlayerFooter` compensates for this after the first playback, but newly uploaded audio will have `duration_ms = 0` in the database until someone plays it.

3. **`resolveLocalAudioForPonto` has a logic gap.** The function iterates all downloaded audio files in a terreiro's audio directory and returns the first non-empty file it finds for any ponto matching the given `pontoId`. It does not map `pontoAudioId → pontoId` reliably; it scans `pkg.collectionPontos` looking for a ponto with the matching `pontoId` and then returns any file in that terreiro's audio directory. If two pontos share a terreiro directory and one has a local file, the function may return that file for the wrong ponto.

4. **`patchPontoById` has an empty dependency array.** `useCallback` in `useCollectionPlayerData` declares `patchPontoById` with `[]` as its dependency list, yet the function closes over `collectionId` and `queryClient`. This works because both are stable references in practice, but it is a lint-suppressable bug (`queryClient` is guaranteed stable; `collectionId` could theoretically change if the hook is remounted).

5. **`backoffsMs` index in `completeUploadWithRetry`.** The array `[500, 1000, 2000, 4000, 6000]` has 5 entries for a `maxAttempts = 5` loop. Attempt 1 uses index 0, attempt 5 would use index 4 — but attempts 1 through 4 consume all 5 backoff slots (index 0–3), leaving attempt 5 to use `backoffsMs[4] = 6000` via the fallback (`?? backoffsMs[backoffsMs.length - 1]`). The array length matches attempts but the last slot is never used as a "fallback" in the normal case; the logic is correct but misleading.

6. **`callFunctionPublicHttp` comment warns no Authorization should be sent**, but the comment is only inline. If the function is called for review mode by mistake, the caller (`getPontoAudioPlaybackUrlInternal`) correctly selects between `callFunctionAuthedHttp` and `callFunctionPublicHttp`, so this is not a live bug — but the separation is fragile (no type enforcement).

7. **`PlayerSearchModal` does not navigate on result press.** Results are displayed in a `FlatList` but tapping a result does nothing (no `onPress` on the outer `SurfaceCard` or result row). The modal is informational only; there is no implementation to jump to the selected ponto in the player.

8. **`console.log` calls without `__DEV__` guard in `pontoAudio.ts`.** Functions `initPontoAudioUpload`, `uploadToSignedUpload`, `completePontoAudioUpload`, `completeUploadWithRetry`, and `finalizeAudioUploadAndCreateSubmission` use bare `console.log` extensively. These will appear in production builds, unlike the `__DEV__`-guarded logs elsewhere in the same file.

9. **`bytesEstimate` in `savePackage` is calculated twice.** The function stringifies the package, sets `bytesEstimate` from that string's length, then stringifies again with the updated `bytesEstimate`. The second JSON string (with the estimate included) is what is actually stored, but `pkg.bytesEstimate` is set from the first stringification — so the stored estimate is slightly off.

10. **Hardcoded Terms URL.** `TERMS_URL = "https://www.saravafy.com.br/termos-de-uso-interprete-de-ponto-audio"` is embedded directly in `PlayerAudioUpload.tsx`. If the URL changes it requires a code release.
