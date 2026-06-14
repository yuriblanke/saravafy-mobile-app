# Access Manager

> Status: generated 2026-06-12 from full read of source files. Verify before relying on as spec.

## Purpose

Provides terreiro administrators with the screens and logic to manage who can operate a terreiro on Saravafy. Covers two distinct surfaces: the **management console** (`AccessManager` / "Gestão do terreiro") where admins invite, role-toggle, and remove other admins/curimbas, and the **member roster** (`TerreiroMembers` / "Membros do terreiro") where admins and curimbas manage rank-and-file members and approve/reject access requests. A separate read-only **public members list** (`TerreiroMembersList` + `TerreiroMemberProfile`) exposes a tier-aware paginated view of terreiro participants to any visitor. The slice also owns the global RBAC type definitions and the `curators` table hook used across the app.

## Files

- **Routes (expo-router):**
  - `app/(app)/access-manager.tsx`
  - `app/(app)/terreiro-members.tsx`
  - `app/(app)/terreiro-members-list.tsx`
  - `app/(app)/terreiro-member-profile.tsx`
- **Screens:**
  - `src/screens/AccessManager/AccessManager.tsx` — management console (admin-only)
  - `src/screens/AccessManager/AccessManager.old.tsx` — dead file, stub export only
  - `src/screens/AccessManager/AccessSection.tsx` — layout helper (section card with optional action button); used within the now-dead old screen
  - `src/screens/TerreiroMembers/TerreiroMembers.tsx` — member roster (admin + curimba)
  - `src/screens/TerreiroMembersPublic/TerreiroMembersList.tsx` — public paginated list
  - `src/screens/TerreiroMembersPublic/TerreiroMemberProfile.tsx` — read-only profile card (data passed via nav param)
- **Components:**
  - `src/components/AccessRoleInfo.tsx` — "i" tooltip popover that renders role permission copy
- **Hooks:**
  - `src/hooks/terreiroMembership.ts` — all membership queries and mutations (see Data flow)
  - `src/hooks/useIsCurator.ts` — global curator check against `curators` table
  - `src/hooks/useIsDevMaster.ts` — dev-only privilege hook
- **Queries:**
  - `src/queries/terreiroMembersRpc.ts` — typed wrappers for three tiered RPCs + count RPC
  - `src/queries/pendingTerreiroInvites.ts` — invitee-facing pending invite lookup
  - `src/queries/terreirosWithRole.ts` — terreiro list with caller's role (used for sidebar/nav)
  - `src/queries/me.ts` — `useMyTerreirosWithRoleQuery`, `useMyEditableTerreirosQuery`, membership ID helpers
  - `src/queries/queryKeys.ts` — all key factories
- **Domain / utils:**
  - `src/domain/terreiroRoles.ts` — `TerreiroRole` union, `normalizeTerreiroRole`, `TerreiroMemberKind`
  - `src/domain/globalRoles.ts` — `GlobalRole` (`"curator"`), `GLOBAL_ROLE_DEFS` with permission copy
  - `src/constants/accessRoleCopy.ts` — `ACCESS_ROLE_COPY` record, `getAccessRoleInfoProps` for tooltip content

## Routes

| Route | Screen | Params | Guard |
|---|---|---|---|
| `/access-manager` | `AccessManagerScreen` | `terreiroId: string` | Rendered for all; runtime guard — curimba gets toast + `router.back()` immediately after membership loads; non-member sees "Você não tem permissão" empty state |
| `/terreiro-members` | `TerreiroMembers` | `terreiroId: string` | Runtime guard — `canManage = isActiveMember && (role === "admin" || role === "curimba")`; fails to empty state with message |
| `/terreiro-members-list` | `TerreiroMembersList` | `terreiroId: string` | None — publicly accessible; tier is determined dynamically from membership |
| `/terreiro-member-profile` | `TerreiroMemberProfile` | `member: string` (URL-encoded JSON) | None — profile data is passed inline from list; no network call |

## Navigation

User enters these screens from the terreiro settings/preferences area. No deep-link scheme is registered for these routes. Navigation out of all screens is `router.back()`. `TerreiroMembersList` navigates forward to `terreiro-member-profile` via `router.push`, passing a JSON-encoded member param with the email field stripped before encoding.

## Contexts consumed/provided

