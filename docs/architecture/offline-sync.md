# Offline Sync

> Status: generated 2026-06-12 from full read of source files. Verify before relying on as spec.

## Purpose

Allows members to download a terreiro's full content (collections, pontos lyrics, and optionally audio files) to their device so the app remains usable without an internet connection. Provides silent background re-sync whenever the app is foregrounded, and integrates offline fallback paths directly into the query layer so screens degrade gracefully when offline.

## Files

- **Offline core:**
  - `src/offline/terreiroPackage.ts` — package CRUD (save/get/remove/list), sync orchestration, index management
  - `src/offline/audioCache.ts` — audio file download, local resolution, and clearing
  - `src/offline/networkCheck.ts` — one-shot `isOffline()` helper
- **Contexts:**
  - `src/contexts/NetworkContext.tsx` — reactive `isConnected`/`isInternetReachable` via NetInfo subscription
- **Hooks:**
  - `src/hooks/useOfflineAutoSync.ts` — background auto-sync on mount and app foreground
- **Components:**
  - `src/components/TerreiroOfflineSheet.tsx` — bottom sheet for download/sync/remove per terreiro
  - `src/components/DownloadUpdateButton.tsx` — references remote config for install URL
  - `src/screens/Preferences/components/OfflineDownloadsSection.tsx` — list of all downloaded packages in Preferences
- **Queries (with offline fallback):**
  - `src/queries/collectionPontos.ts` — `fetchCollectionPontosItems` with `tryOfflineFallback`
  - `src/queries/terreirosCollections.ts` — `fetchCollectionsByTerreiro` with inline offline branch
- **Query keys:**
  - `src/queries/queryKeys.ts` — `queryKeys.offline.terreiroPackage(id)`, `queryKeys.offline.allPackages()`
- **Remote config:**
  - `src/config/remoteConfig.ts` — `public_app_config` table cache with 6-hour TTL
- **Root layout:**
  - `app/_layout.tsx` — `QueryClient` instantiation, `warmRemoteConfig()` on boot, mounts `useOfflineAutoSync`

## Routes

This slice has no dedicated routes. It is surfaced as a bottom sheet (`TerreiroOfflineSheet`) triggered from terreiro screens, and as a section inside the Preferences screen (`OfflineDownloadsSection`). No deep links.

## Navigation

User enters the offline management flow from:
1. A terreiro screen action button → opens `TerreiroOfflineSheet` (bottom sheet overlay).
2. Preferences screen → "DOWNLOADS OFFLINE" section → shows all saved packages with sync/remove actions.

No dedicated route exists. There are no deep links for this slice.

## Contexts consumed/provided

| Context | Provided here? | Consumed by | State shape |
|---|---|---|---|
| `NetworkContext` | Yes — `src/contexts/NetworkContext.tsx` | `useOfflineAutoSync`, any component calling `useNetwork()` | `{ isConnected: boolean, isInternetReachable: boolean \| null }` |
| `QueryClientProvider` | No — provided in `app/_layout.tsx` | `TerreiroOfflineSheet`, `OfflineDownloadsSection`, `useOfflineAutoSync` | standard TanStack React Query client |

## Data flow (queries → screens)

### `queryKeys.offline.terreiroPackage(terreiroId)` — per-package query
- **queryKey:** `["offline", "terreiroPackage", terreiroId]`
- **Source:** `AsyncStorage` via `getPackage(terreiroId)` — no network call
- **Cache strategy:** `staleTime: 0` (always re-reads from AsyncStorage on focus); no gcTime override
- **Consumed by:** `TerreiroOfflineSheet` (shows metadata: collections count, pontos count, bytes, sync date, audio flag)
- **Invalidated by:** `handleSync`, `handleDownloadAudios`, `handleClearAudios`, `handleRemove` in `TerreiroOfflineSheet`; `handleSync`, `handleRemove` in `OfflineDownloadsSection`; `useOfflineAutoSync` after each background sync

