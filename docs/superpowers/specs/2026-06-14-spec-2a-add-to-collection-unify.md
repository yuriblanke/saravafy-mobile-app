# Spec 2a — AddToCollection unification

**Date:** 2026-06-14
**Source:** [code-quality-audit.md](../../architecture/code-quality-audit.md) wave 1.
**Depends on:** Spec 1 Foundations (uses `useTerreiroRole`, `getErrorMessage`, `<QueryBoundary>` artifacts).
**Sibling:** Spec 2b (PreferencesContext → RQ) — independent; can land in either order.

## 1. Goal

Eliminate the 3 divergent add-to-collection implementations by extracting a single `<AddToCollectionFlow>` shared component used by all 3 call sites.

## 2. Scope

### 2.1 In scope

1. **Unify 3 add-to-collection implementations** into a single `<AddToCollectionFlow>` shared component:
   - `src/screens/CollectionAddToCollection/AddToCollection.tsx` (1,328 LOC) — dedicated route
   - `src/screens/Home/components/HomeAddToCollectionWizard.tsx` (693 LOC) — inline wizard
   - `src/screens/Player/components/LibraryPlayerAddToCollectionModal.tsx` (784 LOC) — modal variant

### 2.2 Out of scope (later)

- 8 remaining `getErrorMessage` local copies (Spec 3 sweep).
- 10+ remaining inline role checks (Spec 3 sweep).
- PreferencesContext `fetchTerreirosQueAdministro` migration → Spec 2b (sibling).
- Splitting the monoliths themselves (Spec 3).
- Performance optimizations on the unified flow (Spec 4).

### 2.3 Known constraints

- Existing shared model: `src/screens/CollectionAddToCollection/addToCollectionModel.ts` already has `addPontoToCollection`, `ListPonto`, `toPlayerPonto`, `getLyricsPreview`, etc. **Real duplication is UI shell, not data layer.**

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

### 3.2 Three host call sites replaced

- **`AddToCollection.tsx`** → becomes thin route wrapper: read pontoId from route params, fetch ponto, render `<AddToCollectionFlow>`.
- **`HomeAddToCollectionWizard.tsx`** → DELETED. Home opens `<AddToCollectionFlow>` directly inside its existing BottomSheet.
- **`LibraryPlayerAddToCollectionModal.tsx`** → DELETED. Player opens `<AddToCollectionFlow>` directly inside its existing modal shell.

**Net LOC reduction target:** 3 files (2,805 LOC) → ~1 flow (~600 LOC) + 1 thin wrapper (~80 LOC) + ~50 LOC of host-site integration = ~700 LOC. **Reduction: ~2,100 LOC.**

## 4. Non-goals

- Do NOT rewrite the data model (`addToCollectionModel.ts`) — already correct.
- Do NOT change RPCs, table schemas, or RLS policies.
- Do NOT add new add-to-collection features (e.g. multi-ponto, bulk add). Strict consolidation.
- Do NOT migrate `useMyEditableTerreirosQuery` — different role scope (admin + curimba), keep distinct.

## 5. Risks

| Risk | Mitigation |
|---|---|
| `<AddToCollectionFlow>` diverges from one host's UX expectations | Read all 3 impls side-by-side; document UX differences in the unified component; expose props (`titleOverride`, `showCreateOption`, `initialCollectionId`) for variation. |
| RLS recursion fallback breaks during query migration | Port the exact branch logic; manual smoke test with mock recursion error. |
| `queryClient.invalidateQueries` order matters (RPC commits before cache invalidation) | Mirror existing pattern: invalidate in mutation `onSuccess` / `onSettled`, never inside the mutation fn. |
| Removing `fetchTerreirosQueAdministro` breaks an undiscovered consumer | grep before removal; CI tsc check; manual smoke of 3 known consumers. |
| Test infra fallback (react-test-renderer) limits component testing | Use snapshot + tree-instance queries; defer integration tests of the flow to Spec 4. |

## 6. Testing

- **Unit tests required:**
  - `src/queries/me.test.ts` (new file) — `useMyManagedTerreirosQuery` mock branches: admin rows present, status column missing fallback, RLS recursion fallback, empty result.
- **Component tests:**
  - `src/features/addToCollection/AddToCollectionFlow.test.tsx` — render with mocked collections, simulate search, simulate select + commit, simulate empty state, simulate error.
- **Manual smoke (per consumer):**
  - Open AddToCollection screen from collection detail → search → commit.
  - Open Home → tap ponto → "Adicionar a coleção" → commit.
  - Open Player → menu → "Adicionar a coleção" → commit.
  - Open Terreiro Editor → save → verify managed terreiros list updates without manual refresh.
  - Accept terreiro invite → verify managed terreiros list updates.

## 7. Deliverables

| File | Type | LOC |
|---|---|---|
| `src/features/addToCollection/AddToCollectionFlow.tsx` | create | ~600 |
| `src/features/addToCollection/AddToCollectionFlow.test.tsx` | create | ~200 |
| `src/screens/CollectionAddToCollection/AddToCollection.tsx` | rewrite | -1,200 (was 1,328 → ~120) |
| `src/screens/Home/components/HomeAddToCollectionWizard.tsx` | DELETE | -693 |
| `src/screens/Player/components/LibraryPlayerAddToCollectionModal.tsx` | DELETE | -784 |
| `src/screens/Home/Home.tsx` | edit | ~+30 / -30 (wire new flow) |
| `src/screens/Player/PlayerScreen.tsx` | edit | ~+30 / -30 (wire new flow) |
| `src/queries/me.ts` | edit | +120 (new hook + type move) |
| `src/queries/me.test.ts` | create | ~150 |
| `src/queries/queryKeys.ts` | edit | +3 (new key) |
| `contexts/PreferencesContext.tsx` | edit | -210 (remove fn + type export) |
| `src/components/InviteGate.tsx` | edit | ~+5 / -5 (swap to invalidate) |
| `src/components/TabsHeaderWithPreferences.tsx` | edit | ~+5 / -5 |
| `src/screens/TerreiroEditor/TerreiroEditor.tsx` | edit | ~+10 / -10 (3 sites) |

**Net LOC:** ~+1,100 new, ~-2,900 removed = **−1,800 LOC** ✅

## 8. Definition of done

- All new unit tests pass.
- `npx tsc --noEmit` baseline preserved (0 errors).
- All 23 existing tests + new tests pass.
- Manual smoke test of 5 flows above (3 add-to-collection, 2 managed-terreiros refresh).
- Audit doc `code-quality-audit.md` waves 1 + 6 rows cross-linked to this spec.

## 9. Open questions

- **Q1:** Should `<AddToCollectionFlow>` be a single component or split into `<AddToCollectionList>` + `<AddToCollectionCommit>` for testability? **A:** Single component for now — internal helpers can be private functions. Premature split adds surface area; revisit if testability suffers.
- **Q2:** Does `HomeAddToCollectionWizard` have wizard-specific UX (multi-step) that the unified flow lacks? **A:** Per LOC count (693 < 1,328) it's a simplified variant. Audit didn't flag unique features; assume superset (`AddToCollection.tsx`) covers it. Verify during impl — if a missing step surfaces, add a `wizardMode?: boolean` prop.
- **Q3:** Should `useMyManagedTerreirosQuery` deprecate the older `useMyEditableTerreirosQuery`? **A:** No — different scope (admin-only vs admin+curimba). Keep both.
