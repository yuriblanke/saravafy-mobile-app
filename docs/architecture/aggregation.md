# Aggregation

> Status: generated 2026-06-12 from full read of all 11 slice docs and `queryKeys.ts` + `app/` route tree. Mark anything uncertain with "(unconfirmed)".

---

## 1. Route Inventory

Complete table of every expo-router file found under `app/`, with auth guard and primary slice.

| Route pattern | File | Screen / component | Auth guard | Primary slice |
|---|---|---|---|---|
| `/(auth)/_layout.tsx` | `app/(auth)/_layout.tsx` | Headerless Stack (unauthenticated group) | None — public group | auth |
| `/(auth)/login` | `app/(auth)/login.tsx` | `LoginScreen` | None — reached when `user` is null | auth |
| `/auth/callback` | `app/auth/callback.tsx` | `AuthCallbackScreen` | None — OS deep-link target | auth |
| `/_layout` | `app/_layout.tsx` | Root provider tree + boot orchestrator | — | foundation |
| `/+html` | `app/+html.tsx` | Web-only HTML shell | None | foundation |
| `/+not-found` | `app/+not-found.tsx` | Generic 404 | None | foundation |
| `/(app)/_layout` | `app/(app)/_layout.tsx` | Authenticated group Stack | `useAuth().user` set at boot; else → `/login` | foundation |
| `/(app)/index` | `app/(app)/index.tsx` | `<Redirect href="/(app)/(tabs)/(pontos)" />` | inherited | foundation |
| `/(app)/(tabs)/_layout` | `app/(app)/(tabs)/_layout.tsx` | Material top-tabs (Pontos ↔ Terreiros) | inherited | foundation |
| `/(app)/(tabs)/(pontos)/_layout` | `app/(app)/(tabs)/(pontos)/_layout.tsx` | Headerless Stack, `animation: "none"` | inherited | pontos |
| `/(app)/(tabs)/(pontos)/index` | `app/(app)/(tabs)/(pontos)/index.tsx` | `Home` screen | inherited | pontos |
| `/(app)/(tabs)/(terreiros)/_layout` | `app/(app)/(tabs)/(terreiros)/_layout.tsx` | Headerless Stack, `animation: "none"` | inherited | terreiros |
| `/(app)/(tabs)/(terreiros)/index` | `app/(app)/(tabs)/(terreiros)/index.tsx` | `Terreiros` screen | inherited | terreiros |
| `/(app)/player` | `app/(app)/player.tsx` | `PlayerScreen` | inherited; swipe overlay disabled | player-audio |
| `/(app)/ponto-audio-upload` | `app/(app)/ponto-audio-upload.tsx` | `PlayerAudioUpload` | inherited; modal; `requireAuth()` called before push | pontos / player-audio |
| `/(app)/collection/[id]` | `app/(app)/collection/[id].tsx` | `Collection` | inherited; members-only gate rendered in-screen | collections |
| `/(app)/collection/[id]/add` | `app/(app)/collection/[id]/add.tsx` | `AddToCollection` | inherited; auth check in screen | collections |
| `/(app)/collection/[id]/edit` | `app/(app)/collection/[id]/edit.tsx` | `CollectionEdit` | inherited; requires `draftKey` in draftStore | collections |
| `/(app)/terreiro` | `app/(app)/terreiro.tsx` | `TerreiroBiblioteca` | inherited; fade transition | terreiros |
| `/(app)/terreiro-editor` | `app/(app)/terreiro-editor.tsx` | `TerreiroEditor` | inherited; modal; swipe overlay disabled | terreiros |
| `/(app)/terreiro-members` | `app/(app)/terreiro-members.tsx` | `TerreiroMembers` | inherited; runtime guard `admin\|curimba` only | terreiros / access-manager |
| `/(app)/terreiro-members-list` | `app/(app)/terreiro-members-list.tsx` | `TerreiroMembersList` | inherited; publicly accessible; tier from membership | access-manager |
| `/(app)/terreiro-member-profile` | `app/(app)/terreiro-member-profile.tsx` | `TerreiroMemberProfile` | inherited; modal; data from nav param | access-manager |
| `/(app)/terreiro-collections/[terreiroId]/edit` | `app/(app)/terreiro-collections/[terreiroId]/edit.tsx` | `TerreiroCollectionsEdit` | inherited; runtime guard `admin\|curimba` | collections |
| `/(app)/access-manager` | `app/(app)/access-manager.tsx` | `AccessManagerScreen` | inherited; curimba → instant `router.back()`; non-member → inline empty state | access-manager |
| `/(app)/preferences` | `app/(app)/preferences.tsx` | `Preferences` | inherited (`(app)` layout) | preferences |
| `/(app)/review-submissions` (index) | `app/(app)/review-submissions/index.tsx` | `ReviewQueueScreen` | inherited + `useIsCurator` → toast + `router.replace("/")` if false | curator-review |
| `/(app)/review-submissions/[submissionId]` | `app/(app)/review-submissions/[submissionId].tsx` | `ReviewSubmissionScreen` | inherited + same curator client guard; server enforces `not_curator` | curator-review |
| `/(app)/l/ponto/[id]` | `app/(app)/l/ponto/[id].tsx` | Deep-link redirector | inherited; UUID-validated | pontos |
| `/(app)/l/colecao/[id]` | `app/(app)/l/colecao/[id].tsx` | Deep-link redirector | inherited; UUID-validated | collections |
| `/(app)/l/terreiro/[id]` | `app/(app)/l/terreiro/[id].tsx` | Deep-link redirector | inherited; UUID-validated | terreiros |
| `/(app)/l/[tipo]/[id]` | `app/(app)/l/[tipo]/[id].tsx` | Generic deep-link bridge | inherited; normalizes `tipo` | pontos |