### `queryKeys.offline.allPackages()` — index query
- **queryKey:** `["offline", "allPackages"]`
- **Source:** `AsyncStorage` via `listPackages()` — reads index key then loads each package
- **Cache strategy:** `staleTime: 0`
- **Consumed by:** `OfflineDownloadsSection` (renders the list); `useOfflineAutoSync` (reads index to know which terreiros to re-sync)
- **Invalidated by:** any mutation that adds/removes a package

### `queryKeys.collections.pontos(collectionId)` — collection pontos (offline-aware)
- **queryKey:** `["collections", "pontos", collectionId]`
- **Source:** `fetchCollectionPontosItems` → calls `isOffline()` first; if offline, calls `tryOfflineFallback(collectionId)` which scans all saved packages; falls back to Supabase query otherwise
- **Cache strategy:** `staleTime: 3 * 60 * 1000`, `gcTime: 45 * 60 * 1000`
- **Consumed by:** Player screen, collection detail screens

### `queryKeys.terreiros.collectionsByTerreiro(terreiroId)` — collections list (offline-aware)
- **queryKey:** `["terreiros", "collectionsByTerreiro", terreiroId]`
- **Source:** `fetchCollectionsByTerreiro` → calls `isOffline()` first; if offline, reads `pkg.collections` from the saved package; falls back to Supabase query otherwise
- **Cache strategy:** `staleTime: 60_000`, `gcTime: 30 * 60_000`
- **Consumed by:** terreiro biblioteca screen, sync orchestration inside `syncTerreiroPackage`

### Remote config — `app_install_url`
- **Source:** `public_app_config` table, key `app_install_url`; cached in AsyncStorage under `remoteConfig:app_install_url` with 6-hour TTL
- **No queryKey** — managed outside React Query via `getCachedAppInstallUrl` / `getAppInstallUrl` / `warmRemoteConfig`
- **Warmed:** `warmRemoteConfig()` called once on app boot in `app/_layout.tsx`

## Supabase surface

- **Tables read:**
  - `terreiros` — `id, title, cover_image_url` — fetched during `syncTerreiroPackage` to populate package metadata; fallback select omits `cover_image_url` if column error
  - `collections` — `id, title, description, visibility, owner_terreiro_id` — fetched via `fetchCollectionsByTerreiro` during sync; compat fallback omits `description`
  - `collections_pontos` — `position, ponto_versao_id, entidade_id, entidade_texto, entidade_orixa_id, pontos(…), ponto_versao(…)` — fetched per collection via `fetchCollectionPontosItems` during sync
  - `ponto_audios` — `id, ponto_id, ponto_versao_id` filtered by `is_active=true` and `upload_status='uploaded'`, ordered `created_at DESC` — fetched in `findApprovedAudiosForPontoIds` during audio download; one audio per ponto (first-seen deduplication)
  - `public_app_config` — `key, value, updated_at` — remote config; `.maybeSingle()` for key `app_install_url`
- **Tables written:** none
- **RPCs called:** none directly in this slice (`getPontoAudioPlaybackUrlPublic` is called from `src/api/pontoAudio` to resolve signed/public playback URLs before download)
- **Realtime channels:** none
- **Storage buckets:** audio files are downloaded from URLs resolved by `getPontoAudioPlaybackUrlPublic` (Supabase Storage public URLs or signed URLs); written to the device filesystem, not to a Supabase bucket
- **Edge functions:** none

## Mutations

This slice has no TanStack Query mutations (no `useMutation`). All write operations are plain `async` functions called imperatively from components, with manual query invalidation afterward. There are no optimistic updates — storage writes are either complete or not.

### `syncTerreiroPackage(terreiroId, { onProgress })`

| Property | Detail |
|---|---|
| Storage target | AsyncStorage key `@saravafy:offline:terreiro:<id>` + index key `@saravafy:offline:terreiroIndex` |
| What it writes | Full `TerreiroOfflinePackageV1` JSON: terreiro metadata, all `TerreiroCollectionCard[]`, all `CollectionPlayerItem[]` per collection, `audiosIncluded: false`, `bytesEstimate` (JSON byte length) |
| Concurrency | Collections fetched in parallel with `MAX_CONCURRENCY = 4` workers |
| Progress phases | `terreiro → collections → pontos → saving` reported via `onProgress` callback |
| Error handling | Supabase errors on terreiro fetch throw; collection/ponto fetch errors propagate; callers catch silently or surface `syncError` string |
| Post-write invalidations | Caller invalidates `queryKeys.offline.terreiroPackage(id)` and `queryKeys.offline.allPackages()` |

