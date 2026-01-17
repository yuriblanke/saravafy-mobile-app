import type { QueryClient } from "@tanstack/react-query";

import { prefetchPreferencesTerreiros } from "@/src/queries/me";
import { prefetchPendingTerreiroInvitesForInvitee } from "@/src/queries/pendingTerreiroInvites";

export async function prewarmPreferences(
  queryClient: QueryClient,
  params: { userId: string | null; normalizedEmail: string | null }
) {
  const { userId, normalizedEmail } = params;

  const tasks: Array<Promise<unknown>> = [];

  // Metro doesn't always code-split, but this still warms the module graph.
  tasks.push(import("@/src/screens/Preferences/Preferences").catch(() => null));

  if (userId) {
    tasks.push(prefetchPreferencesTerreiros(queryClient, { userId }).catch(() => null));
  }

  if (normalizedEmail) {
    tasks.push(
      prefetchPendingTerreiroInvitesForInvitee(queryClient, { normalizedEmail }).catch(
        () => null
      )
    );
  }

  await Promise.allSettled(tasks);
}
