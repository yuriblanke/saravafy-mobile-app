# Architecture Docs

## Overview

Saravafy is a React Native mobile app (Expo + Expo Router, New Architecture enabled) for cataloguing, learning, and singing Umbanda *pontos* — Afro-Brazilian religious chants. The backend is Supabase (PostgreSQL with RLS, RPCs, Realtime channels, and Storage). Server state is managed entirely through React Query. Navigation is file-based via Expo Router with two top-level route groups — `(auth)` and `(app)` — and a two-tab pager (Pontos / Terreiros) inside `(app)`. Audio playback is powered by React Native Track Player (RNTP). Terreiro packages (collections + lyrics + audio) can be downloaded for offline-first use.

## How to use these docs

> **Doing remediation work rather than reading?** Start at
> [`../superpowers/README.md`](../superpowers/README.md) instead — it holds the binding spec/plan
> conventions, the prioritized backlog, and the human-validation queue. The audit doc in this
> folder is a *diagnostic catalogue*, not the priority order.

Start with the slice doc for the feature you are investigating. Each doc follows the same template-driven structure: Purpose, Files, Routes table, Navigation, Contexts, Data flow (queries + mutations), State management, Error handling, Known issues, and Cross-slice dependencies. The template is `_TEMPLATE.md`.

For cross-feature questions — shared query keys, which mutations affect which slices, the full Supabase surface, or systemic bugs — read `aggregation.md`. Section 6 of that doc lists the known cross-cutting issues found during the documentation pass.

## Document index

| Document | Slice / Topic | Description |
|---|---|---|
| [foundation.md](foundation.md) | App shell, routing, design system | Non-feature plumbing: root provider tree, auth-gated routing, tab pager, Saravafy theme, and cross-cutting contexts (network, toast, gestures, layout). |
| [auth.md](auth.md) | Authentication | Google OAuth via Supabase, session persistence, `(auth)` / `(app)` route gate, global login sheet, and terreiro invite acceptance modal. |
| [pontos.md](pontos.md) | Pontos (chants) | Home feed, fulltext search, ponto submission / edit / correction workflow, versioning layer (`ponto_versoes`), and entidade chip integration. |
| [player-audio.md](player-audio.md) | Player & audio | Lyrics display and audio playback for pontos (collection mode or full-library mode), audio upload submission, and offline playback via RNTP. |
| [terreiros.md](terreiros.md) | Terreiros | Browse / join terreiros, per-terreiro library (collections + tags), admin profile editing, realtime membership sync, and offline package integration. |
| [collections.md](collections.md) | Collections | Ordered playlists of pontos owned by users or terreiros, drag-to-reorder editing, members-only access gate, and add-to-collection wizards. |
| [entidades-tags.md](entidades-tags.md) | Entidades / Tags | Three taxonomy layers on pontos: global entidades/orixás catalog, terreiro-scoped medium tags, and free-text ponto tags; plus the `[entidade]` lyrics-placeholder mechanism. |
| [access-manager.md](access-manager.md) | Access manager / RBAC | Terreiro admin console for inviting, role-toggling, and removing admins/curimbas; member roster management; public member list; and global RBAC type definitions. |
| [preferences.md](preferences.md) | Preferences | Single-screen user settings: appearance, Curimba mode, terreiro memberships, offline downloads, start-page preference (Supabase + AsyncStorage), and logout. |
| [curator-review.md](curator-review.md) | Curator / review queue | Global curator triage of user-submitted pontos (new, corrections, problems, variations, audio) with approve/reject RPCs and curator-mode toggle. |
| [offline-sync.md](offline-sync.md) | Offline sync | Download a terreiro's full content (collections, lyrics, optional audio) to device, background re-sync on foreground, and offline fallback paths in the query layer. |
| [aggregation.md](aggregation.md) | Cross-slice aggregation | Master inventory of all routes, contexts, query keys, Supabase tables, cross-slice mutation dependencies, and known architectural issues. |
| [code-quality-audit.md](code-quality-audit.md) | Code quality audit | Diagnostic catalog of monolithic components, performance bottlenecks, and architectural defects across the codebase, with file:line refs and prioritized remediation order. |
| [_TEMPLATE.md](_TEMPLATE.md) | Template | Canonical template for future slice docs. |

## Key architectural decisions

