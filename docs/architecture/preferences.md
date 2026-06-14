# Preferences

> Status: generated 2026-06-12 from full read of source files. Verify before relying on as spec.

## Purpose

Provides a single, scrollable screen where the authenticated user manages all personal settings: appearance (theme), Curimba mode (screen-always-on + lyrics-only view), their terreiro memberships (with inline invite accept/reject), offline downloads, and account/logout actions. It also maintains a persistent `startPagePreference` that controls which terreiro the app opens to on launch, backed by both Supabase `profiles` and an AsyncStorage snapshot for offline resilience.

## Files

- **Routes (expo-router):** `app/(app)/preferences.tsx`
- **Screens:** `src/screens/Preferences/Preferences.tsx`
- **Screen components:**
  - `src/screens/Preferences/components/PreferencesHeader.tsx`
  - `src/screens/Preferences/components/ProfileSection.tsx`
  - `src/screens/Preferences/components/TerreirosSection.tsx`
  - `src/screens/Preferences/components/TerreiroActionsSheet.tsx`
  - `src/screens/Preferences/components/ThemeSection.tsx`
  - `src/screens/Preferences/components/CurimbaSection.tsx`
  - `src/screens/Preferences/components/OfflineDownloadsSection.tsx`
  - `src/screens/Preferences/components/LogoutSection.tsx`
  - `src/screens/Preferences/components/ConfirmModal.tsx`
  - `src/screens/Preferences/components/utils.ts`
  - `src/screens/Preferences/LoadingStatePreferences.tsx`
  - `src/screens/Preferences/prewarmPreferences.ts`
- **Components:** `src/components/overlays/PreferencesModal.tsx`, `src/components/TabsHeaderWithPreferences.tsx` (contains `PreferencesOverlaySheets`), `src/components/preferences/` (index, `PreferencesPageItem`, `PreferencesRadioGroup`, `PreferencesSection`, `PreferencesSwitchItem`), `src/components/CurimbaExplainerBottomSheet.tsx`
- **Contexts:**
  - `contexts/PreferencesContext.tsx` — primary state: theme, curimba, terreiros admin list, start-page preference
  - `src/contexts/PreferencesOverlayContext.tsx` — open/close state for the overlay (tabs-header sheet)
  - `contexts/CuratorModeContext.tsx` — curator mode toggle (gated to curators only)
- **Hooks:** `src/hooks/useIsCurator.ts`, `src/hooks/useIsDevMaster.ts`, `src/hooks/useTerreiroInviteDecision.ts`
- **Queries:**
  - `src/queries/me.ts` — `usePreferencesTerreirosQuery` / `prefetchPreferencesTerreiros`
  - `src/queries/preferencesTerreirosList.ts` — merges memberships + pending invites into a single list
  - `src/queries/preferencesTerreirosRealtime.ts` — Supabase realtime channel for `terreiro_members`
  - `src/queries/pendingTerreiroInvites.ts` — pending terreiro invite query + prefetch
  - `src/queries/queryKeys.ts` — `queryKeys.preferences.terreiros`, `queryKeys.me.*`, `queryKeys.offline.*`
- **Services / config:** `src/config/remoteConfig.ts` — `public_app_config` table; `app_install_url` key cached in AsyncStorage

## Routes

| Route | Screen | Params | Guard |
|---|---|---|---|
| `/(app)/preferences` | `Preferences` (via `PreferencesRoute`) | none | `(app)` layout (auth required) |

There is also an **overlay path**: `PreferencesModal` (a full-screen `<Modal>`) rendered inside `GlobalOverlaysHost` and driven by `PreferencesOverlayContext`. This overlay surfaces `PreferencesOverlaySheets` from `TabsHeaderWithPreferences` when triggered from the tabs header avatar/bell icon. It is **separate** from the stack route above and temporarily hides itself when `terreiro-editor` or `access-manager` routes are active.

## Navigation

