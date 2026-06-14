# Curator / Review Submissions

> Status: generated 2026-06-11 from full read of source files. Verify before relying on as spec.

## Purpose
Lets global "curators" (acervo guardians) triage user-submitted pontos — new pontos, lyric corrections, problem reports, variations, and audio uploads — and approve or reject them via server-side RPCs. Also wires up the first-time curator onboarding flow (`CuratorInviteGate`) and the per-user "curator mode" toggle that surfaces moderation affordances in the rest of the app.

## Files
- **Routes (expo-router):**
  - `app/(app)/review-submissions/index.tsx` — re-exports `ReviewQueueScreen`.
  - `app/(app)/review-submissions/[submissionId].tsx` — re-exports `ReviewSubmissionScreen`.
- **Screens:**
  - `src/screens/CuratorReviewQueue/ReviewQueue.tsx`
  - `src/screens/CuratorReviewQueue/ReviewSubmission.tsx`
- **Components:** `src/components/CuratorInviteGate.tsx`
- **Contexts:** `contexts/CuratorModeContext.tsx`
- **Hooks:** `src/hooks/useIsCurator.ts`, `src/hooks/useIsDevMaster.ts`
- **Queries:** `src/queries/pontoSubmissions.ts`, `src/queries/queryKeys.ts` (keys only)
- **Services / API:**
  - `src/api/pontoAudio.ts` (`prefetchReviewPlaybackUrl`, `getReviewPlaybackUrlEnsured`)
  - `src/audio/rntpService.ts` (RN Track Player single source of truth)
  - `src/services/reviewAudioPrefetch.ts` — **deprecated stub** (`export {};`). Playback prefetch moved to `src/api/pontoAudio.ts`; only legacy import path stability remains.
- **Domain / utils:** `src/domain/globalRoles.ts`, `src/utils/sanitizeReviewSubmission.ts`, `src/features/identity/resolveProfiles.ts`

## Routes
| Route | Screen | Params | Guard |
|---|---|---|---|
| `/review-submissions` | `ReviewQueueScreen` | — | `useIsCurator` — non-curators get a toast and `router.replace("/")` (`ReviewQueue.tsx:66-72`). |
| `/review-submissions/[submissionId]` | `ReviewSubmissionScreen` | `submissionId: string` (from `useLocalSearchParams`) | Same client guard (`ReviewSubmission.tsx:565-571`). Server enforces curator-only via RPCs (`not_curator`). |

## Navigation
- Entry point: pressing a queue row pushes `/review-submissions/${s.id}` (`ReviewQueue.tsx:278-280`).
- The queue itself is reached from a curator-only entry elsewhere in the app (Home/Preferences). Not a deep-link target — no `saravafy://review-submissions/...` handler observed.
- Exits: `router.back()` after every successful approve/reject; `router.replace("/")` on guard failure.

## Contexts consumed/provided
| Context | Provided here? | Consumed by | State shape |
|---|---|---|---|
| `CuratorModeContext` (`contexts/CuratorModeContext.tsx`) | Yes — `CuratorModeProvider` is mounted in `app/_layout.tsx`. | `Home`, `PlayerScreen`, `TabsHeaderWithPreferences`, `Preferences/ProfileSection` (see Cross-feature deps). | `{ curatorModeEnabled: boolean; isLoading: boolean; isSaving: boolean; setCuratorModeEnabled(next): Promise<void> }`. |
| `AuthContext` | Consumed | Everywhere — supplies `user.id`, `user.email`. | n/a |
| `PreferencesContext` | Consumed | Both review screens for `effectiveTheme`. | n/a |
| `ToastContext` | Consumed | Both review screens + invite gate. | n/a |
| `InviteGatesContext` | Consumed by `CuratorInviteGate` | Used to suppress the curator banner/modal while `terreiroGateActive` is true (`CuratorInviteGate.tsx:73,130,235`). | `{ terreiroGateActive: boolean }` (used here). |