### `downloadAudiosForPackage(terreiroId, { onProgress })`

| Property | Detail |
|---|---|
| Storage target | Filesystem: `<documentDirectory>/saravafy/terreiros/<terreiroId>/audios/<pontoAudioId>.<ext>` |
| What it writes | One audio file per approved ponto (mp3/ogg/wav, extension inferred from MIME type); skips files already present (`getInfoAsync` check before download) |
| Post-write | Sets `pkg.audiosIncluded = true`, updates `pkg.bytesEstimate` from JSON length, calls `savePackage(pkg)` |
| Error handling | Per-file errors caught and skipped silently; missing package throws "Pacote offline não encontrado." |
| Post-write invalidations | Caller invalidates `queryKeys.offline.terreiroPackage(id)` |

### `savePackage(pkg)`

| Property | Detail |
|---|---|
| Storage target | AsyncStorage key `@saravafy:offline:terreiro:<id>` |
| Side effect | Calls `updateIndex(id, "add")` to ensure terreiro ID is in the index set |
| Error handling | None — `AsyncStorage.setItem` errors propagate to caller |

### `removePackage(terreiroId)`

| Property | Detail |
|---|---|
| Storage target | AsyncStorage — removes `@saravafy:offline:terreiro:<id>`, removes ID from index |
| Typically preceded by | `clearAudiosForTerreiro(terreiroId)` |
| Error handling | Index update errors caught silently (best effort) |
| Post-write invalidations | Caller invalidates both `terreiroPackage` and `allPackages` query keys |

### `clearAudiosForTerreiro(terreiroId)`

| Property | Detail |
|---|---|
| Storage target | Filesystem: deletes entire `<documentDirectory>/saravafy/terreiros/<terreiroId>/audios/` directory |
| Post-write | Loads package and sets `pkg.audiosIncluded = false`, then `savePackage(pkg)` |
| Error handling | All errors caught silently (best effort) |

### Remote config write — `writeCachedString`

| Property | Detail |
|---|---|
| Storage target | AsyncStorage key `remoteConfig:app_install_url` |
| Written when | `getAppInstallUrl()` fetches a valid `https://` URL from `public_app_config` |
| TTL | 6 hours (`TTL_MS = 6 * 60 * 60 * 1000`) |

## Business rules / invariants

- **Package versioning:** `TerreiroOfflinePackageV1` carries `version: 1`. `getPackage` returns `null` if `parsed.version !== CURRENT_VERSION`, effectively dropping stale packages on format changes with no migration path.
- **Audio deduplication during download:** `findApprovedAudiosForPontoIds` picks at most one audio per `ponto_id` (first row after `ORDER BY created_at DESC`), choosing the most recently created active+uploaded audio. The package index does not store a `pontoId → pontoAudioId` map — resolution at playback time (`resolveLocalAudioForPonto`) scans all files in the terreiro audio directory and matches by iterating `collectionPontos`.
- **Auto-sync throttle:** `useOfflineAutoSync` enforces a minimum 30-minute gap between automatic syncs (`MIN_SYNC_INTERVAL_MS`). The interval is tracked in a `useRef` (in-memory only) and resets on app restart.
- **Auto-sync scope:** only re-syncs metadata (lyrics/collections); it never re-downloads audio files automatically. Audio download is always user-initiated.
- **Offline fallback precedence:** `fetchCollectionPontosItems` checks `isOffline()` before attempting Supabase. If offline but no package exists for the collection, it falls through and lets the Supabase call fail naturally (no custom offline error message surfaced).
- **Remote config URL validation:** only `https://` URLs are accepted from the remote; legacy `http://` URLs already in the local cache are accepted as-is (grandfathered).
- **`bytesEstimate` is JSON size only:** the field measures the serialized JSON of the package object, not the actual on-disk size of downloaded audio files. The UI displays this figure as "Tamanho" which can significantly undercount storage usage when audios are present.
- **Collection `pontosCount` in metadata:** computed by summing `collectionPontos[id].length` values from the saved package — reflects the count at last sync time, not live data.
- **No per-ponto audio map stored in package:** `pkg` has `audiosIncluded: boolean` but no `pontoId → localFilePath` map. `resolveLocalAudioForPonto` resolves the file at playback time via a directory scan + package cross-reference, which is O(terreiros × files).

