# Auth

> Status: generated 2026-06-11 from full read of source files. Verify before relying on as spec.

## Purpose
Handle Google OAuth sign-in via Supabase, persist the session through cold starts, gate the rest of the app behind a `(auth)` vs `(app)` route split, and surface a global login sheet plus an in-app invite acceptance modal so unauthenticated and newly-authenticated users land in the right place.

## Files
- **Routes (expo-router):**
  - `app/(auth)/_layout.tsx` — Stack layout for the unauthenticated group (headerless).
  - `app/(auth)/login.tsx` — Login screen ("Entrar com Google" + "Entrar sem login" skip).
  - `app/auth/callback.tsx` — Deep-link landing route for `saravafy://auth/callback` (PKCE exchange / token fallback).
  - `app/_layout.tsx` — Root layout. Owns the gate decision (`/(app)` vs `/login` vs `/terreiro`) and the logout cache cleanup. Not part of this slice but interacts heavily with it.
- **Contexts:**
  - `contexts/AuthContext.tsx` — Provides session, user, OAuth methods, watchdog.
  - `contexts/InviteGatesContext.tsx` — Tracks whether the terreiro invite gate is active and a snooze-version counter for re-renders.
  - `src/contexts/LoginPromptContext.tsx` — Global gate that runs an action if logged in, else opens the login sheet and replays the action on success.
- **Components:**
  - `src/components/LoginPromptSheet.tsx` — Bottom-sheet UI driven by `LoginPromptContext`.
  - `src/components/InviteGate.tsx` — Full-screen modal + bottom banner for pending `terreiro_invites`.
- **Queries (membership-related, owned by `me` slice but consumed here):**
  - `src/queries/me.ts` — `useMyTerreiroIdsQuery`, `useMyTerreiroAccessIdsQuery`, `useMyEditableTerreirosQuery`, `useMyTerreirosWithRoleQuery`, plus prefetch helpers.
- **Services / API:**
  - `lib/supabase.ts` — Supabase client (AsyncStorage-backed session).
- **Domain / utils:**
  - `src/utils/authLogger.ts` — `AuthAttempt` class + `logAuthEvent` writes to `auth_login_attempts`. Also `classifyUrl` URL classifier and a local in-memory ring buffer (`getRecentAuthLogs`).

## Routes

| Route | Screen | Params | Guard |
|---|---|---|---|
| `/(auth)/login` | `LoginScreen` | — | Reached when `user` is null after boot, or via `router.replace("/login")`. No internal guard — root layout decides. |
| `/auth/callback` | `AuthCallbackScreen` | `code?`, `access_token?`, `refresh_token?`, `error?`, `error_description?` (all parsed from `useLocalSearchParams`) | None — designed to be hit by OS deep link from Google → Supabase. Internally exchanges code/sets session, then `replace`s to `/(app)/(tabs)/(pontos)` or `/login`. |

Note: `/auth/callback` lives at `app/auth/callback.tsx` (NOT inside `(auth)` group), so it is not gated by the auth-only layout and works regardless of current session state.

## Navigation

### Entry points into the auth slice
- **Cold start with no session** — `app/_layout.tsx:253-255` sets `preferredHref = "/login"` and `router.replace`s there once `isLoading=false` and prefs are ready.
- **Logout** — `signOut` in `AuthContext.tsx:695-712` calls `supabase.auth.signOut()`, then the root layout’s logout-cleanup effect (`app/_layout.tsx:190-221`) runs cancel/remove queries for all queryKeys containing the previous `userId` and resets in-memory prefs. Then the boot decision re-runs and pushes the user to `/login`.
- **Deep link OAuth callback** — Configured via `Linking.createURL("auth/callback")` (`AuthContext.tsx:513`). The OS opens `saravafy://auth/callback?...` after Google → Supabase redirects.

### Exits from the auth slice
- `AuthCallbackScreen` calls `router.replace("/(app)/(tabs)/(pontos)" as any)` on session success (`app/auth/callback.tsx:43`).
- `LoginScreen` "Entrar sem login" link calls `router.replace("/(app)/(tabs)/(pontos)")` (`login.tsx:82`).
- Root layout has a **symmetric guard**: if `user?.id` becomes set while still inside `(auth)` segment, it `router.replace("/(app)")` (`app/_layout.tsx:420-429`). This covers the case where `openAuthSessionAsync` returns the URL but the deep link does not fire.

### Deep link scheme
Scheme: `saravafy://` (used implicitly by `Linking.createURL`). Supabase Dashboard must allowlist `saravafy://auth/callback` — documented in a banner comment at `AuthContext.tsx:740-745`.