| Context | Provided here? | Consumed by | State shape |
|---|---|---|---|
| `AuthContext` | No | `AccessManager`, `TerreiroMembersList`, `useIsCurator`, `useCreateTerreiroInvite`, `useRemoveTerreiroMember`, `useTerreiroMembershipStatus`, `me.ts` queries | `{ user: { id } }` |
| `PreferencesContext` | No | All four screens | `{ effectiveTheme: "light" \| "dark" }` |
| `ToastContext` | No | `AccessManager`, `TerreiroMembers`, `TerreiroMembersList` | `{ showToast(msg) }` |
| `GlobalSafeAreaInsetsContext` | No | `AccessManager`, `TerreiroMembers`, `TerreiroMembersList`, `TerreiroMemberProfile` | `{ top: number }` |

## Data flow (queries → screens)

### `useTerreiroMembershipStatus(terreiroId)`

- **queryKey:** `queryKeys.me.membership(userId)` → `["me", "membership", userId]`
- **Secondary key (pending requests):** `["terreiroMembershipRequest", userId, terreiroId]`
- **Table:** `terreiro_members` (select `terreiro_id, role, status` where `user_id = userId`, `role IN (admin, curimba, member)`, `status = active`); falls back without `status` filter if column missing. Also queries `terreiro_membership_requests` for non-members to detect a pending access request.
- **staleTime:** 60 s (membership); 30 s (pending request); pending request only enabled when `!isActiveMember`
- **Cache strategy:** `placeholderData: prev` (keeps previous data across invalidations); shared across all terreiros for the user (single queryKey by userId, filtered in-memory by `terreiroId`)
- **Screens:** `AccessManager`, `TerreiroMembers`, `TerreiroMembersList`

### `useTerreiroMembers(terreiroId)`

- **queryKey:** `queryKeys.terreiro.members(terreiroId)` → `["terreiro", terreiroId, "members"]`
- **Table:** `terreiro_members` (all columns including `member_kind`, `status`; adaptive: retries without missing columns up to 3 times)
- **staleTime:** 15 s; `placeholderData: prev`
- **Post-fetch:** calls `resolveProfiles({ userIds })` to hydrate `profilesById` map (email, full_name, avatar_url)
- **Screens:** `AccessManager` (filtered to `role IN (admin, curimba)`, `status = active`), `TerreiroMembers` (filtered to `role = member`, `status = active`)

### `useTerreiroInvites(terreiroId)`

- **queryKey:** `queryKeys.terreiro.invites(terreiroId)` → `["terreiro", terreiroId, "invites"]`
- **Table:** `terreiro_invites` (all records ordered by `created_at DESC`; adaptive column handling for `member_kind`, `status`)
- **staleTime:** 15 s; `placeholderData: prev`
- **Post-fetch:** calls `resolveProfiles({ emails })` to hydrate `profilesByEmailLower` map
- **Derived:** `.pending` = items filtered to `status === "pending"` (memoized)
- **Screens:** `AccessManager` (shows only `role IN (admin, curimba)` pending invites), `TerreiroMembers` (shows only `role = member` pending invites)

### `usePendingTerreiroMembershipRequests(terreiroId)`

- **queryKey:** `queryKeys.terreiro.membershipRequests(terreiroId)` → `["terreiro", terreiroId, "membershipRequests"]`
- **Table:** `terreiro_membership_requests` (select `id, terreiro_id, user_id, status, created_at` where `status = pending`, ordered `created_at ASC`)
- **staleTime:** 15 s; `placeholderData: prev`
- **Post-fetch:** `resolveProfiles({ userIds })` for `profilesById`
- **Screens:** `TerreiroMembers` only

### `useInfiniteQuery` — members public list (`TerreiroMembersList`)

- **queryKey:** `queryKeys.terreiroMembersListInfinite({ terreiroId, visibilityTier })` → `["terreiroMembersListInfinite", terreiroId, visibilityTier]`
- **RPCs:** `get_terreiro_members_public` / `get_terreiro_members_for_members` / `get_terreiro_members_for_admins` (params: `p_terreiro_id`, `p_limit`, `p_offset`)
- **Page size:** 30; infinite scroll via `onEndReached`
- **staleTime:** 60 s; `gcTime`: 5 min
- **Tier logic:** starts at `"public"`, promotes to `"members"` or `"admins"` once `useTerreiroMembershipStatus` resolves; falls back down on RPC error (max 2 fallbacks)
- **Screens:** `TerreiroMembersList`

### `useIsCurator()`