- User enters the stack route by tapping the back-chevron-equipped header or a push from any screen that calls `router.push('/preferences')`.
- User enters the overlay sheet by tapping the avatar/preference icon in the shared tabs header.
- On exit from the stack route, `router.back()` is used.
- The overlay is closed via `closePreferences()` from `PreferencesOverlayContext`, or on Android hardware back press.
- **Nav cover:** A `LoadingStatePreferences` modal (`navCover`) hides the Preferences screen until both layout has occurred (`didLayoutRef`) and the prewarm promise resolves (`navCover.ready`). A hard 8-second failsafe clears the cover if something stalls.
- **From TerreirosSection:** tapping a terreiro card pushes `/(app)/terreiro?terreiroId=…&from=/preferences`.
- **From TerreiroActionsSheet:** admin can push `/terreiro-members`, `/access-manager`, or `/terreiro-editor`.
- **From ProfileSection (curator):** pushes `/review-submissions`.
- No deep links directly into the preferences screen are defined.

## Contexts consumed/provided

| Context | Provided here? | Consumed by | Key state shape |
|---|---|---|---|
| `PreferencesContext` | No — provided in root `_layout.tsx` | `ThemeSection`, `CurimbaSection`, `Preferences.tsx`, `TabsHeaderWithPreferences`, many screens | `themeMode`, `effectiveTheme`, `curimbaEnabled`, `curimbaOnboardingDismissed`, `terreirosAdmin`, `startPagePreference`, `isReady` |
| `PreferencesOverlayContext` | No — provided in root `_layout.tsx` | `PreferencesModal`, `TabsHeaderWithPreferences` | `isOpen`, `openPreferences()`, `closePreferences()` |
| `CuratorModeContext` | No — provided in root `_layout.tsx` | `ProfileSection`, curator-gated UI | `curatorModeEnabled`, `isSaving`, `setCuratorModeEnabled()` |
| `AuthContext` | No | `ProfileSection`, `TerreirosSection`, `LogoutSection`, `TerreiroActionsSheet` | `user`, `signOut()` |
| `ToastContext` | No | `LogoutSection`, `TerreiroActionsSheet` | `showToast()` |
| `GlobalSafeAreaInsetsContext` | No | `Preferences.tsx`, `PreferencesHeader` | `insets.top`, `insets.bottom` |

## Data flow (queries → screens)

### Preferences terreiros list

- **queryKey:** `["preferences", "terreiros", userId]`
- **table:** `terreiro_members` (roles: admin/curimba/member, status: active) + `terreiros` (id, title, cover_image_url) — two-step join
- **params:** `userId`
- **cache strategy:** `staleTime: 60_000`; prefetched via `prewarmPreferences` before the stack route is opened (fires `prefetchPreferencesTerreiros`); kept warm via `placeholderData: prev`
- **screens:** `TerreirosSection` (via `usePreferencesTerreirosListItems`)

### Pending terreiro invites

- **queryKey:** `["terreiroInvites", "pendingForInvitee", normalizedEmail]`
- **table:** `terreiro_invites` (status: pending, email: normalizedEmail) joined to `terreiros(title)`
- **params:** `normalizedEmail`
- **cache strategy:** `staleTime: 0` (always fresh); prefetched via `prewarmPreferences`
- **screens:** `TerreirosSection` (merged with memberships, invites shown first)

### Offline packages

- **queryKey:** `["offline", "allPackages"]`
- **source:** `listPackages()` from `src/offline/terreiroPackage.ts` (local AsyncStorage, not Supabase)
- **params:** none
- **cache strategy:** `staleTime: 0`
- **screens:** `OfflineDownloadsSection` — only renders if `packages.length > 0`

### Curator check (`useIsCurator`)

- **queryKey:** `["globalRoles", "curator", userId]`
- **table:** `curators` (select `user_id` where `user_id = userId`)
- **params:** `userId`
- **cache strategy:** `staleTime: 0`, `gcTime: 30_000`, `refetchOnMount: "always"`, `refetchOnWindowFocus: true`
- **screens:** `ProfileSection` — gates the curator mode toggle and "Revisar envios" button

### Curator mode preference

- **queryKey:** `["me", "profile", userId]`
- **table:** `profiles` (column: `curator_mode_enabled`)
- **params:** `userId`
- **cache strategy:** `staleTime: 60_000`
- **screens:** `ProfileSection` (via `useCuratorMode`)

### Start-page preference

