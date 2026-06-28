import { isColumnMissingError } from "@/src/utils/errors";
import { supabase } from "@/lib/supabase";

export async function removeTerreiroMember(
  terreiroId: string,
  userId: string
) {
  return supabase.rpc("fn_remove_terreiro_member", {
    p_terreiro_id: terreiroId,
    p_user_id: userId,
  }) as Promise<any>;
}

export async function countActiveAdmins(
  terreiroId: string
): Promise<number | null> {
  try {
    let res: any = await supabase
      .from("terreiro_members")
      .select("user_id", { count: "exact", head: true })
      .eq("terreiro_id", terreiroId)
      .eq("role", "admin")
      .eq("status", "active");

    if (res.error && isColumnMissingError(res.error, "status")) {
      res = await supabase
        .from("terreiro_members")
        .select("user_id", { count: "exact", head: true })
        .eq("terreiro_id", terreiroId)
        .eq("role", "admin");
    }

    if (res.error) return null;
    return typeof res.count === "number" ? res.count : null;
  } catch {
    return null;
  }
}

export async function leaveTerreiroAsMember(
  terreiroId: string,
  userId: string
) {
  return supabase
    .from("terreiro_members")
    .delete()
    .eq("terreiro_id", terreiroId)
    .eq("user_id", userId) as Promise<any>;
}