- **queryKey:** `queryKeys.globalRoles.isCurator(userId)` → `["globalRoles", "curator", userId]`
- **Table:** `curators` (select `user_id` where `user_id = userId`, `.maybeSingle()`)
- **staleTime:** 0; `gcTime`: 30 s; `refetchOnMount: "always"`, `refetchOnWindowFocus: true`
- **Screens:** Not consumed in this slice's screens directly; consumed by curator-gated features elsewhere

### `usePendingTerreiroInvitesForInviteeQuery` (invitee-facing)

- **queryKey:** `queryKeys.terreiroInvites.pendingForInvitee(normalizedEmail)` → `["terreiroInvites", "pendingForInvitee", email]`
- **Table:** `terreiro_invites` joined to `terreiros(title)`, filtered `status = pending`, `email = normalizedEmail`
- **staleTime:** 0 (always fresh); used in the auth/onboarding flow, not in the admin screens

## Supabase surface

- **Tables read:**
  - `terreiro_members` — membership rows (role, status, member_kind, created_at)
  - `terreiro_invites` — invite rows (email, role, member_kind, status, created_at, created_by)
  - `terreiro_membership_requests` — access request rows (user_id, status, created_at)
  - `terreiros` — minimal fields (id, title, cover_image_url) joined in `me.ts` and `terreirosWithRole.ts`
  - `curators` — global curator flag (user_id only)
  - `profiles` (via `resolveProfiles`) — full_name, email, avatar_url; hydrated after member/invite fetches
- **Tables written:**
  - `terreiro_members` — `UPDATE { role }` (role toggle); `DELETE` (remove member via `useRemoveTerreiroMember`); `UPSERT` (via `upsertTerreiroMemberActive` utility)
  - `terreiro_invites` — `INSERT` (create invite); `DELETE` (cancel invite); `UPDATE { updated_at }` (resend invite — stub)
  - `terreiro_membership_requests` — `INSERT` (new access request via `useCreateTerreiroMembershipRequest`)
- **RPCs called:**
  - `approve_terreiro_membership_request(request_id)` — approves a pending request
  - `reject_terreiro_membership_request(request_id)` — rejects a pending request
  - `get_terreiro_members_public(p_terreiro_id, p_limit, p_offset)` — public member list (name, avatar only)
  - `get_terreiro_members_for_members(p_terreiro_id, p_limit, p_offset)` — member-tier list (adds role, status)
  - `get_terreiro_members_for_admins(p_terreiro_id, p_limit, p_offset)` — admin-tier list (adds email)
  - `get_terreiro_members_count(p_terreiro_id)` — returns integer count
- **Realtime channels:** None in this slice (Realtime for membership is handled in `useRealtimeTerreiroScope` hook and triggers invalidations of `queryKeys.me.membership`)
- **Storage buckets:** None
- **Edge functions:** None

## Mutations

### `useCreateTerreiroInvite(terreiroId).create({ email, role })`

- **Table:** INSERT into `terreiro_invites`
- **onMutate:** cancels `queryKeys.terreiro.invites(terreiroId)`; prepends optimistic invite with `id: "optimistic-{timestamp}"` and `status: "pending"` to cached items
- **onError:** rolls back to snapshot
- **onSettled:** invalidates `queryKeys.terreiro.invites(terreiroId)`
- **Duplicate guard:** checked client-side before mutating — if a pending invite with the same normalized email already exists, returns an error string with role-appropriate hint copy

### `useRemoveTerreiroMember(terreiroId).remove(memberUserId)`

- **Table:** DELETE from `terreiro_members` where `terreiro_id = terreiroId AND user_id = memberUserId`
- **onMutate:** cancels `queryKeys.terreiro.members(terreiroId)`; removes item from cached items array by `user_id`
- **onError:** rolls back to snapshot
- **onSettled:** invalidates `queryKeys.terreiro.members(terreiroId)`
- **Post-removal (in `AccessManager`):** also invalidates `queryKeys.me.membership(user.id)` and `queryKeys.terreiros.withRole(user.id)`

### `useCancelTerreiroInvite(terreiroId).cancel(inviteId)`

- **Table:** DELETE from `terreiro_invites` by `id` (real) or by `terreiro_id + email + status + role` (optimistic ID path)
- **onMutate:** cancels `queryKeys.terreiro.invites(terreiroId)`; removes invite from cache by id
- **onError:** rollback
- **onSettled:** invalidates `queryKeys.terreiro.invites(terreiroId)`
- **Edge case:** if `inviteId` starts with `"optimistic-"`, resolves the real email/role from cache before building the DELETE filter; throws if email not yet available

