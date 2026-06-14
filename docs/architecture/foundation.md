# Foundation

> Status: generated 2026-06-11 from full read of source files. Verify before relying on as spec.

## Purpose
Non-feature plumbing that every screen in the app sits on top of: the app entry, root provider tree, auth-gated routing, tab pager mechanics, the Saravafy design system (theme + primitive UI), and a set of cross-cutting contexts (safe area, network, layout metrics, gestures, toast, root pager, tab controller). Feature slices consume these — they do not redefine them.

## Files

### App entry / shell
- `index.js` — Expo Router entry shim (`require("expo-router/entry")`).
- `app.config.ts` — Expo build-time identity (scheme `saravafy`, iOS `associatedDomains: applinks:saravafy.com.br`, Android intent filters for `https://saravafy.com.br/l`), variant selection from `EAS_BUILD_PROFILE` / `APP_VARIANT`, `newArchEnabled: true`, plugins `expo-router` + `expo-dev-client`.

### Routes (expo-router)
- `app/_layout.tsx` — root provider tree + boot orchestration.
- `app/+html.tsx` — web-only HTML shell (disables body scroll, dark-mode-safe bg).
- `app/+not-found.tsx` — generic 404 (uses `components/Themed.tsx`; vestigial Expo template styling).
- `app/(app)/_layout.tsx` — authenticated group layout (Stack + Saravafy background + gestures + tab controller).
- `app/(app)/index.tsx` — `<Redirect href="/(app)/(tabs)/(pontos)" />`.
- `app/(app)/(tabs)/_layout.tsx` — material top-tabs (Pontos ↔ Terreiros) with custom swipe overlay header.

### Theme (facades over `@saravafy/design-tokens`)
- `src/theme/index.ts` — re-exports `colors`, `getSaravafyBaseColor`, `radii`, `shadows`, `spacing`.
- `src/theme/colors.ts`, `radii.ts`, `shadows.ts`, `spacing.ts`, `saravafyBaseColor.ts` — one-line facades. Source of truth lives in the `@saravafy/design-tokens` package.
- `constants/Colors.ts` — **legacy** Expo-template palette (`forest/leaf/sand/clay`). Only consumed by `components/Themed.tsx`.
- `components/Themed.tsx`, `components/useColorScheme.ts`, `components/useColorScheme.web.ts` — Expo template scaffold. `useColorScheme()` here is the *resolved* scheme (respects `PreferencesContext.themeMode`).

### Background / screen wrappers
- `src/components/SaravafyBackgroundLayers.tsx` — gradient + light blobs + vignette + noise texture; variants `tabs | stack | focus`, both themes.
- `src/components/SaravafyScreen.tsx` — full-screen wrapper: status bar + background layers + safe-area scrims + padded content.
- `src/components/SaravafyStackScene.tsx` — like `SaravafyScreen` but for deep Stack screens; pads top by `headerHeight` from `SaravafyLayoutMetricsContext` (falls back to `insets.top`).

### Primitive UI
- `src/components/BottomSheet.tsx`
- `src/components/ConfirmModal.tsx`
- `src/components/SelectModal.tsx`
- `src/components/SurfaceCard.tsx`
- `src/components/Separator.tsx`
- `src/components/Badge.tsx`
- `src/components/TagChip.tsx` (+ exported `getPontoTagChipChrome`, `TAG_CHIP_HEIGHT`, `TAG_CHIP_RADIUS`)
- `src/components/TagPlusChip.tsx`
- `src/components/TooltipPopover.tsx` (+ exported global `dismissAllTooltips`)

### Icons
- `src/components/icons/AtabaqueIcon.tsx` — custom shape primitive (no svg dep).
- `src/components/icons/Share2Icon.tsx` — lucide-react-native deep import to avoid bundling the full icon index on Metro/Windows.
- `src/types/lucide-share-2-deep.d.ts` — types for the deep lucide import.

### Overlays
- `src/components/overlays/GlobalOverlaysHost.tsx` — currently only renders `PreferencesModal` (see Preferences slice). Mounted once at root.