### CuratorModeContext behaviour
- Reads `profiles.curator_mode_enabled` per `user.id`, **keyed under `queryKeys.me.profile(userId)`** (a coincidental key reuse — see "Known issues" below) (`CuratorModeContext.tsx:57-89`).
- `staleTime: 60_000`; `placeholderData: prev`.
- Has a defensive `isColumnMissingError` branch that returns `false` if Postgres complains the column doesn't exist (`CuratorModeContext.tsx:74-77`) — tolerates older DB migrations.
- `setCuratorModeEnabled` is **client-gated on `isCurator`** (`CuratorModeContext.tsx:94`) and does an optimistic update on `profiles`. The toggle's effective value is masked to `false` if the user is not a curator: `curatorModeEnabled: isCurator ? !!q.data : false` (`CuratorModeContext.tsx:131`). Server RLS must still prevent non-curators from flipping this column.
- UX implications: when `curatorModeEnabled` is true, downstream features (Home, Player, etc.) reveal moderation affordances (review queue link, edit-any-ponto controls). When `isCurator` is `false`, the toggle is forced `false` and `setCuratorModeEnabled` short-circuits silently — there is no UI affordance to *become* a curator from this context; that's the role of `CuratorInviteGate`.

## Data flow (queries → screens)

### `usePendingPontoSubmissions` — `src/queries/pontoSubmissions.ts:208`
- **queryKey:** `queryKeys.pontosSubmissions.pending()` → `["pontosSubmissions","pending"]`.
- **Table:** `pontos_submissions` joined to `pontos:ponto_id (title)`.
- **Filters:** `status = "pending"`, ordered `created_at DESC`. **No pagination, no cursor, no limit** — the whole pending set is fetched in one call (`pontoSubmissions.ts:90-96`).
- **Cache:** `staleTime: 0`, `gcTime: 5min`, `placeholderData: prev`.
- **Consumer:** `ReviewQueueScreen` (enabled only when `isCurator && !isCuratorLoading`).
- **Selected columns:** `id, kind, status, created_at, created_by, reviewed_at, reviewed_by, ponto_id, pontos:ponto_id(title), ponto_audio_id, audio_bucket_id, audio_object_path, payload, ponto_is_public_domain, author_name, author_consent_granted, terms_version, has_audio, interpreter_name, interpreter_consent_granted`.

### `usePontoSubmissionById` — `src/queries/pontoSubmissions.ts:221`
- **queryKey:** `queryKeys.pontosSubmissions.byId(submissionId)`.
- **Table:** `pontos_submissions` (same column set), `.maybeSingle()`.
- **Cache:** `staleTime: 0`, `gcTime: 5min`.
- **Consumer:** `ReviewSubmissionScreen`.

### Auxiliary queries inside `ReviewSubmissionScreen`
- **Canonical ponto** (for `audio_upload` hydration) — inline `useQuery` keyed `["pontos","byId", pontoId]` on `pontos` joined to `ponto_versoes!inner(lyrics, is_canonical)` with `is_canonical = true` (`ReviewSubmission.tsx:441-492`). `staleTime: 30_000`.
- **`ponto_audios` meta** — inline `useQuery` keyed `["pontoAudios","metaById", pontoAudioId]` reads `id, interpreter_name, duration_ms, size_bytes, mime_type, upload_status, is_active` (`ReviewSubmission.tsx:494-539`). `staleTime: 30_000`. Note this key is **outside** the central `queryKeys.pontoAudios.*` set in `queryKeys.ts:131-138`.
- **`useIsCurator`** — see Hooks below.

### Filters / pagination — **none**
There is no UI filter (kind, has_audio, public_domain) and no pagination. The queue is a single `ScrollView` over the unbounded `pending` array.

## Supabase surface

- **Tables read:**
  - `pontos_submissions` (queue + detail; `.eq('status','pending')`)
  - `profiles` (curator-mode column read/write; also `resolveProfiles` lookups)
  - `curators` (presence check by `user_id` for role)
  - `curator_invites` (pending invite for the signed-in user; realtime channel)
  - `pontos` (canonical row + canonical version on detail)
  - `ponto_audios` (audio meta on detail)
- **Tables written:**
  - `profiles.curator_mode_enabled` (via `CuratorModeContext`)
  - `ponto_audios.duration_ms` (direct UPDATE before the audio-upload approve RPC — see "Business rules")
