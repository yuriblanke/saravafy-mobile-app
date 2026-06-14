# Code Quality Audit — saravafy-mobile-app

**Date:** 2026-06-13
**Scope:** Full mobile app (`src/`, `app/`, `contexts/`).
**Stats:** 200 TS/TSX files · ~54,500 LOC · 7 files > 1500 LOC · 0 test files · 507 `any` casts.

This document catalogs concrete defects across three axes — monolithic components, performance/inefficiency, and architecture/state — with file:line refs. Findings are diagnostic; fixes are scoped separately.

---

## TL;DR — Top 10 priorities

1. **Monolith hotspot: `TabsHeaderWithPreferences.tsx` (3,164 LOC)** — contains nested 630-line component (`PreferencesOverlaySheets`) + 7 modal/sheet instances + curator invite mutation logic.
2. **`TerreiroEditor.tsx` (2,906 LOC)** — image processing + multi-step form + member mgmt + delete flow tangled.
3. **`Home.tsx` (2,109 LOC)** — two huge inline mutations (`addToCollectionMutation`, `createCollectionMutation`) + 6 embedded modals + 32 hooks.
4. **3 separate "add-to-collection" implementations** (Home wizard / Player modal / dedicated AddToCollection screen) — same domain, divergent code.
5. **9 screens import `supabase` directly** alongside React Query layer — inconsistent data access; mutations bypass cache abstractions.
6. **Zero test files** — no coverage for OAuth retry, audio upload, optimistic cache mutations, role guards, deeplinks.
7. **507 `any` casts** concentrated in `src/api/pontoAudio.ts` (20+) and Supabase response parsing.
8. **`PreferencesContext` owns server state** (`fetchTerreirosQueAdministro`) duplicating `useMyEditableTerreirosQuery`.
9. **`.map()` rendering lists in `ScrollView`** — `TerreiroMembers.tsx:779,873,953` + `AccessManager/MembersList.tsx:74`; will jank on 50+ items.
10. **N+1 query cascades** — `Collection.tsx:300-310` and `PlayerScreen.tsx:226-229` derive `pontoIds` then fan out to multiple dependent queries that re-fire on any items change.

---

## 1. Monolithic components

Concentration of responsibilities in 8 largest files (18,648 LOC combined). Estimated extractable: ~4,500 LOC → hooks, ~3,000 LOC → sub-components, ~1,500 LOC → utility modules. Expected per-file reduction after extraction: 40–50%.

### 1.1 `src/components/TabsHeaderWithPreferences.tsx` — 3,164 LOC

- **Mixed:** navigation state, preferences overlay (theme/curator/profile), curator admin invites, nav-cover prewarming, debug telemetry.
- **Hooks:** 27 (useState×15, useEffect×7, useMemo×6, useCallback×1).
- **Sub-components inlined:** `PreferencesOverlaySheets()` declared at line 630 — a full feature component.
- **Modals/sheets embedded:** 7 (`BottomSheet`, `CurimbaExplainerBottomSheet`, `SelectModal`, multiple `ActionSheet`).
- **Splits:**
  - Lines 630–1000 → `src/screens/Preferences/PreferencesOverlaySheets.tsx`
  - Lines 674–692 → `src/components/CuratorInviteModal.tsx`
  - Lines 246–267 → `src/hooks/useNavDiagnostics.ts`

### 1.2 `src/screens/TerreiroEditor/TerreiroEditor.tsx` — 2,906 LOC

- **Mixed:** multi-step form, WEBP encoding + Supabase storage upload, member/invite RPC, delete cascade (storage + DB + cache).
- **Hooks:** 39.
- **Splits:**
  - Lines 508–600 → `flows/createTerreiroFlow.ts` (business logic only)
  - Lines 253–326 → `ImageUploadController.tsx`
  - Lines 800–950 → `TerreiroDeleteModal.tsx`
  - Lines ~1200–1800 → `TerreiroAdminSection.tsx` + `TerreiroMemberInviteModal.tsx`

### 1.3 `src/screens/TerreiroBiblioteca/TerreiroBiblioteca.tsx` — 2,113 LOC

