import { isRpcParamMismatch } from "@/src/utils/errors";
import { supabase } from "@/lib/supabase";

export async function rpcTerreiroInvite(
  fnName: "accept_terreiro_invite" | "reject_terreiro_invite",
  inviteId: string
) {
  // Prefer `invite_id` (new signature) but fall back to `p_invite_id`.
  let rpc: any = await supabase.rpc(fnName, { invite_id: inviteId });

  if (rpc?.error && isRpcParamMismatch(rpc.error, "invite_id")) {
    rpc = await supabase.rpc(fnName, { p_invite_id: inviteId });
  }

  return rpc as any;
}