- **RPCs called** (all via `supabase.rpc`):
  - `accept_curator_invite(p_invite_id)` — `CuratorInviteGate.tsx:380`
  - `reject_curator_invite(p_invite_id)` — `CuratorInviteGate.tsx:467`
  - `approve_ponto_submission(p_submission_id, p_decision, p_review_note, p_title, p_lyrics, p_tags, p_author_name, p_interpreter_name)` — `ReviewSubmission.tsx:605-619` (also used as fallback for `audio_upload` activation, `:735-755`)
  - `approve_ponto_correction_submission(p_submission_id, p_review_note)` — `ReviewSubmission.tsx:622-638`
  - `approve_variation_submission(p_submission_id, p_decision, p_review_note, p_title, p_lyrics, p_tags, p_author_name)` — `ReviewSubmission.tsx:907-910`
  - `approve_audio_upload_submission(p_submission_id)` — `ReviewSubmission.tsx:715-720`
  - `reject_ponto_submission(p_submission_id, p_review_note)` — `ReviewSubmission.tsx:640-656`
  - `reject_audio_upload_submission(p_submission_id, p_review_note)` — `ReviewSubmission.tsx:792-798`
  - All approve/reject calls are routed through `callRpcWithParamFallback` (`ReviewSubmission.tsx:85-133`), which retries without the `p_` prefix on PGRST202 — supports legacy server signatures.
- **Realtime channels:**
  - `invite-gate:curator_invites` — `INSERT` + `UPDATE` on `public.curator_invites` (`CuratorInviteGate.tsx:351-367`).
- **Storage buckets:** indirectly — audio playback resolves a signed URL via `pontoAudio.getReviewPlaybackUrlEnsured` from `submission.audio_bucket_id` + `submission.audio_object_path` (gating fields populated by the queue/detail queries).
- **Edge functions:** none observed in this slice.

## Mutations

| Mutation | RPC | Optimistic? | Local cache changes on success | Invalidations |
|---|---|---|---|---|
| Accept curator invite | `accept_curator_invite` | No | — | `queryKeys.curatorInvites.pendingForInvitee(email)` (exact), `queryKeys.globalRoles.isCurator(userId)`, plus explicit `refetchIsCurator()`. |
| Reject curator invite | `reject_curator_invite` | No | — | Same as accept. |
| Approve "new" submission | `approve_ponto_submission` | Yes — `removeFromPendingList(id)` writes `queryKeys.pontosSubmissions.pending()` directly (`ReviewSubmission.tsx:594-602, 1063`). | Pops row from pending list. | `["pontos"]`. |
| Approve correction | `approve_ponto_correction_submission` | No | — | `queryKeys.pontosSubmissions.pending()`, `queryKeys.pontosSubmissions.byId(id)`, `["collections","pontos"]`, `["pontos"]`. |
| Approve variation | `approve_variation_submission` | Yes — `removeFromPendingList(id)` | Pops pending row. | `["pontos"]`, `queryKeys.pontosSubmissions.pending()`. |
| Approve audio upload | `approve_audio_upload_submission` (with `approve_ponto_submission` fallback on `invalid_activation` / `cannot activate ponto_audio`) | Yes — `removeFromPendingList(id)` | Pops pending row. | `pontosSubmissions.pending()`, `pontosSubmissions.byId(id)`, `pontosSubmissions.approvedAudioByPontoId(pontoId)`, `pontoAudios.byPontoId(pontoId)`, `pontoAudios.hasAnyUploadedByPontoId(pontoId)`, `["pontoAudios","metaById",pontoAudioId]`, `["pontos"]`. Pre-step: direct `UPDATE ponto_audios SET duration_ms = <ms>` against the row before calling the RPC (`ReviewSubmission.tsx:690-703`). |
| Reject (`new` / `correction` / `variation`) | `reject_ponto_submission` | Yes — `removeFromPendingList(id)` | Pops pending row. | none (after pop). |
| Reject audio upload | `reject_audio_upload_submission` (requires non-empty `p_review_note`) | Yes — `removeFromPendingList(id)` | Pops pending row. | Same invalidation set as audio approve. |

On any error whose raw message contains `submission_not_pending`, the screen still pops the pending row optimistically and goes back (`ReviewSubmission.tsx:933-938, 1007-1012, 1072-1077, 1178-1183`).

## Business rules / invariants

