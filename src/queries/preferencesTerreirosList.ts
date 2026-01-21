import { useMemo } from "react";
import type { MyTerreiroWithRole } from "./me";
import { usePreferencesTerreirosQuery } from "./me";
import {
  usePendingTerreiroInvitesForInviteeQuery,
  type PendingTerreiroInvite,
} from "./pendingTerreiroInvites";

export type PreferencesTerreirosListItem =
  | {
      type: "membership";
      terreiro: MyTerreiroWithRole;
    }
  | {
      type: "invite";
      invite: PendingTerreiroInvite;
    };

export function usePreferencesTerreirosListItems(params: {
  userId: string | null;
  normalizedEmail: string | null;
  enabledInvites?: boolean;
}) {
  const { userId, normalizedEmail, enabledInvites = true } = params;

  const membershipsQuery = usePreferencesTerreirosQuery(userId);
  const invitesQuery = usePendingTerreiroInvitesForInviteeQuery({
    normalizedEmail,
    enabled: !!userId && enabledInvites,
  });

  const items = useMemo<PreferencesTerreirosListItem[]>(() => {
    const inviteItems: PreferencesTerreirosListItem[] = (
      invitesQuery.data ?? []
    ).map((invite) => ({ type: "invite", invite } as const));

    const membershipItems: PreferencesTerreirosListItem[] = (
      membershipsQuery.data ?? []
    ).map((terreiro) => ({ type: "membership", terreiro } as const));

    // Product: invites should show alongside the user's terreiros.
    // We keep invites first to encourage a decision.
    return [...inviteItems, ...membershipItems];
  }, [invitesQuery.data, membershipsQuery.data]);

  return {
    items,
    membershipsQuery,
    invitesQuery,
  };
}
