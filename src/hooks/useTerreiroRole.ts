import { useMemo } from "react";
import { useTerreiroMembershipStatus } from "./terreiroMembership";

export type TerreiroRole = "admin" | "curimba" | "member" | null;

export interface UseTerreiroRoleResult {
  role: TerreiroRole;
  isLoading: boolean;
  isActiveMember: boolean;
  hasPendingRequest: boolean;
  isAdmin: boolean;
  isCurimba: boolean;
  isAdminOrCurimba: boolean;
  isMember: boolean;
  canEditCustomTags: boolean;
  canManageMembers: boolean;
  canEditTerreiro: boolean;
}

export function useTerreiroRole(
  terreiroId: string | null | undefined,
): UseTerreiroRoleResult {
  const tid = typeof terreiroId === "string" ? terreiroId : "";
  const membership = useTerreiroMembershipStatus(tid);

  return useMemo(() => {
    const data = membership.data;
    const role: TerreiroRole = tid ? data.role : null;
    const isActiveMember = tid ? data.isActiveMember : false;
    const hasPendingRequest = tid ? data.hasPendingRequest : false;

    const isAdmin = isActiveMember && role === "admin";
    const isCurimba = isActiveMember && role === "curimba";
    const isAdminOrCurimba = isAdmin || isCurimba;
    const isMember = isActiveMember;

    return {
      role,
      isLoading: membership.isLoading,
      isActiveMember,
      hasPendingRequest,
      isAdmin,
      isCurimba,
      isAdminOrCurimba,
      isMember,
      canEditCustomTags: isAdminOrCurimba,
      canManageMembers: isAdmin,
      canEditTerreiro: isAdmin,
    };
  }, [
    tid,
    membership.data.role,
    membership.data.isActiveMember,
    membership.data.hasPendingRequest,
    membership.isLoading,
  ]);
}