- **source:** `profiles.primary_terreiro_id` (fetched imperatively in `bootstrapStartPage`, not via React Query)
- **persistence:** AsyncStorage key `@saravafy:startPageSnapshot` — used as offline fallback during cold start
- **screens:** consumed by root `_layout.tsx` at boot via `bootstrapStartPage(userId)`

### Remote config (`app_install_url`)

- **queryKey:** none — imperative, not React Query
- **table:** `public_app_config` (key: `app_install_url`)
- **cache strategy:** AsyncStorage key `remoteConfig:app_install_url`, TTL 6 hours; warmed once on app start via `warmRemoteConfig()`
- **screens:** not consumed directly by Preferences screen; used globally for share/install links

### Realtime sync (`usePreferencesTerreirosRealtime`)

- Subscribes to channel `preferences-terreiros:{userId}` on `terreiro_members` filtered by `user_id`
- On any change: optimistically updates `queryKeys.preferences.terreiros` and `queryKeys.me.membership` in-cache, then invalidates both plus `me.editableTerreiros`, `me.permissions`, `terreiros.withRole`, `terreiros.editableByUser`, `collections.editableByUserPrefix`
- Mounted in `TerreirosSection`

## Supabase surface

- **Tables read:**
  - `terreiro_members` — user's memberships (role, status, member_kind); queried with status=active + role filter
  - `terreiros` — title, cover_image_url (joined after fetching IDs from terreiro_members)
  - `terreiro_invites` — pending invites by email; joined to `terreiros(title)`
  - `profiles` — `primary_terreiro_id` (start page), `curator_mode_enabled` (curator mode)
  - `curators` — presence check for `useIsCurator`
  - `public_app_config` — remote config (key=`app_install_url`)
- **Tables written:**
  - `profiles` — upsert `primary_terreiro_id` (start-page preference), update `curator_mode_enabled`
  - `terreiro_members` — update `role` → "member" (leave role); delete row (leave terreiro as member)
- **RPCs called:**
  - `accept_terreiro_invite(invite_id)` — with param fallback to `p_invite_id` if PGRST202
  - `reject_terreiro_invite(invite_id)` — same fallback pattern
- **Realtime channels:**
  - `preferences-terreiros:{userId}` — subscribes to `postgres_changes` on `terreiro_members` filtered by `user_id`
- **Storage buckets:** none
- **Edge functions:** none

## Mutations

### `setThemeMode(mode)` — theme preference

- **Trigger:** user selects a radio option in `ThemeSection`
- **Write:** `AsyncStorage.setItem("@saravafy:themeMode", mode)` — local only, no Supabase write
- **Optimistic:** `setThemeModeState(mode)` fires synchronously before the AsyncStorage write
- **Rollback:** none (fire-and-forget; AsyncStorage errors are swallowed)
- **Invalidations:** none — `effectiveTheme` is derived from `(themeMode, systemScheme)` via `useMemo`; Android navigation bar button style synced in a debounced `useEffect` (100ms timeout)

### `setCurimbaEnabled(enabled)` — Curimba mode

- **Trigger:** toggle in `CurimbaSection`
- **Write:** `AsyncStorage.setItem("preferences.curimba_mode_enabled", String(enabled))`
- **Optimistic:** `setCurimbaEnabledState(enabled)` synchronous
- **Side-effects:** `activateKeepAwakeAsync("saravafy-curimba")` / `deactivateKeepAwake(...)` via `useEffect` on `curimbaEnabled`
- **Rollback:** none

### `setCurimbaOnboardingDismissed(dismissed)` — dismiss onboarding

- **Trigger:** user checks "Don't show again" in `CurimbaExplainerBottomSheet`
- **Write:** `AsyncStorage.setItem("preferences.curimba_explainer_dont_show_again", String(dismissed))`
- **Optimistic:** synchronous state update
- **Rollback:** none

### `setCuratorModeEnabled(next)` — curator mode toggle

- **Trigger:** toggle in `ProfileSection` (gated: only curators see it)
- **Optimistic:** `queryClient.setQueryData(["me", "profile", userId], next)` immediately
- **Write:** `supabase.from("profiles").update({ curator_mode_enabled: next }).eq("id", userId)`
- **Rollback:** on error, `queryClient.setQueryData(profileKey, prev)` + `showToast(message)`
- **Invalidations:** none (profile key updated in place)

