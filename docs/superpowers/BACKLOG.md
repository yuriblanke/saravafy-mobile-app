# Backlog — deferred scope

**Updated:** 2026-08-08

Everything deferred out of a spec lands here. Nothing is "deferred to Spec N" unless Spec N exists
(see [`CONVENTIONS.md`](CONVENTIONS.md) §8).

**Goal this backlog serves:** make the codebase resistant to *unexpected* bugs. Not smaller code —
fewer places where two sources of truth can disagree. Ordering below reflects that, not effort.

Priority tiers:
- **P0** — confirmed defect with user-visible or cross-user impact. Fix first.
- **P1** — contract hole that lets P0-class bugs recur. Fix before further refactoring.
- **P2** — real duplication/complexity. Genuine value, no bug attached today.
- **P3** — cleanup.

---

## P0 — confirmed defects

`D1`–`D5` verified against source on 2026-08-08 (from `aggregation.md` §6, re-checked in code, not
taken on the doc's word). `D6`–`D13` found during the 2026-08-08/09 human validation pass and
root-caused in code before being written down.

**Spec coverage:**

| Spec | Covers |
|---|---|
| [Spec 3 — Auth state leaks](specs/2026-08-09-spec-3-auth-state-leaks.md) | `D8`, `D12` |
| [Spec 4 — Failure presentation](specs/2026-08-09-spec-4-failure-presentation.md) | `D7`, `D10`, `D11` |
| [Spec 5 — Add-to-collection write path](specs/2026-08-09-spec-5-add-to-collection-write-path.md) | `D6`, `D9` |
| [Spec 6 — Keyboard avoidance (pilot)](specs/2026-08-09-spec-6-keyboard-avoidance.md) | `D14` (1 screen only) |
| *(Spec 7 — rollout, blocked on Spec 6 sign-off)* | `D14` (remaining 8 screens) |
| *(unassigned)* | `D1`–`D5`, `D13` |

`D13` is deliberately unassigned: it needs a product decision (and likely a `profiles` column)
rather than a code fix — see its row.

| ID | Defect | Evidence | Impact |
|---|---|---|---|
| **D1** | Logout does not evict non-user-scoped cache keys | `app/_layout.tsx:206,212` — predicate is `q.queryKey.includes(prevUserId)`. Keys like `["terreiroMembersCount", terreiroId]`, `["terreiroMembersListInfinite", ...]`, `["terreiro", id, "members"]` carry no `userId` and survive logout | One user's terreiro membership data can surface for the next user on the same device |
| **D2** | Audio attached to a new ponto submission is always lost | `PontoUpsertModal.tsx:591` selects `approved_ponto_id` immediately after INSERT; that column is only written by the curator's approve RPC, so it is always `null` and L609 falls through to the error toast | Submission saves, audio silently discarded |
| **D3** | "Reenviar convite" is a no-op that reports success | `terreiroMembership.ts:1224-1228` — only `.update({ updated_at })`. Source comment reads *"This is a placeholder implementation"*. Called from 2 screens | UI asserts something that did not happen |
| **D4** | Optimistic tag mutations have no rollback | `AddMediumTagSheet.tsx:203` calls `setQueriesData` with no prior `getQueriesData` snapshot and no `onError` | Network failure leaves the UI showing unsaved state until staleTime expires |
| **D5** | Edit-ponto bypasses React Query entirely | Direct `UPDATE` on `pontos` + `ponto_versoes`, then `setPontos` on local state. No invalidation of `pontos.feed`, `collections.pontos(id)`, or `["pontos","all","public"]` | Edited ponto shows stale on every screen that did not trigger the edit |
| ~~**D6**~~ ✅ | **RESOLVED 2026-08-09** (`925b8da` detection, `3342d3d` flow-level test) — Spec 5 Tasks 2-3. The **primary** approach shipped, not §3.1's pre-check fallback: `ON CONFLICT DO NOTHING` returning zero rows was verified against the real database *and* through the real supabase-js client, so the assumption the fix rests on is measured, not inferred. `ignoreDuplicates: true` kept deliberately and now guarded by a unit assertion. Adding a ponto already in a collection never shows the duplicate message, and silently desyncs cache from DB | `src/screens/Home/data/collections_pontos.ts:154-161` — `upsert(..., { onConflict: "collection_id,ponto_id", ignoreDuplicates: true })`. With `ignoreDuplicates: true`, Postgres does `ON CONFLICT DO NOTHING` and **never raises the `23505` unique-violation** the code checks for at line 170. That branch (which sets `alreadyExists: true`) is unreachable dead code | Function always returns `{ ok: true }` for a duplicate add. UI shows "Ponto adicionado à coleção" (false — DB left the existing row untouched, position/added_by/entidade unchanged) while the optimistic cache patch in `AddToCollectionFlow.tsx` inserts/reorders it anyway. Cache and DB diverge until the next invalidation. Found 2026-08-08 testing Spec 2a (queue item 1.7) |
| ~~**D7**~~ ✅ | **RESOLVED 2026-08-09** (`5722160`) — Spec 4 Task 3. Raw JS error leaks to the Home search UI instead of a readable message | `src/hooks/usePontosSearch.ts:73` — `const message = e instanceof Error ? e.message : String(e);`, rendered verbatim at `Home.tsx:589`. Never routed through `src/lib/errors.ts` (`getErrorMessage`, added in Spec 1 for exactly this). Under a real network failure the user sees `TypeError: Network request failed` | Same class of defect as `S-3a` (uncentralized error handling), but here there was no local copy to sweep — just no handling at all. Found 2026-08-08 testing Spec 2a (queue item 1.4) |
| ~~**D8**~~ ✅ | **RESOLVED 2026-08-09** (`8fd05c3`, test coverage `80de05d`) — Spec 3 Tasks 2-3. Derivation gated on `userId`; both `placeholderData` lines kept, since they still earn their keep for in-session terreiro switches. Admin/curimba-level edit affordances leak to a logged-out viewer after logout, without a full app restart | `src/hooks/terreiroMembership.ts:92-158` — `useTerreiroMembershipStatus`'s query uses `placeholderData: (prev) => prev`. On logout, `userId` becomes `null` and the query key changes (to `[]`, disabled), so it never fetches fresh — but `placeholderData` still serves the *previous* query's last successful `data` as a stand-in. Every permission derived from this hook (`useTerreiroRole`, `canEditCustomTags`, etc.) keeps reading the pre-logout role until the component unmounts | **Sharper than `D1`.** D1 is a cache-eviction gap for keys that never carried `userId`; this key *does* carry `userId` and *is* correctly evicted from the cache by `app/_layout.tsx`'s logout cleanup — but `placeholderData` bypasses the cache read entirely, carrying the value at the React Query observer level. Fixing D1's eviction predicate will not fix this. Found 2026-08-08 testing Spec 1 (queue item 2.6): logged out mid-session after testing as admin/curimba, still saw admin-level buttons on a screen the guest should see as read-only |
| ~~**D9**~~ ✅ | **RESOLVED 2026-08-09** (`b5447c9`) — Spec 5 Task 4. `isLibraryPlayer` dropped from both the button and the flow mount; `requireAuth` and `user?.id` kept, so signed-out users still get the login sheet rather than a dead control. State renamed `libraryAddToCollectionOpen` → `addToCollectionOpen` so the gate does not look deliberate to the next reader. Add-to-collection "+" is entirely absent when a ponto is opened from a terreiro's own collection — only appears in the public-library player | `src/screens/Player/PlayerScreen.tsx:150` (`isLibraryPlayer = source === "all"`), gates both the button (line 625) and the `AddToCollectionFlow` mount (line 815) on `isLibraryPlayer`. `inCollectionPlayer` (line 204, `!isLibraryPlayer && !!collectionId`) has no add-to-collection path at all | **Confirmed pre-existing, not a Spec 2a regression** — the restriction predates the refactor (the deleted `LibraryPlayerAddToCollectionModal.tsx` had "Library" in its own name). **User decision (2026-08-08): treat as bug, fix here** — the feature already exists in the app; wiring it into collection-mode player completes expected behavior rather than adding a new one. Found testing Spec 2a (queue item 2.7); blocks 2.8 (can't test committing from this context until fixed) |
| ~~**D10**~~ ✅ | **RESOLVED 2026-08-09** (`2958f6d` utility, `cdfc461` the médium-tag call site) — Spec 4 Tasks 2 and 4. Matcher is narrow by design (the two known phrasings, never the bare word "network"), guarded by a decoy test. **See `X13`: it does not match bare strings, which matters for `S-3a`.** The shared `getErrorMessage` utility itself — not just its adoption — has no branch for network/connectivity failures, so any offline action shows the raw runtime string | `src/lib/errors.ts:1-22` (Spec 1's own foundation artifact): `if (e instanceof Error && ... e.message.trim()) return e.message;` passes a `TypeError` (or its stringified form) straight through with no normalization. Reproduced twice in one session under airplane mode: `D7` (Home search) and queue item 3.5 (Collection → `AddMediumTagSheet.tsx`, which has its own near-identical local copy at line 62 with the same gap) | **Fixing `S-3a` (routing every local copy through the shared util) will not fix this** — the shared util needs a network-error branch first, or every call site inherits the same ugly text regardless of centralization. Fix `D10` before or together with `S-3a`, not after it. Suggested friendly text: "Sem conexão. Verifique sua internet e tente novamente." |
| ~~**D12**~~ ✅ | **RESOLVED 2026-08-09** at **four** sites, not three (`94f4ddb` `ProfileSection`, `4733c21` `LogoutSection`, `e85875b` the overlay's "Sair" row **and** its profile identity row, found by the Task 6 scan) — Spec 3 Tasks 4-6. Preferences screen shows a broken "? Você" identity card and a nonsensical "Sair" button after logging out from within it | `src/screens/Preferences/components/ProfileSection.tsx` and `LogoutSection.tsx` (the `Preferences.tsx` stack-route implementation) have **no `!user` branch at all**. `ProfileSection` derives everything from `user?.xxx` with optional chaining, so on logout `nameFromMetadata`/`userEmail` become `""`, feeding `getDisplayName("")` → literally returns the string `"Você"` (`utils.ts:18`) and `getInitials("?")` → `"?"` — reproducing the exact "? Você" text reported. `LogoutSection` renders its "Sair" `Pressable` completely unconditionally, no auth check anywhere | **Confirmed to exist independently in the *other* parallel Preferences implementation too** — `TabsHeaderWithPreferences.tsx:1948-1959`'s own "Sair" button has the identical gap (no `user` guard in the JSX). This is `aggregation.md` §6.12 ("two overlapping Preferences UI implementations... changes to one do not automatically propagate to the other") manifesting concretely: fixing one screen does **not** fix the other; both need the same `!user` guard added independently until §6.12 itself is resolved. Neither screen currently redirects/closes on logout, so this state is reachable and not just a 1-frame flash — user reported it as directly observable. Found 2026-08-08 (queue item 5.2) |
| **D14** 🚫 | **PILOT BLOCKED 2026-08-09 — environmental, not a library problem.** Spec 6 stopped at its native build gate: `./gradlew assembleDebug` fails with `ninja: error: … Filename longer than 260 characters` because `LongPathsEnabled=0` on this machine and CMake mirrors the full source path under `.cxx` (367 chars vs a 260 limit). Zero other modules failed and CMake configure/generate both succeeded, so autolinking is fine — but whether the library links under SDK 54 + New Arch is **unproven in both directions**. The install was reverted so the Android build is not left broken. Unblock by enabling Win32 long paths (admin + reboot), then clear `android/.cxx` and re-run. See the plan's Task 2 Step 3 for the full transcript and alternatives. **Count correction: 13 files render `filler.png`, not nine.** | Text inputs near the bottom of a form are covered by the keyboard; the workaround is a fixed-height image the user must scroll past manually | Nine files render `assets/images/filler.png` as dead space at the end of a form, styled **identically** in every one: `{ width: "100%", height: 290, marginTop: spacing.lg }`. There is **no `KeyboardAvoidingView` anywhere in the codebase** — the filler is the entire strategy. `290` is a fixed guess against a variable quantity (keyboard height varies by device, OS, language, third-party keyboard, and whether the suggestion/emoji row is showing), which is exactly why it works sometimes and not others: taller keyboard → field still covered; shorter → a large gap. Nothing scrolls on its own in either case | User-reported 2026-08-09. Fix is [`react-native-keyboard-controller`](https://docs.expo.dev/versions/latest/sdk/keyboard-controller/)'s `KeyboardAwareScrollView`, which scrolls the focused input into view using the keyboard's real height. Android prerequisite is already met (`AndroidManifest.xml:19` sets `windowSoftInputMode="adjustResize"`). **Leverage: 8 of the 9 files render inside the shared `BottomSheet`**, so one shared change eventually fixes eight screens; `ReviewSubmission.tsx` is the lone outlier. **Split by user decision into a one-screen pilot ([Spec 6](specs/2026-08-09-spec-6-keyboard-avoidance.md)) and a rollout (Spec 7) gated on hands-on validation** — a shared component with 8 consumers cannot be changed in place and still be called a pilot |
| **D13** | No way to remove or override your own profile photo — user's explicit call: "isso é bug, precisamos arrumar" | Confirmed by exhaustive grep: `ProfileSection.tsx:47-52` (and duplicate logic in `TabsHeaderWithPreferences.tsx:346-347,694-695`) reads the avatar **only** from OAuth metadata (`user.user_metadata.avatar_url` / `.picture` — whatever Google provided at signup). There is no in-app avatar upload, override, or removal mechanism anywhere in `src/` for the user's own profile (terreiro cover-image upload is a separate, unrelated feature) | **Scope note, not a stall:** this isn't a broken delete button — no such control ever existed. You can't literally "delete" the Google-provided photo from Saravafy's side; the fix is a preference (e.g. a `profiles` column like `hide_avatar` / `use_initials_instead`) that makes the app show initials regardless of what the OAuth provider supplies. Flagging this precisely so a future spec doesn't scope it as "restore a missing button" |
| ~~**D11**~~ ✅ | **RESOLVED 2026-08-09** (`dc8459a`) — Spec 4 Task 5. Derivation extracted to `src/screens/Terreiros/deriveListErrorMessage.ts` (a sibling module, because a helper inside a screen component cannot be unit-tested — importing it drags in AsyncStorage) and covered by 4 tests. `<QueryBoundary>`'s stale-while-revalidate guarantee is defeated at its own Terreiros adoption site for the error case — a background refetch failure hides a fully-loaded list behind a full-screen error card | `src/screens/Terreiros/Terreiros.tsx:430-433`. The `isLoading` variable correctly guards against hiding cached data (`terreirosQuery.isFetching && terreiros.length === 0`) — but `error` has **no equivalent guard**: `terreirosQuery.isError ? "..." : null`, true regardless of whether `terreiros.length > 0`. Both feed into the synthetic query object at line 528 (`data: error \|\| isLoading ? undefined : filteredTerreiros`), so *any* background refetch error — not just a manual retry — zeroes `data` and forces `<QueryBoundary>` into its error branch, covering content that was already on screen | This is the exact failure mode `<QueryBoundary>` was built to prevent (Spec 1 §3.3: "Error with stale data... render children(data)... Prevents flicker on transient failures") — undone by how the wrapper constructs its input, not by the component itself. **Reproducible without pull-to-refresh** (which doesn't exist — see queue 4.2 note): wait past the 30s `staleTime` on the Terreiros tab, then go offline and trigger any refetch (revisit the tab, or the boundary's own retry button at line 545). Fix: mirror the `isLoading` pattern — `error: terreirosQuery.isError && terreiros.length === 0 ? "..." : null` |

Detail for each: `docs/architecture/aggregation.md` §6.10, §6.11, §6.7, §6.6, §6.8.

---

## P0.5 — dependency drift (found 2026-08-08, via `npx expo-doctor`)

Surfaced while preparing a native rebuild: a clean `npm install` failed with an `ERESOLVE` conflict
because `jest-expo` had drifted 2 majors ahead of the installed Expo SDK (fixed same day, commit
`6d08cdb`). That prompted a full `expo-doctor` pass — Expo's own SDK-compatibility diagnostic —
which found more of the same class of problem. Not yet actioned; listed here rather than fixed
immediately because upgrading native deps right before the human validation pass would introduce a
new variable while trying to isolate whether the reported bugs (flicker, routing) still exist.

| ID | Finding | Severity | Why |
|---|---|---|---|
| **N1** | `react-native-track-player` is **not supported on New Architecture** | 🔴 high | `app.config.ts:76` sets `newArchEnabled: true` (required by Reanimated 4), and `android/gradle.properties:38` confirms it's active. RNTP is the app's sole audio playback engine (`aggregation.md` — "RNTP as single source of truth"). A documented incompatibility here is a strong candidate for exactly the class of bug this whole effort targets — native crashes or inconsistent playback behavior that would look "random" from the JS side |
| **N2** | `@react-native-community/netinfo` installed at `12.0.1`, Expo SDK 54 expects `11.4.1` (major ahead) | 🟡 medium | Same *shape* of defect as the `jest-expo` fix — a native module ahead of the SDK it's paired with. This package belongs to the uncommitted offline-sync WIP (`S-5`); fix it together with that spec, not in isolation |
| **N3** | 11 `expo-*` packages behind by a patch version each | 🟢 low | `npx expo install --check` fixes in one pass. No known behavioral risk |
| **N4** | `react-native-gesture-handler` `2.30.0` vs expected `~2.28.0` (minor) | 🟢 low | Within normal drift; gesture handling is already flagged as fragmented in `code-quality-audit.md` §3.1 (4 contexts) — worth re-checking together if that work happens |
| **N5** | `@types/jest` `30` vs expected `29.5.14` | 🟢 low | Types-only, dev dependency, no runtime effect |

**Next step:** re-run `npx expo-doctor` after the human validation pass. Fix N3–N5 as a routine
patch-bump commit (low risk, do anytime). Fix N2 as part of `S-5`.

> **DECISION (2026-08-08, user call): N1 / player rework is explicitly deprioritized to LAST, and
> is scoped as a full rebuild, not a patch.**
>
> Context: the current player (RNTP-based, including its notification/media-session controls) was
> a source of real user pain **before** this refactor effort started — the user described it as
> traumatic and confirmed it was part of what motivated starting the mobile-app cleanup in the
> first place. The N1 finding above (RNTP unsupported on New Architecture) is corroborating
> technical evidence for something the user already knew experientially. Notification media
> controls were previously patched around at least twice (see git history: `c60729d`, `148f726`)
> rather than fixed at the root.
>
> **Scope when this is eventually tackled:** not just an engine swap (RNTP → another library) —
> **a full redesign of the player experience.** This is a deliberate, explicit exception to this
> project's stated "no new features, fix what exists" objective ([`CLAUDE.md`](../../../CLAUDE.md),
> [`README.md`](README.md)) — noted here so it isn't silently applied as precedent to other backlog
> items. Everything else in this document stays fix-only.
>
> **Do not start this now.** Purely a marker for when the P0/P1/P2 work above is done.

---

## P1 — contract holes

| ID | Item | Why it is P1 |
|---|---|---|
| **C1** | **Close the query-key contract.** Every key from `src/queries/queryKeys.ts`; no inline literals | 5 ad-hoc keys confirmed live across 6 files. Invalidation silently misses them — this is the mechanism behind D5 and half of §6.2. **A fifth key was introduced during the Spec 2a refactor itself** (`AddToCollectionFlow.tsx:232`), which proves dedup without this contract just relocates the defect |
| **C2** | Terreiro keys fragmented across 3 namespaces (`terreiro.*`, `terreiros.*`, flat top-level) | The flat keys are exactly the ones that escape logout eviction — C1 and D1 are the same root cause. Fix together |
| **C3** | Enforce one mutation shape: cancel → snapshot → optimistic → rollback → invalidate, **or** no optimistic update at all | Three shapes coexist today (`aggregation.md` §6.6). The middle ground — optimistic without rollback — produced D4 and is strictly worse than either endpoint |
| **C4** | Shared schema-tolerance utility (column-missing detect + retry) | Independently reimplemented in 10+ files (`aggregation.md` §6.5). Most pervasive duplication in the repo; each copy is a place a fallback can be subtly wrong |
| **C5** | Two parallel Preferences UIs (`TabsHeaderWithPreferences` overlay vs `Preferences.tsx` route) diverging silently | `aggregation.md` §6.12. Prime suspect for the reported screen-transition flicker. **Concretely confirmed 2026-08-09 via `D12`**: the exact same missing-`!user`-guard bug exists independently in both implementations — proof this isn't theoretical, fixes to one really don't reach the other. **Cost paid 2026-08-09:** Spec 3 had to write the same guard twice, in three separate commits across two implementations — and the scan of the overlay then turned up a *fourth* unguarded site the route implementation never had. Every future auth-shaped fix pays this tax until C5 lands |
| **C6** | Deprecated keys still actively invalidated (`me.terreirosWithRole`, `collections.available`) | `aggregation.md` §6.9. Dead contract that still looks live |
| **C7** | `queryKeys.me.profile(userId)` holds a boolean written by `CuratorModeContext` | `aggregation.md` §6.4. Key name implies an object; a future profile query would clobber it |

---

## P2 — duplication and structure

| ID | Item | Source |
|---|---|---|
| **S-2c** | Extract `VersaoPickerRows` + `EntidadeResolver` shared across all 3 add-to-collection surfaces, including the inverse flow `AddToCollection.tsx` (1,328 LOC), which Spec 2a left untouched | Spec 2a §2.2 (referenced there as "Spec 2c") |
| **S-3a** ⚠️ | **UNBLOCKED 2026-08-09 by Spec 4** — the shared utility now handles connectivity, so sweeping no longer spreads the raw-message defect (that was the whole reason `D10` had to land first). Real count is **10 copies, not 8** (inventory 2026-08-09: 12 definitions = 1 canonical + 11 copies, of which Spec 4 removed one). **Two things to know before starting:** (1) `src/screens/CollectionAddToCollection/addToCollectionModel.ts:107` is *exported* — check its importers rather than assuming every copy is file-local; (2) decide `X13` first, since a call site passing `String(e)` would keep leaking the raw text | Spec 1 §"Adoption deferred", Spec 2a §2.2, Spec 4 Task 1 inventory |
| **S-3b** | Sweep the 10+ remaining inline `role === "admin"` checks onto `useTerreiroRole` | same |
| **S-3c** | Adopt `<QueryBoundary>` at the remaining ~14 query consumers | Spec 1 plan, implementation notes |
| **S-4a** | Navigation: 4 fragmented gesture/pager contexts (`RootPager`, `TabController`, `GestureBlock`, `GestureGate`) → unify | `code-quality-audit.md` §3.1. **Second prime suspect for transition flicker**, alongside C5. **Confirmed 2026-08-09: a whole masking layer already exists for this** — `src/utils/navCover.ts` is a pub-sub "cover" overlay shown before a nav push and held until the destination calls `markNavCoverReady()`, wired into `TabsHeaderWithPreferences.tsx` (`showNavCover`/`prewarmPreferences`, ~line 505) and `Preferences.tsx` (`setNavCoverVisible`/`useNavCoverState`), plus dev-only debug tooling (`__saravafyDebugGhostAmplifyUntil`, `__saravafyDebugPrefsCoverEnabled`) built specifically to diagnose this exact flicker. **User decision:** the mask currently works (queue 6.4: no visible flash today) but this refactor should fix the underlying transition issue at the root, not just verify the mask still holds. **Acceptance bar for a future spec: `navCover.ts` and its debug tooling can be deleted entirely and the transition still doesn't flicker** — that's the signal the root cause is actually fixed, not papered over again |
| **S-4b** | No centralized deeplink handler; each route handles its own | `code-quality-audit.md` §3.1 |
| **S-4c** | Batch the N+1 cascades in `Collection.tsx:300-310` and `PlayerScreen.tsx:226-229` | `code-quality-audit.md` §2.4. Needs a backend RPC change |
| **S-4d** | `.map()` over member lists inside `ScrollView` → `FlatList` | `code-quality-audit.md` §2.1 |
| **S-4e** | `fetchAllPontos` has no limit — whole catalog into local state on every Home mount | `aggregation.md` §6.15 |

### Monolith splits — deliberately last

Per explicit decision (2026-08-08): componentization comes **after** P0/P1, as a consequence of
fixing them rather than as an end in itself. A 3,000-line file matters because it hides
multiple sources of truth, not because of its length.

| File | LOC | Target |
|---|---|---|
| `TabsHeaderWithPreferences.tsx` | 3,164 | ~1,500 + 4 extractions (contains a nested 630-LOC component) |
| `TerreiroEditor.tsx` | 2,906 | ~1,200 + 4 extractions |
| `TerreiroBiblioteca.tsx` | 2,113 | + animation hook, header, list |
| `Home.tsx` | 2,109 | + 2 mutation hooks, 2 sheets |
| `Collection.tsx` | 2,009 | + header, list, tag-mutation hook |
| `ReviewSubmission.tsx` | 1,959 | + rpc fallback, error map, player, form |
| `PontoUpsertModal.tsx` | 1,840 | + form hook, rights consent hook, upload section |
| `InviteGate.tsx` | 1,498 | + snooze hook, fetch hook, actions, modal (19 refs — over-fragmented state machine) |

Full split proposals: `code-quality-audit.md` §1.

---

## P3 — cleanup

| ID | Item | Source |
|---|---|---|
| **X1** | `getErrorMessage` spec/impl mismatch: Spec 1 §3.2 says returns **trimmed** message; `src/lib/errors.ts` returns untrimmed; the test is titled `"trims..."` but asserts untrimmed. Decide the contract, fix all three | `CONVENTIONS.md` §7 |
| **X2** | Dead branch in `src/lib/errors.ts`: `if (e == null && fallback !== undefined) return fallback;` is fully subsumed by the following `return fallback ?? String(e);` | Review 2026-08-08 |
| **X3** | 507 `any` casts; hotspot `src/api/pontoAudio.ts` (20+) | `code-quality-audit.md` §3.7 |
| **X4** | `PontoSubmissionKind` domain mismatch — `"issue"` in `src/domain/ponto.ts` vs `"problem"` in review UI mapping | `aggregation.md` §6.14 |
| **X5** | Dead prefetch: `useHomeFeedPontos` and `useExploreTerreiros` warmed at boot, never consumed | `aggregation.md` §6.1 |
| **X6** | Offline `bytesEstimate` measures the JSON metadata blob, not audio size, and is shown to users as "Tamanho" | `aggregation.md` §6.16 |
| ~~**X7**~~ | Offline auto-sync WIP — **decided 2026-08-08: keep it, spec it after the validation pass.** Promoted to `S-5` below | Working tree |
| **X15** | `addPontoToCollection` has **two** consumers, and Spec 5 only reached one. `AddToCollection.tsx:591-612` (the inverse flow) now hits the newly-reachable `alreadyExists` branch and shows the right toast, but unlike `AddToCollectionFlow.tsx:502-517` it does **not** revert its optimistic writes — and its `onSettled` invalidates `collections.pontos` and `collections.byId` but **not** `["terreiros","collectionsByTerreiro"]`, which is the key `incrementCollectionPontosCountInTerreiroLists` patched. So a duplicate add from that surface leaves the collection's `pontosCount` badge **+1 too high** until something else invalidates it. Not a regression — before Spec 5 this path had the same stale count *plus* a false success toast — and it is partly shielded by the `alreadyInCollectionIds` pre-check at line 630. Natural rider on `S-2c`, which already owns this file | Spec 5 final whole-branch review, 2026-08-09 |
| **X16** | `D9`'s ungating also un-gates two queries. `PlayerScreen.tsx:814` mounts `AddToCollectionFlow` with `visible={false}` whenever `user?.id && activePonto`, and `useEditableCollections` / `useMyEditableTerreirosQuery` are **not** gated on `visible` — unlike `useEntidadesCatalogQuery` and `versoesQuery`, which are. The collection-mode player now warms two queries it never did. Real cost is low (`staleTime` 5 min / 1 min, keys shared with the Home flow), so this is recorded rather than actioned | Spec 5 final whole-branch review, 2026-08-09 |
| **X14** ⚠️ | `collections_pontos`'s INSERT policy is **broader than its three SELECT policies**. A terreiro-owned collection with `owner_user_id IS NULL` and `visibility = 'private'` would be writable by a curimba/editor but readable by none of them — so the `RETURNING` read that `D6`'s fix now depends on would miss its own row. **No live gap:** 0 of 24 collections are in that shape (22 terreiro-owned, all `public`/`members`), but `private` is a valid enum value. Worst case is a wrong message on a successful add, never data loss. Pre-existing, but `D6`'s fix is the first code to depend on the asymmetry. Could not be resolved empirically without writing into `collections_pontos`, which the plan forbade | Spec 5 Task 2 DB verification, 2026-08-09 |
| **X13** ⚠️ | `isNetworkError` (`src/lib/errors.ts`) does not match a **bare string** — extraction reads `.message` off `Error`s and objects only, so `"Network request failed"` as a plain string returns `false` and `getErrorMessage` returns it verbatim through its own string branch. No live bug today (grepped: no call site stringifies before calling), but **`S-3a` should not start until this is decided** — some of the 10 remaining copies may pass `String(e)`. Widening with a `typeof e === "string" ? e : …` arm does not break the existing `isNetworkError("boom") === false` assertion. Left as-is deliberately: the plan prescribed this exact code, so changing it is a human call, not an agent's | Spec 4 Task 2 review, 2026-08-09 |
| **X9** | Test output is not pristine: `AddToCollectionFlow.test.tsx` emits 3 × `An update to Icon inside a test was not wrapped in act(...)`. Pre-existing (last touched by Spec 2a, `7f15a70`) and unrelated to Spec 3 — confirmed by running that suite alone. Noise trains readers to ignore the gate | Spec 3 review, 2026-08-09 |
| **X10** | `src/screens/Player/PlayerScreen.tsx:213` — `membership` binding assigned and never read | Spec 3 Task 1 consumer inventory, 2026-08-09 |
| **X11** | The Supabase query-builder mock is duplicated near-verbatim in `terreiroMembership.test.tsx` and `useTerreiroRole.test.tsx` — **and so is the `flushMacrotask` helper**, verbatim in both. Two copies each to keep in sync when the real query shape or React Query's scheduling changes | Spec 3 review, 2026-08-09 |
| **X12** | No render tests exist for `ProfileSection`, `LogoutSection`, or `TabsHeaderWithPreferences`. Spec 3's guards are hook-order-sensitive — the class of break that passes `tsc` and every current test, then crashes at runtime | Spec 3 review, 2026-08-09 |
| **X8** | `prefetchTerreirosWithRole` (`terreirosWithRole.ts:343-354`) exists but is never called from `app/_layout.tsx`'s boot prefetch plan | Verified 2026-08-08 (queue 4.1) while confirming `aggregation.md` §6.1: boot only prefetches `terreiros.exploreInitial()` (via `prefetchExploreTerreiros`), which `Terreiros.tsx` doesn't consume — it reads `terreiros.withRole(userId)` instead, which has its own ready-to-use prefetch helper sitting unwired. §6.1's "dead prefetch" finding is **confirmed accurate**, not a false positive like Spec 1's waves 7/8. Low priority: user reports the tab already feels fast in practice (likely `staleTime`/session cache from a prior visit, not a boot warm) |

---

## S-5 — Offline auto-sync: retro-spec after validation

**Status:** code is in the working tree, uncommitted, with no spec and no tests.
**Decision (2026-08-08):** keep it. Do **not** revert. Write the spec *after* the batched human
validation pass, using what that pass observes as input.

**Why this ordering:** the code changes offline-banner and re-sync behaviour, so it will be live
during validation anyway. Reverting would mean testing an app that is not the one being built.
Writing the spec first would mean guessing at behaviour that a single run of the app will show
directly.

> **Update (2026-08-09): offline testing itself deprioritized to post-refactor, not just this
> pass.** Confirmed during validation (queue 4.4) that the dev client cannot launch with airplane
> mode already on — real cold-cache-offline testing needs a standalone/EAS production build, not
> the dev client this whole effort has been using. Rather than test offline behavior piecemeal
> against the wrong build type, it gets one dedicated round with a prod build **after** the
> fix-only refactor lands. `S-5`'s spec-writing waits on that round, not on this validation pass
> alone.

**Files in scope:**

| File | State |
|---|---|
| `src/hooks/useOfflineAutoSync.ts` | new, untracked |
| `src/components/OfflineBanner.tsx` | modified (+75/−5) |
| `app/_layout.tsx` | modified (+7) |
| `src/queries/collectionPontos.ts` | modified |
| `src/screens/Player/components/AudioPlayerFooter.tsx` | modified |
| `src/screens/Player/hooks/useCollectionPlayerData.ts` | modified |

**Inputs the spec will need from validation:** anything logged in the
[`HUMAN-VALIDATION-QUEUE.md`](HUMAN-VALIDATION-QUEUE.md) "Fora de escopo" table relating to
connectivity, the offline banner, or re-sync on foreground.

**Then:** reconstruct intent from the diff + observed behaviour, write spec and plan per
[`CONVENTIONS.md`](CONVENTIONS.md), add tests, and land it as a normal commit. Related existing
doc: `docs/architecture/offline-sync.md` (generated 2026-06-12 — predates this work, so treat as
background, not as a description of the current code).

---

## Future feature ideas — explicitly out of scope for this effort

Not bugs, not cleanup. This effort is fix-only (see [`README.md`](README.md)); the one deliberate
exception is the player redesign noted above. Anything else that comes up during testing that's a
*new capability* rather than a defect goes here, not into the P-tiers, so it never gets
accidentally worked as if it were in scope.

| ID | Idea | Context |
|---|---|---|
| **F1** | Members-only collection gate + private collections | User request, 2026-08-08 (queue item 3.4). The **read side already partly exists**: `Collection.tsx:207` derives `isMembersOnly` from `collection.visibility === "members"` and renders a gate UI + join-request affordance at line 1250 when true. But **no write path exists anywhere** — grepped every collection create/edit screen, none sets `visibility`. So the gate is currently dead code; no collection in the live app can ever have `visibility: "members"`. A future spec would add the write-side UI (a visibility picker on create/edit: public / members-only / private) and decide what "private" means precisely (not just members-only — fully hidden from non-owners?). |
| **F2** | Search/filter UI for the Terreiros directory | User comment, 2026-08-08 (queue item 4.5). Confirmed by code that this is already the intended design, not a bug: `fetchTerreirosWithRole` (`terreirosWithRole.ts:100+`) queries **all** terreiros unconditionally — no `WHERE` on membership — joining `terreiro_members` only to overlay a role badge for terreiros the viewer belongs to. The Terreiros tab is a public directory by design; a client-side `searchQuery`/`matchesTerreiroQuery` filter already exists in `Terreiros.tsx:435-438`, so a visible search affordance is mostly UI work on top of a working filter, not new plumbing. |

---

## Not yet audited

Untouched by any pass so far: bundle size / Hermes profile, crash analytics, memory leaks (audio
buffers, image cache, listeners), Supabase request count per screen, accessibility, i18n, EAS/OTA
pipeline, native patches in `patches/`, backend RPC compatibility matrix.

Source: `code-quality-audit.md` §5.