## Contexts consumed/provided

| Context | Provided at | Consumed by | State shape |
|---|---|---|---|
| `AuthContext` | `app/_layout.tsx:127` (root) | Everywhere (`useAuth()`) | `{ session: Session\|null, user: User\|null, isLoading: boolean, authInProgress: boolean, authError: string\|null, signInWithGoogle, retryGoogleLogin, signOut, clearAuthError, getRecentAuthLogs }` (`AuthContext.tsx:25-36`) |
| `InviteGatesContext` | `app/_layout.tsx:135` | `InviteGate.tsx` (writes `terreiroGateActive`), other slices read it to suppress overlays | `{ terreiroGateActive: boolean, setTerreiroGateActive, terreiroSnoozeVersion: number, bumpTerreiroSnoozeVersion }` (`InviteGatesContext.tsx:3-9`) |
| `LoginPromptContext` | `app/_layout.tsx:136` | Any screen calling `useLoginPrompt().requireAuth(...)`; `LoginPromptSheet` reads `isOpen`/`reason` | `{ isOpen, reason: string\|null, requireAuth(action, {reason}?), openLoginSheet({reason}?), closeLoginSheet }` (`LoginPromptContext.tsx:22-36`) |

## Data flow (queries → screens)

The auth slice itself owns no React Query queries (the Supabase JS client is called directly). Membership queries in `src/queries/me.ts` are consumed here because login/logout invalidate them.

| queryKey (literal) | Table / RPC | Params | Cache strategy | Consumed by |
|---|---|---|---|---|
| `queryKeys.me.terreiros(userId)` → `useMyTerreiroIdsQuery` | `terreiro_members` select `terreiro_id, status` where `user_id=:userId AND status='active'` (falls back to no status if column missing) | `userId` | `staleTime: 60_000`, `placeholderData: prev`, `enabled: !!userId` | Membership checks; invalidated on invite accept/reject (`InviteGate.tsx:786-808`, `952-969`). |
| `queryKeys.me.terreiroAccessIds(userId)` → `useMyTerreiroAccessIdsQuery` / `prefetchMyTerreiroAccessIds` | `terreiro_members` select `terreiro_id, status` where `user_id=:userId AND role in ('admin','curimba','editor','member') AND status='active'` | `userId` | `staleTime: 60_000` | Prefetched at boot (`app/_layout.tsx:349`); drives the editable terreiros set. |
| `queryKeys.me.editableTerreiros(userId)` → `useMyEditableTerreirosQuery` / `prefetchMyEditableTerreiros` | `terreiro_members` (admin/curimba/editor) joined with `terreiros(id,title,cover_image_url)` | `{userId, editableTerreiroIds?}` | `staleTime: 60_000` | Prefetched at boot (`app/_layout.tsx:376`); invalidated on accept. |
| `queryKeys.preferences.terreiros(userId)` → `useMyTerreirosWithRoleQuery` / `prefetchPreferencesTerreiros` | `terreiro_members` + `terreiros` (minimal fields), with `member_kind` column fallback chain | `userId` | `staleTime: 60_000`, 15s `withTimeout` per Supabase call (`me.ts:373-419`) | Preferences sheet ("terreiros do perfil"). |

Note that `me.ts` aggressively retries the same select with shrinking column lists when it sees `does not exist` / `column` in the error message (`status`, `member_kind`, `cover_image_url`, and even the `title`/`name` swap in `InviteGate.tsx:361-368`). This is schema-tolerance, not retry-on-failure.

## Supabase surface

- **Tables read:**
  - `terreiro_invites` (`InviteGate.tsx:354-359`) — filtered by `status='pending'` and `email=:normalizedUserEmail`, joined to `terreiros(title)` or `terreiros(name)`.
  - `terreiro_members` (via `me.ts` queries, see above).
  - `terreiros` (via `me.ts` joins, minimal columns).
  - `auth.users` (implicitly, via `supabase.auth.getSession()` / `getUser`).
- **Tables written:**
  - `auth_login_attempts` (`authLogger.ts:365`) — insert-only telemetry of OAuth events. Payload columns: `attempt_id, user_id, provider='google', event, client_ts, platform, os_version, app_version, build_number, network_type, network_details, browser_details, details` (`authLogger.ts:346-361`).
- **RPCs called:**
  - `accept_terreiro_invite(invite_id)` — falls back to `p_invite_id` if PostgREST returns `PGRST202` (`InviteGate.tsx:86-89`). Returns boolean.
  - `reject_terreiro_invite(invite_id)` — same fallback. Marked with a `NOTE` that `decline_terreiro_invite` must NOT be used while DB CHECK constraint expects `pending|accepted|rejected` (`InviteGate.tsx:895-901`).