## Cross-feature dependencies

| Dependency | Used for |
|---|---|
| `src/queries/terreirosCollections.ts` (`fetchCollectionsByTerreiro`) | Called during `syncTerreiroPackage` to fetch the list of collections to package |
| `src/queries/collectionPontos.ts` (`fetchCollectionPontosItems`) | Called per collection during `syncTerreiroPackage` to fetch ponto items |
| `src/api/pontoAudio` (`getPontoAudioPlaybackUrlPublic`) | Called during `downloadAudiosForPackage` to resolve a playback URL before `FileSystem.downloadAsync` |
| `src/domain/entidade`, `src/domain/entidadePlaceholder` | Used inside `fetchCollectionPontosItems` to resolve entidade labels and lyrics placeholders — stored in the package as-is |
| Auth (`AuthProvider`) | Not directly consumed by offline layer; but `useOfflineAutoSync` is mounted inside the authenticated layout scope |
| `src/screens/Player/hooks/useCollectionPlayerData` (`CollectionPlayerItem`) | Type definition shared between the player hook and the offline package shape |
| React Query (`QueryClient`) | All offline queries and manual invalidations use the global `QueryClient` instantiated in `app/_layout.tsx` |

## Known issues / TODOs found in code

1. **No `pontoId → audioFilePath` map in package.** `resolveLocalAudioForPonto` does a full directory + package scan across all saved terreiros to find a local audio for a given ponto. This is O(n terreiros × n pontos × n audio files) and has no index — will degrade as more packages are saved.

2. **`bytesEstimate` is misleading when audios are present.** The estimate covers only the JSON metadata blob. Audio files (potentially tens of MB per terreiro) are not counted. The UI shows this as "Tamanho" without qualification.

3. **No migration for version bump.** `getPackage` silently returns `null` if `version !== 1`. If `CURRENT_VERSION` is incremented, all existing packages are invisible to the app but remain in AsyncStorage and the index until explicitly removed. There is no migration or cleanup routine.

4. **Auto-sync throttle is in-memory only.** The 30-minute `lastSyncAtMs` ref resets to 0 on every app restart. Users who cold-launch frequently will trigger a full re-sync on every launch regardless of how recently the last sync ran.

5. **`useOfflineAutoSync` stale `isConnected` closure.** Both `useEffect` hooks suppress `react-hooks/exhaustive-deps` for `maybeSync`. The `AppState` handler captures `isConnected` at effect creation time and does not update when connectivity changes mid-session — `isConnected` in the handler may be stale.

6. **`terreirosCollections.ts` offline branch does not populate `pontosCount`.** When returning `pkg.collections` offline, `pontosCount` was set to `0` at initial collection fetch time (it is only computed in the live path via a second Supabase query). Offline callers see `pontosCount: 0` for all collections.

7. **Audio resolution is non-deterministic when multiple terreiros share a ponto.** `resolveLocalAudioForPonto` iterates terreiro directories in filesystem order and returns the first match. If a ponto appears in two downloaded terreiros, the returned file is non-deterministic.

8. **`clearAudiosForTerreiro` and `removePackage` are not atomic.** If `clearAudiosForTerreiro` succeeds but `removePackage` fails, the package record remains in AsyncStorage with `audiosIncluded: false` while the files are gone. The reverse (package removed, index not updated) is also possible if `updateIndex` fails silently.

9. **Remote config has no in-memory cache.** Every call to `getAppInstallUrl` within the TTL re-reads from `AsyncStorage`. No in-memory singleton is maintained, so repeated calls within a session hit AsyncStorage each time.