- **Mixed:** Reanimated header animation, terreiro fetching, offline package sync, library order persistence, share sheet.
- **Hooks:** 45 (useState×16, useEffect×8, useMemo×9, useCallback×12).
- **Reanimated hooks:** 6+ (`useSharedValue`, `useDerivedValue`, `useAnimatedStyle`, etc.).
- **Splits:**
  - Lines 156–253 → `hooks/useCoverAnimation.ts`
  - Lines 370–420 → `TerreiroBibliotecaHeader.tsx`
  - Lines ~800+ → `TerreiroBibliotecaCollectionList.tsx`

### 1.4 `src/screens/Home/Home.tsx` — 2,109 LOC

- **Mixed:** ponto search + client filter, add-to-collection wizard, create-collection sheet, filter dropdown, edit/submit ponto modals, optimistic mutations.
- **Hooks:** ~32.
- **Modals/sheets embedded:** 6.
- **Splits:**
  - Lines 167–402 → `hooks/useAddToCollectionMutation.ts`
  - Lines 691–832 → `hooks/useCreateCollectionMutation.ts`
  - Lines 1403–1550 → `HomeAddToCollectionModal.tsx`
  - Lines 1568–1681 → `CreateCollectionSheet.tsx`

### 1.5 `src/screens/Collection/Collection.tsx` — 2,009 LOC

- **Mixed:** metadata display, ponto list with badges, tag add/remove sheets, audio metadata fetching, placeholder resolution, membership request.
- **Hooks:** 39.
- **Splits:**
  - Lines ~180–300 → `CollectionHeader.tsx`
  - Lines ~400–800 → `CollectionPontoList.tsx`
  - Lines ~1000+ → `hooks/useCollectionTagMutation.ts`

### 1.6 `src/screens/CuratorReviewQueue/ReviewSubmission.tsx` — 1,959 LOC

- **Mixed:** audio playback UI, submission display, approval/rejection RPC with version negotiation, error mapping, audio correction attachment.
- **Splits:**
  - Lines 85–133 → `rpcWithFallback.ts`
  - Lines 135–160 → `reviewErrorMessages.ts`
  - Lines ~400–800 → `ReviewSubmissionAudioPlayer.tsx`
  - Lines ~800–1400 → `ReviewSubmissionForm.tsx`

### 1.7 `src/components/pontos/PontoUpsertModal.tsx` — 1,840 LOC

- **Mixed:** ponto form (create/edit/correction), audio upload controller, rights consent state machine, tag parsing, terms sheet, three mutation paths.
- **Hooks:** 39. Refs: 4.
- **Splits:**
  - Lines 310–395 → `PontoUpsertRightsSheet.tsx` + `usePontoRightsConsent.ts`
  - Lines 119–170 → `usePontoUpsertForm.ts`
  - Lines 280–330 → `usePontoTags.ts`
  - Lines ~1200+ → `PontoAudioUploadSection.tsx`

### 1.8 `src/components/InviteGate.tsx` — 1,498 LOC

- **Mixed:** invite fetch + 12s cache, snooze persistence, modal state machine, accept/reject RPC with param fallback, RLS recovery, app-state tracking.
- **Hooks:** 37 — **19 refs** (state machine over-fragmented).
- **Splits:**
  - Lines 244–278 → `useTerreiroInviteSnooze.ts`
  - Lines 323–425 → `useFetchPendingInvites.ts`
  - Lines ~700–1200 → `InviteGate/inviteActions.ts`
  - Lines ~1200+ → `InviteGateModal.tsx` (presentation-only)

### 1.9 `src/screens/Player/PlayerScreen.tsx` — 1,220 LOC

- **Mixed:** playlist navigation, audio footer, ponto detail, font size persistence, curimba toggle, entidade resolution, search/add-to-collection sub-modals.
- **Hooks:** 37.
- **Splits:**
  - Lines ~400–600 → `useLyricsFontSize.ts` + `LyricsFontSizeControl.tsx`
  - Lines ~700–900 → `PlayerPontoDetail.tsx`
  - Lines ~1000+ → `PlayerEntidadeSection.tsx`

---

## 2. Performance & inefficiency

