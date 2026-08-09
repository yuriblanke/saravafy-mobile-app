# Spec 2a — AddToCollection unification

**Date:** 2026-06-14
**Source:** [code-quality-audit.md](../../architecture/code-quality-audit.md) wave 1.
**Depends on:** Spec 1 Foundations (uses `useTerreiroRole`, `getErrorMessage`, `<QueryBoundary>` artifacts).
**Sibling:** Spec 2b (PreferencesContext → RQ) — independent; can land in either order.

## 1. Goal

Eliminate UI duplication between the 2 fixed-ponto/pick-collection add-to-collection implementations by extracting a single `<AddToCollectionFlow>` shared component. The dedicated route (`AddToCollection.tsx`) is **out of scope** — it is the inverse flow (fixed-collection/pick-ponto) and merits a separate consolidation (deferred to Spec 2c: extract `VersaoPickerRows` + `EntidadeResolver` sub-components shared across all 3).

## 2. Scope

### 2.1 In scope

1. **Unify 2 fixed-ponto add-to-collection implementations** into a single `<AddToCollectionFlow>` shared component:
   - `src/screens/Home/components/HomeAddToCollectionWizard.tsx` (693 LOC) — inline wizard in Home BottomSheet
   - `src/screens/Player/components/LibraryPlayerAddToCollectionModal.tsx` (784 LOC) — modal variant from Player

### 2.2 Out of scope (later)

- `src/screens/CollectionAddToCollection/AddToCollection.tsx` (1,328 LOC) — **inverse flow** (fixed-collection, pick-ponto). Deferred to Spec 2c, which extracts shared sub-components (`VersaoPickerRows`, `EntidadeResolver`) used by all 3.
- 8 remaining `getErrorMessage` local copies (Spec 3 sweep).
- 10+ remaining inline role checks (Spec 3 sweep).
- Performance optimizations on the unified flow (Spec 4).

### 2.3 Known constraints