### Role checks — security-relevant
- `useIsCurator` (`src/hooks/useIsCurator.ts:14-42`) — source of truth: a `SELECT user_id FROM curators WHERE user_id = <me>` `.maybeSingle()`. **It is not a JWT claim** — every check is a live DB query. Cache: `staleTime: 0`, `gcTime: 30_000`, `refetchOnMount: "always"`, `refetchOnReconnect: true`, `refetchOnWindowFocus: true`. On any error it returns `false` (fail-closed).
- `useIsDevMaster` (`src/hooks/useIsDevMaster.ts:14-39`) — **purely client-side allowlist**. Reads `EXPO_PUBLIC_DEV_MASTER_EMAILS` (whitespace/comma/semicolon-separated) at build time; falls back to a hard-coded list `FALLBACK_DEV_MASTER_EMAILS = ["yuriblanke@gmail.com"]` (`useIsDevMaster.ts:12`). Match is case-insensitive on the auth user's email. This is **client-trusted only** — it must never be used to authorize destructive actions; only to reveal dev UI.
- Client guards in `ReviewQueue.tsx:66-72` and `ReviewSubmission.tsx:565-571` toast + `router.replace("/")` if `!isCurator` after loading. These are UX guards, **not authorization** — every RPC additionally maps the `not_curator` error to "Apenas pessoas guardiãs do acervo podem revisar envios." (`ReviewSubmission.tsx:141-142`), proving the server enforces curator-only.
- `CuratorModeContext.setCuratorModeEnabled` early-returns when `!isCurator` (`CuratorModeContext.tsx:94`). RLS must back this; do not trust the client.

### Global roles domain
- `src/domain/globalRoles.ts` declares a single enum: `type GlobalRole = "curator"` (`globalRoles.ts:3`). The badge/label/permissions copy is bundled here:
  - `badgeLabel`: `"Pessoa Guardiã do Acervo"`
  - Permissions: edit any ponto, fix lyrics/titles, add/remove tags, act on submissions per policy.
- No "dev master" or other global roles are defined here — `useIsDevMaster` is intentionally separate and out-of-band.

### Submission kinds
The screen branches on `submission.kind` (compared case-insensitively): `"new"`, `"correction"`, `"problem"`, `"audio_upload"`, `"variation"`. These map to PT-BR labels in `toKindLabel` (`ReviewQueue.tsx:39-47`, `ReviewSubmission.tsx:186-194`). The DB enum is `ponto_submission_kind` (per `docs/schema.md`); statuses use `ponto_submission_status` defaulting to `'pending'`.

### Side-by-side diff?
**No diff UI.** The detail screen edits the submission's denormalized fields in place (title, author, interpreter, lyrics, tags, review note) and submits them as RPC parameters. Approval is effectively curator-mediated editing — the curator can correct payload content before approving. For `correction` submissions the form fields are **not sent** to the RPC at all (`approve_ponto_correction_submission` takes only `p_submission_id, p_review_note`), so the curator's edits in those fields are ignored. For `audio_upload` the title/author/interpreter/lyrics/tags inputs are hydrated **read-only** from the canonical `pontos` row (`editable={!isMutatingAny && !isAudioUpload}`) (`ReviewSubmission.tsx:541-563, 1415, 1436, 1461, 1603, 1626`).

### Consent gating (client-side, also server-enforced)
Before invoking `approve_ponto_submission` for the "new" path, the screen blocks approval if:
- `!isPublicDomain && !author_consent_granted` → "Não dá para aprovar: consentimento do autor não foi concedido." (`ReviewSubmission.tsx:1033-1039`)
- `hasAudio && !interpreter_consent_granted` → "Não dá para aprovar: consentimento do intérprete não foi concedido." (`ReviewSubmission.tsx:1041-1047`)

### Audio playback in review
- Single-source-of-truth: RN Track Player via `src/audio/rntpService.ts`. Review-screen audio is identified as `{ kind: "submission", submissionId }` (`ReviewSubmission.tsx:336, 420-428, 1315-1320`).
- Gating fields: `isAudioReadyForPlayback` requires `isAudioUpload && submission.has_audio === true && pontoAudioId && audio_bucket_id && audio_object_path` (`ReviewSubmission.tsx:312-319`). Approval is blocked unless RNTP has reported a positive `durationMillis`, with the friendly message "Carregue o áudio para aprovar." (`ReviewSubmission.tsx:949-954`).
- Direct `UPDATE ponto_audios SET duration_ms` is performed by the client **before** the approve RPC (`ReviewSubmission.tsx:690-703`). The backend trigger `trg_enforce_audio_duration_on_approval` is referenced in error mapping (`ReviewSubmission.tsx:163-168`), which suggests the server enforces non-null duration_ms at approval time — the client populates it first.

