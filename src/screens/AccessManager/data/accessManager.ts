import { supabase } from "@/lib/supabase";

export async function updateMemberRole(params: {
  terreiroId: string;
  userId: string;
  role: "admin" | "curimba";
}): Promise<void> {
  const res: any = await supabase
    .from("terreiro_members")
    .update({ role: params.role })
    .eq("terreiro_id", params.terreiroId)
    .eq("user_id", params.userId);

  if (res.error) {
    throw new Error(
      typeof res.error.message === "string"
        ? res.error.message
        : "Erro ao alterar papel"
    );
  }
}
