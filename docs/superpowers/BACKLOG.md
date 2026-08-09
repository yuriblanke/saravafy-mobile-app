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

All five verified against source on 2026-08-08. Not doc claims — code was read.

| ID | Defect | Evidence | Impact |
|---|---|---|---|
| **D1** | Logout does not evict non-user-scoped cache keys | `app/_layout.tsx:206,212` — predicate is `q.queryKey.includes(prevUserId)`. Keys like `["terreiroMembersCount", terreiroId]`, `["terreiroMembersListInfinite", ...]`, `["terreiro", id, "members"]` carry no `userId` and survive logout | One user's terreiro membership data can surface for the next user on the same device |
| **D2** | Audio attached to a new ponto submission is always lost | `PontoUpsertModal.tsx:591` selects `approved_ponto_id` immediately after INSERT; that column is only written by the curator's approve RPC, so it is always `null` and L609 falls through to the error toast | Submission saves, audio silently discarded |
| **D3** | "Reenviar convite" is a no-op that reports success | `terreiroMembership.ts:1224-1228` — only `.update({ updated_at })`. Source comment reads *"This is a placeholder implementation"*. Called from 2 screens | UI asserts something that did not happen |
| **D4** | Optimistic tag mutations have no rollback | `AddMediumTagSheet.tsx:203` calls `setQueriesData` with no prior `getQueriesData` snapshot and no `onError` | Network failure leaves the UI showing unsaved state until staleTime expires |
| **D5** | Edit-ponto bypasses React Query entirely | Direct `UPDATE` on `pontos` + `ponto_versoes`, then `setPontos` on local state. No invalidation of `pontos.feed`, `collections.pontos(id)`, or `["pontos","all","public"]` | Edited ponto shows stale on every screen that did not trigger the edit |

Detail for each: `docs/architecture/aggregation.md` §6.10, §6.11, §6.7, §6.6, §6.8.

---

## P1 — contract holes

| ID | Item | Why it is P1 |
|---|---|---|
| **C1** | **Close the query-key contract.** Every key from `src/queries/queryKeys.ts`; no inline literals | 5 ad-hoc keys confirmed live across 6 files. Invalidation silently misses them — this is the mechanism behind D5 and half of §6.2. **A fifth key was introduced during the Spec 2a refactor itself** (`AddToCollectionFlow.tsx:232`), which proves dedup without this contract just relocates the defect |
| **C2** | Terreiro keys fragmented across 3 namespaces (`terreiro.*`, `terreiros.*`, flat top-level) | The flat keys are exactly the ones that escape logout eviction — C1 and D1 are the same root cause. Fix together |
| **C3** | Enforce one mutation shape: cancel → snapshot → optimistic → rollback → invalidate, **or** no optimistic update at all | Three shapes coexist today (`aggregation.md` §6.6). The middle ground — optimistic without rollback — produced D4 and is strictly worse than either endpoint |
| **C4** | Shared schema-tolerance utility (column-missing detect + retry) | Independently reimplemented in 10+ files (`aggregation.md` §6.5). Most pervasive duplication in the repo; each copy is a place a fallback can be subtly wrong |
| **C5** | Two parallel Preferences UIs (`TabsHeaderWithPreferences` overlay vs `Preferences.tsx` route) diverging silently | `aggregation.md` §6.12. Prime suspect for the reported screen-transition flicker |
| **C6** | Deprecated keys still actively invalidated (`me.terreirosWithRole`, `collections.available`) | `aggregation.md` §6.9. Dead contract that still looks live |
| **C7** | `queryKeys.me.profile(userId)` holds a boolean written by `CuratorModeContext` | `aggregation.md` §6.4. Key name implies an object; a future profile query would clobber it |

---

## P2 — duplication and structure

| ID | Item | Source |
|---|---|---|
| **S-2c** | Extract `VersaoPickerRows` + `EntidadeResolver` shared across all 3 add-to-collection surfaces, including the inverse flow `AddToCollection.tsx` (1,328 LOC), which Spec 2a left untouched | Spec 2a §2.2 (referenced there as "Spec 2c") |
| **S-3a** | Sweep the 8 remaining local `getErrorMessage` copies onto `src/lib/errors` | Spec 1 §"Adoption deferred", Spec 2a §2.2 |
| **S-3b** | Sweep the 10+ remaining inline `role === "admin"` checks onto `useTerreiroRole` | same |
| **S-3c** | Adopt `<QueryBoundary>` at the remaining ~14 query consumers | Spec 1 plan, implementation notes |
| **S-4a** | Navigation: 4 fragmented gesture/pager contexts (`RootPager`, `TabController`, `GestureBlock`, `GestureGate`) → unify | `code-quality-audit.md` §3.1. **Second prime suspect for transition flicker**, alongside C5 |
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
| **X7** | Uncommitted offline auto-sync work (`useOfflineAutoSync.ts` + 5 edited files) has no spec and no tests. Decide: spec it, or revert | Working tree, 2026-08-08 |

---

## Not yet audited

Untouched by any pass so far: bundle size / Hermes profile, crash analytics, memory leaks (audio
buffers, image cache, listeners), Supabase request count per screen, accessibility, i18n, EAS/OTA
pipeline, native patches in `patches/`, backend RPC compatibility matrix.

Source: `code-quality-audit.md` §5.
