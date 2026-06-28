import { supabase } from "@/lib/supabase";

function isRpcFunctionParamMismatch(error: unknown, paramName: string) {
  const anyErr = error as any;
  const code = typeof anyErr?.code === "string" ? anyErr.code : "";
  const message = typeof anyErr?.message === "string" ? anyErr.message : "";
  const hint = typeof anyErr?.hint === "string" ? anyErr.hint : "";
  if (code !== "PGRST202") return false;
  return (
    message.includes(`(${paramName})`) ||
    message.includes(`parameter ${paramName}`) ||
    hint.includes("invite_id")
  );
}

export async function rpcTerreiroInvite(
  fnName: "accept_terreiro_invite" | "reject_terreiro_invite",
  inviteId: string
) {
  // Prefer `invite_id` (new signature) but fall back to `p_invite_id`.
  let rpc: any = await supabase.rpc(fnName, { invite_id: inviteId });

  if (rpc?.error && isRpcFunctionParamMismatch(rpc.error, "invite_id")) {
    rpc = await supabase.rpc(fnName, { p_invite_id: inviteId });
  }

  return rpc as any;
}