### Gestures / pager
- `src/components/AppTabSwipeOverlay.tsx` — global PanResponder overlay for Pontos ↔ Terreiros swipe (works even from deep screens).

### Contexts (root-level — `contexts/`)
- `contexts/RootPagerContext.tsx` — root pager state + `isBottomSheetOpen` flag.
- `contexts/TabControllerContext.tsx` — registry-pattern tab nav handle (`goToTab` / `registerGoToTab`).
- `contexts/GestureBlockContext.tsx` — short post-swipe press blocker (150ms window).
- `contexts/GestureGateContext.tsx` — richer swipe gate with reactive `isTabSwiping` flag.
- `contexts/ToastContext.tsx` — toast stack (max 3 visible, queue beyond), provider mounts its own `ToastStack`.

### Contexts (`src/contexts/`)
- `src/contexts/GlobalSafeAreaInsetsContext.tsx` — caches `useSafeAreaInsets()` once at root.
- `src/contexts/NetworkContext.tsx` — `NetInfo` listener (`isConnected`, `isInternetReachable`).
- `src/contexts/SaravafyLayoutMetricsContext.tsx` — measured global header height for stack scenes.

### Navigation utils
- `src/utils/navCover.ts` — external store (`useSyncExternalStore`) for showing a solid cover during navigation transitions to mask gradient flicker.
- `src/utils/navTrace.ts` — `__DEV__`-only timestamped log helper (`[NavTrace +Xms] event`).

### Shared utils / config
- `src/utils/shareContent.ts` — build/copy/share messages for Ponto/Coleção/Terreiro public links.
- `src/config/links.ts` — public URL builders (`https://saravafy.com.br/l/{ponto|colecao|terreiro}/{id}`).
- `src/config/remoteConfig.ts` — `app_install_url` warming from `public_app_config` table.

## Routes

The `(app)` group lives inside `app/_layout.tsx`'s auth gate. Public route `(auth)/login` and `auth/callback` are siblings (not covered in this slice).

| Route | Screen file | Params | Guard |
|---|---|---|---|
| `/(app)` | `app/(app)/index.tsx` | — | `useAuth().user` (set by root boot effect; otherwise `/login`) |
| `/(app)/(tabs)/(pontos)` | tab subtree | — | inherited |
| `/(app)/(tabs)/(terreiros)` | tab subtree | — | inherited |
| `/player` | `app/(app)/player.tsx` | — | inherited; disables global swipe overlay |
| `/l/[tipo]/[id]` | `app/(app)/l/[tipo]/[id]` | `tipo`, `id` | deep-link redirector |
| `/collection/[id]` | `app/(app)/collection/[id]` | `id` | inherited; fade transition; opaque scene bg |
| `/collection/[id]/edit` | ↑ subtree | `id` | inherited |
| `/collection/[id]/add` | ↑ subtree | `id` | inherited |
| `/terreiro` | `app/(app)/terreiro.tsx` | `terreiroId`, `terreiroTitle`, `bootStart?`, `bootOffline?` | inherited; fade transition |
| `/terreiro-collections/[terreiroId]/edit` | subtree | `terreiroId` | inherited |
| `/preferences` | `app/(app)/preferences.tsx` | — | inherited; solid underlay forced by `(app)/_layout.tsx:95` |
| `/terreiro-members` | screen | — | inherited |
| `/terreiro-members-list` | screen | — | inherited |
| `/access-manager` | screen | — | inherited; disables global swipe overlay |
| `/terreiro-editor` | screen | — | inherited; **modal** presentation; disables global swipe overlay |
| `/review-submissions/[submissionId]` | subtree | `submissionId` | inherited; modal |
| `/ponto-audio-upload` | screen | — | inherited; modal |
| `/terreiro-member-profile` | screen | — | inherited; modal |
| `/+not-found` | `app/+not-found.tsx` | — | none |

Stack `screenOptions` in `app/(app)/_layout.tsx:191`: `headerShown: false`, `contentStyle: { backgroundColor: "transparent" }`, `animation: "none"`. Deep screens individually override `animation: "fade"` and a solid `getSaravafyBaseColor(effectiveTheme)` content background (anti-flicker).