### `setStartPageTerreiro(userId, terreiroId, terreiroTitle)` — set start page

- **Trigger:** imperative call from terreiro selection UI (in `TabsHeaderWithPreferences` overlay)
- **Optimistic:** `setStartPagePreference(next)` + `persistStartPageSnapshot(toSnapshot(next))` (AsyncStorage)
- **Write:** `supabase.from("profiles").upsert({ id: userId, primary_terreiro_id: terreiroId, updated_at: now })`
- **Rollback:** on error, restores previous `startPagePreference` and snapshot
- **Post-write:** background refetch from backend to confirm final state; merges `terreiroTitle` if IDs match

### `clearStartPagePreference(userId)` — clear start page

- **Trigger:** user clears terreiro start-page preference
- **Optimistic:** `setStartPagePreference(null)` + clears AsyncStorage snapshot
- **Write:** upserts `profiles` with `primary_terreiro_id: null`
- **Rollback:** restores previous preference on error
- **Post-write:** background refetch; clears snapshot if backend confirms null

### `confirmLeaveRole()` — demote admin/curimba to member

- **Trigger:** user confirms in `TerreiroActionsSheet`
- **Write:** `supabase.from("terreiro_members").update({ role: "member" }).eq("terreiro_id", t.id).eq("user_id", userId)`
- **Optimistic cache update:** `queryClient.setQueryData(queryKeys.me.membership(userId), …)` — updates role in place
- **Invalidations:** `preferences.terreiros`, `me.membership`, `me.editableTerreiros`, `me.permissions`, `terreiros.editableByUser`, `collections.editableByUserPrefix`
- **Error handling:** special-cases `cannot_remove_last_admin` RPC error with a distinct toast

### `confirmLeaveTerreiro()` — leave as member

- **Trigger:** user confirms in `TerreiroActionsSheet`
- **Write:** `supabase.from("terreiro_members").delete().eq("terreiro_id", t.id).eq("user_id", userId)`
- **Optimistic cache update:** removes terreiro from `queryKeys.me.membership` and `queryKeys.preferences.terreiros` immediately
- **Invalidations:** same set as `confirmLeaveRole` above
- **Error handling:** detects RLS/permission errors and surfaces an admin-action-required message

### `accept(invite)` — accept terreiro invite

- **Trigger:** "Aceitar" button in `TerreirosSection`
- **Write:** RPC `accept_terreiro_invite(invite_id)` with `p_invite_id` fallback
- **Optimistic:** removes invite from `queryKeys.terreiroInvites.pendingForInvitee`; adds terreiro placeholder to `queryKeys.preferences.terreiros`
- **Invalidations:** `terreiroInvites.pendingForInvitee`, `me.membership`, `me.terreiros`, `me.terreirosWithRole`, `me.terreiroAccessIds`, `me.editableTerreiros`, `me.permissions`, `terreiros.editableByUser`, `collections.accountable`, `collections.editableByUserPrefix`

### `reject(invite)` — reject terreiro invite

- **Trigger:** "Recusar" button in `TerreirosSection`
- **Write:** RPC `reject_terreiro_invite(invite_id)` with `p_invite_id` fallback
- **Optimistic:** removes invite from `queryKeys.terreiroInvites.pendingForInvitee`
- **Invalidations:** same as accept minus `collections.accountable`

### Offline package sync / remove (in `OfflineDownloadsSection`)

- **handleSync:** calls `syncTerreiroPackage(meta.terreiroId)`; invalidates `offline.terreiroPackage` + `offline.allPackages`
- **handleRemove:** calls `clearAudiosForTerreiro` then `removePackage`; same invalidations; guarded by `Alert.alert` confirmation

## Business rules / invariants

