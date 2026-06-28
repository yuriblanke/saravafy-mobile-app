import { supabase } from "@/lib/supabase";

export async function downgradeToMember(params: {
  userId: string;
  terreiroId: string;
}): Promise<void> {
  const res: any = await supabase
    .from("terreiro_members")
    .update({ role: "member" })
    .eq("terreiro_id", params.terreiroId)
    .eq("user_id", params.userId);

  if (res.error) {
    throw new Error(
      typeof res.error.message === "string" && res.error.message.trim()
        ? res.error.message
        : "Não foi possível sair do papel agora."
    );
  }
}

export async function deleteTerreirMembership(params: {
  userId: string;
  terreiroId: string;
}): Promise<void> {
  const res: any = await supabase
    .from("terreiro_members")
    .delete()
    .eq("terreiro_id", params.terreiroId)
    .eq("user_id", params.userId);

  if (res.error) {
    const msg =
      typeof res.error.message === "string" && res.error.message.trim()
        ? res.error.message
        : "Não foi possível sair do terreiro agora.";

    const lower = msg.toLowerCase();
    if (
      lower.includes("row-level") ||
      lower.includes("rls") ||
      lower.includes("permission") ||
      lower.includes("not authorized")
    ) {
      throw new Error(
        "Sem permissão para sair automaticamente. Um admin precisa ajustar a policy no Supabase."
      );
    }

    throw new Error(msg);
  }
}