## Navigation

### Boot / entry
`app/_layout.tsx:166` (`RootLayoutNav`) decides the entry path **once per cold start** (`didCompleteBootRef` latch).
1. If `segments.length > 0` → already deep-linked, hide splash and skip boot.
2. If no auth user → `router.replace("/login")`.
3. If user → call `usePreferences().bootstrapStartPage(user.id)`; may resolve to `/terreiro` with `{ bootStart, bootOffline, terreiroId, terreiroTitle }` or fall back to `/(app)`.

A second effect at `app/_layout.tsx:420` is a **symmetric guard**: if user is authed but `segments[0] === "(auth)"`, force `/(app)`. This catches OAuth flows that complete via `openAuthSessionAsync` without a deep-link callback.

A third effect at `app/_layout.tsx:304` runs the **boot prefetch plan** once per user id (gated by `didRunPrefetchPlanRef`):
1. `prefetchHomeFeedPontos({ limit: 10 })` + `prefetchExploreTerreiros({ limit: 10 })` (parallel).
2. `prefetchEditableTerreiroIds(userId)` + `prefetchMyTerreiroAccessIds(userId)`.
3. `prefetchCollectionsByTerreiro` over each access id.
4. `prefetchMyEditableTerreiros` for Preferences sheet.
5. `prefetchEditableCollections({ userId, editableTerreiroIds })`.

A **logout cleanup** effect at `app/_layout.tsx:190` cancels and removes all `queryClient` queries whose key array `.includes(prevUserId)` and resets memory-only preferences via `clearStartPageSnapshotOnly()`.

### Tab switching
The `(tabs)` layout uses `@react-navigation/material-top-tabs` wrapped by `withLayoutContext` (`app/(app)/(tabs)/_layout.tsx:17`). Its custom `tabBar` returns `null` and captures the inner navigator into a ref so it can be exposed via `TabControllerContext.registerGoToTab` (`app/(app)/(tabs)/_layout.tsx:96`). Header rendering is delegated to `TabsHeaderWithPreferences` (not in this slice).

Swipe is enabled unless `rootPager.isBottomSheetOpen`.

### Android back behavior
`app/(app)/_layout.tsx:32` (`AndroidBackBehavior`): on `pathname === "/"` and active tab `terreiros`, hardware back goes to `pontos` (Home anchor); otherwise default React Navigation handling. iOS uses standard gestures.

### Deep links
- Scheme: `saravafy://` (from `app.config.ts:69`).
- Universal links (iOS): `applinks:saravafy.com.br` (`app.config.ts:95`).
- App links (Android): intent filter `https://saravafy.com.br/l/*`, `autoVerify: true` (`app.config.ts:108`).
- Router handler: `app/(app)/l/[tipo]/[id]/...` (children handle `ponto`, `colecao`, `terreiro`).
- Public URL builders (`src/config/links.ts`):
  - `buildPublicPontoUrl(id)` → `https://saravafy.com.br/l/ponto/{id}`
  - `buildPublicColecaoUrl(id)` → `https://saravafy.com.br/l/colecao/{id}`
  - `buildPublicTerreiroUrl(id)` → `https://saravafy.com.br/l/terreiro/{id}`

## Contexts consumed/provided

All contexts below are **provided** by this slice. "Consumed by" lists the foundation files that read them — feature slices consume most of them too.