1. **Default theme is dark.** On first launch when no `@saravafy:themeMode` key exists, the context initialises to `"dark"` and writes that value to AsyncStorage.
2. **`effectiveTheme` derivation:** `"system"` → follows `Appearance.getColorScheme()` (live subscription). `"light"` or `"dark"` are absolute overrides.
3. **Curimba mode → keep-awake:** enabling `curimbaEnabled` activates `expo-keep-awake` tag `"saravafy-curimba"`; disabling deactivates it. This fires inside a `useEffect` tied to `curimbaEnabled` in `PreferencesContext`.
4. **Curimba onboarding explainer:** shown automatically the first time Curimba is enabled, unless `curimbaOnboardingDismissed` is true. The explainer's "don't show again" checkbox calls `setCurimbaOnboardingDismissed(true)`.
5. **Legacy key migration:** on boot, `PreferencesContext` reads both the new key (`preferences.curimba_mode_enabled`) and the legacy key (`@saravafy:curimbaEnabled`) for curimba values. If only the legacy key exists, its value is copied to the new key (fire-and-forget).
6. **Curator mode is doubly gated:** `CuratorModeContext.setCuratorModeEnabled` returns early if `!isCurator`; `ProfileSection` only renders the toggle at all when `isCurator && !isCuratorLoading`.
7. **Dev Master badge:** `useIsDevMaster` compares the user's email against `EXPO_PUBLIC_DEV_MASTER_EMAILS` env var (comma/space separated) or falls back to the hardcoded list `["yuriblanke@gmail.com"]`. Shown as a "Dev Master" badge in `ProfileSection`.
8. **Terreiros list role priority:** when a user has duplicate `terreiro_members` rows for the same terreiro (schema edge case), the strongest role wins: `admin > curimba > member`.
9. **RLS recursion fallback:** `fetchTerreirosQueAdministro` detects infinite recursion on `terreiro_members` policies and falls back to querying `terreiros.created_by = userId` instead. This keeps the app functional when the Supabase policy is misconfigured.
10. **Schema-compat column probing:** all queries on `terreiro_members` and `terreiros` probe for missing columns (`status`, `cover_image_url`, `avatar_url`, `image_url`, `member_kind`) and retry with narrower selects. This allows deployment of schema changes without a forced app update.
11. **Start-page offline resilience:** `bootstrapStartPage` tries to fetch from `profiles` first. On network error it reads `@saravafy:startPageSnapshot` and returns `usedOfflineSnapshot: true`. On success it validates terreiro access via a separate `terreiros` query before navigating; an invalid `primary_terreiro_id` is silently cleared.
12. **`cannot_remove_last_admin`:** attempting to demote the sole admin of a terreiro produces a specific toast; this is caught by string-matching the error message.
13. **`TerreiroActionsSheet` hides during modal push:** the sheet closes before pushing to `/terreiro-members` or `/access-manager` so there is no z-index conflict between the bottom sheet and the RN Modal.
14. **`PreferencesModal` hides for certain routes:** the overlay `<Modal>` sets `visible={isOpen && !shouldHideForRoute}` where `shouldHideForRoute` is true when the current route leaf is `terreiro-editor` or `access-manager`.
15. **Nav cover failsafe:** `LoadingStatePreferences` sets an 8-second timeout to force-clear the nav cover in case the prewarm or layout never resolves.
16. **`OfflineDownloadsSection` renders nothing when empty:** `if (packages.length === 0) return null`.

## Cross-feature dependencies

| Dependency | What is consumed |
|---|---|
| **Auth** (`AuthContext`) | `user.id`, `user.email`, `user.user_metadata`, `signOut()` |
| **Terreiros** | `queryKeys.terreiros.*`, `queryKeys.me.*` — invalidated after role/membership changes |
| **Collections** | `queryKeys.collections.editableByUserPrefix`, `queryKeys.collections.accountable` — invalidated on membership changes |
| **Offline / `terreiroPackage`** | `listPackages()`, `syncTerreiroPackage()`, `removePackage()`, `clearAudiosForTerreiro()` — all consumed by `OfflineDownloadsSection` |
| **Remote config** | `warmRemoteConfig()` called at app startup; `getAppInstallUrl()` used by share/install flows |
| **navCover util** (`src/utils/navCover`) | `showNavCover`, `setNavCoverVisible`, `markNavCoverReady`, `useNavCoverState` — orchestrate the loading cover on push transition |
| **`CurimbaExplainerBottomSheet`** | Self-contained component consumed by both `Preferences.tsx` and `TabsHeaderWithPreferences` |
| **Design tokens** | `colors` from `@saravafy/design-tokens` (re-exported via `src/theme/colors.ts`); `spacing`, `radii`, `shadows` from `src/theme/` |
| **`prewarmPreferences`** | Called from `TabsHeaderWithPreferences` (before the push to the stack route) to prefetch `preferences.terreiros` and `terreiroInvites` |

