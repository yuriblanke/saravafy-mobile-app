import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { corsHeaders } from "../_shared/cors.ts";

type CompleteRequestBody = {
  upload_token?: string;
  size_bytes?: number;
  duration_ms?: number;
  content_etag?: string | null;
  sha256?: string | null;
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function coerceNumber(v: unknown): number | null {
  if (typeof v !== "number") return null;
  if (!Number.isFinite(v)) return null;
  return v;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey =
      Deno.env.get("SUPABASE_ANON_KEY") ??
      Deno.env.get("SUPABASE_ANON_PUBLIC") ??
      "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceKey) {
      console.log("[COMPLETE] missing env", { requestId });
      return jsonResponse(500, { message: "Server misconfigured." });
    }

    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      console.log("[COMPLETE] unauthorized", {
        requestId,
        userError: userError?.message ?? null,
      });
      return jsonResponse(401, { message: "Unauthorized" });
    }

    const body: CompleteRequestBody = (await req
      .json()
      .catch(() => ({}))) as any;

    const uploadToken = getString(body.upload_token);
    const sizeBytes = coerceNumber(body.size_bytes);
    const durationMs = coerceNumber(body.duration_ms);

    if (!uploadToken) {
      return jsonResponse(400, { message: "upload_token is required" });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: row, error: rowError } = await admin
      .from("ponto_audios")
      .select(
        "id, created_by, storage_bucket, storage_path, upload_status, size_bytes, duration_ms"
      )
      .eq("upload_token", uploadToken)
      .maybeSingle();

    console.log("[COMPLETE] invoked", {
      requestId,
      uploadToken,
      ponto_audio_id: row?.id ?? null,
    });

    if (rowError) {
      console.log("[COMPLETE] select error", {
        requestId,
        uploadToken,
        message: (rowError as any)?.message ?? null,
        details: (rowError as any)?.details ?? null,
        hint: (rowError as any)?.hint ?? null,
        code: (rowError as any)?.code ?? null,
      });
      return jsonResponse(500, { message: "Failed to load audio row." });
    }

    if (!row) {
      return jsonResponse(404, { message: "Upload token not found." });
    }

    if (String((row as any).created_by ?? "") !== user.id) {
      return jsonResponse(403, { message: "Forbidden" });
    }

    const before = {
      storage_bucket: (row as any).storage_bucket ?? null,
      storage_path: (row as any).storage_path ?? null,
      upload_status: (row as any).upload_status ?? null,
      size_bytes: (row as any).size_bytes ?? null,
      duration_ms: (row as any).duration_ms ?? null,
    };

    console.log("[COMPLETE] current state", {
      requestId,
      ponto_audio_id: row.id,
      before,
    });

    const alreadyUploaded =
      String((row as any).upload_status ?? "").toLowerCase() === "uploaded" &&
      typeof (row as any).storage_path === "string" &&
      (row as any).storage_path.trim().length > 0;

    if (alreadyUploaded) {
      console.log("[COMPLETE] already complete", {
        requestId,
        ponto_audio_id: row.id,
      });

      return jsonResponse(200, {
        ok: true,
        ponto_audio_id: row.id,
        bucket: String((row as any).storage_bucket ?? "ponto-audios"),
        path: String((row as any).storage_path ?? ""),
        upload_status: "uploaded",
      });
    }

    const updatePayload: Record<string, unknown> = {
      upload_status: "uploaded",
    };

    if (typeof sizeBytes === "number") updatePayload.size_bytes = sizeBytes;
    if (typeof durationMs === "number") updatePayload.duration_ms = durationMs;
    if (typeof body.content_etag === "string" || body.content_etag === null) {
      updatePayload.content_etag = body.content_etag ?? null;
    }
    if (typeof body.sha256 === "string" || body.sha256 === null) {
      updatePayload.sha256 = body.sha256 ?? null;
    }

    const { data: updated, error: updateError } = await admin
      .from("ponto_audios")
      .update(updatePayload)
      .eq("id", row.id)
      .select("id, storage_bucket, storage_path, upload_status")
      .single();

    if (updateError) {
      const code = (updateError as any)?.code ?? null;

      // Unique violation.
      if (code === "23505") {
        console.log("[COMPLETE] 409 unique conflict", {
          requestId,
          ponto_audio_id: row.id,
          message: (updateError as any)?.message ?? null,
          details: (updateError as any)?.details ?? null,
          hint: (updateError as any)?.hint ?? null,
          code,
        });

        return jsonResponse(409, {
          message: "storage_path já existe (conflito de unique).",
          code: "storage_path_unique_conflict",
          ponto_audio_id: row.id,
        });
      }

      console.log("[COMPLETE] update error", {
        requestId,
        ponto_audio_id: row.id,
        message: (updateError as any)?.message ?? null,
        details: (updateError as any)?.details ?? null,
        hint: (updateError as any)?.hint ?? null,
        code,
      });

      return jsonResponse(500, { message: "Failed to complete upload." });
    }

    const bucket =
      typeof (updated as any).storage_bucket === "string"
        ? (updated as any).storage_bucket
        : null;
    const path =
      typeof (updated as any).storage_path === "string"
        ? (updated as any).storage_path
        : null;

    if (!bucket || !path) {
      console.log("[COMPLETE] invalid final state", {
        requestId,
        ponto_audio_id: row.id,
        bucket,
        path,
      });

      return jsonResponse(409, {
        message: "estado inválido: storage_path ausente após complete",
        code: "invalid_state",
        ponto_audio_id: row.id,
      });
    }

    console.log("[COMPLETE] completed", {
      requestId,
      ponto_audio_id: row.id,
      bucket,
      path,
    });

    return jsonResponse(200, {
      ok: true,
      ponto_audio_id: String((updated as any).id),
      bucket,
      path,
      upload_status: "uploaded",
    });
  } catch (e) {
    console.log("[COMPLETE] unhandled error", {
      requestId,
      error: String(e),
      message: (e as any)?.message ?? null,
    });

    return jsonResponse(500, { message: "Unexpected error" });
  }
});
