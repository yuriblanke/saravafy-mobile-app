# Terreiros

> Status: generated 2026-06-12 from full read of source files. Verify before relying on as spec.

## Purpose
Browse and explore Umbanda terreiros (houses/communities), join one as a member via invite or membership request, drive the per-terreiro library (collections + custom "medium" tags), and let admins/curimbas curate the terreiro profile, manage members and invites, and sync the terreiro for offline use. Membership is role-gated (`admin` / `curimba` / `member`, plus a synthetic `follower` for non-members) and propagates live via two parallel realtime stacks plus a snooze-aware invite acceptance modal.

## Files

### Routes (expo-router)
- `app/(app)/(tabs)/(terreiros)/_layout.tsx` — headerless Stack inside the Terreiros tab. `contentStyle: { backgroundColor: "transparent" }`, `animation: "none"`. `detachPreviousScreen` is true for `route.name === "terreiro" | "collection/[id]"` ("optimization, not a requirement" per the inline comment).
- `app/(app)/(tabs)/(terreiros)/index.tsx` — thin re-export of `src/screens/Terreiros/Terreiros`.
- `app/(app)/l/terreiro/[id].tsx` — deep-link redirector. Validates UUID via `isUuid`; redirects to `/terreiro` with `{ terreiroId: id }`. Bad UUID → toast "Link inválido." + `/(app)`.
- `app/(app)/terreiro.tsx` — re-exports `src/screens/TerreiroBiblioteca/TerreiroBiblioteca` (the per-terreiro library screen; route name is misleading).
- `app/(app)/terreiro-editor.tsx` — wraps `src/screens/TerreiroEditor/TerreiroEditor` in a `SafeAreaView` with a theme-derived `modalBg`. Mounted as a modal Stack route by `(app)/_layout.tsx`.
- `app/(app)/terreiro-members.tsx` — re-exports `src/screens/TerreiroMembers/TerreiroMembers` (gestão view: admins/curimbas only).
- `app/(app)/terreiro-members-list.tsx` — re-exports `src/screens/TerreiroMembersPublic/TerreiroMembersList` (public list).
- `app/(app)/terreiro-member-profile.tsx` — re-exports `src/screens/TerreiroMembersPublic/TerreiroMemberProfile` (public profile sheet; modal).

### Screens
- `src/screens/Terreiros/Terreiros.tsx` — the Terreiros tab body: search bar, "Cadastrar terreiro" CTA, and the list of terreiros sorted by `membersCount DESC` then name. Cards expand to show responsáveis, lines of work, contatos (Instagram + WhatsApp).
- `src/screens/Terreiros/data/terreiros.ts` — **dead/duplicate copy** of `fetchTerreirosWithRole` (no `membersCount` field, lacks offline fallback). Nothing in the read paths imports this file; live screens use `src/queries/terreirosWithRole.ts`.
- `src/screens/TerreiroBiblioteca/TerreiroBiblioteca.tsx` — the actual per-terreiro screen mounted at `/terreiro`. Pinned-cover scroll, terreiro title + members count + collections count, "Tornar-se membro" (when not a member) / "Nova coleção" + "Editar" (curators), collection cards with rename/delete bottom sheets, offline package sheet, background-sync on focus.
- `src/screens/TerreiroEditor/TerreiroEditor.tsx` — create / edit terreiro form (title, about, lines of work, cover image as WebP, primary `terreiros_contatos` row with IBGE-driven UF / city pickers, phone + WhatsApp flag, Instagram handle). Inline "Administração do terreiro" panel for owners/admins with "Gerenciar acesso" + "Excluir terreiro" CTAs.
- `src/screens/TerreiroMembers/TerreiroMembers.tsx` — gestão view (admin/curimba only): members (with `role='member'`), pending invites (`role='member'`), pending membership requests with approve/reject CTAs.
- `src/screens/TerreiroMembersPublic/TerreiroMembersList.tsx` — public/member-tier infinite list of all active members; uses three RPCs (`admins`/`members`/`public`) with auto-fallback to lower tier on RLS error.
- `src/screens/TerreiroMembersPublic/TerreiroMemberProfile.tsx` — public profile card. Receives the `MemberPayload` JSON-encoded in the `member` URL param; **email is intentionally stripped before encoding** (`encodeMemberParam` at `TerreiroMembersList.tsx:65-70`).

### Components
- `src/components/TerreirosRealtimeSync.tsx` — mounted once at root (`app/_layout.tsx:138`). Subscribes to `postgres_changes` on `terreiros` + `terreiros_contatos`, filters by my-access-ids (warmed via `prefetchMyTerreiroAccessIds`), and runs `invalidateTerreiro` + `invalidateTerreiroListsForRoles` on hits. Creator-of-row gets unconditional update (covers INSERT before access cache exists).
- `src/components/TerreiroOfflineSheet.tsx` — bottom sheet for syncing/removing the terreiro package and audios.
- `src/components/JoinTerreiroButton.tsx` — "Tornar-se membro" button: requires auth, then INSERTs into `terreiro_membership_requests`.
- `src/components/InviteGate.tsx` — global terreiro-invite modal + banner. Owned by foundation, but the queries / RPCs / snooze logic live here. (Also documented in `auth.md`.)

### Contexts
- None provided here. Consumes `AuthContext`, `PreferencesContext`, `ToastContext`, `LoginPromptContext`, `InviteGatesContext` (terreiro side only), `NetworkContext`, `GlobalSafeAreaInsetsContext`, `GestureBlockContext`, `GestureGateContext`.