- **Realtime channels:**
  - `invite-gate:terreiro_invites` — `postgres_changes` INSERT on `public.terreiro_invites`, filtered client-side by normalized email (`InviteGate.tsx:630-687`). Cleaned up via `supabase.removeChannel` on unmount.
- **Auth API:** `signInWithOAuth({provider:'google', skipBrowserRedirect:true, scopes:'email profile', queryParams:{access_type:'offline', prompt:'consent'}})`, `exchangeCodeForSession`, `setSession`, `getSession`, `signOut`, `onAuthStateChange`.
- **Storage buckets:** none directly used by this slice.
- **Edge functions:** none called from this slice.

## Auth flow — detailed sequence

1. **App boot** (`AuthContext.tsx:382-488`):
   - Creates a "boot" `AuthAttempt` and logs `boot_auth_context_mounted`.
   - Calls `supabase.auth.getSession()` (sourced from AsyncStorage). On success → set state, log `boot_get_session_success`. On error → log `boot_get_session_error`.
   - **Refresh-token self-heal:** if the error is `AuthApiError` whose message contains `"Invalid Refresh Token"` or `"Refresh Token Not Found"`, calls `supabase.auth.signOut({ scope: "local" })` to wipe the corrupted token (`AuthContext.tsx:412-427`).
   - Registers `onAuthStateChange`. On any event with a session, calls `concludeOAuthFlow("session_established", ...)` and clears `authError`.

2. **User taps "Entrar com Google"** → `signInWithGoogle` (`AuthContext.tsx:491-683`):
   - Builds redirect URI via `Linking.createURL("auth/callback")`.
   - Calls `supabase.auth.signInWithOAuth({provider:'google', skipBrowserRedirect:true, ...})`. The `skipBrowserRedirect: true` is the key: Supabase returns a `data.url` instead of auto-redirecting, so the client controls the browser.
   - Starts a **12-second watchdog** (`watchdogTimerRef`) that sets `authError = "Não conseguimos concluir o login voltando do Google para o app. Tente novamente."` if the flow hasn’t completed AND `AppState === 'active'`.
   - Calls `WebBrowser.openAuthSessionAsync(data.url, redirectUri)`.
   - On `result.type === 'success'` with a URL, calls `handleOAuthCallbackUrl(result.url)` directly — covers devices where the deep link to `/auth/callback` does NOT fire after the browser closes.

3. **OS deep links to `/auth/callback`** (`app/auth/callback.tsx`):
   - If `user?.id` is already set (race with `handleOAuthCallbackUrl` / `onAuthStateChange`), it skips straight to `goHome()` (`callback.tsx:53-58`).
   - Otherwise reads `code` / `access_token` / `refresh_token` / `error` from URL params:
     - `error` or `error_description` → log and `goLogin()`.
     - `code` (PKCE) → `supabase.auth.exchangeCodeForSession(code)` → on session, `goHome()`.
     - `access_token` + `refresh_token` (legacy fragment flow) → `supabase.auth.setSession({...})` → on session, `goHome()`.
     - Last-resort: `getSession()`; if session exists, `goHome()`, else `goLogin()`.
   - Uses `didNavigateRef` + a `cancelled` closure flag to ensure exactly one navigation (`callback.tsx:36-50`).

4. **OAuth watchdog (background-safe)** — `AuthContext.tsx:312-379`:
   - Tracks `oauthFlowState ∈ {IDLE, BROWSER_OPENED, COMPLETED}` and `oauthBrowserOpenStartedAtMs`.
   - Logs `oauth_appstate_backgrounded` once per attempt when AppState goes inactive/background after browser opens.
   - On AppState return to `active`, if 15s+ have elapsed since browser opened and we are still `BROWSER_OPENED`, logs `oauth_timeout_on_resume` and sets the same generic error string. This is the "on-resume" timeout that compensates for the `setTimeout(12s)` not firing reliably while backgrounded.

5. **`concludeOAuthFlow(outcome, details)`** is the single source of truth that flips `oauthCompletedRef`, clears the timer, logs `oauth_flow_concluded`, and sets `authInProgress=false`. It is called from: deep link success path, browser cancel/dismiss, and `onAuthStateChange` SESSION_ESTABLISHED.

## Session persistence

`lib/supabase.ts:8-15`:

```ts
createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

Notes:
- `storage: AsyncStorage` — sessions survive cold start.
- `detectSessionInUrl: false` — required for React Native; URL parsing is handled manually in `app/auth/callback.tsx` and `AuthContext.handleOAuthCallbackUrl`.
- `autoRefreshToken: true` — Supabase JS refreshes silently in background; corruption is handled at boot (see step 1 self-heal above).
- Env vars: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (asserted non-null with `!`).

## Mutations
The slice does not register React Query mutations. State changes happen through:
- `supabase.auth.signInWithOAuth` / `exchangeCodeForSession` / `setSession` / `signOut` — managed by Supabase JS.
- Direct `setState` on the local Auth context state from `onAuthStateChange`.

Cross-slice invalidations performed by this slice are on the **invite** RPCs (see `InviteGate.tsx:786-808` for accept and `952-969` for reject) — they invalidate `queryKeys.me.membership`, `me.terreiros`, `me.terreiroAccessIds`, `me.editableTerreiros`, `me.permissions`, `terreiros.editableByUser`, `collections.accountable`, `collections.editableByUserPrefix`.

## Business rules / invariants

- **Skip-login is allowed.** `login.tsx:82` lets the user enter `(app)` without a session. Most app slices use `LoginPromptContext.requireAuth` to gate write actions.
- **Login sheet replays the pending action after sign-in.** `LoginPromptContext.tsx:79-97` watches the `null → string` transition of `user?.id` and fires the saved `pendingActionRef.current` in a `setTimeout(0)` (to let overlays unmount before navigation/modal triggers).
- **Invite gate is purely terreiro-scoped.** Despite the generic name `InviteGatesContext`, it currently only tracks `terreiroGateActive` and `terreiroSnoozeVersion`. The companion `CuratorInviteGate` (mounted next to `InviteGate` in `_layout.tsx:140`) is a separate component out of scope for this doc.
- **Snooze model for terreiro invites:** `shouldHideFromGate` (`InviteGate.tsx:262-278`) hides an invite from the **modal** (not the banner) after the user picks "Decidir depois" — once for the current app session, and permanently after the second snooze (`count >= 2`).
- **Gate only opens when navigation is ready.** `InviteGate.tsx:500-519` defers opening the modal until `segments[0] === "(app)"` to avoid a black backdrop during boot.
- **RLS recursion shield.** If a Supabase error contains `"infinite recursion detected in policy"` and references `"terreiro_members"`, the gate flips `rlsRecursionDetectedRef = true` and stops querying, surfacing a toast once and keeping the app usable (`InviteGate.tsx:108-114`, `371-389`).
- **Android back button is blocked while the invite modal is open** (`InviteGate.tsx:694-700`).
- **Backdrop press does not close the invite modal** — the backdrop is a `Pressable` with `onPress={() => undefined}` (`InviteGate.tsx:1149-1153`).
- **RPC param fallback.** `rpcTerreiroInvite` tries `invite_id` first, then `p_invite_id` if PostgREST returns code `PGRST202` (`InviteGate.tsx:86-89`). The mismatch detection is in `isRpcFunctionParamMismatch` (`InviteGate.tsx:67-78`).
- **OAuth callback URL dedupe** (`AuthContext.tsx:197-209`) — guards against the case where both `openAuthSessionAsync` result.url AND the deep link to `/auth/callback` fire for the same `code` or `access_token`. The dedupe key is `code:<code>` or `tokens:<first6>:<first6>`.

## authLogger — events logged

All events go to `public.auth_login_attempts` with `provider='google'` hardcoded. The `details` payload is sanitized to strip `access_token`, `refresh_token`, `id_token`, `code`, `token`, `secret`, `password` (`authLogger.ts:240-256`).

Events emitted (grep-friendly list):

- `boot_auth_context_mounted`, `boot_supabase_onAuthStateChange_registered`, `boot_get_session_success`, `boot_get_session_error`
- `auth_state_change`
- `oauth_start`, `oauth_redirect_uri_built`, `oauth_signInWithOAuth_called`, `oauth_signInWithOAuth_success`, `oauth_signInWithOAuth_error`
- `oauth_browser_open_start`, `oauth_browser_open_result`
- `oauth_appstate_backgrounded`, `oauth_timeout_timer`, `oauth_timeout_on_resume`
- `oauth_flow_concluded` (with `outcome ∈ {cancel, dismiss, deeplink_success, session_established, other}`)
- `oauth_error`
- `deep_link_received`, `deep_link_oauth_error`, `deep_link_exchange_code_start`, `deep_link_exchange_code_success`, `deep_link_exchange_code_error`, `deep_link_set_session_start`, `deep_link_set_session_success`, `deep_link_set_session_error`, `deep_link_error`, `auth_session_set`

Local in-memory ring buffer (`localLogHistory`, max 50) is exposed via `useAuth().getRecentAuthLogs()` for debug screens.

Dedupe: identical `attemptId + event + JSON.stringify(details)` within 1000 ms is dropped (`authLogger.ts:127-152`).

`user_id` inference: if no explicit `userId` is provided, falls back to `supabase.auth.getSession()` (cached for 5 s) — `authLogger.ts:185-227`. Flags `inferredUserId: true` and `hadSession` in the persisted `details`.

## Cross-feature dependencies

- **Preferences** (`contexts/PreferencesContext`) — root layout calls `bootstrapStartPage(user.id)` to decide whether to land on `(app)` or a specific `/terreiro`. `InviteGate` uses `fetchTerreirosQueAdministro` from this context to warm the cache after accept.
- **Toast** (`contexts/ToastContext`) — invite gate uses `showToast` for success/failure messages and for the RLS-recursion notice.
- **React Query** — invalidations of `queryKeys.me.*`, `queryKeys.terreiros.editableByUser`, `queryKeys.collections.*` after invite mutations.
- **Domain copy** — `src/domain/terreiroInviteCopy` supplies role-specific badge labels, body copy, and the "decide later" toast string.
- **Snooze storage** — `src/utils/terreiroInviteSnooze` (AsyncStorage-backed) keys snoozes by `normalizedUserEmail`.

## Known issues / TODOs found in code

- **No declared `decline_terreiro_invite`.** Inline `NOTE` at `InviteGate.tsx:896-898`: "Não usar `decline_terreiro_invite` enquanto o banco estiver com CHECK status=('pending'|'accepted'|'rejected') e activated_consistency." So the canonical name is intentionally avoided.
- **Schema-tolerance noise.** Both `me.ts` and `InviteGate.tsx` carry repeated fallback chains for missing columns (`status`, `member_kind`, `cover_image_url`, `terreiros.title` vs `name`). This is silently masking schema drift between environments and should ideally be replaced with a hard migration target.
- **Two watchdogs racing.** `signInWithGoogle` installs a 12 s `setTimeout` timer, and the AppState listener has a separate 15 s on-resume timeout (`AuthContext.tsx:347`). The error string is the same but bookkeeping in `timeoutReportedRef` tracks them separately (`timer` vs `resume`). Behavior is correct but the asymmetry is non-obvious.
- **`textPrimary` is unused** in `login.tsx` (computed at line 19-20, never read) — dead code.
- **`subtitle`-only copy variant on login.** The `Deixa o ponto te guiar` string is hardcoded at `login.tsx:60` with no copy slot. Consider lifting to `src/domain`.
- **`useEffect(supabase.auth.getSession)` is duplicated** between `LoginScreen` (`login.tsx:31-35`, only `console.log`s the session) and `AuthContext` boot. The login-screen effect is debug-only and could be removed.
- **`router.replace("/(app)/(tabs)/(pontos)" as any)`** in `app/auth/callback.tsx:43` uses an `as any` cast because the typed route table doesn’t know this path — confirms expo-router type generation is out of sync with the literal navigation target.
- **Sensitive-field stripping is shallow.** `sanitizeDetails` only removes top-level keys (`authLogger.ts:237-256`); nested tokens would survive. The current call sites do not pass nested tokens, but it’s a latent risk.
- **`detectSessionInUrl: false`** plus a manual `handleOAuthCallbackUrl` AND `app/auth/callback.tsx` AND `signInWithGoogle` result.url processing means the callback can be processed in three independent code paths. Dedupe via `lastHandledOAuthCallbackKeyRef` covers the first two but `app/auth/callback.tsx` runs its own `exchangeCodeForSession` without consulting that ref — both `AuthContext` and the callback screen may try to exchange the same `code` on slow devices. Supabase will reject the second exchange but the error path in `app/auth/callback.tsx:77-83` will `goLogin()` instead of `goHome()`, potentially landing a freshly-logged-in user on `/login` for one frame before the root layout’s symmetric guard kicks in.
- **`textPrimary` colour is recomputed in `LoginPromptSheet`** (`LoginPromptSheet.tsx:16-17`) but never used — dead code parallel to the login screen issue.
- **`expo-constants` import** in `authLogger.ts:14` uses the deprecated `Application.default?.manifest2` path; on EAS Update channels this may return `null` and silently drop `app_version`/`build_number` from logs.