| Context | Provided in | Consumed (foundation) | State shape |
|---|---|---|---|
| `RootPagerContext` (`useRootPager` / `useRootPagerOptional` / `useIsRootPagerTabActive`) | `app/_layout.tsx:132` via `RootPagerProvider` | `(app)/_layout.tsx`, `(tabs)/_layout.tsx`, `AppTabSwipeOverlay`, `BottomSheet` | `{ index, setIndex, activeKey, setActiveKey, routes, isBottomSheetOpen, setIsBottomSheetOpen }` |
| `TabControllerContext` (`useTabController`) | `(app)/_layout.tsx:156` via `TabControllerProvider` | `(tabs)/_layout.tsx` registers; `AndroidBackBehavior`, `AppTabSwipeOverlay` call | `{ goToTab(tab), registerGoToTab(fn \| null) }` |
| `GestureBlockContext` (`useGestureBlock`) | `(app)/_layout.tsx:155` | `AppTabSwipeOverlay` | `{ markSwipeRecognized(), shouldBlockPress() }` (150ms post-swipe window) |
| `GestureGateContext` (`useGestureGate`) | `(app)/_layout.tsx:154` | `AppTabSwipeOverlay` | `{ isTabSwiping, markSwipeStart(), markSwipeEnd(), shouldBlockPress() }` |
| `ToastContext` (`useToast`) | `app/_layout.tsx:133` via `ToastProvider` | renders `ToastStack` internally | `{ showToast(msg, opts) → id, dismissToast(id), clearToasts() }` |
| `GlobalSafeAreaInsetsContext` (`useGlobalSafeAreaInsets`) | `app/_layout.tsx:130` | `SaravafyScreen`, `SaravafyStackScene`, `ToastContext.ToastStack` | `EdgeInsets` from `react-native-safe-area-context` |
| `NetworkContext` (`useNetwork`) | `app/_layout.tsx:129` | (consumed by `OfflineBanner`, `useOfflineAutoSync` — feature slices) | `{ isConnected, isInternetReachable }` |
| `SaravafyLayoutMetricsContext` (`useSaravafyLayoutMetrics`) | `(app)/_layout.tsx:158` | `SaravafyStackScene` | `{ headerHeight, setHeaderHeight(v) }` |
| React Navigation `ThemeProvider` | `app/_layout.tsx:435` | wraps `<Slot />` | resolves `effectiveScheme === "dark" ? DarkTheme : DefaultTheme` from `useColorScheme()` (which itself respects `PreferencesContext.themeMode`) |

The provider tree (top → bottom, `app/_layout.tsx:124`):

```
RootGestureHandlerWrapper       // try/catch require of react-native-gesture-handler
  SafeAreaProvider              // initialMetrics=initialWindowMetrics
    QueryClientProvider         // refetchOnWindowFocus=false, retry=1
      AuthProvider              // (feature slice)
        PreferencesProvider     // (feature slice)
          NetworkProvider
            GlobalSafeAreaInsetsProvider
              PreferencesOverlayProvider
                RootPagerProvider
                  ToastProvider
                    CuratorModeProvider     // (feature slice)
                      InviteGatesProvider   // (feature slice)
                        LoginPromptProvider // (feature slice)
                          <RootLayoutNav/>  // renders Slot under ThemeProvider
                          + TerreirosRealtimeSync
                          + InviteGate
                          + CuratorInviteGate
                          + GlobalOverlaysHost
                          + LoginPromptSheet
                          + OfflineBanner
                          + OfflineAutoSync
```

The `(app)` layout adds, in order: `GestureGateProvider` → `GestureBlockProvider` → `TabControllerProvider` → `SaravafyLayoutMetricsProvider`.

## Data flow (queries → screens)

Foundation provides plumbing only. The boot prefetch plan (`app/_layout.tsx:304`) **invokes** these prefetchers (defined in feature slices):
- `prefetchHomeFeedPontos`
- `prefetchExploreTerreiros`
- `prefetchEditableTerreiroIds`
- `prefetchMyTerreiroAccessIds`
- `prefetchCollectionsByTerreiro`
- `prefetchMyEditableTerreiros`
- `prefetchEditableCollections`

Only one queryKey is referenced inline here for diagnostic purposes: `["collections", "editableByUser", userId]` (`app/_layout.tsx:399`).

## Supabase surface

- **Tables read:** `public_app_config` (key `app_install_url`) — `src/config/remoteConfig.ts:123`.
- **Tables written:** N/A
- **RPCs called:** N/A
- **Realtime channels:** N/A (realtime is wired by `useRealtimeTerreiroScope` and `TerreirosRealtimeSync`, defined in feature slices but **mounted** by foundation).
- **Storage buckets:** N/A
- **Edge functions:** N/A

## Mutations
N/A — foundation does not own any mutation.

## Business rules / invariants

