import { supabase } from "@/lib/supabase";
import * as Crypto from "expo-crypto";

export const SUBMISSION_AUDIO_BUCKET = "ponto-audios" as const;

export type SubmissionAudioFile = {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
};

export type SubmissionAudioUploadResult = {
  submissionId: string;
  has_audio: true;
  audio_bucket_id: typeof SUBMISSION_AUDIO_BUCKET;
  audio_object_path: string;
};

function generateUuid(): string {
  try {
    return Crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function normalizeExt(raw: string | null | undefined): string {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!s) return "";
  const name = s.split("?")[0].split("#")[0];
  const last = name.split(".").pop() ?? "";
  const ext = last.replace(/^\.+/, "").trim();
  return ext && ext.length <= 10 ? ext : "";
}

function extFromMimeType(mimeType: string | null | undefined): string {
  const mt = typeof mimeType === "string" ? mimeType.trim().toLowerCase() : "";
  if (!mt) return "";

  if (mt === "audio/mpeg" || mt === "audio/mp3") return "mp3";
  if (mt === "audio/mp4" || mt === "audio/m4a" || mt === "audio/x-m4a")
    return "m4a";
  if (mt === "audio/aac") return "aac";
  if (mt === "audio/wav" || mt === "audio/x-wav") return "wav";
  if (mt === "audio/ogg" || mt === "audio/opus") return "ogg";
  if (mt === "audio/flac") return "flac";

  return "";
}

async function readBytesFromUri(uri: string): Promise<Uint8Array> {
  const res = await fetch(uri);
  if (!res.ok) {
    throw new Error(
      `Não foi possível ler o arquivo selecionado (HTTP ${res.status}).`,
    );
  }

  const ab = await res.arrayBuffer();
  return new Uint8Array(ab);
}

export async function uploadSubmissionAudio(params: {
  submissionId: string;
  file: SubmissionAudioFile;
}): Promise<SubmissionAudioUploadResult> {
  const submissionId = String(params.submissionId ?? "").trim();
  if (!submissionId) throw new Error("submissionId inválido.");

  const uri = typeof params.file?.uri === "string" ? params.file.uri.trim() : "";
  if (!uri) throw new Error("Arquivo inválido para upload.");

  const extFromName = normalizeExt(params.file?.name ?? "");
  const extFromUri = normalizeExt(uri);
  const extFromMime = extFromMimeType(params.file?.mimeType ?? null);
  const ext = extFromName || extFromUri || extFromMime || "m4a";

  const uuid = generateUuid();
  const audioObjectPath = `submissions/${submissionId}/${uuid}.${ext}`;

  const contentType =
    typeof params.file?.mimeType === "string" && params.file.mimeType.trim()
      ? params.file.mimeType.trim()
      : undefined;

  const bytes = await readBytesFromUri(uri);

  const upload = await supabase.storage
    .from(SUBMISSION_AUDIO_BUCKET)
    .upload(audioObjectPath, bytes, {
      upsert: false,
      contentType,
    });

  if (upload.error) {
    const msg =
      typeof upload.error.message === "string" && upload.error.message.trim()
        ? upload.error.message.trim()
        : "Não foi possível enviar o áudio.";
    throw new Error(msg);
  }

  const update = await supabase
    .from("pontos_submissions")
    .update({
      has_audio: true,
      audio_bucket_id: SUBMISSION_AUDIO_BUCKET,
      audio_object_path: audioObjectPath,
    })
    .eq("id", submissionId)
    .select("id, has_audio, audio_bucket_id, audio_object_path")
    .single();

  if (update.error) {
    const msg =
      typeof update.error.message === "string" && update.error.message.trim()
        ? update.error.message.trim()
        : "Não foi possível atualizar a submissão com o áudio.";
    throw new Error(msg);
  }

  return {
    submissionId: String((update.data as any)?.id ?? submissionId),
    has_audio: true,
    audio_bucket_id: SUBMISSION_AUDIO_BUCKET,
    audio_object_path: audioObjectPath,
  };
}