### 2.1 List rendering — `.map()` in `ScrollView` (will jank on large lists)

| File:Line | Issue |
|---|---|
| `src/screens/TerreiroMembers/TerreiroMembers.tsx:779,873,953` | `.map()` of member/invite/request items inside `ScrollView` |
| `src/screens/AccessManager/MembersList.tsx:74` | `.map()` of `MemberPerson` inside `View` inside `ScrollView` |

**Fix direction:** convert to `FlatList` / `SectionList` with stable `keyExtractor` and `getItemLayout` where height is known.

### 2.2 Missing memoization

| File:Line | Issue |
|---|---|
| `src/screens/Home/Home.tsx:635-664` | `openAddToCollectionSheet` callback depends on `editableCollections.length` + `editableCollectionsQuery.isFetching` — unstable deps |
| `src/screens/Collection/Collection.tsx:324-328` | useEffect closing sheets cascades on `canEditCustomTags`/`deleteTarget` changes; child sheets lack `React.memo` |
| `src/screens/Player/PlayerScreen.tsx:222-223` | `pontoIds` computed inline `.map().filter()` every render — feeds multiple child queries |
| `src/screens/Home/Home.tsx:563-608` | 3 chained `useMemo` blocks (`collectionsFilterItems`, `collectionsFilterLabel`, `visibleEditableCollections`) recompute together on filter change |

### 2.3 useEffect issues

| File:Line | Issue |
|---|---|
| `src/screens/Home/Home.tsx:494-508` | Empty deps `[]` fetches once but misses refetch on revisit — dual pattern with `useFocusEffect` at L510 |
| `src/screens/Home/Home.tsx:681-689` | timeout on `isCreateCollectionModalOpen` — fragile cleanup if modal toggles fast |
| `src/screens/Collection/Collection.tsx:251-275` | deps include `goToPontosTab` + `showToast` parent fns — runs every parent render (parent fns need `useCallback`) |

### 2.4 N+1 query cascades

| File:Line | Issue |
|---|---|
| `src/screens/Collection/Collection.tsx:300-310` | derives `pontoIds` then fans out to `useLatestPontoAudioMetaByPontoIds()` + `useTerreiroPontosCustomTagsMap()` — both refetch on items change |
| `src/screens/Player/PlayerScreen.tsx:226-229` | `customTagsMapQuery` depends on `pontoIds` derived from `items` — should piggyback on parent collection query |

**Fix direction:** batch into single RPC or single React Query that returns aggregate shape.

### 2.5 Heavy synchronous work in render

| File:Line | Issue |
|---|---|
| `src/screens/Home/Home.tsx:108-123` | `matchesQuery` runs 4× `normalize()` (trim + toLowerCase) per ponto per keystroke; multi-line lyrics × 1000 results = string GC pressure |
| `src/screens/CollectionAddToCollection/AddToCollection.tsx:367` | `.sort()` on scored results in render — move into `useMemo` or query selector |

### 2.6 Image loading

- `src/screens/Home/Home.tsx:1674` — `<Image resizeMode="contain" />` no explicit `width`/`height`; delays first frame.
- All `<Image>` set `resizeMode` correctly but **no `Image.prefetch()` or caching** for terreiro/collection covers loaded repeatedly across screens.

### 2.7 AsyncStorage abuse

- `src/components/AddMediumTagSheet.tsx:35,44` — get/set in effect with no debounce; rapid toggle queues I/O.
- `src/offline/terreiroPackage.ts:45,61` — AsyncStorage reads/writes inside query hooks; consider moving to dedicated service with debounce.

### 2.8 Re-render cascades

- `contexts/PreferencesOverlayContext.tsx:35-37` — context value memoized correctly, **but** consumer `TabsHeaderWithPreferences:1050+` reads multiple memos (`pendingTerreiroInvites`, `curatorModeInfo`, `myTerreiros`) → modal re-renders on any dep change. Add `React.memo` boundary on modal contents.

---

## 3. Architecture & state management

### 3.1 Navigation (Expo Router file-based)