### Hooks
- `src/hooks/terreiroMembership.ts` — the **central membership hook bundle**. Exports:
  - `useTerreiroMembershipStatus(terreiroId)` — shared membership cache `queryKeys.me.membership(userId)` (the user's full membership list) + a `terreiro_membership_requests` lookup. Cached `staleTime: 60_000` / `30_000` respectively.
  - `useCreateTerreiroMembershipRequest(terreiroId)` — INSERT into `terreiro_membership_requests` (`status: "pending"`). Treats `23505`/duplicate as `{ ok: true, alreadyExisted: true }`.
  - `usePendingTerreiroMembershipRequests(terreiroId)` — admin-side pending list at `queryKeys.terreiro.membershipRequests(terreiroId)`, enriched with `resolveProfiles({ userIds })`.
  - `useReviewTerreiroMembershipRequest(terreiroId)` — `approve_terreiro_membership_request(request_id)` / `reject_terreiro_membership_request(request_id)` RPCs with optimistic pop + `cannot_remove_last_admin` / `not_authorized_admin_only` mapping.
  - `useTerreiroMembers(terreiroId)` — `terreiro_members` select with `member_kind` / `status` schema-tolerant column fallback chain (up to 3 retries).
  - `useTerreiroInvites(terreiroId)` — `terreiro_invites` for the terreiro, same fallback chain; exposes `pending` derived list.
  - `useCreateTerreiroInvite(terreiroId)` — wraps `createTerreiroInvite` with optimistic `id: "optimistic-<ts>"` prepended.
  - `useCancelTerreiroInvite(terreiroId)` — DELETE on `terreiro_invites`; for optimistic IDs, falls back to a DELETE by `(terreiro_id, email, status='pending', role)` tuple.
  - `useRemoveTerreiroMember(terreiroId)` — DELETE on `terreiro_members`.
  - `useResendTerreiroInvite()` — placeholder: bumps `updated_at` (see Known issues).
- `src/hooks/useRealtimeTerreiroScope.ts` — scoped realtime: subscribes per `scopeTerreiroId` to `pontos`, `collections`, `collections_pontos`, `terreiro_members`. Mounted by `(app)/_layout.tsx:140`.
- `src/hooks/useTerreiroInviteDecision.ts` — accept/reject flow for the **pending invites list** (used by the Preferences slice, not by `InviteGate.tsx`). Calls `accept_terreiro_invite` / `reject_terreiro_invite` with `invite_id → p_invite_id` PGRST202 fallback.

### Queries (React Query)
- `src/queries/queryKeys.ts` — three coexisting terreiro key namespaces:
  - `queryKeys.terreiro.*` → `["terreiro", terreiroId, "members" | "membersCount" | "invites" | "membershipRequests"]` (used by `terreiroMembership.ts`).
  - `queryKeys.terreiros.*` → `["terreiros", "explore"|"withRole"|"byId"|"editableByUser"|"collectionsByTerreiro", ...]` (per-list / per-id).
  - `queryKeys.terreiroMembersCount` / `terreiroMembersList` / `terreiroMembersListInfinite` — flat top-level keys for the public-RPC layer.
- `src/queries/terreirosCache.ts` — `invalidateTerreiro`, `invalidateTerreiroListsForRoles`, `patchTerreiroInLists`, `removeTerreiroFromLists`. Patches three caches simultaneously: `terreiros.withRole`, `preferences.terreiros`, `me.editableTerreiros`. **Locale-aware sort: `localeCompare(a, b, "pt-BR", { sensitivity: "base" })`** (`terreirosCache.ts:5-7`).
- `src/queries/terreirosExplore.ts` — `useExploreTerreiros(limit=10)` / `prefetchExploreTerreiros`. Keyed `queryKeys.terreiros.exploreInitial()`. Public, no auth gating.
- `src/queries/terreirosWithRole.ts` — `fetchTerreirosWithRole`, `useTerreirosWithRoleQuery`, `prefetchTerreirosWithRole`. Embeds `terreiro_members(role, user_id)` for `membersCount` + role match; falls back to a no-join select on RLS-recursion error. Pulls primary contato and ordered `responsaveis` in parallel.
- `src/queries/terreirosCollections.ts` — `fetchCollectionsByTerreiro` (offline-first via `getPackage`), `useCollectionsByTerreiroQuery`, `prefetchCollectionsByTerreiro`. Two-step: collections then `collections_pontos` count.
- `src/queries/terreiroMembersRpc.ts` — `fetchTerreiroMembersCount` (`get_terreiro_members_count`), `fetchTerreiroMembersList` / `fetchTerreiroMembersPage` (one of `get_terreiro_members_for_admins` / `get_terreiro_members_for_members` / `get_terreiro_members_public`).
- `src/queries/terreiroPontoCustomTags.ts` — `fetchTerreiroPontosCustomTagsMap` reads `terreiro_ponto_custom_tags` filtered to `source='medium' AND template_key='medium'`. Hook keyed by FNV-1a hash of the sorted+deduped ponto id list.
- `src/queries/pendingTerreiroInvites.ts` — `fetchPendingTerreiroInvitesForInvitee`, `usePendingTerreiroInvitesForInviteeQuery`, `prefetchPendingTerreiroInvitesForInvitee`. Keyed `queryKeys.terreiroInvites.pendingForInvitee(normalizedEmail)`. Schema-tolerant chain: `title` → `name`, with/without `member_kind`.

### Services / API
- `lib/supabase.ts` — shared Supabase client.
- `src/offline/terreiroPackage.ts` (out of slice, mentioned for context) — `getPackage`, `syncTerreiroPackage`, `removePackage`, `listPackages` — power the `TerreiroOfflineSheet` and the offline fallback in `terreirosCollections.ts` / `terreirosWithRole.ts`.

### Domain / utils
- `src/domain/terreiroRoles.ts` — `TerreiroRole = "admin" | "curimba" | "member"`. `normalizeTerreiroRole` maps legacy `"editor"` → `"curimba"`. `TerreiroMemberKind = "corrente" | "assistencia"` with label helpers.
- `src/domain/terreiroInviteCopy.ts` — `TerreiroInviteRole`, `getTerreiroInviteRoleBadgeLabel`, `getTerreiroInviteBodyCopy`, `TERREIRO_INVITE_DECIDE_LATER_TOAST`. Body copy differs per role (member → curimba → admin); always uses PT-BR.
- `src/utils/terreiroInviteSnooze.ts` — AsyncStorage map keyed `inviteGate:terreiroInviteSnooze:v2:<normalizedEmail>`. Migrates from v1 `inviteGate:snoozedInviteIds:v1:<email>` (array of IDs → `{ count: 2, lastSnoozedAt: now }` each). Count capped at 2.
- `src/utils/terreiroLibraryOrder.ts` — AsyncStorage at `saravafy:terreiro-library-order:<terreiroId>`. `applyTerreiroLibraryOrder(items, orderedIds)` orders by saved IDs first, appends unknown IDs after.

## Routes

| Route | Screen | Params | Guard |
|---|---|---|---|
| `/(app)/(tabs)/(terreiros)` | `Terreiros` | — | inherited from `(app)/_layout.tsx` |
| `/(app)/(tabs)/(terreiros)/index` | `Terreiros` | — | same |
| `/(app)/l/terreiro/[id]` | deep-link redirector | `id: uuid` | UUID-checked; redirects to `/terreiro?terreiroId=:id`. Bad UUID → toast + `/(app)` |
| `/(app)/terreiro` | `TerreiroBiblioteca` | `terreiroId`, `terreiroTitle?`, `bootStart?`, `bootOffline?`, `from?` | inherited; fade transition; if no `terreiroId` and not `bootStart=1`, replaces to `from` or `/(app)/(tabs)/(pontos)` |
| `/(app)/terreiro-editor` | `TerreiroEditor` | `mode?: "create"\|"edit"`, `terreiroId?` | inherited; **modal** presentation; disables global swipe overlay (foundation rule) |
| `/(app)/terreiro-members` | `TerreiroMembers` | `terreiroId` | client guard: `canManage = isActiveMember && role in {admin, curimba}`; non-managers see "Você não tem permissão" |
| `/(app)/terreiro-members-list` | `TerreiroMembersList` | `terreiroId` | none (public — server RPC enforces tier) |
| `/(app)/terreiro-member-profile` | `TerreiroMemberProfile` | `member: <encoded JSON>` | inherited; modal |

`/terreiro-collections/[terreiroId]/edit` exists in the foundation route table but its source lives in `src/screens/TerreiroCollectionsEdit/`, which is out of scope for this slice.

## Navigation

### Entry
- Default boot path for users whose `bootstrapStartPage` returned a terreiro → `/terreiro` with `{ bootStart: "1", bootOffline?: "1", terreiroId, terreiroTitle }` (foundation rule).
- Tab swipe from Pontos.
- Deep link `saravafy://l/terreiro/:id` or `https://saravafy.com.br/l/terreiro/:id`.
- Preferences sheet ("Meus terreiros") and the "Convite" banner shown by `InviteGate` (foundation-mounted) also funnel users here.

### Exits
- Terreiros tab card press → `router.push("/terreiro", { terreiroId, terreiroTitle, from: "/(app)/(tabs)/(terreiros)" })` (Terreiros.tsx:585-592). The `from` is **only** used by `TerreiroBiblioteca` to override back navigation (`returnTo`) and the Android hardware-back handler.
- "Cadastrar terreiro" → `requireAuth(() => router.push({ pathname: "/terreiro-editor", params: { mode: "create" } }))`.
- Collection press inside `TerreiroBiblioteca` → `router.push("/collection/[id]", { id, collectionId, collectionTitle, terreiroId })`.
- "Ver membros" press on counts row → `router.push("/terreiro-members-list", { terreiroId })`.
- "Tornar-se membro" → see `JoinTerreiroButton`.
- "Editar" (curators) → `router.push("/terreiro-collections/[terreiroId]/edit", { terreiroId })` (cross-slice).
- "Gerenciar acesso" (editor admin panel) → `router.push("/access-manager", { terreiroId, terreiroTitle })` (cross-slice).
- After `delete_terreiro` succeeds → `router.replace("/(app)/(tabs)/(terreiros)")` (`TerreiroEditor.tsx:943`).

### Curator/admin entry points (cross-slice)
- "Nova coleção" / "Editar" CTAs on `TerreiroBiblioteca` are gated by `canEdit = membership.isActiveMember && (myRole === "admin" || myRole === "curimba")` (`TerreiroBiblioteca.tsx:258-259`).
- `TerreiroMembers` and `TerreiroEditor`'s admin section both use the same gate.

### Public-link deep target
`saravafy://l/terreiro/:id` and `https://saravafy.com.br/l/terreiro/:id` land on the redirector route and `router.replace` into `/terreiro`. No share dialog ever launches the `(tabs)/(terreiros)/index` list.

## Contexts consumed/provided

| Context | Provided here? | Consumed by | State shape |
|---|---|---|---|
| `AuthContext` | No | All screens/hooks | `{ user }` |
| `PreferencesContext` | No | All screens (`effectiveTheme`, `applyTerreiroPatch`, `fetchTerreirosQueAdministro`, `clearStartPageSnapshotOnly`) | foundation |
| `ToastContext` | No | All screens / hooks | `showToast(msg)` |
| `LoginPromptContext` | No | `Terreiros.tsx`, `JoinTerreiroButton` — `requireAuth(action, { reason })` | foundation |
| `InviteGatesContext` | No | `InviteGate` (writes `terreiroGateActive` + reads `terreiroSnoozeVersion`); `CuratorInviteGate` reads `terreiroGateActive` to yield priority | `{ terreiroGateActive, setTerreiroGateActive, terreiroSnoozeVersion, bumpTerreiroSnoozeVersion }` |
| `NetworkContext` | No | `TerreiroBiblioteca` — background-sync gated by `isConnected` | `{ isConnected, isInternetReachable }` |
| `GestureBlockContext` | No | `TerreiroBiblioteca` — `shouldBlockPress()` before `router.push("/collection/[id]")` | foundation |
| `GestureGateContext` | No | `Terreiros` — `shouldBlockPress()` before `router.push("/terreiro")` | foundation |
| `GlobalSafeAreaInsetsContext` | No | `TerreiroBiblioteca`, `TerreiroMembers`, `TerreiroMembersList`, `TerreiroMemberProfile` | foundation |

## Data flow (queries → screens)

### `fetchTerreirosWithRole(userId)` — `src/queries/terreirosWithRole.ts`
- **queryKey:** `queryKeys.terreiros.withRole(userId ?? "anonymous")` → `["terreiros", "withRole", userId]`.
- **Table:** `terreiros` with embed `terreiro_members(role, user_id)`; parallel selects on `terreiros_contatos` (where `is_primary=true`) and `terreiros_responsaveis` (sort `is_primary DESC, created_at ASC`).
- **Filters:** `order title ASC`. No pagination.
- **Offline fallback:** `listPackages()` returns minimal `{id, name, membersCount:0}` when offline.
- **Schema tolerance:** `cover_image_url` missing → drop column; RLS recursion on `terreiro_members` → drop the embed; anonymous user → no-join select.
- **Cache:** `staleTime: 30_000`, `gcTime: 30 * 60_000`, `placeholderData: prev`.
- **Consumer:** `Terreiros.tsx:424`.

### `fetchExploreTerreiros({ limit })` — `src/queries/terreirosExplore.ts`
- **queryKey:** `queryKeys.terreiros.exploreInitial()` → `["terreiros", "explore", "initial"]`.
- **Table:** `terreiros` `id, title, cover_image_url`, `order title ASC`, `limit`.
- **Cache:** `staleTime: 5min`, `gcTime: 30min`, `placeholderData: prev`.
- **Consumer:** **none.** `useExploreTerreiros` is exported but no source file calls it (only `prefetchExploreTerreiros` is wired at boot — `app/_layout.tsx:324`).

### `fetchCollectionsByTerreiro(terreiroId)` — `src/queries/terreirosCollections.ts`
- **queryKey:** `queryKeys.terreiros.collectionsByTerreiro(terreiroId)` → `["terreiros", "collectionsByTerreiro", terreiroId]`.
- **Table:** `collections` `id, title, description, visibility, owner_terreiro_id` `eq owner_terreiro_id`, ordered `updated_at DESC`; then `collections_pontos` `count: exact` for `collection_id IN (ids)`.
- **Schema tolerance:** `description` missing → drop column.
- **Offline:** when `isOffline()`, returns `pkg.collections`.
- **Cache:** `staleTime: 60_000`, `gcTime: 30 * 60_000`, `placeholderData: prev`. 15s `withTimeout` wrapper.
- **Consumer:** `TerreiroBiblioteca.tsx:270`, `TerreiroCollectionsEdit.tsx:62` (cross-slice).

### `useTerreiroMembershipStatus(terreiroId)` — `src/hooks/terreiroMembership.ts`
- Inner membership query: `queryKeys.me.membership(userId)` → `["me", "membership", userId]`. Selects `terreiro_members.terreiro_id, role, status` with `user_id=:userId AND role IN ('admin','curimba','member') AND status='active'`. **Schema tolerance:** drops `status` filter when column missing.
- Inner pending request query: `["terreiroMembershipRequest", userId, terreiroId]`. Selects `terreiro_membership_requests.id` where `(terreiro_id, user_id, status='pending')` `.maybeSingle()`.
- **Cache:** `staleTime: 60_000` / `30_000`, `placeholderData: prev`.
- **Consumers:** `TerreiroBiblioteca.tsx:255`, `TerreiroMembers.tsx:135`, `TerreiroMembersList.tsx:109`, `JoinTerreiroButton.tsx:23`.

### `useTerreiroMembers(terreiroId)` — `src/hooks/terreiroMembership.ts`
- **queryKey:** `queryKeys.terreiro.members(terreiroId || "__none__")` → `["terreiro", terreiroId, "members"]`.
- **Table:** `terreiro_members` `terreiro_id, user_id, role, member_kind?, status?, created_at` ordered `created_at ASC`. **Schema-tolerant** column chain over `status` then `member_kind` (up to 3 retries).
- Profiles enriched via `resolveProfiles({ userIds })` from `src/features/identity/resolveProfiles.ts`.
- **Cache:** `staleTime: 15_000`, `placeholderData: prev`.

### `useTerreiroInvites(terreiroId)` — `src/hooks/terreiroMembership.ts`
- **queryKey:** `queryKeys.terreiro.invites(terreiroId || "__none__")` → `["terreiro", terreiroId, "invites"]`.
- **Table:** `terreiro_invites` for this terreiro, ordered `created_at DESC`; same `status` / `member_kind` fallback chain.
- Profiles enriched via `resolveProfiles({ emails })` and indexed by `byEmailLower`.
- **Cache:** `staleTime: 15_000`.
- Exposes `pending = items.filter(status === "pending")`.

### `usePendingTerreiroMembershipRequests(terreiroId)` — `src/hooks/terreiroMembership.ts`
- **queryKey:** `queryKeys.terreiro.membershipRequests(terreiroId || "__none__")` → `["terreiro", terreiroId, "membershipRequests"]`.
- **Table:** `terreiro_membership_requests` `id, terreiro_id, user_id, status, created_at` where `(terreiro_id, status='pending')` `order created_at ASC`.
- Profiles enriched via `resolveProfiles({ userIds })`.
- **Cache:** `staleTime: 15_000`.

### `fetchTerreiroMembersCount(terreiroId)` — `src/queries/terreiroMembersRpc.ts`
- **RPC:** `get_terreiro_members_count(p_terreiro_id)`. Accepts number, `{ count }`, or array thereof.
- **queryKey (consumer):** `queryKeys.terreiroMembersCount(terreiroId)` → `["terreiroMembersCount", terreiroId]`.
- **Cache:** `staleTime: 60_000`, `gcTime: 5 * 60_000`.
- **Consumer:** `TerreiroBiblioteca.tsx:622` inline `useQuery`.

### `fetchTerreiroMembersPage(tier, terreiroId, limit, offset)` — `src/queries/terreiroMembersRpc.ts`
- **RPCs (one of):** `get_terreiro_members_for_admins`, `get_terreiro_members_for_members`, `get_terreiro_members_public`. All called with `p_terreiro_id, p_limit, p_offset`.
- **queryKey:** `queryKeys.terreiroMembersListInfinite({ terreiroId, visibilityTier })` → `["terreiroMembersListInfinite", terreiroId, visibilityTier]`.
- **Cache:** `staleTime: 60 * 1000`, `gcTime: 5 * 60 * 1000`; `PAGE_SIZE = 30`.
- **Consumer:** `TerreiroMembersList.tsx:181` via `useInfiniteQuery`. Auto-fallback `admins → members → public` capped at 2 retries (`TerreiroMembersList.tsx:209-244`); on logged-in fallback to `public`, toasts `"Mostrando a lista pública de membros."`.

### `fetchTerreiroPontosCustomTagsMap({ terreiroId, pontoIds })` — `src/queries/terreiroPontoCustomTags.ts`
- **queryKey:** `queryKeys.pontos.customTagsByTerreiro({ terreiroId, pontoIdsHash })` → `["pontos", "customTags", terreiroId, pontoIdsHash]`.
- **Table:** `terreiro_ponto_custom_tags` filtered by `(terreiro_id, ponto_id IN ids, source='medium', template_key='medium')`, ordered `(ponto_id ASC, created_at ASC)`.
- `pontoIdsHash` is FNV-1a 32-bit hash (base-36) of sorted+deduped ids.
- **Cache:** `staleTime: 60_000`, `gcTime: 5 * 60_000`, `placeholderData: prev`.
- **Consumers:** `Collection.tsx:307`, `PlayerScreen.tsx:226` (cross-slice — drives the per-medium tag chips).

### `fetchPendingTerreiroInvitesForInvitee(normalizedEmail)` — `src/queries/pendingTerreiroInvites.ts`
- **queryKey:** `queryKeys.terreiroInvites.pendingForInvitee(normalizedEmail)` → `["terreiroInvites", "pendingForInvitee", normalizedEmail]`.
- **Table:** `terreiro_invites` `id, terreiro_id, role, created_at, member_kind?, terreiro:terreiros(title|name)` `eq status='pending' AND email=:normalized`, `order created_at ASC`. Schema tolerance: `title → name` and `member_kind` missing.
- **Cache:** `staleTime: 0` (always treated stale).
- **Consumer:** the Preferences slice (out of scope) + `useTerreiroInviteDecision`. Note: `InviteGate.tsx` does **not** consume this query — it owns its own raw `supabase.from("terreiro_invites")...` call (`InviteGate.tsx:354-359`).

### Boot prefetch (foundation, listed for completeness)
At `app/_layout.tsx:304`:
- `prefetchExploreTerreiros(queryClient, { limit: 10 })` (unused — see Known issues).
- `prefetchMyTerreiroAccessIds(userId)`.
- `prefetchCollectionsByTerreiro({ terreiroId })` for every access id.
- `prefetchMyEditableTerreiros({ userId, editableTerreiroIds })`.

## Supabase surface

- **Tables read:**
  - `terreiros` — `fetchTerreirosWithRole`, `fetchExploreTerreiros`, `TerreiroBiblioteca` byId, `TerreiroEditor` load.
  - `terreiros_contatos` — `fetchTerreirosWithRole` primary contato; `TerreiroEditor` load.
  - `terreiros_responsaveis` — `fetchTerreirosWithRole`.
  - `terreiro_members` — `useTerreiroMembershipStatus` (`me.membership`), `useTerreiroMembers`, `TerreiroEditor.loadAdminData`, plus the embed in `fetchTerreirosWithRole`.
  - `terreiro_invites` — `useTerreiroInvites`, `fetchPendingTerreiroInvitesForInvitee`, `InviteGate.refreshPendingInvites`, `TerreiroEditor.loadAdminData`.
  - `terreiro_membership_requests` — `useTerreiroMembershipStatus`, `usePendingTerreiroMembershipRequests`.
  - `collections` — `fetchCollectionsByTerreiro`.
  - `collections_pontos` — pontos-count per collection.
  - `terreiro_ponto_custom_tags` — `fetchTerreiroPontosCustomTagsMap`.
  - `profiles` — `TerreiroEditor.loadAdminData` direct select; `resolveProfiles` batch (cross-cutting).
- **Tables written:**
  - `terreiros` — `TerreiroEditor.createTerreiroFlow` (INSERT), `TerreiroEditor.onSave` edit (UPDATE `title`, `about`, `lines_of_work`, `cover_image_url`).
  - `terreiros_contatos` — `upsertPrimaryContato` (UPSERT on `terreiro_id`).
  - `terreiro_members` — `TerreiroEditor.createTerreiroFlow` (INSERT admin/active for creator), `useRemoveTerreiroMember` (DELETE), `upsertTerreiroMemberActive` helper (UPSERT on `(terreiro_id, user_id)`).
  - `terreiro_invites` — `TerreiroEditor.sendInvite` (INSERT), `createTerreiroInvite` helper (INSERT, with `member_kind` fallback), `useCancelTerreiroInvite` (DELETE), `useResendTerreiroInvite` (UPDATE `updated_at` placeholder).
  - `terreiro_membership_requests` — `useCreateTerreiroMembershipRequest` (INSERT `pending`).
  - `collections` — `TerreiroBiblioteca` `createCollectionMutation` (INSERT `owner_terreiro_id`, `owner_user_id: null`), `updateCollectionTitleMutation` (UPDATE `title`).
  - `terreiro_ponto_custom_tags` — INSERT/DELETE from `AddMediumTagSheet`/`RemoveMediumTagSheet` (cross-slice, not analyzed in depth here).
- **RPCs called:**
  - `accept_terreiro_invite(invite_id)` — `InviteGate.acceptInvite`, `useTerreiroInviteDecision.accept`. Both wrap with a `p_invite_id` fallback on `PGRST202`.
  - `reject_terreiro_invite(invite_id)` — same; intentionally avoids `decline_terreiro_invite` while the DB `CHECK status IN ('pending','accepted','rejected')` constraint stands (`InviteGate.tsx:895-898`).
  - `approve_terreiro_membership_request(request_id)` — `useReviewTerreiroMembershipRequest.approveMutation`.
  - `reject_terreiro_membership_request(request_id)` — `useReviewTerreiroMembershipRequest.rejectMutation`.
  - `get_terreiro_members_count(p_terreiro_id)` — `fetchTerreiroMembersCount`, `TerreiroBiblioteca.membersCountQuery`.
  - `get_terreiro_members_for_admins(p_terreiro_id, p_limit, p_offset)`, `get_terreiro_members_for_members(...)`, `get_terreiro_members_public(...)` — `fetchTerreiroMembersPage`.
  - `delete_terreiro(p_terreiro_id)` — `TerreiroEditor.confirmDeleteTerreiro`.
  - `delete_collection(p_collection_id)` — `TerreiroBiblioteca.deleteCollectionMutation` (cross-slice).
- **Realtime channels:**
  - `terreiros-sync:<userId>` (`TerreirosRealtimeSync`) — `postgres_changes` `*` on `terreiros` and `terreiros_contatos`. Filter is myAccessIds (warmed) + a "creator-of-row" bypass for INSERT.
  - `rt:pontos:<scopeTerreiroId>` — INSERT on `pontos` where `owner_terreiro_id == scopeTerreiroId` → invalidate `queryKeys.pontos.terreiro(scopeTerreiroId)`.
  - `rt:collections:<scopeTerreiroId>` — `*` on `collections`; invalidates `terreiros.collectionsByTerreiro`, `collections.terreiro` (compat), `collections.accountable/editableByUserPrefix/available`.
  - `rt:collections_pontos:<scopeTerreiroId>` — `*` on `collections_pontos`; invalidates `collections.byId` and `collections.pontos`.
  - `rt:terreiro_members:<scopeTerreiroId>` — `*` on `terreiro_members`, filtered by `myTerreiroSet`; invalidates `me.membership`, `me.terreiros`, `me.permissions`.
  - `invite-gate:terreiro_invites` — INSERT-only on `terreiro_invites`, filtered client-side by `normalizedUserEmail` (`InviteGate.tsx:630-687`).
- **Storage buckets:** `terreiros-images` — `terreiros/<terreiroId>/cover.webp` (legacy fixed path used on edit) and `terreiros/<terreiroId>/<unique>.webp` (used on create, see `makeUniqueFileName`). Bucket max 2 MB enforced client-side via WebP compression candidates `[0.92, 0.86, 0.78, 0.7, 0.62]`.
- **Edge functions:** none in this slice.

## Mutations

Following `cache-contract.md` template (cancel → snapshot → optimistic → rollback on error → invalidate on settled).

### Create terreiro — `createTerreiroFlow` + `patchTerreiroInLists` (`TerreiroEditor.tsx`)
- **Where:** `TerreiroEditor.tsx:1343-1426`.
- **What it writes:** 4 sequential operations:
  1. INSERT `terreiros` `{ title, about, lines_of_work, created_by }` returning `id`.
  2. INSERT `terreiro_members` `{ terreiro_id, user_id, role: "admin", status: "active" }`.
  3. UPSERT `terreiros_contatos` primary on `terreiro_id`.
  4. Optional WebP image upload to `terreiros/<id>/<unique>.webp`, then UPDATE `terreiros.cover_image_url`.
- **Optimistic strategy:** after step 3, calls `onBaseCreated(terreiroId)` which immediately runs `patchTerreiroInLists(queryClient, { ..., role: "admin" })` and `invalidateQueries(queryKeys.preferences.terreiros(user.id))`. After the upload, runs `patchTerreiroInLists` again with the final cover URL.
- **Invalidations on success:** `invalidateTerreiro(id)`, `invalidateTerreiroListsForRoles(userId)`, `queryKeys.preferences.terreiros(userId)`. Also fires `applyTerreiroPatch` from Preferences and `fetchTerreirosQueAdministro(userId)`.
- **Error handling:** image upload failures are recoverable — terreiro stays created, toast says `"Terreiro criado, mas não foi possível salvar a imagem."`.

### Update terreiro — `TerreiroEditor.onSave` (edit path)
- **Where:** `TerreiroEditor.tsx:1429-1552`.
- **What it writes:** UPDATE `terreiros` (`title, about, lines_of_work, cover_image_url`), UPSERT `terreiros_contatos`.
- **Optimistic strategy:** none on the request itself. After response, `patchTerreiroInLists` + `invalidateTerreiro` + `invalidateTerreiroListsForRoles` + **`refetchQueries({ queryKey: queryKeys.terreiros.withRole(userId), type: "all" })`** to force the Terreiros list to reflect contatos/WhatsApp changes immediately.

### Delete terreiro — `confirmDeleteTerreiro`
- **Where:** `TerreiroEditor.tsx:868-978`.
- **RPC:** `delete_terreiro(p_terreiro_id)`. Pre-step: `deleteTerreiroStorageFolder(id)` (recursive list+remove on `terreiros-images`).
- **Optimistic strategy:** snapshots `preferences.terreiros`, `terreiros.withRole`, `me.editableTerreiros`, then calls `removeTerreiroFromLists`. On error, restores all three caches.
- **Invalidations on success:** `invalidateTerreiro(id)`, `invalidateTerreiroListsForRoles(userId)`, `preferences.terreiros(userId)`; **removes** caches for `terreiros.byId(id)`, `terreiros.collectionsByTerreiro(id)`, `pontos.terreiro(id)`.
- **Confirmation:** client enforces typing the exact `expectedDeleteName` (trimmed `form.title`).

### Send invite (admin path) — `TerreiroEditor.sendInvite`
- **Where:** `TerreiroEditor.tsx:1097-1180`.
- **What it writes:** INSERT `terreiro_invites` `{ terreiro_id, email: normalized, role: "admin"|"curimba", created_by: user.id, status: "pending" }`. **Does not set `member_kind`.**
- **Pre-validation:** email format, not already a member, no pending dup at the same `(terreiro_id, email)`.
- **Optimistic strategy:** none.
- **Error mapping:** `23505` / `ux_terreiro_invites_pending` → "Este e-mail já possui um convite pendente para este terreiro."

### Send invite (gestão path) — `useCreateTerreiroInvite`
- **Where:** `src/hooks/terreiroMembership.ts:906-994` (used by `TerreiroMembers.tsx`).
- **What it writes:** calls `createTerreiroInvite({ terreiroId, createdBy, email, role: "member" })`. `member_kind` is defaulted to `"assistencia"` when role is `"member"`; **if the `member_kind` column is missing on the DB, the helper retries without it.**
- **Optimistic strategy:** prepends `{ id: "optimistic-<ts>", terreiro_id, email: normalized, role, status: "pending", created_at: now }` to `queryKeys.terreiro.invites(terreiroId)`. On error → rollback.
- **Invalidations on settled:** `queryKeys.terreiro.invites(terreiroId)`.
- **Duplicate handling:** same as above, returns `Já existe um convite pendente…`.

### Cancel invite — `useCancelTerreiroInvite`
- **Where:** `src/hooks/terreiroMembership.ts:1086-1210`.
- **What it writes:** DELETE on `terreiro_invites` `eq id`. **If `inviteId.startsWith("optimistic-")`,** the mutation reads the cached row to recover `email`/`role`, then DELETEs by `(terreiro_id, email, status='pending', role?)` — never by id (the optimistic id is bogus). Refuses cancellation when no `email` recoverable: `"Convite ainda está sendo enviado. Tente novamente em alguns segundos."`.
- **Optimistic strategy:** filter out by id, rollback on error.
- **Invalidations on settled:** `queryKeys.terreiro.invites(terreiroId)`.
- **Empty-delete guard:** `deletedCount === 0` raises `"Convite não encontrado (talvez já tenha sido cancelado)."`.

### Resend invite — `useResendTerreiroInvite`
- **Where:** `src/hooks/terreiroMembership.ts:1212-1250`. **Placeholder implementation:** UPDATE `terreiro_invites` `set updated_at = now()` `eq id`. Inline comment: `"This is a placeholder implementation. You may want to add a specific RPC or update logic here."` (`:1223-1225`). No mail re-send actually happens server-side from this client call.

### Remove member — `useRemoveTerreiroMember`
- **Where:** `src/hooks/terreiroMembership.ts:995-1084`.
- **What it writes:** DELETE on `terreiro_members` `eq (terreiro_id, user_id)`.
- **Optimistic strategy:** filter out by `user_id`, rollback on error.
- **Invalidations on settled:** `queryKeys.terreiro.members(terreiroId)`.
- **Error mapping:** `cannot_remove_last_admin` → `"Não é possível remover o último admin"`.

### Approve/reject membership request — `useReviewTerreiroMembershipRequest`
- **Where:** `src/hooks/terreiroMembership.ts:400-589`.
- **RPCs:** `approve_terreiro_membership_request(request_id)` / `reject_terreiro_membership_request(request_id)`.
- **Optimistic strategy:** filter out by id from `queryKeys.terreiro.membershipRequests(terreiroId)`, rollback on error.
- **Invalidations on settled:** `terreiro.membershipRequests`, `terreiro.members`, `terreiro.invites` (all for the same terreiro).
- **Error mapping:** `not_authorized_admin_only` / RLS / permission → `"Acesso restrito à administração."`.

### Create membership request — `useCreateTerreiroMembershipRequest`
- **Where:** `src/hooks/terreiroMembership.ts:234-278`. Used by `JoinTerreiroButton`.
- **What it writes:** INSERT `terreiro_membership_requests` `{ terreiro_id, user_id, status: "pending" }`.
- **Optimistic strategy:** none (returns success state via `setState`).
- **Duplicate handling:** `23505` / `"duplicate" | "already exists" | "unique"` → `{ ok: true, alreadyExisted: true }`, toast says `"Pedido já enviado (pendente)."`.
- **No invalidations**, but `JoinTerreiroButton` calls `membership.reload()` after success.

### Accept terreiro invite — `InviteGate.acceptInvite` and `useTerreiroInviteDecision.accept`
- **Where:** `InviteGate.tsx:713-885`, `src/hooks/useTerreiroInviteDecision.ts:45-129`.
- **RPC:** `accept_terreiro_invite(invite_id)` (fallback `p_invite_id` on `PGRST202`).
- **Validation:** `data === false` raised as `Error("accept_terreiro_invite returned false")`.
- **Optimistic strategy:**
  - `InviteGate`: `resolveInviteLocally(id)` pops from in-memory queue, closes modal; if role is `admin`/`curimba`, runs `fetchTerreirosQueAdministro(userId)` synchronously.
  - `useTerreiroInviteDecision`: directly patches `queryKeys.terreiroInvites.pendingForInvitee(email)` (removes invite) and **also pushes the terreiro into `queryKeys.preferences.terreiros(userId)`** with the invite's role + member_kind.
- **Invalidations on success:** `me.membership`, `me.terreiros`, `me.terreirosWithRole`, `me.terreiroAccessIds`, `me.editableTerreiros`, `me.permissions`, `terreiros.editableByUser`, `collections.accountable`, `collections.editableByUserPrefix`. The hook also exact-invalidates `terreiroInvites.pendingForInvitee(email)`.
- **Toast:** `InviteGate` says `"Convite aceito."` or `"Convite aceito, mas não foi possível atualizar permissões agora. Tente novamente em instantes."` when the warm-cache step throws. Hook variant says `"Convite aceito. Você agora faz parte do terreiro."`.

### Reject terreiro invite — `InviteGate.rejectInvite` and `useTerreiroInviteDecision.reject`
- **RPC:** `reject_terreiro_invite(invite_id)` (same fallback).
- **Same optimistic pop + invalidation surface** as accept, minus the editableTerreiros / collections.accountable invalidations in the hook (rejection does not produce membership).

### Decide later (snooze) — `InviteGate.decideLater`
- **Where:** `InviteGate.tsx:1056-1090`.
- **Persisted to AsyncStorage** via `bumpTerreiroInviteSnooze(normalizedEmail, inviteId)`. Count caps at 2.
- **No network call.**
- **Toast:** `TERREIRO_INVITE_DECIDE_LATER_TOAST` = `"Você pode aceitar ou recusar este convite a qualquer momento no menu de Preferências."`.

## Business rules / invariants

### Roles & member kinds
- **Three roles**: `admin`, `curimba`, `member`. Legacy `editor` is normalized to `curimba` (`terreiroRoles.ts:9`). A synthetic 4th role `follower` is used **only in the Terreiros list** as a UI hint when there's no `terreiro_members` row (`terreirosWithRole.ts:254`). It is **never written**.
- **Member kind** (`corrente` / `assistencia`) is only valid for `role === "member"` and is sent **only by `createTerreiroInvite`** (defaulted `"assistencia"`); `TerreiroEditor.sendInvite` does not set it at all.
- **Curator role** (the global "acervo guardião") is a **separate global concept** (`docs/architecture/curator-review.md`); not in this slice.
- **`canEdit`** in `TerreiroBiblioteca`, `canManage` in `TerreiroMembers`, and `isAdmin` in `TerreiroEditor` all derive from the same membership query but with slightly different gates:
  - `canEdit = isActiveMember && role IN (admin, curimba)` — collection CRUD.
  - `canManage` same — gestão view.
  - `isAdmin = (createdBy === user.id) || (myTerreiroRole === "admin")` — terreiro destruction + invites. **Ownership grants admin even when no `terreiro_members` row exists**, which is how the creator passes the gate before the post-create realtime sync settles.
- **`canDeleteCollection`** also requires `ownerTerreiroId === terreiroId` (`TerreiroBiblioteca.tsx:691-702`) — i.e., a `curimba` can delete only **terreiro-owned** collections, not user-owned ones that happen to be visible.

### Invite copy variants by role
`src/domain/terreiroInviteCopy.ts`:
- `member` → badge `"Membra / Membro"`; body emphasizes "passará a aparecer como membro(a) do terreiro".
- `curimba` → badge `"Curimba"`; body emphasizes "criar, editar e organizar pontos e coleções".
- `admin` → badge `"Admin"`; body emphasizes "gerenciar conteúdos, membros e convites".
- The modal additionally renders `Badge.appearance` as `"primary"` only for `admin` and `"secondary"` for the others (`InviteGate.tsx:1167-1170`).

### Snooze model (terreiro invite)
- `loadTerreiroInviteSnoozeMap` migrates legacy v1 keys (`inviteGate:snoozedInviteIds:v1:<email>` array → `{ count: 2, lastSnoozedAt: now }` each).
- `shouldHideFromGate` (InviteGate):
  - `count >= 2` → hide forever from modal.
  - `count === 1 && lastSnoozedAt >= sessionStartAtRef.current` → hide for the rest of this app session only.
  - Banner is **not** affected: the banner shows whenever there's at least one pending invite reachable on the server.
- `terreiroSnoozeVersion` in `InviteGatesContext` is a counter that lets external code force a re-evaluation by bumping it; the `InviteGate` effect at `:296-321` re-reads the snooze map and resyncs.

### `TerreiroBiblioteca` (the `/terreiro` route)
- The route name is `/terreiro` but the screen file is `TerreiroBiblioteca` — the route renders the **library**, not a terreiro overview.
- **Membership check happens against `queryKeys.me.membership(userId)`**, not against the embedded `terreiro_members` from `fetchTerreirosWithRole`. The shared cache is what `useRealtimeTerreiroScope`'s `terreiro_members` channel invalidates.
- **Two routes converge here:** `/(app)/terreiro` (named) and the deep link `/l/terreiro/:id`. The library exposes `bootStart="1"` / `bootOffline="1"` params that the foundation uses for the start-page resume flow; if `bootOffline === "1"` AND the collections query errors, it `clearStartPageSnapshotOnly()` and replaces back to the previous tab.
- **Background offline refresh:** when `isConnected`, if `getPackage(terreiroId)` exists, `syncTerreiroPackage(terreiroId)` runs silently on focus (`TerreiroBiblioteca.tsx:382-397`).
- **Library order** persists per terreiro to AsyncStorage at `saravafy:terreiro-library-order:<terreiroId>`. The "Editar" affordance (curators only) leads to a cross-slice editor at `/terreiro-collections/[terreiroId]/edit`.

### Members list visibility tiering
- `TerreiroMembersList.initialTier = "public"` even for logged-in users. The tier is then upgraded to `admins` / `members` once `useTerreiroMembershipStatus` resolves with a known role (`TerreiroMembersList.tsx:131-153`).
- **Fallback chain** on RPC error: `admins → members → public`, capped at 2 falls (`fallbackCountRef`). When falling back to `public` from a higher tier while logged in, the user gets `showToast("Mostrando a lista pública de membros.")`.
- **Email is intentionally stripped from URL params** when navigating to the profile screen (`encodeMemberParam`, `TerreiroMembersList.tsx:65-70`) — only `admins`-tier RPC returns email, and even then the profile route never carries it.
- The `useToast` import in `TerreiroMembersList.tsx:3` is **unused** after the fallback message moved to the effect; this is dead code (see Known issues).

### Realtime double-stack
- **Global, all-terreiros stream** in `TerreirosRealtimeSync` (root-mounted). Reacts to `terreiros` + `terreiros_contatos` only. The channel name is per user (`terreiros-sync:<userId>`).
- **Scoped, single-terreiro stream** in `useRealtimeTerreiroScope` (`(app)/_layout.tsx`-mounted). Channels are per `scopeTerreiroId`. Reacts to `pontos`, `collections`, `collections_pontos`, `terreiro_members`.
- **Both** can re-trigger on `terreiros_contatos` indirectly via cache invalidation: `TerreirosRealtimeSync` only invalidates if the terreiro is in your access ids (warmed) — creator gets unconditional update because it would otherwise be filtered out for the very first INSERT.

### `myTerreiroSet` filter
`useRealtimeTerreiroScope` is **doubly scoped**: the `pontos`/`collections` channels are bound to `scopeTerreiroId`, but the `terreiro_members` channel additionally gates events through `myTerreiroSet` (from `useMyTerreiroIdsQuery`). A `terreiro_members` event for a terreiro you are not a member of is silently ignored, even when you're viewing that terreiro.

### Anti-RLS-recursion / schema-drift hardening
- `isTerreiroMembersPolicyRecursionError` (`terreirosWithRole.ts:55-69`, `terreiros.ts:28-42`, `InviteGate.tsx:108-114`) — when Supabase returns `"infinite recursion detected in policy"` mentioning `"terreiro_members"`, the queries drop the embed/short-circuit. `InviteGate` raises `rlsRecursionDetectedRef = true` after the first hit and never queries again until reload; user gets a one-time toast.
- `isColumnMissingError` patterns appear in **every** terreiro query that touches optional columns — `cover_image_url`, `status`, `member_kind`, `description`, `title` vs `name` on the embed. Each falls back to a narrower select. **The doc-listed schema still has all of these columns** in current revisions; the fallbacks are old-environment compatibility.
- `pendingTerreiroInvites.ts` has the same `title`/`name` and `member_kind` fallback chain, but on error returns `[]` rather than throwing (`pendingTerreiroInvites.ts:89-91`).

### Anonymous / no-auth path
- `fetchTerreirosWithRole(null)` skips the `terreiro_members` embed entirely (RLS may forbid it) and returns rows with `role: undefined, membersCount: 0` (`terreirosWithRole.ts:119-161`).
- `JoinTerreiroButton.performJoin` requires auth via `requireAuth(action, { reason: "Para se tornar membro do terreiro, entre com sua conta." })`.

### Optimistic vs canonical IDs
- `createTerreiroInvite` optimistic IDs are `"optimistic-<Date.now()>"` (`terreiroMembership.ts:938`). `useCancelTerreiroInvite` recognizes the prefix and falls back to a DELETE by `(terreiro_id, email, status='pending', role?)` — only safe because invites are unique on `(terreiro_id, email, status='pending')` (DB index `ux_terreiro_invites_pending`).
- The realtime INSERT will reconcile the optimistic row's id on the next `terreiro.invites(terreiroId)` invalidation; no `replaceId` is wired explicitly.

### Image rules (TerreiroEditor)
- Cover must be WebP under 2 MB. The compress loop walks `[0.92, 0.86, 0.78, 0.7, 0.62]` and bails with a friendly error if none fit.
- The encoder availability is checked by `result.uri.toLowerCase().includes(".webp")`; "Encoder WEBP indisponível neste dispositivo." is thrown otherwise.
- **Two upload paths:** `uploadCoverWebp` for edit uses fixed `terreiros/<id>/cover.webp` (overwritten in place); `createTerreiroFlow` for create uses `terreiros/<id>/<unique>.webp` (`makeUniqueFileName`). Both write back `cover_image_url` with a `?v=<Date.now()>` cache-bust suffix.
- `deleteTerreiroStorageFolder` lists everything under `terreiros/<id>/` and removes in chunks of 100. Runs **before** `delete_terreiro` RPC.

### Members tab visual rules
- `TerreiroMembers` only shows **`role === "member" && status === "active"`** members in the "Membros" list and only **`role === "member"`** invites in "Convites enviados" (`TerreiroMembers.tsx:158-200`). Admin/curimba management lives separately in `AccessManager` (cross-slice route `/access-manager`).
- `formatTimeAgo` rounds to PT-BR labels (`"agora"`, `"1 minuto atrás"`, …, `"X dias atrás"`).
- When a member invite is optimistic and the user opens the kebab menu, the screen toasts `"Aguarde… enviando convite"` and refuses to open the actions sheet.

## Cross-feature dependencies

- **Auth** (`@/contexts/AuthContext`) — `user.id` and `user.email` everywhere. `normalizedUserEmail` is the lookup key for invites and snooze AsyncStorage.
- **Preferences** (`@/contexts/PreferencesContext`) — `effectiveTheme`, `bootstrapStartPage` (drives `/terreiro` boot params), `applyTerreiroPatch` (called after every terreiro create/edit), `fetchTerreirosQueAdministro` (warm cache called after invite accept and terreiro save), `clearStartPageSnapshotOnly` (called when the offline-boot library fetch errors). The list `queryKeys.preferences.terreiros(userId)` is patched directly by both `terreirosCache.ts` and `useTerreiroInviteDecision`.
- **Toast** — used by every mutation path for success and error feedback.
- **Login prompt** (`@/src/contexts/LoginPromptContext`) — `requireAuth` wraps "Cadastrar terreiro" and "Tornar-se membro".
- **InviteGates** (`@/contexts/InviteGatesContext`) — `setTerreiroGateActive` is set by `InviteGate` whenever the modal/banner is up; `terreiroSnoozeVersion` lets external code force a snooze re-eval.
- **Foundation prefetch / boot plan** — `prefetchExploreTerreiros`, `prefetchCollectionsByTerreiro` (per access id), `prefetchMyEditableTerreiros`, `prefetchMyTerreiroAccessIds`.
- **`me` slice** — `useMyTerreiroIdsQuery`, `useMyTerreiroAccessIdsQuery`, `useMyEditableTerreirosQuery`, `useMyTerreirosWithRoleQuery`, `prefetchMyTerreiroAccessIds`. The terreiro slice's `invalidateTerreiroListsForRoles` and `useTerreiroInviteDecision` both invalidate the full `queryKeys.me.*` family.
- **Collections** — `collections` table is **owned** here in two ways: `owner_terreiro_id` (terreiro-owned, visible in `TerreiroBiblioteca`) and `owner_user_id` (user-owned, out of slice). `useRealtimeTerreiroScope` invalidates both `accountable` and `editableByUserPrefix` for `me`.
- **Pontos** — `useRealtimeTerreiroScope`'s `pontos` channel invalidates `queryKeys.pontos.terreiro(terreiroId)`; the `terreiro_ponto_custom_tags` cache lives on `queryKeys.pontos.customTagsByTerreiro` (note the `pontos` namespace, not `terreiros`).
- **AccessManager** (`src/screens/AccessManager/`, cross-slice) — `TerreiroEditor` pushes here as `/access-manager` for full role-management; an `AccessManager.old.tsx` sibling lives next to it (legacy).
- **Offline** (`src/offline/terreiroPackage.ts`, `src/offline/audioCache.ts`) — `TerreiroOfflineSheet` is the only UI to drive these; consumed by `terreirosCollections.ts` and `terreirosWithRole.ts` as a read-time fallback.
- **`@/src/features/identity/resolveProfiles`** — batch profile lookup; used by `useTerreiroMembers`, `useTerreiroInvites`, `usePendingTerreiroMembershipRequests`.
- **`@saravafy/design-tokens`** via `src/theme`.

## Known issues / TODOs found in code

- **Duplicate `fetchTerreirosWithRole` implementation.** `src/screens/Terreiros/data/terreiros.ts` is a near-identical copy of the live `src/queries/terreirosWithRole.ts` but lacks `membersCount` and the offline fallback. Nothing imports it (verified by grep). Dead file.
- **`useExploreTerreiros` is unused.** The hook is exported (`terreirosExplore.ts:63`) and `prefetchExploreTerreiros` runs at boot (`app/_layout.tsx:324`), but **no consumer reads the cache**. Either point the Terreiros tab at it (and drop `useTerreirosWithRoleQuery` for the anonymous path) or delete both. Mirrors the same dead-query pattern in `pontosFeed.ts`.
- **Three coexisting terreiro key namespaces** (`queryKeys.terreiro.*`, `queryKeys.terreiros.*`, top-level `terreiroMembersCount`/`terreiroMembersList(Infinite)`). The flat top-level keys are inconsistent with the rest of the registry (which is hierarchical) and don't participate in the user-scoped logout cleanup predicate. Consolidate.
- **Deprecated keys still around:**
  - `queryKeys.me.terreirosWithRole(userId)` is documented "Deprecated… use `queryKeys.preferences.terreiros`" (`queryKeys.ts:39-41`) but `useTerreiroInviteDecision` still invalidates it explicitly.
  - `queryKeys.collections.available(...)` ("manter por compatibilidade temporária", `queryKeys.ts:81-88`) is still invalidated by `useRealtimeTerreiroScope`.
- **`useResendTerreiroInvite` is a placeholder.** It UPDATES `terreiro_invites.updated_at` with no server-side resend logic (`terreiroMembership.ts:1223-1228`). The `TerreiroMembers` screen advertises "Reenviar convite" + toasts success regardless.
- **`handleRemoveMember`, `handleCancelInvite` in `TerreiroMembers.tsx` are no-op stubs.** They take an argument they `void` and rely on the menu sheets to call `openConfirmRemoveMember` / `openConfirmCancelInvite` directly. Dead callbacks (`TerreiroMembers.tsx:274-287`).
- **`InviteGate` and `usePendingTerreiroInvitesForInviteeQuery` are not the same code path.** `InviteGate` owns its own raw query, snooze logic, realtime channel, and refresh debounce; the Preferences slice uses the React Query version. Accepting an invite via Preferences invalidates the gate's cache via `queryKeys.terreiroInvites.pendingForInvitee(...)`, but the gate refreshes via its own in-memory cache window (`12_000 ms`) — there can be a delay before the banner disappears.
- **`useTerreiroInviteDecision` invalidates both `me.terreirosWithRole` AND `preferences.terreiros`** (`useTerreiroInviteDecision.ts:97-101`), which collide on the same `["preferences", "terreiros", userId]` array. Harmless but noisy; the alias is the only reason the redundancy is visible.
- **`InviteGate` realtime is INSERT-only.** UPDATEs to `terreiro_invites` (e.g., another device accepting the same invite) do not flush the banner/modal — only the manual or AppState-resume refetch does. Compare with `CuratorInviteGate` which subscribes to INSERT+UPDATE.
- **`reject_terreiro_invite` is the canonical name.** The `decline_terreiro_invite` name is intentionally avoided due to a deployed DB `CHECK status IN ('pending', 'accepted', 'rejected')` constraint and `activated_consistency` rule (inline note at `InviteGate.tsx:895-898`). The `useTerreiroInviteDecision` hook doesn't carry the same comment.
- **`PendingTerreiroInvite` has `member_kind`, but the membership accept path discards it.** `useTerreiroInviteDecision.accept` patches the Preferences cache with `member_kind: invite.role === "member" ? invite.member_kind ?? null : null`, but the server-side accept RPC is the source of truth — the cache may show a `member_kind` that the RPC ignored or overrode.
- **`TerreiroEditor.sendInvite` doesn't send `member_kind` either.** The shared `createTerreiroInvite` helper does (with fallback); the inline INSERT in the editor does not (`TerreiroEditor.tsx:1139-1149`). Two write paths, two payloads.
- **`fetchTerreirosWithRole` calls two extra parallel queries** (`terreiros_contatos`, `terreiros_responsaveis`) for **every** load, even when the list is huge. There is no `limit` on the parent select.
- **`useTerreiroMembers` and `useTerreiroInvites` chain "schema tolerance" with `for (let i = 0; i < 3 && res?.error; i += 1)`**. If a non-column-missing error happens it `break`s, but the loop body has no guarantee that re-running with the same column subset terminates — relies on the per-iteration short-circuit. Refactor to a switch is cleaner.
- **`isAdmin` in `TerreiroEditor`** is true when `terreiroCreatedByRef.current === user.id` OR `myTerreiroRole === "admin"`. The first condition runs before `loadAdminData` ever fires, so a creator can briefly see admin affordances **before** their `terreiro_members` row is read. (Inverse risk: after a hand-off, the `created_by` of the row never moves, so the original creator keeps seeing admin UI even after losing the role.)
- **`useToast` is imported but unused in `TerreiroMembersList`** (`TerreiroMembersList.tsx:3, 91` — `showToast` is then used only for the fallback message; if the fallback path is removed it becomes dead). Minor.
- **`TerreiroMembers.handleRemoveMember` / `handleCancelInvite` console.log absent, but `_layout.tsx:483-492` AppTabSwipeOverlay style logs are heavy** — same `__DEV__` audit as foundation.md.
- **`/terreiro-members-list` has no `terreiroTitle` param**, so the back button drops the user one step in stack history with no breadcrumb. Compare with `/terreiro` which echoes the title.
- **`TerreiroBiblioteca.headerTitleThreshold` has hardcoded `-40` and `-66` magic numbers** with stale `__DEV__` console.logs left in (`TerreiroBiblioteca.tsx:489-512`). The associated `useAnimatedReaction` also logs raw `scrollY` numbers in DEV (`:529-535`).
- **`TerreiroBiblioteca` background-sync silently swallows errors** (`/* best effort */`, `:388-392`). A package can silently de-sync without surface.
- **`useExploreTerreiros` query key `["terreiros", "explore", "initial"]` does not include `limit`**, so changing the boot-prefetch limit would still hit the same cache slot.
- **`useTerreiroInviteDecision`'s optimistic patch into `preferences.terreiros`** assumes the cache shape `{ id, title, cover_image_url, role, member_kind? }`. The actual `preferences.terreiros` query (from the auth slice's `me.ts`) is more permissive but does not document this shape; future schema additions risk silent shape drift.
- **`terreirosCache.patchTerreiroInLists` mixes `name` (input)** and `title` (cache row) inconsistently; the input field is `name`, but it writes `title` into the preferences cache and `name` into the `terreiros.withRole` cache. The two caches use different field names for the same value (`name` vs `title`), reinforcing the schema-drift problem.
- **`TerreiroOfflineSheet` invalidates `queryKeys.offline.terreiroPackage(terreiroId)`** after sync/remove but **not** `queryKeys.terreiros.collectionsByTerreiro(terreiroId)`. If the offline path returned stale data (`fetchCollectionsByTerreiro` does an `isOffline()` check that resolves before this invalidation), the screen could remain on the old package payload.