- **Single-shot boot.** `didCompleteBootRef` (`app/_layout.tsx:184`) and `didNavigateRef` ensure boot navigation runs at most once per cold start. If `segments.length > 0` on first mount (deep link), boot is skipped entirely.
- **User-scoped cache eviction on logout.** Predicate `q.queryKey.includes(prevUserId)` (`app/_layout.tsx:206`). Means: **any query that wants to be cleared on logout must put the user id as a top-level element in its queryKey tuple.**
- **Prefetch plan idempotency.** Tracked per-userId via `didRunPrefetchPlanRef: Set<string>` (`app/_layout.tsx:176`). Re-login of same user does **not** re-prefetch unless logout cleared the set.
- **Root pager / Bottom sheet coupling.** Any `BottomSheet` mount calls `rootPager.setIsBottomSheetOpen(true)` (`BottomSheet.tsx:151`) on visibility — this disables the tabs' material-top-tabs `swipeEnabled` (`(tabs)/_layout.tsx:81`) and disables the global `AppTabSwipeOverlay` (`AppTabSwipeOverlay.tsx:152`).
- **Swipe overlay disabled routes.** `/player` (music swipe priority), `/terreiro-editor`, `/access-manager` — see `AppTabSwipeOverlay.tsx:148`.
- **Swipe direction semantics.** On Pontos: only left swipe → Terreiros. On Terreiros: only right swipe → Pontos. Threshold capture: 12px horizontal with `absX > 1.2*absY`. Threshold navigate: 40px (`AppTabSwipeOverlay.tsx:33`,`:59`).
- **Tab switch via registry.** `TabController.goToTab` resolves to the inner top-tabs `navigator.navigate(...)` (so stack-per-tab state is preserved). `router.replace` is a defensive fallback only (`(tabs)/_layout.tsx:104`).
- **Android predictive back disabled.** `predictiveBackGestureEnabled: false` in `app.config.ts:107`.
- **Effective color scheme.** `components/useColorScheme.ts` returns `themeMode === "system" ? useSystemColorScheme() : themeMode`. `useColorScheme.web.ts` is hardcoded `"light"` (SSR-safe).
- **Solid-underlay anti-flicker.** `(app)/_layout.tsx:94` paints an opaque layer beneath the Stack while pushing to `/preferences` to prevent gradient bleed during transition (S1/H2 fix).
- **`getSaravafyBaseColor(theme)` is the canonical opaque fallback** for any Stack screen `contentStyle.backgroundColor`. Used repeatedly for deep screens; used directly by `SaravafyScreen`/`SaravafyStackScene` as the root container backgroundColor.
- **Tooltip global dismiss.** `dismissAllTooltips()` (exported from `TooltipPopover.tsx:18`) is called by `BottomSheet`'s `ScrollView.onScrollBeginDrag` (`BottomSheet.tsx:434`). Tooltips also auto-close on `pathname` change.
- **Toast capacity & stack visuals.** `MAX_VISIBLE = 3`, queue thereafter; 85% overlap on stack; tapering shadow per index; bottom slot ~12% of screen height; max toast height 33% of screen (`ToastContext.tsx:53–55`).
- **Tab chips share dimension constants.** `TAG_CHIP_HEIGHT = 26`, `TAG_CHIP_RADIUS = 6`. `TagPlusChip` reuses these so a `+` chip aligns with `TagChip`s in a row. Android hairline border is bumped to 1px (`TagChip.tsx:53`).
- **Public-link host** is hardcoded `https://saravafy.com.br` in `src/config/links.ts:1`. Anti-pattern: this duplicates the host that `app.config.ts:95,114` references — keep them in sync if the domain ever changes.
- **`navCover` is currently provider-less.** It's a module-level external store consumed via `useNavCoverState()`; no foundation file mounts a UI for it yet (search the rest of the codebase before assuming).

## Cross-feature dependencies