- **Tabs:** `(tabs)/(pontos)`, `(tabs)/(terreiros)` — swipe-based via `RootPagerContext`.
- **Full screens:** player, collection/[id], terreiro, terreiro-collections/[id]/edit.
- **Modals:** terreiro-editor, review-submissions/[submissionId], ponto-audio-upload, terreiro-member-profile.
- **Deep links:** `l/[tipo]/[id]` (generic) + per-type variants.

**Issues:**
- **Presentation inconsistency:** AccessManager + Preferences are full-screen routes but render dialog-style UX. Should be modals.
- **No centralized deeplink handler** in `app/_layout.tsx`; routes handle individually.
- **Gesture/pager coordination fragmented across 4 contexts** (`RootPager`, `TabController`, `GestureBlock`, `GestureGate`) — candidates for unified `AppNavigationContext`.

### 3.2 Context inventory (9 providers, ~14 levels deep)

| Context | Size | Owns | Issue |
|---|---|---|---|
| AuthContext | 24KB | Session, OAuth retry, watchdog | OK |
| **PreferencesContext** | **35KB** | Theme + managed terreiros (server state) | **Anti-pattern: owns server state, duplicates `useMyEditableTerreirosQuery`** |
| **CuratorModeContext** | 4KB | `curator_mode_enabled` from profiles | **Anti-pattern: should delegate to single RQ mutation** |
| RootPagerContext | 2KB | Sheet open state | Candidate for merge |
| TabControllerContext | 2KB | Tab nav | Candidate for merge |
| GestureBlockContext | 2KB | Gesture block flag | Candidate for merge |
| GestureGateContext | 3KB | Gesture gate | Candidate for merge |
| InviteGatesContext | 1KB | Invite state | OK (small) |
| ToastContext | 12KB | Toast queue | OK |

### 3.3 Code duplication

- **3 add-to-collection implementations** sharing model + RPC:
  - `src/screens/CollectionAddToCollection/AddToCollection.tsx` (dedicated screen, 450+ LOC)
  - `src/screens/Home/components/HomeAddToCollectionWizard.tsx` (wizard, 200+ LOC)
  - `src/screens/Player/components/LibraryPlayerAddToCollectionModal.tsx` (modal, 300+ LOC)
- **Error extraction `getErrorMessage`** copy-pasted in `Home.tsx:93-106`, `Collection.tsx:90-102`, `TerreiroBiblioteca.tsx:109-123`.
- **Role checks** `role === "admin"` inlined 12+ times across `TabsHeaderWithPreferences`, `InviteGate`, `AccessManager`. `useIsCurator()` exists but no `useTerreiroRole(terreiroId)` equivalent.
- **Hex-to-RGBA utility** duplicated in `TerreiroBiblioteca.tsx:85-107` + `Collection.tsx:66-88`.
- **Query loading/error/empty scaffolding** reinvented in 15+ screens — no shared `<QueryBoundary>`.

### 3.4 Mixed query layers

**9 screens import `supabase` directly** while React Query layer exists for the same data:

```
AccessManager, Collection, CollectionEdit, CollectionAddToCollection,
CuratorReviewQueue, TerreiroBiblioteca, TerreiroCollectionsEdit,
TerreiroEditor, Preferences/TerreiroActionsSheet
```

Mutations especially scattered as inline `.from().update()` calls — no abstraction layer.

### 3.5 Screen-vs-component boundary

- `src/components/pontos/PontoUpsertModal.tsx` (1,840 LOC) is a full form/screen by responsibility.
- `src/screens/Home/components/HomeAddToCollectionWizard.tsx` is a multi-step flow — arguably a screen.
- `src/components/SubmitPontoModal.tsx` carries submission state machine.

**Pattern proposal:** create `src/screens/AddToCollection/index.tsx` exposable as both modal and full-screen route via presentation context.

### 3.6 Test coverage

**Zero test files** in `src/__tests__` or co-located. Critical untested flows:

- OAuth login/retry (AuthContext, 200+ LOC of watchdog state machine)
- Audio upload submission (PontoAudioUpload, 300+ LOC)
- Add-to-collection optimistic updates (3 implementations diverged)
- Terreiro role transitions (admin/curimba/member/follower)
- Offline sync cascade (`terreiroPackage`)
- Permission guards (curator vs admin vs member)
- Deep link resolution (`l/ponto/[id]`, `l/terreiro/[id]`)
- RQ cache invalidation patterns (`mutationUtils.ts` snapshot/rollback)