**Notes:**
- The specific route `/(app)/l/ponto/[id]` shadows `/(app)/l/[tipo]/[id]` for `tipo='ponto'`. The generic handler's ponto branch is a dead code path (expo-router selects the more specific file).
- `PreferencesModal` (full-screen `<Modal>`) is NOT a route — it is driven by `PreferencesOverlayContext` and renders inside `GlobalOverlaysHost`.
- `InviteGate`, `CuratorInviteGate`, `LoginPromptSheet`, `TerreirosRealtimeSync` are root-mounted components, not routes.

---

## 2. Context Registry

All React contexts provided anywhere in the app, with the file that provides them and key consumers.

| Context name | Hook | Provider file | State held | Key consumers |
|---|---|---|---|---|
| `AuthContext` | `useAuth()` | `contexts/AuthContext.tsx` (mounted: `app/_layout.tsx:127`) | `session`, `user`, `isLoading`, `authInProgress`, `authError`, `signInWithGoogle`, `retryGoogleLogin`, `signOut`, `clearAuthError`, `getRecentAuthLogs` | Everywhere — virtually every screen and hook |
| `PreferencesContext` | `usePreferences()` | `contexts/PreferencesContext.tsx` (mounted: `app/_layout.tsx`) | `themeMode`, `effectiveTheme`, `curimbaEnabled`, `curimbaOnboardingDismissed`, `terreirosAdmin`, `startPagePreference`, `isReady`, `bootstrapStartPage`, `applyTerreiroPatch`, `fetchTerreirosQueAdministro`, `clearStartPageSnapshotOnly` | `ThemeSection`, `CurimbaSection`, all screens (effectiveTheme), root layout (boot) |
| `InviteGatesContext` | `useInviteGates()` | `contexts/InviteGatesContext.tsx` (mounted: `app/_layout.tsx:135`) | `terreiroGateActive`, `setTerreiroGateActive`, `terreiroSnoozeVersion`, `bumpTerreiroSnoozeVersion` | `InviteGate` (writes), `CuratorInviteGate` (reads to yield priority) |
| `LoginPromptContext` | `useLoginPrompt()` | `src/contexts/LoginPromptContext.tsx` (mounted: `app/_layout.tsx:136`) | `isOpen`, `reason`, `requireAuth(action, {reason})`, `openLoginSheet({reason})`, `closeLoginSheet` | Home, Terreiros, Collection, JoinTerreiroButton, Player |
| `PreferencesOverlayContext` | `usePreferencesOverlay()` | `src/contexts/PreferencesOverlayContext.tsx` (mounted: `app/_layout.tsx`) | `isOpen`, `openPreferences()`, `closePreferences()` | `PreferencesModal`, `TabsHeaderWithPreferences` |
| `CuratorModeContext` | `useCuratorMode()` | `contexts/CuratorModeContext.tsx` (mounted: `app/_layout.tsx`) | `curatorModeEnabled`, `isLoading`, `isSaving`, `setCuratorModeEnabled(next)` | `Home`, `PlayerScreen`, `TabsHeaderWithPreferences`, `Preferences/ProfileSection` |
| `RootPagerContext` | `useRootPager()` / `useRootPagerOptional()` / `useIsRootPagerTabActive()` | `contexts/RootPagerContext.tsx` (mounted: `app/_layout.tsx:132`) | `index`, `setIndex`, `activeKey`, `setActiveKey`, `routes`, `isBottomSheetOpen`, `setIsBottomSheetOpen` | `(app)/_layout.tsx`, `(tabs)/_layout.tsx`, `AppTabSwipeOverlay`, `BottomSheet`, `Home`, `LibraryPlayerAddToCollectionModal` |
| `TabControllerContext` | `useTabController()` | `contexts/TabControllerContext.tsx` (mounted: `(app)/_layout.tsx:156`) | `goToTab(tab)`, `registerGoToTab(fn\|null)` | `(tabs)/_layout.tsx` (registers), `AndroidBackBehavior`, `AppTabSwipeOverlay`, `PlayerScreen` |
| `GestureBlockContext` | `useGestureBlock()` | `contexts/GestureBlockContext.tsx` (mounted: `(app)/_layout.tsx:155`) | `markSwipeRecognized()`, `shouldBlockPress()` (150ms window) | `AppTabSwipeOverlay`, `Home`, `TerreiroBiblioteca`, `Collection`, `TerreiroCollectionsEdit`, `CollectionEdit` |
| `GestureGateContext` | `useGestureGate()` | `contexts/GestureGateContext.tsx` (mounted: `(app)/_layout.tsx:154`) | `isTabSwiping`, `markSwipeStart()`, `markSwipeEnd()`, `shouldBlockPress()` | `AppTabSwipeOverlay`, `Terreiros` |
| `ToastContext` | `useToast()` | `contexts/ToastContext.tsx` (mounted: `app/_layout.tsx:133`) | `showToast(msg, opts) → id`, `dismissToast(id)`, `clearToasts()`; renders `ToastStack` internally | All screens and mutation hooks |
| `GlobalSafeAreaInsetsContext` | `useGlobalSafeAreaInsets()` | `src/contexts/GlobalSafeAreaInsetsContext.tsx` (mounted: `app/_layout.tsx:130`) | `EdgeInsets` from `react-native-safe-area-context` | `SaravafyScreen`, `SaravafyStackScene`, `ToastStack`, many screens |
| `NetworkContext` | `useNetwork()` | `src/contexts/NetworkContext.tsx` (mounted: `app/_layout.tsx:129`) | `isConnected: boolean`, `isInternetReachable: boolean\|null` | `useOfflineAutoSync`, `TerreiroBiblioteca` (background sync gate) |
| `SaravafyLayoutMetricsContext` | `useSaravafyLayoutMetrics()` | `src/contexts/SaravafyLayoutMetricsContext.tsx` (mounted: `(app)/_layout.tsx:158`) | `headerHeight`, `setHeaderHeight(v)` | `SaravafyStackScene` |