- Existing shared model: `src/screens/CollectionAddToCollection/addToCollectionModel.ts` already has `ListPonto`, `toPlayerPonto`, `toListPonto`, `resolveDefaultPontoVersaoId`, `versaoCardTitle`, `getLyricsPreview`, `getErrorMessage`. **Real duplication is UI shell + state machine, not data layer.**
- Investigator-confirmed convergence between Home and Player: entidade placeholder resolution pattern is identical; collection row list rendering is near-identical; cache invalidation differs (Player's snapshot-rollback pattern is more robust — adopt it).
- Investigator-confirmed divergence: Home has 2-phase wizard (`versao` → `colecao`); Player is single-phase with pre-selected `activeVersao`. Unified component supports both via `allowVersionSelection` + `initialPhase` props.

## 3. Acceptance criteria

### 3.1 `<AddToCollectionFlow>` shared component

- **Location:** `src/features/addToCollection/AddToCollectionFlow.tsx`
- **API:**
  ```tsx
  type AddToCollectionFlowProps = {
    ponto: ListPonto;              // ponto to add
    onClose: () => void;           // close/back
    onSuccess?: (collectionId: string) => void; // optional toast/nav callback

    // Optional UI tweaks per host:
    titleOverride?: string;        // default "Adicionar à coleção"
    showCreateOption?: boolean;    // default true; player/home may hide if context doesn't support
    initialCollectionId?: string | null; // pre-select (e.g. when opened from collection detail)
  };
  ```
- **Behavior:**
  - Fetches user's editable collections (admin + curimba via `useMyEditableTerreirosQuery`) + personal collections.
  - Shows search input, list of eligible collections, "create new collection" affordance (if `showCreateOption`).
  - On commit: calls `addPontoToCollection` (existing model fn). Handles success/duplicate/error via shared `getErrorMessage` + `<QueryBoundary>` patterns from Spec 1.
  - Versão selection + entidade resolution: reuse logic from existing `AddToCollection.tsx` (the most complete impl).
  - Loading/error states: `<QueryBoundary>` for the collections list query.

### 3.2 Two host call sites replaced

- **`HomeAddToCollectionWizard.tsx`** → DELETED. Home opens `<AddToCollectionFlow>` directly inside its existing BottomSheet.
- **`LibraryPlayerAddToCollectionModal.tsx`** → DELETED. Player opens `<AddToCollectionFlow>` directly inside its existing modal shell.
- **`AddToCollection.tsx`** → untouched in this spec (inverse flow). Spec 2c will extract its shared sub-components.

**Net LOC reduction target:** 2 files (1,477 LOC) → ~1 flow (~650 LOC) + ~30 LOC of host-site integration per host (~60 LOC total) = ~710 LOC. **Reduction: ~770 LOC.**

## 4. Non-goals

- Do NOT rewrite the data model (`addToCollectionModel.ts`) — already correct.
- Do NOT change RPCs, table schemas, or RLS policies.
- Do NOT add new add-to-collection features (e.g. multi-ponto, bulk add). Strict consolidation.
- Do NOT migrate `useMyEditableTerreirosQuery` — different role scope (admin + curimba), keep distinct.

## 5. Risks

| Risk | Mitigation |
|---|---|
| `<AddToCollectionFlow>` diverges from one host's UX expectations | Read all 3 impls side-by-side; document UX differences in the unified component; expose props (`titleOverride`, `showCreateOption`, `initialCollectionId`) for variation. |
| `queryClient.invalidateQueries` order matters (RPC commits before cache invalidation) | Mirror existing pattern: invalidate in mutation `onSuccess` / `onSettled`, never inside the mutation fn. |
| Test infra fallback (react-test-renderer) limits component testing | Use snapshot + tree-instance queries; defer integration tests of the flow to Spec 4. |
| Versão selection + entidade resolution logic in `AddToCollection.tsx` is the most complete; risk of losing edge cases when porting | Port verbatim from `AddToCollection.tsx`; cross-check with the 2 simpler impls for any branch they handle that the dedicated route misses. |

## 6. Testing

- **Component tests:**
  - `src/features/addToCollection/AddToCollectionFlow.test.tsx` — render with mocked collections, simulate search, simulate select + commit, simulate empty state, simulate error.
- **Manual smoke (per consumer):**
  - Open Home → tap ponto → "Adicionar a coleção" → commit.
  - Open Player → menu → "Adicionar a coleção" → commit.

## 7. Deliverables

| File | Type | LOC |
|---|---|---|
| `src/features/addToCollection/AddToCollectionFlow.tsx` | create | ~650 |
| `src/features/addToCollection/AddToCollectionFlow.test.tsx` | create | ~200 |
| `src/screens/Home/components/HomeAddToCollectionWizard.tsx` | DELETE | -693 |
| `src/screens/Player/components/LibraryPlayerAddToCollectionModal.tsx` | DELETE | -784 |
| `src/screens/Home/Home.tsx` (or wherever HomeAddToCollectionWizard is mounted) | edit | ~+30 / -30 (wire new flow) |
| `src/screens/Player/PlayerScreen.tsx` (or wherever LibraryPlayerAddToCollectionModal is mounted) | edit | ~+30 / -30 (wire new flow) |

**Net LOC:** ~+850 new, ~-1,477 removed = **−627 LOC** ✅ (smaller than original prediction; the original conflated 2 flow directions)

## 8. Definition of done

Split per [`CONVENTIONS.md`](../CONVENTIONS.md) §4. A pending human check never blocks a commit.

### Agent DoD — ✅ met (2026-08-08)

- [x] `npx tsc --noEmit` produces **zero output**.
- [x] Test suite reports **0 failures** (5 suites, 34 tests), including new `AddToCollectionFlow.test.tsx`.
- [x] `HomeAddToCollectionWizard.tsx` and `LibraryPlayerAddToCollectionModal.tsx` deleted; repo-wide
      grep returns no references.
- [x] No inline query-key literals remain — see the note below (fixed, not skipped).
- [x] Audit doc `code-quality-audit.md` wave 1 row cross-linked to this spec.

### Human DoD — deferred

Appended to [`HUMAN-VALIDATION-QUEUE.md`](../HUMAN-VALIDATION-QUEUE.md) §1 and §2: the Home
2-phase wizard and the Player single-phase flow both commit correctly and behave as before.

> **⚠️ CONTRACT VIOLATION INTRODUCED BY THIS SPEC — fixed 2026-08-08.**
>
> `AddToCollectionFlow.tsx:240` declared an inline query key:
>
> ```ts
> queryKey: ["pontos", "versoesBatch", "addToCollectionFlow", ponto.id]
> ```
>
> This reproduced the exact defect the spec was meant to consolidate away. The key it replaced
> (`["pontos","versoesBatch","homeAddWizard",pontoId]`) was one of the four ad-hoc keys catalogued
> in `aggregation.md` §6.2 — keys outside `src/queries/queryKeys.ts` that no mutation can invalidate
> because invalidation helpers cannot see them.
>
> **Resolution.** A repo-wide grep found a *second* pre-existing offender using the same
> `"pontos","versoesBatch"` prefix: `AddToCollection.tsx:415-421` (the inverse-flow screen, out of
> scope for this spec but sharing the same fetcher shape). Both differentiator segments
> (`"addToCollectionFlow"` for a single ponto, `"addToCollectionSearch"` for a joined batch from
> search) are a legitimate per-caller distinction, not arbitrary — so the fix was to register the
> pattern, not collapse it:
>
> ```ts
> // src/queries/queryKeys.ts, under pontos:
> versoesBatch: (scope: string, idsKey: string) =>
>   ["pontos", "versoesBatch", scope, idsKey] as const,
> ```
>
> Both call sites now read `queryKeys.pontos.versoesBatch(scope, idsKey)`. Verified: `tsc` clean,
> 34/34 tests pass, and `grep '"pontos", "versoesBatch"'` across `src/` matches only the registry
> definition itself.
>
> This query is read-only within its 60s `staleTime` and no mutation writes through it, so the
> defect's practical severity here was low — but the pattern is what mattered: deduplicating UI
> while re-inventing the cache key relocates the bug instead of removing it. Closing the full
> registry contract (all remaining ad-hoc keys, `aggregation.md` §6.2/§6.3) stays open as `C1` in
> [`BACKLOG.md`](../BACKLOG.md); see [`CONVENTIONS.md`](../CONVENTIONS.md) §11.

## 9. Open questions

- **Q1:** Should `<AddToCollectionFlow>` be a single component or split into `<AddToCollectionList>` + `<AddToCollectionCommit>` for testability? **A:** Single component for now — internal helpers can be private functions. Premature split adds surface area; revisit if testability suffers.
- **Q2:** Does `HomeAddToCollectionWizard` have wizard-specific UX (multi-step) that the unified flow lacks? **A:** Per LOC count (693 < 1,328) it's a simplified variant. Audit didn't flag unique features; assume superset (`AddToCollection.tsx`) covers it. Verify during impl — if a missing step surfaces, add a `wizardMode?: boolean` prop.