### `useResendTerreiroInvite().resend(inviteId)` — STUB

- **Table:** UPDATE `terreiro_invites SET updated_at = now()` where `id = inviteId`
- **No cache update, no optimistic update, no invalidation.** Comment in code: "This is a placeholder implementation / You may want to add a specific RPC or update logic here"
- Touching `updated_at` does not re-trigger any email notification pipeline unless a database trigger exists for it (not confirmed from client-side code).

### `useReviewTerreiroMembershipRequest(terreiroId).approve(requestId)`

- **RPC:** `approve_terreiro_membership_request(request_id)`
- **onMutate:** cancels `queryKeys.terreiro.membershipRequests(terreiroId)`; removes request from cached list by id (optimistic removal)
- **onError:** rollback
- **onSettled:** invalidates `membershipRequests`, `members`, and `invites` keys for terreiroId

### `useReviewTerreiroMembershipRequest(terreiroId).reject(requestId)`

- **RPC:** `reject_terreiro_membership_request(request_id)`
- Same cache strategy as approve above

### Role toggle (direct Supabase call in `AccessManager.handleToggleRole`)

- **Table:** `supabase.from("terreiro_members").update({ role: newRole }).eq("terreiro_id", ...).eq("user_id", ...)`
- **No optimistic update.** Calls `membersHook.reload()` (imperative `refetch`) after success.
- **Post-success invalidations:** `queryKeys.me.membership(user.id)`, `queryKeys.terreiros.withRole(user.id)`
- **Deviation from cache-contract:** Direct imperative write bypasses the mutation pattern entirely; no `onMutate`/`onError`/`onSettled` lifecycle.

### `useCreateTerreiroMembershipRequest(terreiroId).create()`

- **Table:** INSERT into `terreiro_membership_requests` with `status: "pending"`
- **Duplicate handling:** PostgreSQL unique-key error (code `23505`) is caught and treated as success (`alreadyExisted: true`) — no throw
- **No cache invalidation** after insert (invitee-facing; the admin sees the request appear only on next `refetch` of `membershipRequests`)

## Business rules / invariants

**RBAC hierarchy (terreiro-scoped):**
- `admin` — full management: invite any role, edit collections, set visibility, manage tags
- `curimba` — partial: edit collections and custom tags; cannot invite or change visibility; can access `TerreiroMembers` screen but NOT `AccessManager`
- `member` — read-only access to terreiro content; `corrente` or `assistencia` subtypes tracked via `member_kind`
- Legacy `"editor"` role is normalized to `"curimba"` in `normalizeTerreiroRole`

**Global role:**
- `curator` — platform-wide; checked separately via `curators` table; allows editing any ponto in the global catalog

**Access guard behavior:**
- `AccessManager` allows the route to render for any user but redirects a `curimba` immediately (toast + `router.back()`) once membership loads. A non-member sees an inline "no permission" message. A `curimba` briefly sees a blank screen during the redirect (empty `<View>` rendered at line 463 while `router.back()` fires).
- `TerreiroMembers` shows an inline "no permission" message for non-admin/curimba users; does not redirect.
- Neither screen blocks render until membership is confirmed — there is a flash window while `membershipQuery.isLoading`.

**Email handling:**
- Emails are always normalized to lowercase-trimmed before comparison or storage.
- The public `TerreiroMembersList` route explicitly strips `email` from the member param before passing it to `TerreiroMemberProfile` via nav (`encodeMemberParam` deletes `email`).
- Admin-tier RPC (`get_terreiro_members_for_admins`) includes email in its response; member and public tiers do not.

**Invite deduplication:**
- Client-side: before calling `createTerreiroInvite`, screens check `invitesHook.pending` for an existing invite to the same normalized email and return a user-facing error with role-specific cancellation hint.
- Server-side: unique constraint `ux_terreiro_invites_pending` (code `23505`) on the table; caught and re-thrown as a friendly message.

**Last-admin protection:**
- Backend enforces `cannot_remove_last_admin` on the delete RPC (error string detected in `getErrorMessage` and surfaced as "Não é possível remover o último admin").
- The client warns the user in the confirm modal copy when removing an admin, but does not prevent the attempt.

**Tier promotion in public member list:**
- `TerreiroMembersList` always starts at `"public"` tier (even for logged-in users) to avoid blank-screen flicker while membership loads.
- After membership resolves: `admin/curimba → "admins"`, `member → "members"`, otherwise stays `"public"`.
- If the elevated-tier RPC fails, falls back one tier, max 2 times, then stays at `"public"` and shows a toast.