**Notes:**
- All contexts except `TabControllerContext`, `GestureBlockContext`, `GestureGateContext`, and `SaravafyLayoutMetricsContext` are provided at the root `app/_layout.tsx` level. The four exceptions are provided at the `(app)/_layout.tsx` level (authenticated only).
- No slice other than foundation provides any context; all contexts are consumed across slices.

---

## 3. Query Key Registry

Every React Query key pattern from `queryKeys.ts`, cross-referenced with slice docs.

| Key pattern (as array) | Factory call | Slice | Primary table / source | `staleTime` | Key consumers |
|---|---|---|---|---|---|
| `["terreiroMembersCount", terreiroId]` | `queryKeys.terreiroMembersCount(terreiroId)` | terreiros / access-manager | RPC `get_terreiro_members_count` | 60 000 ms | `TerreiroBiblioteca` (inline `useQuery`), `fetchTerreiroMembersCount` |
| `["terreiroMembersList", terreiroId, visibilityTier]` | `queryKeys.terreiroMembersList({...})` | access-manager | RPC `get_terreiro_members_for_*` | 60 000 ms | (unconfirmed — non-infinite variant; see `terreiroMembersListInfinite` below) |
| `["terreiroMembersListInfinite", terreiroId, visibilityTier]` | `queryKeys.terreiroMembersListInfinite({...})` | access-manager | RPCs `get_terreiro_members_public/for_members/for_admins` | 60 000 ms | `TerreiroMembersList` (`useInfiniteQuery`) |
| `["terreiro", terreiroId, "members"]` | `queryKeys.terreiro.members(terreiroId)` | terreiros / access-manager | `terreiro_members` | 15 000 ms | `useTerreiroMembers`, `AccessManager`, `TerreiroMembers` |
| `["terreiro", terreiroId, "membersCount"]` | `queryKeys.terreiro.membersCount(terreiroId)` | terreiros | (declared in registry; usage unconfirmed) | — | (unconfirmed) |
| `["terreiro", terreiroId, "invites"]` | `queryKeys.terreiro.invites(terreiroId)` | terreiros / access-manager | `terreiro_invites` | 15 000 ms | `useTerreiroInvites`, `AccessManager`, `TerreiroMembers` |
| `["terreiro", terreiroId, "membershipRequests"]` | `queryKeys.terreiro.membershipRequests(terreiroId)` | terreiros / access-manager | `terreiro_membership_requests` | 15 000 ms | `usePendingTerreiroMembershipRequests`, `TerreiroMembers` |
| `["preferences", "terreiros", userId]` | `queryKeys.preferences.terreiros(userId)` *(also aliased as `queryKeys.me.terreirosWithRole`)* | preferences / terreiros | `terreiro_members` + `terreiros` join | 60 000 ms | `TerreirosSection`, `terreirosCache.patchTerreiroInLists`, `useTerreiroInviteDecision` |
| `["me", "profile", userId]` | `queryKeys.me.profile(userId)` | preferences / curator-review | `profiles.curator_mode_enabled` | 60 000 ms | `CuratorModeContext` (stores a boolean here — see Known issues §6.4) |
| `["me", "membership", userId]` | `queryKeys.me.membership(userId)` | terreiros / access-manager | `terreiro_members` (user's full membership list) | 60 000 ms | `useTerreiroMembershipStatus`, all screens checking role/isActiveMember |
| `["me", "terreiros", userId]` | `queryKeys.me.terreiros(userId)` | auth | `terreiro_members` (`active` rows) | 60 000 ms | `useMyTerreiroIdsQuery` (invite gate, realtime scope filter) |
| `["me", "terreiroAccessIds", userId]` | `queryKeys.me.terreiroAccessIds(userId)` | auth | `terreiro_members` (admin/curimba/editor/member, active) | 60 000 ms | `prefetchMyTerreiroAccessIds`, `TerreirosRealtimeSync` filter |
| `["me", "editableTerreiros", userId]` | `queryKeys.me.editableTerreiros(userId)` | auth / terreiros | `terreiro_members` + `terreiros` join (admin/curimba/editor only) | 60 000 ms | `prefetchMyEditableTerreiros`, `useMyEditableTerreirosQuery` |
| `["me", "permissions", userId]` | `queryKeys.me.permissions(userId)` | terreiros | (unconfirmed — declared but fetch source not detailed in slice docs) | — | Invalidated by membership changes; exact consumer unconfirmed |
| `["pontos", "feed", userId]` | `queryKeys.pontos.feed(userId)` | pontos | `pontos` + `ponto_versoes!inner` | 5 min | **No live consumer** — `prefetchHomeFeedPontos` warms it at boot; `useHomeFeedPontos` declared but never called |
| `["pontos", "customTags", terreiroId, pontoIdsHash]` | `queryKeys.pontos.customTagsByTerreiro({terreiroId, pontoIdsHash})` | entidades-tags | `terreiro_ponto_custom_tags` | 60 000 ms | `PlayerScreen`, `Collection` |
| `["pontos", { scope: "terreiro", terreiroId }]` | `queryKeys.pontos.terreiro(terreiroId)` | terreiros | `pontos` (terreiro-scoped) | — | Invalidated by `useRealtimeTerreiroScope` on pontos INSERT |
| `["terreiros", "explore", "initial"]` | `queryKeys.terreiros.exploreInitial()` | terreiros | `terreiros` (id, title, cover_image_url) | 5 min | **No live consumer** — `prefetchExploreTerreiros` warms at boot; `useExploreTerreiros` declared but never called |
| `["terreiros", "withRole", userId]` | `queryKeys.terreiros.withRole(userId)` | terreiros | `terreiros` + `terreiro_members` embed + `terreiros_contatos` + `terreiros_responsaveis` | 30 000 ms | `Terreiros` screen (`useTerreirosWithRoleQuery`) |
| `["terreiros", "byId", terreiroId]` | `queryKeys.terreiros.byId(terreiroId)` | terreiros | `terreiros` (single row) | — | Invalidated on delete; exact consumer unconfirmed |
| `["terreiros", "editableByUser", userId]` | `queryKeys.terreiros.editableByUser(userId)` | collections | `terreiro_members` | 5 min | `useEditableTerreiroIds` (feeds `useEditableCollections`) |
| `["terreiros", "collectionsByTerreiro", terreiroId]` | `queryKeys.terreiros.collectionsByTerreiro(terreiroId)` | terreiros / collections / offline-sync | `collections` + `collections_pontos` count; offline fallback: AsyncStorage package | 60 000 ms | `TerreiroBiblioteca`, `TerreiroCollectionsEdit`, offline sync orchestration |
| `["collections", "accountable", userId]` | `queryKeys.collections.accountable(userId)` | collections | `collections` (RLS-filtered, all visible) | 10 min | `LibraryPlayerAddToCollectionModal`, optimistic patches from add-to-collection mutations |
| `["collections", "editableByUser", userId, terreiroIdsHash]` | `queryKeys.collections.editableByUser({userId, terreiroIdsHash})` | collections | `collections` + `terreiro_members` | 5 min | `LibraryPlayerAddToCollectionModal`, `HomeAddToCollectionWizard` |
| `["collections", "editableByUser", userId]` *(prefix)* | `queryKeys.collections.editableByUserPrefix(userId)` | collections | — (prefix for invalidation only) | — | Used as `invalidateQueries` prefix; not a standalone fetch key |
| `["collections", "available", userId, terreiroId\|null]` | `queryKeys.collections.available({userId, terreiroId})` | collections | **Deprecated** — compatibility alias | — | Invalidated by `useRealtimeTerreiroScope`; no known live fetch consumer |
| `["collections", { scope: "terreiro", terreiroId }]` | `queryKeys.collections.terreiro(terreiroId)` | terreiros | **Deprecated** — compatibility alias | — | Invalidated by `useRealtimeTerreiroScope` |
| `["collection", { id }]` | `queryKeys.collections.byId(id)` | collections | `collections` (single row; note: uses `"collection"` not `"collections"` as first element) | — | Invalidated after add/edit/delete; direct fetch bypasses React Query in `Collection` screen |
| `["collections", "pontos", collectionId]` | `queryKeys.collections.pontos(collectionId)` | collections / player-audio / offline-sync | `collections_pontos` + `pontos` + `ponto_versoes` + `entidades`; offline: AsyncStorage package | 3 min | `useCollectionPontosQuery`, `PlayerScreen`, `CollectionEdit`, `AddToCollection` |
| `["entidades", "catalog"]` | `queryKeys.entidades.catalog()` | entidades-tags | `entidades` (global, `is_active=true`, paginated 1000/page) | 10 min | `AddToCollection`, `HomeAddToCollectionWizard`, `PlayerScreen` (lazy) |
| `["globalRoles", "curator", userId]` | `queryKeys.globalRoles.isCurator(userId)` | curator-review / access-manager | `curators` table (presence check) | 0 (always fresh) | `useIsCurator`, gated by `refetchOnMount: "always"` |
| `["curatorInvites", "pendingForInvitee", normalizedEmail]` | `queryKeys.curatorInvites.pendingForInvitee(normalizedEmail)` | curator-review | `curator_invites` | 0 | `CuratorInviteGate` |
| `["terreiroInvites", "pendingForInvitee", normalizedEmail]` | `queryKeys.terreiroInvites.pendingForInvitee(normalizedEmail)` | terreiros / preferences | `terreiro_invites` + `terreiros(title)` | 0 (always fresh) | `usePendingTerreiroInvitesForInviteeQuery`, `TerreirosSection` (Preferences), `useTerreiroInviteDecision` |
| `["pontosSubmissions", "pending"]` | `queryKeys.pontosSubmissions.pending()` | curator-review | `pontos_submissions` (`status='pending'`) + `pontos(title)` | 0 | `ReviewQueueScreen` |
| `["pontosSubmissions", "byId", submissionId]` | `queryKeys.pontosSubmissions.byId(submissionId)` | curator-review | `pontos_submissions` (single row) | 0 | `ReviewSubmissionScreen` |
| `["pontosSubmissions", "approvedAudio", pontoId]` | `queryKeys.pontosSubmissions.approvedAudioByPontoId(pontoId)` | pontos / player-audio | `pontos_submissions` (kind=audio_upload, status approved\|pending) | 30 000 ms | `useApprovedPontoAudioSubmission` (when no versaoId), `PlayerScreen` |
| `["pontosSubmissions", "approvedAudio", pontoId, pontoVersaoId]` | `queryKeys.pontosSubmissions.approvedAudioByPontoAndVersao(pontoId, pontoVersaoId)` | pontos / player-audio | `ponto_audios` (is_active, versao) + `pontos_submissions` (pending) | 30 000 ms | `useApprovedPontoAudioSubmission` (with versaoId), `PlayerScreen` |
| `["offline", "terreiroPackage", terreiroId]` | `queryKeys.offline.terreiroPackage(terreiroId)` | offline-sync | AsyncStorage (`@saravafy:offline:terreiro:<id>`) | 0 | `TerreiroOfflineSheet` |
| `["offline", "allPackages"]` | `queryKeys.offline.allPackages()` | offline-sync | AsyncStorage index | 0 | `OfflineDownloadsSection`, `useOfflineAutoSync` |
| `["pontoAudios", "byPontoId", pontoId]` | `queryKeys.pontoAudios.byPontoId(pontoId)` | pontos / player-audio | `ponto_audios` (is_active, uploaded) | — | `usePontoAudios`, invalidated after audio upload |
| `["pontoAudios", "hasAnyUploadedByPontoId", pontoId]` | `queryKeys.pontoAudios.hasAnyUploadedByPontoId(pontoId)` | pontos / player-audio | `ponto_audios` (is_active, uploaded) | — | `useHasAnyUploadedPontoAudio`, invalidated after audio upload |
| `["pontoAudios", "byPontoIds", pontoIdsHash]` | `queryKeys.pontoAudios.byPontoIdsHash(pontoIdsHash)` | pontos | `ponto_audios` (latest per ponto, uploaded) | 60 000 ms | `useLatestPontoAudioMetaByPontoIds` → `Home` card interpreter badge |

**Ad-hoc keys NOT in central registry (identified in slice docs):**

| Key pattern | Slice | Notes |
|---|---|---|
| `["pontoAudios", "metaById", pontoAudioId]` | pontos / player-audio / curator-review | Used by `usePontoAudioMetaById` and inline in `ReviewSubmission.tsx`; not in `queryKeys.pontoAudios.*`; invalidating `queryKeys.pontoAudios.byPontoId` will NOT refresh this key |
| `["pontos", "byId", pontoId]` | curator-review | Inline in `ReviewSubmission.tsx:442`; not in registry |
| `["pontos", "versoesBatch", "homeAddWizard", pontoId]` | collections | Used by `HomeAddToCollectionWizard`; not in registry; never invalidated by any mutation |
| `["pontos", "all", "public"]` | player-audio | Library mode in `PlayerScreen`; not in registry |
| `["terreiroMembershipRequest", userId, terreiroId]` | terreiros / access-manager | Secondary key inside `useTerreiroMembershipStatus`; not in registry |

---

## 4. Supabase Surface — Full Table Inventory

Every Supabase table touched by any slice, with read/write indicators, associated RPCs, realtime channels, and storage buckets.

| Table | Slices that read | Slices that write | Key RPCs | Realtime | Storage bucket |
|---|---|---|---|---|---|
| `pontos` | pontos, player-audio, collections, curator-review, entidades-tags | pontos (curator direct UPDATE) | `search_pontos`, `delete_terreiro` (cascade, unconfirmed) | INSERT via `rt:pontos:<terreiroId>` (terreiros realtime) | — |
| `ponto_versoes` | pontos, player-audio, collections, curator-review | pontos (curator direct UPDATE `lyrics`) | — | — | — |
| `pontos_submissions` | pontos, player-audio, curator-review | pontos (`createPontoSubmission`, `submitPontoCorrection` direct INSERT) | `approve_ponto_submission`, `approve_ponto_correction_submission`, `approve_variation_submission`, `approve_audio_upload_submission`, `reject_ponto_submission`, `reject_audio_upload_submission`, `finalize_ponto_audio_and_create_submission` | — | — |
| `ponto_audios` | pontos, player-audio, offline-sync, curator-review | pontos (edge fn `ponto-audio-complete-upload`); player-audio (`tryPersistPontoAudioDurationMs` UPDATE `duration_ms`); curator-review (direct UPDATE `duration_ms` before approve) | — | — | `ponto-audios` (signed PUT upload) |
| `entidades` | pontos, entidades-tags, collections, player-audio | — (read-only from client) | — | — | — |
| `entidade_aliases` | — | — | — | — | — (table exists; never queried from client) |
| `terreiros` | terreiros, access-manager, offline-sync, auth (via me.ts joins) | terreiros (`TerreiroEditor` INSERT on create, UPDATE on edit) | `delete_terreiro` | `postgres_changes *` on `terreiros` via `TerreirosRealtimeSync` (channel `terreiros-sync:<userId>`) | `terreiros-images` (cover WebP upload) |
| `terreiros_contatos` | terreiros | terreiros (`upsertPrimaryContato` UPSERT) | — | `postgres_changes *` on `terreiros_contatos` via `TerreirosRealtimeSync` | — |
| `terreiros_responsaveis` | terreiros | — | — | — | — |
| `terreiro_members` | terreiros, access-manager, auth, preferences, collections (via `editableTerreiroIds`) | terreiros (INSERT admin row on create, UPSERT `upsertTerreiroMemberActive`, DELETE `useRemoveTerreiroMember`); preferences (UPDATE `role` to demote, DELETE to leave) | `approve_terreiro_membership_request`, `reject_terreiro_membership_request` (write side-effect) | `rt:terreiro_members:<terreiroId>` (scoped, in `useRealtimeTerreiroScope`); `preferences-terreiros:{userId}` (per-user, in `usePreferencesTerreirosRealtime`) | — |
| `terreiro_invites` | terreiros, access-manager, auth, preferences | terreiros (INSERT invite, DELETE cancel, UPDATE `updated_at` resend-stub); auth (READ in `InviteGate`) | `accept_terreiro_invite`, `reject_terreiro_invite` | `invite-gate:terreiro_invites` INSERT-only (in `InviteGate`); INSERT+UPDATE in `CuratorInviteGate` (which watches `curator_invites`, not this table) | — |
| `terreiro_membership_requests` | terreiros, access-manager | terreiros (INSERT pending via `useCreateTerreiroMembershipRequest`) | `approve_terreiro_membership_request`, `reject_terreiro_membership_request` | — | — |
| `terreiro_ponto_custom_tags` | terreiros, entidades-tags | entidades-tags (INSERT add, DELETE remove) | — | — | — |
| `collections` | terreiros, collections, offline-sync | terreiros (INSERT `createCollectionMutation`; UPDATE title; DELETE via RPC); collections (INSERT create, UPDATE title/desc, DELETE delete) | `delete_collection`, `delete_terreiro` (cascade) | `rt:collections:<terreiroId>` (all events, in `useRealtimeTerreiroScope`) | — |
| `collections_pontos` | terreiros, collections, player-audio, entidades-tags, offline-sync | collections (INSERT/UPSERT add ponto, UPSERT reorder, DELETE remove); entidades-tags (UPDATE `entidade_id/texto/orixa_id`) | — | `rt:collections_pontos:<terreiroId>` (all events, in `useRealtimeTerreiroScope`) | — |
| `profiles` | preferences, curator-review, access-manager (via `resolveProfiles`) | preferences (UPSERT `primary_terreiro_id`, UPDATE `curator_mode_enabled`) | — | `preferences-terreiros:{userId}` watches `terreiro_members`, not this table | — |
| `curators` | curator-review, access-manager (via `useIsCurator`) | — (read-only from client; written server-side via `accept_curator_invite`) | — | — | — |
| `curator_invites` | curator-review | — (written server-side; client only reads) | `accept_curator_invite`, `reject_curator_invite` | `invite-gate:curator_invites` INSERT+UPDATE (in `CuratorInviteGate`) | — |
| `auth_login_attempts` | — | auth (`authLogger.ts` INSERT-only telemetry) | — | — | — |
| `public_app_config` | preferences / foundation (remote config, `app_install_url`) | — | — | — | — |

**Storage buckets:**

| Bucket | Slice | Operations |
|---|---|---|
| `ponto-audios` | pontos / player-audio | Signed PUT upload (via `ponto-audio-init-upload` edge fn); playback URL via `ponto-audio-playback-url` edge fn |
| `terreiros-images` | terreiros | WebP cover upload on create (`terreiros/<id>/<unique>.webp`) and edit (`terreiros/<id>/cover.webp`); recursive delete on `delete_terreiro` |

**Edge functions:**

| Function | Slice | Auth | Purpose |
|---|---|---|---|
| `ponto-audio-init-upload` | pontos / player-audio | Authed | Returns `ponto_audio_id`, `upload_token`, signed PUT URL |
| `ponto-audio-complete-upload` | pontos / player-audio | Authed | Marks `ponto_audios.upload_status='uploaded'`; sets `size_bytes`, `duration_ms`, `content_etag`, `sha256`; 409 with `retryable` flag on conflict |
| `ponto-audio-playback-url` | pontos / player-audio | Public (no Auth header) for approved; Authed for review | Returns signed playback URL with `expires_in_seconds` |

---

## 5. Cross-Slice Mutation Dependencies

Which mutations in one slice invalidate query keys owned by another slice.

| Mutation (slice) | Invalidates keys owned by other slices | Details |
|---|---|---|
| **Auth: `acceptInvite` (InviteGate)** | terreiros (`me.terreiros`, `me.terreiroAccessIds`, `me.editableTerreiros`, `terreiros.editableByUser`), collections (`collections.accountable`, `collections.editableByUserPrefix`), preferences (`me.membership`, `me.permissions`) | Broadest invalidation surface in the app |
| **Auth: `rejectInvite` (InviteGate)** | terreiros (`me.membership`, `me.terreiros`, `me.terreiroAccessIds`, `me.editableTerreiros`, `me.permissions`, `terreiros.editableByUser`), collections (`collections.editableByUserPrefix`) | Same minus `collections.accountable` |
| **Terreiros: Create terreiro (`TerreiroEditor`)** | preferences (`queryKeys.preferences.terreiros(userId)`) | `patchTerreiroInLists` + `invalidateTerreiroListsForRoles` both touch preferences cache |
| **Terreiros: Update terreiro (`TerreiroEditor`)** | preferences (`queryKeys.preferences.terreiros(userId)`) | `patchTerreiroInLists` + `invalidateTerreiroListsForRoles` |
| **Terreiros: Delete terreiro (`TerreiroEditor`)** | preferences (`preferences.terreiros`), collections (`terreiros.collectionsByTerreiro`, `collections.pontos` for terreiro's collections) | `removeTerreiroFromLists` patches all three caches |
| **Terreiros: Accept terreiro invite (`useTerreiroInviteDecision`)** | preferences (`preferences.terreiros`), auth / terreiros (`me.membership`, `me.terreiros`, `me.terreiroAccessIds`, `me.editableTerreiros`, `me.permissions`, `terreiros.editableByUser`), collections (`collections.accountable`, `collections.editableByUserPrefix`) | Also patches `preferences.terreiros` directly (pushes terreiro row with role + member_kind) |
| **Terreiros: Reject terreiro invite (`useTerreiroInviteDecision`)** | Same as accept minus `collections.accountable` | |
| **Terreiros: Remove member (`useRemoveTerreiroMember`) — called from AccessManager** | auth (`me.membership`), terreiros (`terreiros.withRole`) | `AccessManager.handleRemoveMember` additionally invalidates these cross-slice keys after removal |
| **Terreiros: Leave role / leave terreiro (Preferences)** | auth / terreiros (`me.membership`, `me.editableTerreiros`, `me.permissions`, `terreiros.editableByUser`), collections (`collections.editableByUserPrefix`) | Preferences slice invalidates terreiros and collections caches |
| **Terreiros: `TerreirosRealtimeSync` (INSERT/UPDATE on `terreiros`/`terreiros_contatos`)** | preferences (`preferences.terreiros` via `invalidateTerreiroListsForRoles`) | Global realtime component invalidates Preferences cache |
| **Terreiros: `useRealtimeTerreiroScope` (members channel)** | auth (`me.membership`, `me.terreiros`, `me.permissions`) | Realtime membership change invalidates auth-owned keys |
| **Terreiros: `useRealtimeTerreiroScope` (collections channel)** | collections (`terreiros.collectionsByTerreiro`, `collections.accountable`, `collections.editableByUserPrefix`, deprecated `collections.available`) | Realtime collection changes invalidate collections cache |
| **Terreiros: `useRealtimeTerreiroScope` (collections_pontos channel)** | collections (`collections.byId`, `collections.pontos`) | |
| **Collections: Add ponto to collection (`addToCollectionMutation`)** | terreiros (`terreiros.collectionsByTerreiro` prefix) | `incrementCollectionPontosCountInTerreiroLists` patches terreiros-owned cache |
| **Collections: Edit ponto order / remove pontos (`saveCollectionPontosDraft`)** | terreiros (`terreiros.collectionsByTerreiro` prefix) | Count delta adjustment |
| **Collections: Delete collection** | terreiros (`terreiros.collectionsByTerreiro`) | `invalidateQueries` on collectionsByTerreiro |
| **Pontos: Edit ponto direct UPDATE (`PontoUpsertModal` curator mode)** | player-audio (`["pontos","all","public"]` cache via `patchPontoById`) | `patchPontoById` in `useCollectionPlayerData` also writes `collections.pontos(collectionId)`; no formal `invalidateQueries` call |
| **Pontos: Audio upload complete (`PlayerAudioUpload`)** | curator-review (`pontosSubmissions.pending`) | Invalidated on upload done |
| **Curator-review: Approve new submission** | pontos (`["pontos"]` prefix) | `invalidateQueries({ queryKey: ["pontos"] })` — broad prefix invalidation |
| **Curator-review: Approve correction** | pontos (`["pontos"]`), collections (`["collections","pontos"]`) | Lyrics may have changed; collection pontos cache stale |
| **Curator-review: Approve audio upload** | pontos (`pontosSubmissions.pending`, `pontosSubmissions.byId`, `pontosSubmissions.approvedAudioByPontoId`, `pontoAudios.byPontoId`, `pontoAudios.hasAnyUploadedByPontoId`, `["pontos"]`), player-audio (`["pontoAudios","metaById",pontoAudioId]`) | Widest invalidation set in curator-review |
| **Preferences: `usePreferencesTerreirosRealtime`** | auth / terreiros (`me.membership`, `me.editableTerreiros`, `me.permissions`, `terreiros.withRole`, `terreiros.editableByUser`), collections (`collections.editableByUserPrefix`) | Realtime `terreiro_members` channel in Preferences triggers cross-slice invalidations |
| **Access-manager: Role toggle (`AccessManager.handleToggleRole`)** | auth (`me.membership`), terreiros (`terreiros.withRole`) | Direct imperative Supabase call; no `useMutation` wrapper |

---

## 6. Known Cross-Cutting Issues

### 6.1 Dead query pattern (two instances)

Both `useHomeFeedPontos` (pontos slice, `src/queries/pontosFeed.ts`) and `useExploreTerreiros` (terreiros slice, `src/queries/terreirosExplore.ts`) are prefetched at boot but have **no live consumer hooks**. The Home screen uses its own `fetchAllPontos()` with local `useState`, and the Terreiros tab uses `useTerreirosWithRoleQuery`. The boot prefetch warms cache that no screen ever reads — wasted network + memory.

### 6.2 Ad-hoc query keys outside central registry

Four keys confirmed in code but absent from `queryKeys.ts`:

- `["pontoAudios", "metaById", pontoAudioId]` — used in `pontoAudio.ts`, `ReviewSubmission.tsx`, `AudioPlayerFooter`. Invalidating `queryKeys.pontoAudios.byPontoId` will NOT refresh this key. Three separate slices reference it by literal string.
- `["pontos", "byId", pontoId]` — inline in `ReviewSubmission.tsx`.
- `["pontos", "versoesBatch", "homeAddWizard", pontoId]` — inline in `HomeAddToCollectionWizard`; never invalidated by any mutation.
- `["pontos", "all", "public"]` — library mode in `PlayerScreen`.

### 6.3 Three-namespace key fragmentation in terreiros

The terreiro domain splits across three key namespaces in `queryKeys.ts`: `queryKeys.terreiro.*` (per-terreiro member/invite data), `queryKeys.terreiros.*` (per-list/per-id), and flat top-level keys `terreiroMembersCount` / `terreiroMembersList` / `terreiroMembersListInfinite`. The flat top-level keys are inconsistent with the hierarchical registry pattern and do not participate in the user-scoped logout eviction predicate (`q.queryKey.includes(prevUserId)` in `app/_layout.tsx:206`). A user-specific terreiro members count query will survive logout because its key is `["terreiroMembersCount", terreiroId]` — no `userId` in the array.

### 6.4 `queryKeys.me.profile(userId)` key collision risk

`CuratorModeContext` writes a `boolean` under `queryKeys.me.profile(userId)` (`["me","profile",userId]`). If any other code stores a profile object under the same key, the two queries will silently clobber each other. The key name implies a profile object but the value stored is a boolean.

### 6.5 Schema-tolerance noise duplicated across every slice

The pattern of retrying a Supabase query with fewer columns when `isColumnMissingError` is detected is independently reimplemented in:
- `src/queries/me.ts` (auth)
- `src/hooks/terreiroMembership.ts` (terreiros) — up to 3-iteration loop for `status`/`member_kind`
- `src/queries/terreirosWithRole.ts` (terreiros)
- `src/queries/pendingTerreiroInvites.ts` (terreiros)
- `src/screens/Home/data/ponto.ts` / `pontosFeed.ts` (pontos)
- `contexts/PreferencesContext.tsx` (preferences) — ~6 nested retry blocks
- `contexts/CuratorModeContext.tsx` (curator-review)
- `InviteGate.tsx` (auth)
- `Collection.tsx` and `terreirosCollections.ts` (collections) — `isColumnMissingError` defined 3+ times independently
- `getErrorMessage` defined identically in at least 5 files (collections slice)

No shared utility function exists for column-missing detection or retry. This is the most pervasive cross-cutting duplication in the codebase.

### 6.6 Inconsistent optimistic update patterns

Mutations follow three distinct patterns with no enforced contract:

| Pattern | Example | Missing steps |
|---|---|---|
| Full cache-contract (cancel → snapshot → optimistic → rollback → invalidate) | `addToCollectionMutation`, `useCreateTerreiroInvite`, `useRemoveTerreiroMember` | — |
| No optimistic, no rollback | `createPontoSubmission`, `submitPontoCorrection`, `createCollectionMutation`, `TerreiroEditor.sendInvite` | `onMutate`, `onError` rollback |
| Direct imperative call (no `useMutation` at all) | `saveCollectionPontosDraft`, `saveNameDetails`, `deleteCollection`, `AccessManager.handleToggleRole`, `AddMediumTagSheet.submit`, `RemoveMediumTagSheet.remove` | Full React Query lifecycle |

The medium tag mutations (`AddMediumTagSheet` / `RemoveMediumTagSheet`) do optimistic patching via `queryClient.setQueriesData` but take no snapshot — so a network error leaves the UI in the patched state with no rollback until the 60s stale timer fires.

### 6.7 `useResendTerreiroInvite` is a confirmed no-op stub

Both terreiros and access-manager slice docs confirm `useResendTerreiroInvite` only UPDATEs `terreiro_invites.updated_at`. No RPC, no edge function, no database trigger is confirmed to fire on this change from the client. The Terreiros screen toasts "Convite reenviado" regardless.

### 6.8 Edit ponto bypasses React Query entirely

`PontoUpsertModal` curator edit issues two direct `UPDATE`s on `pontos` and `ponto_versoes` and then calls the parent screen's `setPontos(prev => ...)` on its local `useState`. There is no invalidation of:
- `queryKeys.pontos.feed(userId)` (warmed at boot)
- `queryKeys.collections.pontos(collectionId)` for any collection containing this ponto
- `["pontos", "all", "public"]` (player library mode)

`useCollectionPlayerData.patchPontoById` partially compensates by writing to `["collections","pontos",collectionId]` and `["pontos","all","public"]` in-place, but only when the edit was triggered from the player — not from the Home screen.

### 6.9 Deprecated keys still actively used

Two deprecated keys in `queryKeys.ts` remain live:
- `queryKeys.me.terreirosWithRole` (alias to `queryKeys.preferences.terreiros`) — `useTerreiroInviteDecision` still explicitly invalidates it.
- `queryKeys.collections.available` — still invalidated by `useRealtimeTerreiroScope`'s collections channel.

### 6.10 Logout cache eviction blind spot

Foundation's logout cleanup (`app/_layout.tsx:206`) evicts queries with `q.queryKey.includes(prevUserId)`. The following keys will **not** be evicted on logout because they do not include `userId` in their key arrays:
- `["terreiroMembersCount", terreiroId]`
- `["terreiroMembersListInfinite", terreiroId, visibilityTier]`
- `["terreiro", terreiroId, "members" | "invites" | "membershipRequests"]`
- `["pontosSubmissions", ...]` (not user-keyed)

The terreiro-member-related keys could expose one user's membership data to a subsequent user on the same device if the staleTime hasn't expired.

### 6.11 `approved_ponto_id` read-back in submission flow

`PontoUpsertModal` reads `approved_ponto_id` from `pontos_submissions` immediately after inserting a new submission (to chain an audio upload). `approved_ponto_id` is only set by the curator's approve RPC — not at INSERT time. This means the audio upload chaining branch is always a dead path in the current schema, and every new-ponto submission with audio falls through to the "ID do ponto indisponível" error toast. The submission itself succeeds; only the audio is lost.

### 6.12 Two overlapping Preferences UI implementations

`TabsHeaderWithPreferences` (overlay sheet driven by `PreferencesOverlayContext`) and `Preferences.tsx` (stack route at `/(app)/preferences`) are parallel implementations of the same UI. Both maintain their own component trees for theme, curimba, terreiro list, and invite handling. Changes to one do not automatically propagate to the other. `TabsHeaderWithPreferences` additionally contains a hardcoded `"YB"` initial fallback.

### 6.13 ~~`fetchTerreirosQueAdministro` in PreferencesContext is dead code~~ — ✅ RESOLVED, and the original finding was wrong

> **CORRECTION (2026-08-08).** The original finding below claimed the function had *no active
> consumer*. That was incorrect — it only checked the Preferences screen. Spec 2b implementation
> found **three** live consumers: `InviteGate.tsx` (line 196), `TabsHeaderWithPreferences.tsx`
> (line 649), and `TerreiroEditor.tsx` (lines 633, 940, 969, 1415, 1539).
>
> All three were migrated to `useMyManagedTerreirosQuery` + `queryClient.invalidateQueries`, and
> the function was removed from the context (−491 LOC). See
> [Spec 2b](../superpowers/specs/2026-06-14-spec-2b-preferences-context-rq.md), landed 2026-06-14.
>
> **Lesson:** "no consumer" claims must be backed by a repo-wide grep, not a single-screen read.
> A finding stated with more confidence than its evidence supports is worse than no finding.

**Original text:** `PreferencesContext` exposes `fetchTerreirosQueAdministro` and a `terreirosAdmin` state slice. The Preferences screen does not consume them — it uses `usePreferencesTerreirosQuery` (React Query) instead. The imperative fetch remains as exposed API but has no active consumer.

### 6.14 `PontoSubmissionKind` domain mismatch

`src/domain/ponto.ts` lists kind `"issue"`, but the curator-review slice uses `"problem"` in its `toKindLabel` mapping (`ReviewQueue.tsx:39-47`, `ReviewSubmission.tsx:186-194`). Either the domain type has a stale value or the UI copy is targeting a different string.

### 6.15 `fetchAllPontos` has no limit

`Home.tsx` uses `fetchAllPontos()` (local `useState`, no pagination) which returns the entire `pontos` catalog with `is_active AND !restricted AND canonical`. No upper bound. Acceptable for the current data size but an architectural risk as the catalog grows.

### 6.16 Offline `bytesEstimate` misleads users

`TerreiroOfflinePackageV1.bytesEstimate` measures the JSON byte length of the package metadata blob, not the size of downloaded audio files. Audio files (potentially tens of MB per terreiro) are excluded. The Preferences `OfflineDownloadsSection` displays this figure as "Tamanho" with no qualification.