### Audio prefetch service
- `src/services/reviewAudioPrefetch.ts` is **a deprecated stub** containing only `export {};` and a comment that playback was moved to RN Track Player and review prefetching via `expo-av` has been removed. The active prefetcher lives in `src/api/pontoAudio.ts`:
  - `prefetchReviewPlaybackUrl(submissionId)` warms an in-memory cache and an in-flight de-dupe map for the signed URL, kicking off `getReviewPlaybackUrlEnsured` (`pontoAudio.ts:1357-1390`).
  - **When triggered:** `ReviewQueueScreen` prefetches only the *first* submission in the pending list when the queue renders (`ReviewQueue.tsx:86-91`), so opening the top row feels instant. No bulk prefetch of the rest of the queue.

### `sanitizeReviewSubmission`
`src/utils/sanitizeReviewSubmission.ts` is small and load-bearing for what gets sent to RPCs:
- `sanitizeOptionalText(value)` — `trim()` and return `null` for empty strings (so the RPC sees SQL `NULL` instead of `""`).
- `sanitizeRequiredText(value)` — `trim()` only (returns `""` on empty; caller still has to guard).
- `normalizeTagsFromText(value)` — splits on `,` or `|`, trims, drops empties, **de-duplicates case-insensitively while preserving the first casing seen** (lowercase key set, original string kept).
- `normalizeTagsArray(value)` — same de-dupe semantics over an array input.

Purpose: prevent empty strings from being persisted, normalize tag entry, and guarantee idempotent tag sets. **No HTML/script stripping is performed** — only whitespace and dedupe. Lyrics/title bodies are sent verbatim.

### `resolveProfiles` (batch identity)
`src/features/identity/resolveProfiles.ts:16-106` is a generic batch lookup against `profiles(id,email,full_name,avatar_url)`, indexed by either user id or email. Used by `ReviewQueue.tsx:97-125` to display the submitter name + email on each pending card (de-duplicates `created_by` across `items`, fires once per items change, best-effort — errors swallowed).
- Notable: PostgREST `.in('email', …)` is case-sensitive, so the function runs **two parallel queries** (one with raw emails, one lowercased) and merges them client-side (`resolveProfiles.ts:67-103`). Returns `{ byId, byEmailLower }`.

### CuratorInviteGate — first-time curator onboarding
`src/components/CuratorInviteGate.tsx` is the global modal/banner shown to any signed-in non-curator who has a `pending` row in `curator_invites` matching their normalized email.
- **Suppressed when:** `terreiroGateActive` (terreiro invite has priority) or `isCurator === true` (`CuratorInviteGate.tsx:130-131, 555-557`).
- **Query:** `SELECT id,email,status,created_at FROM curator_invites WHERE status='pending' AND email = <normalized> ORDER BY created_at ASC LIMIT 1` (`CuratorInviteGate.tsx:144-151`).
- **Refresh strategy:** in-memory cache window of `12_000 ms` plus an in-flight promise de-dupe (`CuratorInviteGate.tsx:97-99, 133-185`). Also re-runs on `AppState` background→active transitions (`:267-292`).
- **Realtime:** subscribes to INSERT+UPDATE on `public.curator_invites`, filters by email client-side, and either reveals the banner (status became `pending`) or hides everything (status moved away from `pending`) (`CuratorInviteGate.tsx:294-372`).
- **Actions:** `acceptInvite` calls `accept_curator_invite(p_invite_id)`; `rejectInvite` calls `reject_curator_invite(p_invite_id)`. Both invalidate `curatorInvites.pendingForInvitee(email)` and `globalRoles.isCurator(userId)`, then call `refetchIsCurator()` (`CuratorInviteGate.tsx:420-432, 507-519`). On accept, the user is toasted `Agora você é Pessoa Guardiã do Acervo.` (label from `globalRoles.ts`).
- **Error mapping:** `getFriendlyActionError` (`CuratorInviteGate.tsx:41-66`) buckets network errors and RLS/permission errors into friendly PT-BR copy.
- **Defer-to-ready pattern:** if the root navigator isn't ready yet, the modal is queued via `shouldOpenModalWhenReady` and opened once `segments[0] === "(app)"` (`CuratorInviteGate.tsx:74-78, 187-201`).