## Known issues / TODOs found in code

1. **`TerreirosSection` in the stack route vs. `TabsHeaderWithPreferences` — duplication.** The overlay (`TabsHeaderWithPreferences`) contains a full re-implementation of the preferences UI including terreiros, theme, curimba toggle, and invite handling. The stack route (`Preferences.tsx`) + its components is a separate implementation of the same UI. Both are maintained in parallel and can diverge. There is no comment explaining the long-term intent (whether one will replace the other).

2. **`getInitials` fallback hardcoded to `"YB"`.** In `TabsHeaderWithPreferences.tsx` (line ~64), the `getInitials` fallback is `"YB"` — the developer's own initials — rather than a neutral placeholder. The equivalent function in `src/screens/Preferences/components/utils.ts` does not share this hardcoded value but the overlay version does.

3. **`fetchTerreirosQueAdministro` in `PreferencesContext` is now dead code.** The context exposes `fetchTerreirosQueAdministro` and a `terreirosAdmin` state slice, but the Preferences screen does not consume them. The screen uses React Query (`usePreferencesTerreirosQuery`) instead. The imperative fetch in `PreferencesContext` remains as exposed API but is unused by any current screen.

4. **`my.terreirosWithRole` key alias points to `preferences.terreiros`.** In `queryKeys.me`, the `terreirosWithRole` entry is marked `// Deprecated` and is an alias for `queryKeys.preferences.terreiros`. Code still calls both. `useTerreiroInviteDecision` invalidates `queryKeys.me.terreirosWithRole`, which means it invalidates the preferences list correctly — but the alias makes the relationship non-obvious.

5. **Schema-compat column probing is verbose and fragile.** `fetchTerreirosQueAdministro` (in `PreferencesContext`) has ~6 nested retry blocks for column variants (`cover_image_url`, `avatar_url`, `image_url`, `status`). The same pattern is repeated across `me.ts` and `pendingTerreiroInvites.ts`. There is no shared utility for this pattern.

6. **`accept_terreiro_invite` / `reject_terreiro_invite` RPC param fallback.** The `p_invite_id` fallback in `useTerreiroInviteDecision` handles a schema mismatch (PGRST202) by retrying with a different param name. This implies the RPC was renamed at some point and old clients may still hit the old signature. No comment documents when the fallback can be removed.

7. **`LoadingStatePreferences` failsafe is 8 seconds with no user feedback.** If prewarm stalls, the user sees a spinner for up to 8 seconds. There is no retry button or error state.

8. **`PreferencesContext.isReady` is not consumed by the Preferences screen.** The screen renders immediately and relies on the nav cover (prewarm) to gate visibility. The `isReady` flag (which indicates AsyncStorage has been read) is available in context but is not used to block rendering or show a skeleton.

9. **Multiple debug-only visual marker flags in `Preferences.tsx`.** A significant portion of `Preferences.tsx` is `__DEV__`-only code (`visualMarkersEnabled`, `debugCoverVisible`, `debugStampVisible`, `debugUnderlayPeek`) controlled by non-standard globals (`globalThis.__saravafyDebugVisualMarkersEnabled`, etc.). This code is non-trivial and increases cognitive load when reading the screen. There is no documentation for how to activate these debug modes.

10. **`ManagedTerreiro` type (with `role: "admin" | "curimba"`) in `PreferencesContext` vs. `MyTerreiroWithRole` (with `role: "admin" | "curimba" | "member"`) in `me.ts`.** The two types overlap significantly but are separate. The `PreferencesContext.terreirosAdmin` slice only covers admin/curimba roles; the React Query path covers all three. Both exist in the codebase simultaneously.

11. **`OfflineDownloadsSection` errors are silently swallowed.** Both `handleSync` and `handleRemove` catch all exceptions with `/* silent */`. Failed sync or remove operations give the user no feedback.
