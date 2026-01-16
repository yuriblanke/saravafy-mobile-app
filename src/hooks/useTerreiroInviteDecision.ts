import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import type { PendingTerreiroInvite } from "@/src/queries/pendingTerreiroInvites";
import { queryKeys } from "@/src/queries/queryKeys";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

function isRpcFunctionParamMismatch(error: unknown, paramName: string) {
  const anyErr = error as any;
  const code = typeof anyErr?.code === "string" ? anyErr.code : "";
  const message = typeof anyErr?.message === "string" ? anyErr.message : "";
  if (code !== "PGRST202") return false;
  return (
    message.includes(`(${paramName})`) ||
    message.includes(`parameter ${paramName}`) ||
    message.includes(paramName)
  );
}

async function rpcTerreiroInvite(
  fnName: "accept_terreiro_invite" | "reject_terreiro_invite",
  inviteId: string
) {
  let rpc: any = await supabase.rpc(fnName, { invite_id: inviteId });

  if (rpc?.error && isRpcFunctionParamMismatch(rpc.error, "invite_id")) {
    rpc = await supabase.rpc(fnName, { p_invite_id: inviteId });
  }

  return rpc as any;
}

export function useTerreiroInviteDecision(params: {
  userId: string | null;
  normalizedEmail: string | null;
}) {
  const { userId, normalizedEmail } = params;
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [processingInviteId, setProcessingInviteId] = useState<string | null>(
    null
  );

  const accept = async (invite: PendingTerreiroInvite) => {
    if (!userId || !normalizedEmail) return;
    setProcessingInviteId(invite.id);
    try {
      const res = await rpcTerreiroInvite("accept_terreiro_invite", invite.id);
      if (res?.error) throw res.error;
      if (res?.data === false)
        throw new Error("accept_terreiro_invite returned false");

      // Optimistic: remove from pending invites list
      queryClient.setQueryData(
        queryKeys.terreiroInvites.pendingForInvitee(normalizedEmail),
        (prev: any) => {
          const arr = Array.isArray(prev) ? prev : [];
          return arr.filter((i: any) => String(i?.id ?? "") !== invite.id);
        }
      );

      // Optimistic: add terreiro to "Meus terreiros" immediately
      queryClient.setQueryData(
        queryKeys.preferences.terreiros(userId),
        (prev: any) => {
          const arr = Array.isArray(prev) ? prev : [];
          const already = arr.some(
            (t: any) => String(t?.id ?? "") === String(invite.terreiro_id)
          );
          if (already) return arr;

          return [
            ...arr,
            {
              id: invite.terreiro_id,
              title: invite.terreiro_title || "Terreiro",
              cover_image_url: null,
              role: invite.role,
              member_kind:
                invite.role === "member" ? invite.member_kind ?? null : null,
            },
          ];
        }
      );

      // Invalidate related caches
      queryClient.invalidateQueries({
        queryKey: queryKeys.terreiroInvites.pendingForInvitee(normalizedEmail),
        exact: true,
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.me.membership(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.terreiros(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.terreirosWithRole(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.terreiroAccessIds(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.editableTerreiros(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.permissions(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.terreiros.editableByUser(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.accountable(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.editableByUserPrefix(userId),
      });

      showToast("Convite aceito.");
    } catch {
      showToast(
        "Não foi possível concluir agora. Verifique sua conexão e tente novamente."
      );
    } finally {
      setProcessingInviteId(null);
    }
  };

  const reject = async (invite: PendingTerreiroInvite) => {
    if (!userId || !normalizedEmail) return;
    setProcessingInviteId(invite.id);
    try {
      const res = await rpcTerreiroInvite("reject_terreiro_invite", invite.id);
      if (res?.error) throw res.error;
      if (res?.data === false)
        throw new Error("reject_terreiro_invite returned false");

      // Optimistic: remove from pending invites list
      queryClient.setQueryData(
        queryKeys.terreiroInvites.pendingForInvitee(normalizedEmail),
        (prev: any) => {
          const arr = Array.isArray(prev) ? prev : [];
          return arr.filter((i: any) => String(i?.id ?? "") !== invite.id);
        }
      );

      queryClient.invalidateQueries({
        queryKey: queryKeys.terreiroInvites.pendingForInvitee(normalizedEmail),
        exact: true,
      });

      if (userId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.me.membership(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.me.terreiros(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.me.terreirosWithRole(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.me.terreiroAccessIds(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.me.editableTerreiros(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.me.permissions(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.collections.editableByUserPrefix(userId),
        });
      }

      showToast("Convite recusado.");
    } catch {
      showToast(
        "Não foi possível concluir agora. Verifique sua conexão e tente novamente."
      );
    } finally {
      setProcessingInviteId(null);
    }
  };

  return {
    accept,
    reject,
    processingInviteId,
  };
}