- **AuthContext** (`@/contexts/AuthContext`) — `user`, `isLoading`; consumed in root boot, logout cleanup, and `(app)` layout.
- **PreferencesContext** (`@/contexts/PreferencesContext`) — `themeMode`, `effectiveTheme`, `isReady`, `bootstrapStartPage`, `clearStartPageSnapshotOnly`, `selectedTerreiroFilterId`.
- **TabsHeaderWithPreferences** — rendered by `(tabs)/_layout.tsx:118`.
- **OfflineBanner**, **useOfflineAutoSync**, **LoginPromptSheet**, **InviteGate**, **CuratorInviteGate**, **TerreirosRealtimeSync**, **PreferencesModal** (via `GlobalOverlaysHost`), **LoadingStatePreferences** — all mounted unconditionally by foundation but defined in feature slices.
- **Prefetchers** (`src/queries/...`) — listed in "Data flow" above.
- **`useMyTerreiroIdsQuery`**, **`useRealtimeTerreiroScope`** — wired in `(app)/_layout.tsx:137–144`.
- **`lib/supabase`** — used by `src/config/remoteConfig.ts:123`.
- **`@saravafy/design-tokens`** (npm package) — actual source of truth for `colors`, `radii`, `shadows`, `spacing`, `getSaravafyBaseColor`. The `src/theme/*.ts` files are thin re-export facades.

## Known issues / TODOs found in code

- **`AppTabSwipeOverlay.tsx` is extremely log-heavy.** Every render and every gesture phase logs through `logSwipeOverlay`. Even in production (`if (!__DEV__) return;` is the only gate inside the function, but several `logSwipeOverlay` callers fire unconditionally — e.g. `phase: "state"` effect, `phase: "release"`). Audit before shipping; consider a `__DEV__` short-circuit at the call sites.
- **`AppTabSwipeOverlay.tsx` is never imported by `(app)/_layout.tsx`.** It exists and is fully wired, but the only mount in this slice is implicit. Search the codebase for actual mount point; it may be a regression / dead code or mounted by a feature header.
- **`GlobalOverlaysHost` only renders `PreferencesModal`.** Name suggests broader role; if more overlays land they go here.
- **`(app)/_layout.tsx:78` decision-comment block** says header is rendered globally "except in modais full-screen", but the layout itself does **not** render a header — `TabsHeaderWithPreferences` is rendered by `(tabs)/_layout.tsx` and other screens render their own. The comment is stale relative to the file.
- **`components/Themed.tsx` + `constants/Colors.ts`** are Expo template leftovers. Only `+not-found.tsx` uses them. Candidate for removal once 404 is restyled.
- **`useColorScheme.web.ts`** is hardcoded `"light"` — web build will ignore both system scheme and `PreferencesContext.themeMode`.
- **Gesture handler require in try/catch** (`app/_layout.tsx:81`) is a deliberate workaround for older Android dev-clients where the native module is missing. Comment notes "O editor de coleção vai mostrar um aviso." — fallback is silent here.
- **Two near-duplicate gesture contexts (`GestureBlock` and `GestureGate`).** Both clamp post-swipe presses with similar 100–150ms windows. `AppTabSwipeOverlay` uses both. Consolidation candidate.
- **`navCover` external store has no UI mount in this slice.** Either consumed by a feature header/scene (not in this read set) or partially landed.
- **`Share2Icon` deep import is a Metro-on-Windows workaround.** Documented in the file comment. Don't "fix" it back to a top-level import.
- **`remoteConfig.ts` only handles `app_install_url`.** TTL 6h. Cached HTTP URLs are accepted (`allowHttp: true` for cache reads) but only HTTPS is accepted from remote. No other keys yet.
- **`buildPublicColecaoUrl` / `buildPublicTerreiroUrl` are `async`** (`shareContent.ts:25,34`) but only synchronous work happens inside — historical signature, callers `await` them.
- **`ConfirmModal` hardcodes danger color via `colors.danger`** and brass for primary. No "secondary primary" tone; if more tones are needed, refactor.
- **`SaravafyScreen`'s `safeAreaScrim` color comes from `colors.safeAreaScrim`** — verify token exists in `@saravafy/design-tokens`.
- **`TooltipPopover` Modal is `statusBarTranslucent`** — interacts with `(app)/_layout.tsx` setting `translucent` StatusBar on Android. Should not conflict, but watch on edge-to-edge.