- **Expo Router file-based routing** — all screens are thin re-exports inside `app/`; business logic lives in `src/screens/`. Two route groups (`(auth)` / `(app)`) enforce the auth gate at the filesystem level.
- **Supabase as sole backend** — PostgreSQL with row-level security, typed RPC wrappers for complex reads, Realtime `postgres_changes` channels for live membership updates, and Storage for audio files; the Supabase client is AsyncStorage-backed for session persistence across cold starts.
- **React Query cache-contract mutation pattern** — the preferred mutation shape is: cancel in-flight → snapshot current cache → apply optimistic update → roll back on error → invalidate on settle. See aggregation §6.6 for where this contract is currently inconsistent.
- **Offline-first terreiro packages** — `src/offline/terreiroPackage.ts` serialises a full terreiro (collections + pontos JSON + audio files) into a versioned local package; query hooks in `collectionPontos` and `terreirosCollections` have inline offline fallback branches that read from this package when `isOffline()` is true.
- **RNTP as single audio source of truth** — `src/audio/rntpService.ts` is the only code that interacts with React Native Track Player; all playback state (position, buffering, track metadata) flows up through its event subscriptions, not through React context.

## Known cross-cutting issues

All issues are documented in full in [aggregation.md](aggregation.md) §6.

| # | Issue |
|---|---|
| [6.1](aggregation.md#61-dead-query-pattern-two-instances) | Dead query pattern — `useHomeFeedPontos` and `useExploreTerreiros` prefetched at boot but never consumed. |
| [6.2](aggregation.md#62-ad-hoc-query-keys-outside-central-registry) | Ad-hoc query keys outside central registry — four keys in use as literal strings, invisible to invalidation helpers. |
| [6.3](aggregation.md#63-three-namespace-key-fragmentation-in-terreiros) | Three-namespace key fragmentation in terreiros — flat top-level keys escape the user-scoped logout eviction predicate. |
| [6.4](aggregation.md#64-querykeysmeprofileuserid-key-collision-risk) | `queryKeys.me.profile(userId)` collision — `CuratorModeContext` stores a boolean under a key that implies a profile object. |
| [6.5](aggregation.md#65-schema-tolerance-noise-duplicated-across-every-slice) | Schema-tolerance noise duplicated in 9+ files — no shared utility for column-missing detection or retry. |
| [6.6](aggregation.md#66-inconsistent-optimistic-update-patterns) | Inconsistent optimistic update patterns — three distinct mutation patterns with no enforced contract. |
| [6.7](aggregation.md#67-useresendterreiroeinvite-is-a-confirmed-no-op-stub) | `useResendTerreiroInvite` is a confirmed no-op stub — toasts "Convite reenviado" with no side effect. |
| [6.8](aggregation.md#68-edit-ponto-bypasses-react-query-entirely) | Edit ponto bypasses React Query — direct `UPDATE`s with no invalidation of feed or collection caches. |
| [6.9](aggregation.md#69-deprecated-keys-still-actively-used) | Deprecated query keys still actively invalidated by live code. |
| [6.10](aggregation.md#610-logout-cache-eviction-blind-spot) | Logout cache eviction blind spot — member-related keys survive logout and may leak to next user on same device. |
| [6.11](aggregation.md#611-approved_ponto_id-read-back-in-submission-flow) | `approved_ponto_id` read-back is always null at INSERT time — audio upload after new-ponto submission always silently fails. |
| [6.12](aggregation.md#612-two-overlapping-preferences-ui-implementations) | Two overlapping Preferences UI implementations — overlay sheet and stack route diverge silently. |
| [6.13](aggregation.md#613-fetchterreiroasqueadministro-in-preferencescontext-is-dead-code) | `fetchTerreirosQueAdministro` in `PreferencesContext` is dead code — exposed API with no consumer. |
| [6.14](aggregation.md#614-pontosubmissionkind-domain-mismatch) | `PontoSubmissionKind` domain mismatch — `"issue"` in domain type vs `"problem"` in UI mapping. |
| [6.15](aggregation.md#615-fetchallpontos-has-no-limit) | `fetchAllPontos` has no limit — full catalog loaded into local state on every Home mount. |
| [6.16](aggregation.md#616-offline-bytesestimate-misleads-users) | Offline `bytesEstimate` measures JSON blob size, not audio file size — displayed as "Tamanho" without qualification. |

## Template reference

`_TEMPLATE.md` is the canonical template for all future slice docs. Sections: Purpose, Files (grouped by role), Routes table, Navigation, Contexts consumed/provided, Data flow (per query/mutation: queryKey, fetcher, consumers, invalidated by), State management, Error handling, Known issues, Cross-slice dependencies.