### 3.7 TypeScript hygiene

- **507** `any` / `as any` / `as unknown as` across `src/`.
- **0** `@ts-ignore` / `@ts-expect-error` (good).
- **Hotspots:**
  - `src/api/pontoAudio.ts` — 20+ `as any` (HTTP parsing)
  - `app/(app)/(tabs)/_layout.tsx:20,55,89` — nav callback typing
  - `contexts/CuratorModeContext.tsx:58` — `[] as any` empty queryKey
- **Pattern:** screens redefine local `TerreiroRow`/`CollectionRow` types instead of shared domain models.

---

## 4. Recommended remediation order

| Wave | Effort | Files | Impact |
|---|---|---|---|
| **1. Unify add-to-collection** | M | 3 implementations → 1 wizard + 2 thin wrappers | Eliminates ~600 LOC duplication; single source of truth for ponto-version + entidade resolution |
| **2. Extract `useTerreiroRole(terreiroId)`** | S | 12+ inline checks across 5 files | Removes scattered role logic; sets pattern for permission hooks | → [Spec 1](../superpowers/specs/2026-06-13-spec-1-foundations.md) (foundation hook + 2 sample adoptions; bulk migration deferred) |
| **3. Build `<QueryBoundary>` + `getErrorMessage` util** | S | 15+ screens | Removes loading/error scaffolding duplication | → [Spec 1](../superpowers/specs/2026-06-13-spec-1-foundations.md) (foundation modules + 3 sample adoptions; bulk migration deferred) |
| **4. Split TabsHeaderWithPreferences** | L | 3,164 → ~1,500 LOC main + 4 extractions | Largest file in repo; removing nested 630-LOC component is mechanical win |
| **5. Replace `.map()` with `FlatList` in members lists** | S | TerreiroMembers + AccessManager/MembersList | Fixes perceptible jank for terreiros with 50+ members |
| **6. Move `PreferencesContext` server state → RQ** | M | PreferencesContext + consumers | Removes context/RQ duplication; single source for managed terreiros |
| **7. Memoize `pontoIds` in Collection + Player** | S | 2 lines × 2 files | Stops cascading query invalidations |
| **8. Add `useCallback` to `goToPontosTab` + `showToast` parents** | S | Collection.tsx:251-275 + parents | Stops useEffect re-runs on every parent render |
| **9. Extract `usePontoUpsertForm` + `usePontoRightsConsent`** | M | PontoUpsertModal 1,840 → ~900 LOC | Tames rights consent state machine; testable form hook |
| **10. Introduce smoke tests** | L | OAuth + audio upload + add-to-collection mutations | First 3 critical flow tests; covers ~40% of bug surface |
| **11. TypeScript cleanup** | L | 507 `any` casts | Start with `src/api/pontoAudio.ts` (20+); add response validation layer |
| **12. Split TerreiroEditor image/upload/member sections** | L | 2,906 → ~1,200 LOC main + 4 extractions | Second largest screen; clean image+upload boundary unlocks reuse |

**Total estimated LOC reduction after waves 1–9:** ~6,000–8,000 LOC (≈12–15% of codebase) without functional change.

---

## 5. What was NOT audited

- Bundle size / Hermes profile output
- Crash analytics or Sentry breadcrumbs
- Memory leaks (audio buffers, image cache, listener leaks)
- Network waterfall (Supabase request count per screen load)
- Accessibility (`a11y` labels, screen reader support, focus order)
- i18n readiness (string externalization)
- Build pipeline / EAS config / OTA update strategy
- Native module patches in `patches/`
- Backend RPC version compatibility matrix

These warrant separate audits.

---

## 6. References

- Mobile app architecture suite: `docs/architecture/README.md` (14 prior docs cover feature slices)
- Aggregation report (cross-cutting issues): `docs/architecture/aggregation.md`
- Foundation doc (provider/context tree): `docs/architecture/foundation.md`
