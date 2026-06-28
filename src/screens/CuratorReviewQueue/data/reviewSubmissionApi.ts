import { supabase } from "@/lib/supabase";
import {
  isRpcParamMismatch,
  safeJsonForLog,
  serializeErrorForLog as serializeSupabaseErrorForLog,
} from "@/src/utils/errors";

export async function callRpcWithParamFallback(
  functionName: string,
  payloadWithPrefix: Record<string, any>
): Promise<any> {
  const startedAt = Date.now();

  let res: any = await supabase.rpc(functionName, payloadWithPrefix);

  if (__DEV__ && res?.error) {
    console.error("[review-rpc] error:first-attempt", {
      functionName,
      ms: Date.now() - startedAt,
      payloadKeys: Object.keys(payloadWithPrefix ?? {}),
      error: serializeSupabaseErrorForLog(res.error),
    });
  }

  if (res?.error && isRpcParamMismatch(res.error)) {
    const fallbackPayload: Record<string, any> = {};
    for (const [key, value] of Object.entries(payloadWithPrefix)) {
      const newKey = key.startsWith("p_") ? key.substring(2) : key;
      fallbackPayload[newKey] = value;
    }

    if (__DEV__) {
      console.log("[review-rpc] retry:fallback-params", {
        functionName,
        firstAttemptKeys: Object.keys(payloadWithPrefix ?? {}),
        fallbackKeys: Object.keys(fallbackPayload ?? {}),
      });
    }

    res = await supabase.rpc(functionName, fallbackPayload);

    if (__DEV__ && res?.error) {
      console.error("[review-rpc] error:fallback-attempt", {
        functionName,
        ms: Date.now() - startedAt,
        payloadKeys: Object.keys(fallbackPayload ?? {}),
        error: serializeSupabaseErrorForLog(res.error),
      });
    }
  }

  return res;
}