**`member_kind` / `status` column guards:**
- Multiple queries implement retry loops that strip optional columns (`status`, `member_kind`) if the column-missing error pattern is detected, enabling the app to run against older DB schemas.

## Cross-feature dependencies

- **Auth (`AuthContext`):** `user.id` is the primary key for all membership and invite queries.
- **Terreiros slice:** `queryKeys.terreiros.withRole(userId)` is invalidated by role-change and member-removal mutations here, keeping the terreiro list sidebar in sync.
- **Preferences slice:** `queryKeys.preferences.terreiros(userId)` (alias `queryKeys.me.terreirosWithRole`) is the same key used by `useMyTerreirosWithRoleQuery` in `me.ts`; changes to membership here affect what terreiros appear in preferences.
- **Identity / profiles:** `src/features/identity/resolveProfiles` is called after every member and invite fetch to enrich rows with `full_name`, `email`, and `avatar_url` from the `profiles` table.
- **Pontos / Collections:** `curimba` and `admin` roles gate write access to collections and custom tags in those slices; the role values originate from `terreiro_members` as loaded here.
- **Curator review slice:** `useIsCurator` (in this slice) is consumed by curator-specific UI (ponto editing, submission review) in other slices.
- **Offline sync:** `terreirosWithRole.ts` consults `isOffline()` and `listPackages()` for a fallback; this is the only offline-aware function in the access-manager slice.

## Known issues / TODOs found in code

1. **`useResendTerreiroInvite` is a stub.** The implementation only touches `updated_at` on the invite row. There is no RPC, no edge function, and no database trigger confirmed from the client. The code comment says "This is a placeholder implementation". Resending an invite does nothing meaningful unless a Supabase trigger fires on `updated_at` changes.

2. **`AccessManager.old.tsx` is dead code.** The file contains only `export {}` and a comment saying it is "kept for reference; excluded from builds by stubbing." The five component files alongside it (`AccessSection.tsx`, `GestaoList.tsx`, `InviteModal.tsx`, `InviteRow.tsx`, `MembersList.tsx`, `PendingInvitesList.tsx`) exist in the directory but are not imported by the live screen.

3. **Role toggle bypasses the mutation pattern.** `handleToggleRole` in `AccessManager` calls `supabase.from("terreiro_members").update(...)` directly, then calls `membersHook.reload()` imperatively. No optimistic update, no `onError` rollback; error is caught only by a surrounding `try/catch` with a toast. Inconsistent with every other mutation in this slice.

4. **curimba redirect causes a blank-screen flash.** When a curimba navigates to `/access-manager`, the guard renders an empty `<View>` and calls `router.back()` inside a `useEffect`. During the `membershipQuery.isLoading` window the full screen renders unchecked, and after load the curimba sees a blank frame before the back-navigation fires.

5. **`handleRemoveMember` and `handleCancelInvite` in `TerreiroMembers` are stubs.** Both functions contain only `void member` and `void invite` — no actual logic. The real remove/cancel logic is wired through `openConfirmRemoveMember` and `openConfirmCancelInvite` (which do call the hooks), but the originally-named handlers are empty. This appears to be a refactoring artifact.

6. **`showEmailLine` is hardcoded to `false` in `AccessManager`.** The `ManagementMember` and `ManagementInvite` shape includes `showEmailLine` but it is always set to `false`. Email is fetched and stored in the item but never displayed in the management console.

7. **`TerreiroMembersList` tier state is local, not from React Query.** The `effectiveTier` is `useState`, meaning it resets on unmount/remount. Rapid navigation will briefly show the public tier for logged-in members.

8. **`queryKeys.me.terreirosWithRole` is deprecated.** Annotated as deprecated in `queryKeys.ts` (comment: "Deprecated (mantido por compatibilidade): use `queryKeys.preferences.terreiros`") but the alias remains used by some callers.

9. **`fetchTerreiroMembersCount` RPC response shape is ambiguous.** The function defensively handles three response shapes (scalar, object with `.count`, array), suggesting the RPC return type has changed across schema versions or differs between environments.

10. **No Realtime subscription in the admin screens.** `AccessManager` and `TerreiroMembers` rely entirely on imperative `reload()` calls and post-mutation invalidations for freshness. Concurrent admin changes are invisible until a mutation or re-entry is triggered.
