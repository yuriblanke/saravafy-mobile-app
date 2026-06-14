# {Feature Name}

> Status: generated YYYY-MM-DD from full read of source files. Verify before relying on as spec.

## Purpose
1–3 lines. What user problem this feature solves.

## Files
Bulleted file paths grouped by role:
- **Routes (expo-router):** `app/...`
- **Screens:** `src/screens/...`
- **Components:** `src/components/...`
- **Contexts:** `contexts/...`, `src/contexts/...`
- **Hooks:** `src/hooks/...`
- **Queries:** `src/queries/...`
- **Services / API:** `src/services/...`, `src/api/...`
- **Domain / utils:** `src/domain/...`, `src/utils/...`

## Routes
Table of route → screen → params → guard.

## Navigation
How user enters/exits. Deep links (scheme `saravafy://` or `https://saravafy.com.br/l/...`).

## Contexts consumed/provided
Table: context name → provided here? → consumed by → state shape.

## Data flow (queries → screens)
For each query/mutation:
- queryKey
- table/rpc
- params
- cache strategy (warm, prefetch, refetch policy)
- which screens consume

## Supabase surface
- **Tables read:** ...
- **Tables written:** ...
- **RPCs called:** ...
- **Realtime channels:** ...
- **Storage buckets:** ...
- **Edge functions:** ...

## Mutations
Follow cache-contract.md template. List each mutation with optimistic strategy + invalidations.

## Business rules / invariants
Non-obvious behaviors, role checks, gating logic, copy variants by role, etc.

## Cross-feature dependencies
What this feature imports from / depends on (auth, terreiros, etc.).

## Known issues / TODOs found in code
Inline TODO/FIXME/HACK comments + dead code suspicions.