## Cross-feature dependencies

- **AuthContext** (`contexts/AuthContext`) — every hook/screen needs `user.id` and/or `user.email`.
- **PreferencesContext** — theming (`effectiveTheme`) on screens.
- **ToastContext** — user feedback for guards, RPC errors, success.
- **InviteGatesContext** (`contexts/InviteGatesContext`) — curator gate yields to terreiro gate.
- **`@/lib/supabase`** — shared client, also used for realtime.
- **`@/src/audio/rntpService`** — RNTP playback service for audio submissions.
- **`@/src/api/pontoAudio`** — `prefetchReviewPlaybackUrl` + downstream `getReviewPlaybackUrlEnsured` resolve the signed audio URL.
- **`@/src/queries/queryKeys`** — central key namespace (`globalRoles`, `curatorInvites`, `pontosSubmissions`, `pontoAudios`).
- **`@/src/components/Badge`, `SurfaceCard`, `TagChip`, `AudioProgressSlider`** — shared UI primitives.
- **Consumers of `useIsCurator`** outside this slice: `Home`, `PlayerScreen`, `Preferences/ProfileSection`, `TabsHeaderWithPreferences`. Consumers of `useIsDevMaster`: same set minus `CuratorInviteGate`.
- **Consumers of `useCuratorMode`**: `Home`, `PlayerScreen`, `TabsHeaderWithPreferences`, `Preferences/ProfileSection`.

## Known issues / TODOs found in code

- **Deprecated module still imported:** `src/services/reviewAudioPrefetch.ts` is an empty stub kept "for path stability" but no source files in the slice import it any longer. Candidate for deletion (search confirmed it's only referenced by the doc-driven task list).
- **Key collision risk:** `CuratorModeContext` writes the boolean curator-mode flag under `queryKeys.me.profile(userId)` (`CuratorModeContext.tsx:57-58, 98, 110, 121`). If anywhere else uses that same key to store a profile object, the two queries will clobber each other. Worth auditing `queryKeys.me.profile` usage outside this slice.
- **Inline query keys instead of central registry:** `ReviewSubmission.tsx` defines `["pontos","byId", pontoId]` and `["pontoAudios","metaById", pontoAudioId]` ad-hoc (`:442, 496`). The central `queryKeys.pontoAudios.*` does **not** include a `metaById` entry, so invalidations using `queryKeys.pontoAudios.byPontoId(pid)` (e.g. after audio approve, `:986`) will **not** refresh the meta query the same screen consumes — the screen instead invalidates `["pontoAudios","metaById", pontoAudioId]` explicitly (`:994-996`). Fragile.
- **No pagination on the queue.** The pending list is unbounded; a `bottomFiller` of 290px is added at the end (`ReviewQueue.tsx:336, 370`). Will need server-side limit/cursor before the queue grows.
- **No diff UI** for `correction` submissions — curators eyeball changes against the canonical `pontos` row they have to remember.
- **Audio approval requires a client-side preflight UPDATE on `ponto_audios.duration_ms`** before the RPC (`ReviewSubmission.tsx:690-703`). If a curator's session lacks UPDATE rights on `ponto_audios` (depends on RLS), approval will fail before the RPC is even reached. The friendly error "Não foi possível registrar a duração do áudio." is the only signal.
- **`useIsDevMaster` hard-codes `yuriblanke@gmail.com`** as the fallback admin email (`useIsDevMaster.ts:12`). This is client-trusted only — fine for revealing dev UI; do **not** use to gate destructive actions. The env override `EXPO_PUBLIC_DEV_MASTER_EMAILS` is baked into the bundle at build time and shipped to all clients.
- **RPC param-prefix fallback** (`callRpcWithParamFallback`, `ReviewSubmission.tsx:85-133`) silently retries without `p_` on PGRST202 — handy for transitional deploys but masks real signature drift. Tombstone candidate once the server is on a single signature.
- **Comment inconsistency:** preload effect docstring at `ReviewSubmission.tsx:397-398` still references "expo-av" `Sound`, but the implementation now uses RNTP `ensureLoaded`.
- **`reviewAudioPrefetch.ts` deprecation comment** still mentions expo-av removal — confirms the migration to RNTP is recent.
