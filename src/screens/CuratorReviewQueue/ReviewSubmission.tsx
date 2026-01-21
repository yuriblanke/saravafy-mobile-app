import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import {
  ensureLoaded,
  getCurrentSubmissionId,
  loadAndPlay,
  seekToSeconds,
  togglePlayPause,
  useRntpPlayback,
} from "@/src/audio/rntpService";
import { AudioProgressSlider } from "@/src/components/AudioProgressSlider";
import { Badge } from "@/src/components/Badge";
import { TagChip } from "@/src/components/TagChip";
import { useIsCurator } from "@/src/hooks/useIsCurator";
import {
  extractSubmissionContentFromPayload,
  usePontoSubmissionById,
  type PendingPontoSubmission,
} from "@/src/queries/pontoSubmissions";
import { queryKeys } from "@/src/queries/queryKeys";
import { colors, spacing } from "@/src/theme";
import {
  normalizeTagsFromText,
  sanitizeOptionalText,
} from "@/src/utils/sanitizeReviewSubmission";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const fillerPng = require("@/assets/images/filler.png");

function getErrorMessage(error: unknown): string {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as any).message)
      : "";
  return message.trim() ? message.trim() : "Erro";
}

function safeJsonForLog(value: unknown, maxLen = 4000) {
  try {
    const s = JSON.stringify(value);
    return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
  } catch {
    return "<unstringifiable>";
  }
}

function serializeSupabaseErrorForLog(error: unknown) {
  const e: any = error as any;
  return {
    message: typeof e?.message === "string" ? e.message : null,
    details: typeof e?.details === "string" ? e.details : null,
    hint: typeof e?.hint === "string" ? e.hint : null,
    code: typeof e?.code === "string" ? e.code : null,
    status: typeof e?.status === "number" ? e.status : null,
    raw: safeJsonForLog(error),
  };
}

function isRpcParamMismatch(error: unknown) {
  const anyErr = error as any;
  const code = typeof anyErr?.code === "string" ? anyErr.code : "";
  return code === "PGRST202";
}

/**
 * Calls an RPC function with p_ prefixed parameters, falling back to non-prefixed
 * parameters if PGRST202 error occurs (parameter mismatch).
 */
async function callRpcWithParamFallback(
  functionName: string,
  payloadWithPrefix: Record<string, any>,
): Promise<any> {
  // Try with p_ prefix first (new signature)
  let res: any = await supabase.rpc(functionName, payloadWithPrefix);

  // Fallback to old signature if param mismatch
  if (res?.error && isRpcParamMismatch(res.error)) {
    const fallbackPayload: Record<string, any> = {};
    for (const [key, value] of Object.entries(payloadWithPrefix)) {
      // Remove p_ prefix from parameter names
      const newKey = key.startsWith("p_") ? key.substring(2) : key;
      fallbackPayload[newKey] = value;
    }
    res = await supabase.rpc(functionName, fallbackPayload);
  }

  return res;
}

function mapReviewErrorToFriendlyMessage(error: unknown): string {
  const raw = getErrorMessage(error);
  const lower = raw.toLowerCase();

  const has = (token: string) => lower.includes(token);

  if (has("not_curator"))
    return "Apenas pessoas guardiãs do acervo podem revisar envios.";
  if (has("submission_not_found")) return "Envio não encontrado.";
  if (has("submission_not_pending")) return "Este envio já foi revisado.";
  if (has("missing_title")) return "Informe um título antes de aprovar.";
  if (has("missing_lyrics")) return "Informe a letra antes de aprovar.";
  if (has("invalid_decision")) return "Ação inválida.";

  const code =
    error && typeof error === "object" && "code" in (error as any)
      ? String((error as any).code)
      : "";

  if (code === "PGRST202") {
    return "Servidor desatualizado para este fluxo. Atualize o app e tente novamente.";
  }

  if (has("invalid_activation") || has("cannot activate ponto_audio")) {
    return "Não foi possível ativar o áudio deste envio. Tente novamente.";
  }

  if (
    has("trg_enforce_audio_duration_on_approval") ||
    (has("duration_ms") && has("ponto_audios")) ||
    (has("duration") && has("audio") && has("approval"))
  ) {
    return "Não foi possível aprovar porque a duração do áudio não foi registrada.";
  }

  if (has("registrar a duração do áudio")) {
    return raw;
  }

  // Guard-rail do banco: correction approved deve bater com target_ponto_id.
  // Não expor nomes de constraints na UI.
  if (
    has("pontos_submissions_correction_approved_matches_target") ||
    (has("approved_ponto_id") && has("target_ponto_id"))
  ) {
    return "Esta correção precisa ser aprovada pelo fluxo de correção. Atualize o app e tente novamente.";
  }

  return "Não foi possível concluir agora. Tente novamente.";
}

function toKindLabel(kind: string | null | undefined) {
  const k = typeof kind === "string" ? kind.trim().toLowerCase() : "";
  if (k === "correction") return "Correção";
  if (k === "problem") return "Problema";
  if (k === "audio_upload") return "Áudio";
  return "Envio";
}

type PontoRow = {
  id: string;
  title: string;
  lyrics: string;
  author_name: string | null;
  tags: string[];
  is_public_domain: boolean | null;
  duration_seconds: number | null;
};

type PontoAudioMetaRow = {
  id: string;
  interpreter_name: string | null;
  duration_ms: number | null;
  size_bytes: number | null;
  mime_type: string | null;
  upload_status: string | null;
  is_active: boolean | null;
};

function formatBytesAsMb(sizeBytes: number | null | undefined) {
  if (typeof sizeBytes !== "number" || !Number.isFinite(sizeBytes)) return "";
  const mb = sizeBytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

function formatDurationFromMs(durationMs: number | null | undefined) {
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs)) return "";
  if (durationMs <= 0) return "";
  const totalSeconds = Math.round(durationMs / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatFromMime(mimeType: string | null | undefined) {
  const raw = typeof mimeType === "string" ? mimeType.trim().toLowerCase() : "";
  if (!raw) return "";
  if (raw === "audio/mpeg" || raw === "audio/mp3") return "MP3";
  if (raw === "audio/mp4" || raw === "audio/m4a") return "M4A";
  if (raw === "audio/aac") return "AAC";
  if (raw === "audio/ogg") return "OGG";
  if (raw === "audio/wav" || raw === "audio/x-wav") return "WAV";

  const slash = raw.lastIndexOf("/");
  const ext = slash >= 0 ? raw.slice(slash + 1) : raw;
  return ext ? ext.toUpperCase() : "";
}

type RpcPayload = {
  p_submission_id: string;
  p_decision: "approved" | "rejected";
  p_review_note?: string | null;
  p_title?: string | null;
  p_lyrics?: string | null;
  p_tags?: string[] | null;
  p_artist?: string | null;
  p_author_name?: string | null;
  p_interpreter_name?: string | null;
  p_has_author_consent?: boolean | null;
  p_author_contact?: string | null;
};

type ApproveCorrectionRpcPayload = {
  p_submission_id: string;
  p_review_note?: string | null;
};

type RejectSubmissionRpcPayload = {
  p_submission_id: string;
  p_review_note?: string | null;
};

export default function ReviewSubmissionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ submissionId?: string }>();
  const submissionId =
    typeof params.submissionId === "string" ? params.submissionId : null;

  const { showToast } = useToast();
  const { effectiveTheme } = usePreferences();
  const variant = effectiveTheme;

  const bgColor = variant === "light" ? colors.paper50 : colors.forest900;

  const { isCurator, isLoading: isCuratorLoading } = useIsCurator();

  const submissionQuery = usePontoSubmissionById({
    submissionId,
    enabled: !!isCurator && !isCuratorLoading,
  });

  const submission = submissionQuery.data;

  const kindNorm =
    typeof submission?.kind === "string"
      ? submission.kind.trim().toLowerCase()
      : "";
  const isAudioUpload = kindNorm === "audio_upload";

  const pontoId =
    typeof submission?.ponto_id === "string" ? submission.ponto_id : null;
  const pontoAudioId =
    typeof submission?.ponto_audio_id === "string"
      ? submission.ponto_audio_id
      : null;

  const submissionAudioBucketId =
    typeof submission?.audio_bucket_id === "string"
      ? submission.audio_bucket_id
      : null;
  const submissionAudioObjectPath =
    typeof submission?.audio_object_path === "string"
      ? submission.audio_object_path
      : null;

  const isAudioReadyForPlayback =
    isAudioUpload &&
    submission?.has_audio === true &&
    !!pontoAudioId &&
    typeof submissionAudioBucketId === "string" &&
    submissionAudioBucketId.trim().length > 0 &&
    typeof submissionAudioObjectPath === "string" &&
    submissionAudioObjectPath.trim().length > 0;

  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [interpreterName, setInterpreterName] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);

  // --- Secure audio playback state (audio_upload only) ---
  // RNTP is the single source of truth; no expo-av, no URL caching/refresh.
  const rntp = useRntpPlayback(250);
  const [audioUiError, setAudioUiError] = useState<string | null>(null);
  const audioPreloadStartedRef = useRef(false);

  const isThisSubmissionCurrent =
    rntp.current?.kind === "submission" && rntp.current.id === submissionId;
  const isAudioPlaying = isThisSubmissionCurrent && rntp.isPlaying;
  const audioPositionMillis = isThisSubmissionCurrent ? rntp.positionMillis : 0;
  const audioDurationMillis = isThisSubmissionCurrent ? rntp.durationMillis : 0;
  const audioError =
    isThisSubmissionCurrent && rntp.error ? rntp.error : audioUiError;
  const isStartingPlayback = rntp.isLoading;

  const hydratedRef = useRef(false);

  const handleSeekAudio = async (nextPositionMillis: number) => {
    if (!audioDurationMillis) return;
    if (getCurrentSubmissionId() !== submissionId) return;

    const clamped = Math.max(
      0,
      Math.min(audioDurationMillis, Math.round(nextPositionMillis)),
    );

    try {
      await seekToSeconds(clamped / 1000);
    } catch {
      // best-effort only
    }
  };

  useEffect(() => {
    hydratedRef.current = false;
    audioPreloadStartedRef.current = false;
    setTitle("");
    setAuthorName("");
    setInterpreterName("");
    setLyrics("");
    setTagsText("");
    setReviewNote("");
    setInlineError(null);

    // Reset audio playback state on submission change.
    setAudioUiError(null);
  }, [submissionId]);

  useEffect(() => {
    if (hydratedRef.current) return;
    if (!submission) return;

    hydratedRef.current = true;
    const content = extractSubmissionContentFromPayload(submission.payload);
    setTitle(content.title ?? "");
    setAuthorName(
      typeof submission.author_name === "string" ? submission.author_name : "",
    );
    setInterpreterName(
      typeof submission.interpreter_name === "string"
        ? submission.interpreter_name
        : "",
    );
    setLyrics(content.lyrics ?? "");
    setTagsText((content.tags ?? []).join(", "));
    setReviewNote("");
  }, [submission]);

  // Preload audio on open (review UX): fetch URL and load Sound so
  // `status.durationMillis` becomes available for the slider.
  useEffect(() => {
    if (!isAudioUpload) return;
    if (!isAudioReadyForPlayback) return;
    if (!submissionId) return;

    if (audioPreloadStartedRef.current) return;

    // Don't disrupt another global track (single source of truth).
    if (
      rntp.current !== null &&
      !(rntp.current.kind === "submission" && rntp.current.id === submissionId)
    ) {
      return;
    }

    audioPreloadStartedRef.current = true;

    void (async () => {
      try {
        setAudioUiError(null);

        await ensureLoaded({
          kind: "submission",
          submissionId,
          title: title.trim() ? title.trim() : "Ponto",
          artist:
            interpreterName.trim() || authorName.trim()
              ? interpreterName.trim() || authorName.trim()
              : null,
        });
      } catch (e) {
        setAudioUiError(
          e instanceof Error && e.message.trim()
            ? e.message
            : "Não foi possível carregar o áudio.",
        );
      }
    })();
    // Intentionally do not depend on ensureAudioUrl/loadAudio; we run once per submission.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAudioReadyForPlayback, isAudioUpload, submissionId]);

  const pontoQuery = useQuery({
    queryKey: pontoId ? (["pontos", "byId", pontoId] as const) : [],
    enabled: !!pontoId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      if (!pontoId) return null;

      const res = await supabase
        .from("pontos")
        .select(
          "id, title, lyrics, author_name, tags, is_public_domain, duration_seconds",
        )
        .eq("id", pontoId)
        .eq("is_active", true)
        .maybeSingle();

      if (res.error) throw res.error;
      if (!res.data) return null;

      const row: any = res.data;
      return {
        id: String(row.id ?? ""),
        title: typeof row.title === "string" ? row.title : "",
        lyrics: typeof row.lyrics === "string" ? row.lyrics : "",
        author_name:
          typeof row.author_name === "string" ? row.author_name : null,
        tags: Array.isArray(row.tags)
          ? row.tags.filter((t: any) => typeof t === "string")
          : typeof row.tags === "string"
            ? row.tags
                .split(/[,|]/g)
                .map((t: string) => t.trim())
                .filter(Boolean)
            : [],
        is_public_domain:
          typeof row.is_public_domain === "boolean"
            ? row.is_public_domain
            : null,
        duration_seconds:
          typeof row.duration_seconds === "number"
            ? row.duration_seconds
            : null,
      } satisfies PontoRow;
    },
    placeholderData: (prev) => prev,
  });

  const pontoAudioMetaQuery = useQuery({
    queryKey: pontoAudioId
      ? (["pontoAudios", "metaById", pontoAudioId] as const)
      : [],
    // Meta is informational only; playback gating must rely on submission fields.
    enabled:
      isAudioUpload &&
      submission?.has_audio === true &&
      !!pontoAudioId &&
      !!submissionAudioBucketId &&
      !!submissionAudioObjectPath,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      if (!pontoAudioId) return null;

      const res = await supabase
        .from("ponto_audios")
        .select(
          "id, interpreter_name, duration_ms, size_bytes, mime_type, upload_status, is_active",
        )
        .eq("id", pontoAudioId)
        .eq("is_active", true)
        .maybeSingle();

      if (res.error) throw res.error;
      if (!res.data) return null;

      const row: any = res.data;
      return {
        id: String(row.id ?? ""),
        interpreter_name:
          typeof row.interpreter_name === "string"
            ? row.interpreter_name
            : null,
        duration_ms:
          typeof row.duration_ms === "number" ? row.duration_ms : null,
        size_bytes: typeof row.size_bytes === "number" ? row.size_bytes : null,
        mime_type: typeof row.mime_type === "string" ? row.mime_type : null,
        upload_status:
          typeof row.upload_status === "string" ? row.upload_status : null,
        is_active: typeof row.is_active === "boolean" ? row.is_active : null,
      } satisfies PontoAudioMetaRow;
    },
    placeholderData: (prev) => prev,
  });

  // Hydrate read-only fields for audio_upload from the canonical ponto row (not payload).
  useEffect(() => {
    if (!isAudioUpload) return;
    const p = pontoQuery.data;
    if (!p) return;

    setTitle(p.title ?? "");
    setAuthorName(typeof p.author_name === "string" ? p.author_name : "");
    setLyrics(p.lyrics ?? "");
    setTagsText((p.tags ?? []).join(", "));
  }, [isAudioUpload, pontoQuery.data]);

  useEffect(() => {
    if (!isAudioUpload) return;
    const meta = pontoAudioMetaQuery.data;
    if (!meta) return;
    if (
      typeof meta.interpreter_name === "string" &&
      meta.interpreter_name.trim()
    ) {
      setInterpreterName(meta.interpreter_name.trim());
    }
  }, [isAudioUpload, pontoAudioMetaQuery.data]);

  useEffect(() => {
    if (isCuratorLoading) return;
    if (isCurator) return;

    showToast("Apenas pessoas guardiãs do acervo acessam a fila de revisão.");
    router.replace("/");
  }, [isCurator, isCuratorLoading, router, showToast]);

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  const inputBg =
    variant === "light" ? colors.inputBgLight : colors.inputBgDark;
  const inputBorder =
    variant === "light" ? colors.inputBorderLight : colors.inputBorderDark;

  // Match TagChip outline thickness (light uses 2, dark uses hairline).
  const tagOutlineWidth = 2;

  const normalizedTags = useMemo(() => {
    return normalizeTagsFromText(tagsText);
  }, [tagsText]);

  const queryClient = useQueryClient();

  const removeFromPendingList = (id: string) => {
    queryClient.setQueryData(
      queryKeys.pontosSubmissions.pending(),
      (prev: PendingPontoSubmission[] | undefined) => {
        const list = Array.isArray(prev) ? prev : [];
        return list.filter((s) => s.id !== id);
      },
    );
  };

  const reviewNewMutation = useMutation({
    mutationFn: async (payload: RpcPayload) => {
      const res = await callRpcWithParamFallback(
        "review_ponto_submission",
        payload,
      );

      if (res?.error) {
        throw new Error(
          typeof res.error?.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Erro ao revisar envio.",
        );
      }
      return res?.data ?? null;
    },
  });

  const approveCorrectionMutation = useMutation({
    mutationFn: async (payload: ApproveCorrectionRpcPayload) => {
      const res = await callRpcWithParamFallback(
        "approve_ponto_correction_submission",
        payload,
      );

      if (res?.error) {
        throw new Error(
          typeof res.error?.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Erro ao aprovar correção.",
        );
      }
      return res?.data ?? null;
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (payload: RejectSubmissionRpcPayload) => {
      const res = await callRpcWithParamFallback(
        "reject_ponto_submission",
        payload,
      );

      if (res?.error) {
        throw new Error(
          typeof res.error?.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Erro ao rejeitar envio.",
        );
      }
      return res?.data ?? null;
    },
  });

  const isMutating =
    reviewNewMutation.isPending ||
    approveCorrectionMutation.isPending ||
    rejectMutation.isPending;

  const approveAudioUploadMutation = useMutation({
    mutationFn: async (vars: {
      submissionId: string;
      pontoAudioId: string;
      durationMs: number;
    }) => {
      const sid = String(vars.submissionId ?? "").trim();
      if (!sid) throw new Error("Envio inválido.");

      const paid = String(vars.pontoAudioId ?? "").trim();
      if (!paid) throw new Error("Áudio inválido.");

      const durationMs =
        typeof vars.durationMs === "number" && Number.isFinite(vars.durationMs)
          ? Math.round(vars.durationMs)
          : 0;

      if (durationMs <= 0) {
        throw new Error("Carregue o áudio para aprovar.");
      }

      console.log("[review-audio-upload] duration:persist:start", {
        submissionId: sid,
        pontoAudioId: paid,
        duration_ms: durationMs,
      });

      const durRes = await supabase
        .from("ponto_audios")
        .update({ duration_ms: durationMs })
        .eq("id", paid);

      if (durRes.error) {
        console.error("[review-audio-upload] duration:persist:error", {
          submissionId: sid,
          pontoAudioId: paid,
          duration_ms: durationMs,
          error: serializeSupabaseErrorForLog(durRes.error),
        });
        throw new Error("Não foi possível registrar a duração do áudio.");
      }

      console.log("[review-audio-upload] duration:persist:success", {
        submissionId: sid,
        pontoAudioId: paid,
        duration_ms: durationMs,
      });

      console.log("[review-audio-upload] approve:start", {
        submissionId: sid,
      });

      let res = await callRpcWithParamFallback("approve_audio_upload_submission", {
        p_submission_id: sid,
      });

      // Some backends validate activation against an *already approved* audio_upload
      // submission. If so, approve via the canonical review RPC first.
      if (res.error) {
        const msg =
          typeof (res.error as any)?.message === "string"
            ? String((res.error as any).message)
            : "";
        const msgLower = msg.toLowerCase();

        if (
          msgLower.includes("invalid_activation") ||
          msgLower.includes("cannot activate ponto_audio")
        ) {
          const fallback = await callRpcWithParamFallback(
            "review_ponto_submission",
            {
              p_submission_id: sid,
              p_decision: "approved",
              p_review_note: null,
            },
          );

          if (fallback?.error) {
            throw new Error(
              typeof fallback.error?.message === "string" &&
                fallback.error.message.trim()
                ? fallback.error.message
                : "Erro ao aprovar envio.",
            );
          }

          // Normalize return shape.
          res = { data: fallback?.data ?? null, error: null } as any;
        }
      }

      if (res.error) {
        console.error("[review-audio-upload] approve:error", {
          submissionId: sid,
          kind: "audio_upload",
          pontoId:
            typeof submission?.ponto_id === "string"
              ? submission.ponto_id
              : null,
          data: safeJsonForLog(res.data),
          error: serializeSupabaseErrorForLog(res.error),
        });
        throw res.error;
      }

      console.log("[review-audio-upload] approve:success", {
        submissionId: sid,
        data: safeJsonForLog(res.data),
      });

      return res.data ?? null;
    },
  });

  const rejectAudioUploadMutation = useMutation({
    mutationFn: async (vars: { submissionId: string; reviewNote: string }) => {
      const sid = String(vars.submissionId ?? "").trim();
      const note = String(vars.reviewNote ?? "").trim();
      if (!sid) throw new Error("Envio inválido.");
      if (!note) throw new Error("Informe um motivo para rejeitar.");

      console.log("[review-audio-upload] reject:start", {
        submissionId: sid,
      });

      const res = await callRpcWithParamFallback("reject_audio_upload_submission", {
        p_submission_id: sid,
        p_review_note: note,
      });

      if (res.error) {
        console.error("[review-audio-upload] reject:error", {
          submissionId: sid,
          kind: "audio_upload",
          pontoId:
            typeof submission?.ponto_id === "string"
              ? submission.ponto_id
              : null,
          data: safeJsonForLog(res.data),
          error: serializeSupabaseErrorForLog(res.error),
        });
        throw res.error;
      }

      console.log("[review-audio-upload] reject:success", {
        submissionId: sid,
        data: safeJsonForLog(res.data),
      });

      return res.data ?? null;
    },
  });

  const isMutatingAny =
    isMutating ||
    approveAudioUploadMutation.isPending ||
    rejectAudioUploadMutation.isPending;

  const approve = async () => {
    setInlineError(null);

    if (!submissionId) {
      setInlineError("Envio inválido.");
      return;
    }

    const kind = typeof submission?.kind === "string" ? submission.kind : null;
    const isCorrection =
      typeof kind === "string" && kind.trim().toLowerCase() === "correction";

    const isAudioUploadKind =
      typeof kind === "string" && kind.trim().toLowerCase() === "audio_upload";

    if (isCorrection) {
      const payload: ApproveCorrectionRpcPayload = {
        p_submission_id: submissionId,
        p_review_note: sanitizeOptionalText(reviewNote),
      };

      try {
        await approveCorrectionMutation.mutateAsync(payload);

        // Recarrega fila e evita deixar detalhes stale.
        queryClient.invalidateQueries({
          queryKey: queryKeys.pontosSubmissions.pending(),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.pontosSubmissions.byId(submissionId),
        });

        // Força o Player a refletir a letra atualizada (invalidate amplo;
        // não existe queryKey por id hoje).
        const targetId =
          typeof submission?.ponto_id === "string" ? submission.ponto_id : null;
        if (targetId) {
          queryClient.invalidateQueries({
            queryKey: ["collections", "pontos"],
          });
          queryClient.invalidateQueries({ queryKey: ["pontos"] });
        }

        showToast("Correção aprovada.");
        router.back();
      } catch (e) {
        const friendly = mapReviewErrorToFriendlyMessage(e);
        const raw = getErrorMessage(e);

        // Não logar IDs externamente.
        void raw;

        // Não remover da fila em erro.
        setInlineError(friendly);
        showToast(friendly);
      }

      return;
    }

    if (isAudioUploadKind) {
      try {
        const durationMs = audioDurationMillis;
        if (durationMs <= 0) {
          const msg = "Carregue o áudio para aprovar.";
          setInlineError(msg);
          showToast(msg);
          return;
        }

        if (!pontoAudioId) {
          const msg = "Áudio inválido.";
          setInlineError(msg);
          showToast(msg);
          return;
        }

        await approveAudioUploadMutation.mutateAsync({
          submissionId,
          pontoAudioId,
          durationMs,
        });

        removeFromPendingList(submissionId);

        queryClient.invalidateQueries({
          queryKey: queryKeys.pontosSubmissions.pending(),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.pontosSubmissions.byId(submissionId),
        });

        const pid =
          typeof submission?.ponto_id === "string" ? submission.ponto_id : null;
        if (pid) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.pontosSubmissions.approvedAudioByPontoId(pid),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.pontoAudios.byPontoId(pid),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.pontoAudios.hasAnyUploadedByPontoId(pid),
          });
        }

        if (typeof pontoAudioId === "string" && pontoAudioId) {
          queryClient.invalidateQueries({
            queryKey: ["pontoAudios", "metaById", pontoAudioId],
          });
        }

        queryClient.invalidateQueries({ queryKey: ["pontos"] });

        showToast("Áudio aprovado.");
        router.back();
      } catch (e) {
        const friendly = mapReviewErrorToFriendlyMessage(e);
        const raw = getErrorMessage(e);

        if (raw.toLowerCase().includes("submission_not_pending")) {
          removeFromPendingList(submissionId);
          showToast("Já foi revisado.");
          router.back();
          return;
        }

        setInlineError(friendly);
        showToast(friendly);
      }

      return;
    }

    const finalTitle = sanitizeOptionalText(title);
    const finalLyrics = sanitizeOptionalText(lyrics);

    const finalAuthorName = sanitizeOptionalText(authorName);
    const finalInterpreterName = sanitizeOptionalText(interpreterName);

    const isPublicDomain = submission?.ponto_is_public_domain !== false;
    const authorConsentGranted = submission?.author_consent_granted === true;
    const hasAudio = isAudioUpload || submission?.has_audio === true;
    const interpreterConsentGranted =
      submission?.interpreter_consent_granted === true;

    if (!isPublicDomain && !authorConsentGranted) {
      const msg =
        "Não dá para aprovar: consentimento do autor não foi concedido.";
      setInlineError(msg);
      showToast(msg);
      return;
    }

    if (hasAudio && !interpreterConsentGranted) {
      const msg =
        "Não dá para aprovar: consentimento do intérprete não foi concedido.";
      setInlineError(msg);
      showToast(msg);
      return;
    }

    const payload: RpcPayload = {
      p_submission_id: submissionId,
      p_decision: "approved",
      p_review_note: sanitizeOptionalText(reviewNote),
      p_title: finalTitle,
      p_lyrics: finalLyrics,
      p_tags: normalizedTags,
      p_author_name: finalAuthorName,
      p_interpreter_name: finalInterpreterName,
    };

    try {
      await reviewNewMutation.mutateAsync(payload);

      removeFromPendingList(submissionId);
      queryClient.invalidateQueries({ queryKey: ["pontos"] });

      showToast("Envio aprovado.");
      router.back();
    } catch (e) {
      const friendly = mapReviewErrorToFriendlyMessage(e);
      const raw = getErrorMessage(e);

      if (raw.toLowerCase().includes("submission_not_pending")) {
        removeFromPendingList(submissionId);
        showToast("Já foi revisado.");
        router.back();
        return;
      }

      setInlineError(friendly);
      showToast(friendly);
    }
  };

  const reject = async () => {
    setInlineError(null);

    if (!submissionId) {
      setInlineError("Envio inválido.");
      return;
    }

    const kind = typeof submission?.kind === "string" ? submission.kind : null;
    const isAudioUploadKind =
      typeof kind === "string" && kind.trim().toLowerCase() === "audio_upload";

    if (isAudioUploadKind) {
      const note = String(reviewNote ?? "").trim();
      if (!note) {
        const msg = "Informe um motivo para rejeitar.";
        setInlineError(msg);
        showToast(msg);
        return;
      }
    }

    Alert.alert(
      "Rejeitar envio",
      "Tem certeza que deseja rejeitar este envio?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Rejeitar",
          style: "destructive",
          onPress: async () => {
            try {
              if (isAudioUploadKind) {
                await rejectAudioUploadMutation.mutateAsync({
                  submissionId,
                  reviewNote: String(reviewNote ?? ""),
                });

                removeFromPendingList(submissionId);
                queryClient.invalidateQueries({
                  queryKey: queryKeys.pontosSubmissions.pending(),
                });
                queryClient.invalidateQueries({
                  queryKey: queryKeys.pontosSubmissions.byId(submissionId),
                });

                const pid =
                  typeof submission?.ponto_id === "string"
                    ? submission.ponto_id
                    : null;
                if (pid) {
                  queryClient.invalidateQueries({
                    queryKey:
                      queryKeys.pontosSubmissions.approvedAudioByPontoId(pid),
                  });
                  queryClient.invalidateQueries({
                    queryKey: queryKeys.pontoAudios.byPontoId(pid),
                  });
                  queryClient.invalidateQueries({
                    queryKey:
                      queryKeys.pontoAudios.hasAnyUploadedByPontoId(pid),
                  });
                }

                if (typeof pontoAudioId === "string" && pontoAudioId) {
                  queryClient.invalidateQueries({
                    queryKey: ["pontoAudios", "metaById", pontoAudioId],
                  });
                }

                queryClient.invalidateQueries({ queryKey: ["pontos"] });

                showToast("Áudio rejeitado.");
                router.back();
                return;
              }

              const payload: RejectSubmissionRpcPayload = {
                p_submission_id: submissionId,
                p_review_note: sanitizeOptionalText(reviewNote),
              };

              await rejectMutation.mutateAsync(payload);

              removeFromPendingList(submissionId);
              showToast("Envio rejeitado.");
              router.back();
            } catch (e) {
              const friendly = mapReviewErrorToFriendlyMessage(e);
              const raw = getErrorMessage(e);

              // Não logar IDs externamente.
              void raw;

              if (raw.toLowerCase().includes("submission_not_pending")) {
                removeFromPendingList(submissionId);
                showToast("Já foi revisado.");
                router.back();
                return;
              }

              setInlineError(friendly);
              showToast(friendly);
            }
          },
        },
      ],
    );
  };

  if (isCuratorLoading || submissionQuery.isLoading) {
    return (
      <SafeAreaView
        edges={["top", "bottom"]}
        style={[styles.safeArea, { backgroundColor: bgColor }]}
      >
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={[styles.centerText, { color: textSecondary }]}>
            Carregando…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isCurator) {
    return (
      <SafeAreaView
        edges={["top", "bottom"]}
        style={[styles.safeArea, { backgroundColor: bgColor }]}
      />
    );
  }

  if (submissionQuery.isError) {
    return (
      <SafeAreaView
        edges={["top", "bottom"]}
        style={[styles.safeArea, { backgroundColor: bgColor }]}
      >
        <View style={styles.center}>
          <Text style={[styles.errorTitle, { color: colors.brass600 }]}>
            Não foi possível carregar o envio.
          </Text>
          <Text style={[styles.centerText, { color: textSecondary }]}>
            {getErrorMessage(submissionQuery.error)}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!submission) {
    return (
      <SafeAreaView
        edges={["top", "bottom"]}
        style={[styles.safeArea, { backgroundColor: bgColor }]}
      >
        <View style={styles.center}>
          <Text style={[styles.errorTitle, { color: colors.brass600 }]}>
            Envio não encontrado.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const kindLabel = toKindLabel(submission.kind);
  const content = extractSubmissionContentFromPayload(submission.payload);
  const submitterEmail =
    typeof content.submitter_email === "string" ? content.submitter_email : "";
  const issueDetails =
    typeof content.issue_details === "string"
      ? content.issue_details.trim()
      : "";

  const isPublicDomain = submission.ponto_is_public_domain !== false;
  const hasAudio = isAudioUpload || submission.has_audio === true;

  const authorConsentGranted = submission.author_consent_granted === true;
  const interpreterConsentGranted =
    submission.interpreter_consent_granted === true;

  const consentLine = isAudioUpload
    ? [
        `Domínio público: ${isPublicDomain ? "Sim" : "Não"}`,
        `Áudio: ${interpreterConsentGranted ? "Sim" : "Não"}`,
      ].join(" • ")
    : [
        `Domínio público: ${isPublicDomain ? "Sim" : "Não"}`,
        !isPublicDomain
          ? `Consentimento autor: ${authorConsentGranted ? "OK" : "pendente"}`
          : null,
        `Áudio: ${hasAudio ? "Sim" : "Não"}`,
        hasAudio
          ? `Consentimento intérprete: ${
              interpreterConsentGranted ? "OK" : "pendente"
            }`
          : null,
      ]
        .filter(Boolean)
        .join(" • ");

  const handleTogglePlay = async () => {
    setAudioUiError(null);

    if (!isAudioUpload) return;

    if (!isAudioReadyForPlayback) {
      setAudioUiError("Áudio em revisão. Disponível em breve.");
      return;
    }

    if (!submissionId) {
      setAudioUiError("Envio inválido.");
      return;
    }

    const reqTitle = title.trim() ? title.trim() : "Ponto";
    const reqArtist =
      interpreterName.trim() || authorName.trim()
        ? interpreterName.trim() || authorName.trim()
        : null;

    try {
      if (getCurrentSubmissionId() === submissionId) {
        await togglePlayPause();
        return;
      }

      await loadAndPlay({
        kind: "submission",
        submissionId,
        title: reqTitle,
        artist: reqArtist,
      });
    } catch (e) {
      const msg =
        e instanceof Error && e.message.trim()
          ? e.message.trim()
          : "Não foi possível tocar o áudio.";
      setAudioUiError(msg);
    }
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.safeArea, { backgroundColor: bgColor }]}
    >
      <View style={styles.screen}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            hitSlop={10}
            style={({ pressed }) => [
              styles.backBtn,
              pressed ? styles.backBtnPressed : null,
            ]}
          >
            <Ionicons name="chevron-back" size={18} color={textSecondary} />
            <Text style={[styles.backText, { color: textSecondary }]}>
              Voltar
            </Text>
          </Pressable>

          <Text style={[styles.headerTitle, { color: textPrimary }]}>
            Revisar envio
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.metaRow}>
            <Badge label={kindLabel} variant={variant} />
            {submitterEmail ? (
              <Text style={[styles.metaEmail, { color: textSecondary }]}>
                {submitterEmail}
              </Text>
            ) : (
              <View />
            )}
          </View>

          {issueDetails ? (
            <View
              style={[
                styles.issueBox,
                { backgroundColor: inputBg, borderColor: inputBorder },
              ]}
            >
              <Text
                style={[styles.issueLabel, { color: textSecondary }]}
                numberOfLines={1}
              >
                Nota da usuária
              </Text>
              <Text style={[styles.issueText, { color: textPrimary }]}>
                {issueDetails}
              </Text>
            </View>
          ) : null}

          <View
            style={[
              styles.issueBox,
              { backgroundColor: inputBg, borderColor: inputBorder },
            ]}
          >
            <Text
              style={[styles.issueLabel, { color: textSecondary }]}
              numberOfLines={1}
            >
              Consentimentos
            </Text>
            <Text style={[styles.issueText, { color: textPrimary }]}>
              {consentLine}
            </Text>
          </View>

          {inlineError ? (
            <Text style={[styles.inlineError, { color: colors.brass600 }]}>
              {inlineError}
            </Text>
          ) : null}

          <Text style={[styles.label, { color: textSecondary }]}>Título</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            editable={!isMutatingAny && !isAudioUpload}
            placeholder="Título"
            placeholderTextColor={
              variant === "light"
                ? colors.textMutedOnLight
                : colors.textMutedOnDark
            }
            style={[
              styles.input,
              {
                backgroundColor: inputBg,
                borderColor: inputBorder,
                color: textPrimary,
              },
            ]}
          />

          <Text style={[styles.label, { color: textSecondary }]}>Autor</Text>
          <TextInput
            value={authorName}
            onChangeText={setAuthorName}
            editable={!isMutatingAny && !isAudioUpload}
            placeholder={isPublicDomain ? "Autor (opcional)" : "Autor"}
            placeholderTextColor={
              variant === "light"
                ? colors.textMutedOnLight
                : colors.textMutedOnDark
            }
            style={[
              styles.input,
              {
                backgroundColor: inputBg,
                borderColor: inputBorder,
                color: textPrimary,
              },
            ]}
          />

          {hasAudio ? (
            <>
              <Text style={[styles.label, { color: textSecondary }]}>
                Intérprete
              </Text>
              <TextInput
                value={interpreterName}
                onChangeText={setInterpreterName}
                editable={!isMutatingAny && !isAudioUpload}
                placeholder="Intérprete"
                placeholderTextColor={
                  variant === "light"
                    ? colors.textMutedOnLight
                    : colors.textMutedOnDark
                }
                style={[
                  styles.input,
                  {
                    backgroundColor: inputBg,
                    borderColor: inputBorder,
                    color: textPrimary,
                  },
                ]}
              />
            </>
          ) : null}

          {isAudioUpload ? (
            <View
              style={[
                styles.audioBox,
                { backgroundColor: inputBg, borderColor: inputBorder },
              ]}
            >
              <Text style={[styles.audioTitle, { color: textPrimary }]}>
                Áudio
              </Text>

              {!isAudioReadyForPlayback ? (
                <Text style={[styles.audioMetaLine, { color: textSecondary }]}>
                  Áudio em revisão. Disponível em breve.
                </Text>
              ) : (
                <>
                  {pontoAudioMetaQuery.isLoading ? (
                    <View style={styles.audioLoadingRow}>
                      <ActivityIndicator />
                      <Text
                        style={[styles.audioMetaText, { color: textSecondary }]}
                      >
                        Carregando detalhes do áudio…
                      </Text>
                    </View>
                  ) : pontoAudioMetaQuery.data ? (
                    <>
                      <Text
                        style={[styles.audioMetaText, { color: textPrimary }]}
                      >
                        {(typeof pontoAudioMetaQuery.data.interpreter_name ===
                          "string" &&
                        pontoAudioMetaQuery.data.interpreter_name.trim()
                          ? pontoAudioMetaQuery.data.interpreter_name.trim()
                          : "Interpretação não informada"
                        ).trim()}
                      </Text>

                      <Text
                        style={[styles.audioMetaLine, { color: textSecondary }]}
                      >
                        {[
                          formatDurationFromMs(
                            pontoAudioMetaQuery.data.duration_ms,
                          ),
                          formatBytesAsMb(pontoAudioMetaQuery.data.size_bytes),
                          formatFromMime(pontoAudioMetaQuery.data.mime_type),
                        ]
                          .filter((v) => typeof v === "string" && v.trim())
                          .join(" • ")}
                      </Text>
                    </>
                  ) : null}

                  <View style={styles.audioStatusRow}>
                    <Badge label="Pronto para ouvir" variant={variant} />
                    <View />
                  </View>

                  {audioError ? (
                    <View style={styles.audioErrorBox}>
                      <Text
                        style={[
                          styles.audioErrorText,
                          { color: colors.brass600 },
                        ]}
                      >
                        {audioError}
                      </Text>
                    </View>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    disabled={isStartingPlayback}
                    onPress={() => void handleTogglePlay()}
                    style={({ pressed }) => [
                      styles.audioPlayBtn,
                      {
                        borderColor: colors.brass600,
                        borderWidth: tagOutlineWidth,
                      },
                      pressed ? styles.audioPlayBtnPressed : null,
                      isStartingPlayback ? { opacity: 0.7 } : null,
                    ]}
                  >
                    {isStartingPlayback ? (
                      <ActivityIndicator color={colors.brass600} />
                    ) : (
                      <Ionicons
                        name={isAudioPlaying ? "pause" : "play"}
                        size={18}
                        color={colors.brass600}
                      />
                    )}
                    <Text
                      style={[styles.audioPlayText, { color: colors.brass600 }]}
                    >
                      {isAudioPlaying ? "Pausar" : "Tocar"}
                    </Text>
                  </Pressable>

                  <AudioProgressSlider
                    variant={variant}
                    positionMillis={
                      audioDurationMillis ? audioPositionMillis : 0
                    }
                    durationMillis={audioDurationMillis}
                    disabled={isStartingPlayback}
                    accentColor={colors.brass600}
                    trackBorderColor={inputBorder}
                    onSeek={handleSeekAudio}
                  />
                </>
              )}
            </View>
          ) : null}

          <Text style={[styles.label, { color: textSecondary }]}>Letra</Text>
          <TextInput
            value={lyrics}
            onChangeText={setLyrics}
            editable={!isMutatingAny && !isAudioUpload}
            multiline
            textAlignVertical="top"
            placeholder="Letra"
            placeholderTextColor={
              variant === "light"
                ? colors.textMutedOnLight
                : colors.textMutedOnDark
            }
            style={[
              styles.textarea,
              {
                backgroundColor: inputBg,
                borderColor: inputBorder,
                color: textPrimary,
              },
            ]}
          />

          <Text style={[styles.label, { color: textSecondary }]}>Tags</Text>
          <TextInput
            value={tagsText}
            onChangeText={setTagsText}
            editable={!isMutatingAny && !isAudioUpload}
            placeholder="Ex.: Ogum, Caboclo, Xangô"
            placeholderTextColor={
              variant === "light"
                ? colors.textMutedOnLight
                : colors.textMutedOnDark
            }
            style={[
              styles.input,
              {
                backgroundColor: inputBg,
                borderColor: inputBorder,
                color: textPrimary,
              },
            ]}
          />

          {normalizedTags.length > 0 ? (
            <View style={styles.tagsRow}>
              {normalizedTags.map((t) => (
                <TagChip key={t.toLowerCase()} label={t} variant={variant} />
              ))}
            </View>
          ) : null}

          <Text style={[styles.label, { color: textSecondary }]}>
            Nota (opcional)
          </Text>
          <TextInput
            value={reviewNote}
            onChangeText={setReviewNote}
            editable={!isMutatingAny}
            multiline
            placeholder="Ex.: corrigir autor, melhorar clareza da letra…"
            placeholderTextColor={
              variant === "light"
                ? colors.textMutedOnLight
                : colors.textMutedOnDark
            }
            style={[
              styles.note,
              {
                backgroundColor: inputBg,
                borderColor: inputBorder,
                color: textPrimary,
              },
            ]}
          />

          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              disabled={isMutatingAny}
              onPress={() => void reject()}
              style={({ pressed }) => [
                styles.rejectBtn,
                {
                  borderColor: colors.brass600,
                  opacity: isMutatingAny ? 0.7 : 1,
                },
                pressed ? styles.actionPressed : null,
              ]}
            >
              <Text style={[styles.rejectText, { color: colors.brass600 }]}>
                Rejeitar
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={isMutatingAny}
              onPress={() => void approve()}
              style={({ pressed }) => [
                styles.approveBtn,
                {
                  backgroundColor:
                    variant === "light" ? colors.forest700 : colors.forest300,
                  opacity: isMutatingAny ? 0.7 : 1,
                },
                pressed ? styles.actionPressed : null,
              ]}
            >
              <Text
                style={[
                  styles.approveText,
                  {
                    color:
                      variant === "light" ? colors.paper50 : colors.forest900,
                  },
                ]}
              >
                {isMutatingAny ? "Enviando…" : "Aprovar"}
              </Text>
            </Pressable>
          </View>

          <Image source={fillerPng} style={styles.fillerImage} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  backBtnPressed: {
    opacity: 0.86,
  },
  backText: {
    fontSize: 13,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  metaEmail: {
    fontSize: 12,
    fontWeight: "700",
  },
  issueBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: spacing.md,
    gap: 6,
    marginBottom: spacing.sm,
  },
  issueLabel: {
    fontSize: 12,
    fontWeight: "900",
  },
  issueText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  label: {
    marginTop: spacing.md,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "800",
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "700",
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    minHeight: 180,
    fontSize: 14,
    fontWeight: "700",
  },
  note: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    minHeight: 80,
    fontSize: 13,
    fontWeight: "700",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  rejectBtn: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  rejectText: {
    fontSize: 14,
    fontWeight: "900",
  },
  approveBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  approveText: {
    fontSize: 14,
    fontWeight: "900",
  },
  audioBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  audioTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  audioLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  audioMetaText: {
    fontSize: 13,
    fontWeight: "800",
  },
  audioMetaLine: {
    fontSize: 12,
    fontWeight: "700",
  },
  audioStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  audioPlayBtn: {
    marginTop: spacing.sm,
    borderWidth: 2,
    borderRadius: 14,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  audioPlayBtnPressed: {
    opacity: 0.9,
  },
  audioPlayText: {
    fontSize: 14,
    fontWeight: "900",
  },
  audioErrorBox: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  audioErrorText: {
    fontSize: 12,
    fontWeight: "800",
  },
  audioRetryBtn: {
    borderWidth: 2,
    borderRadius: 14,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  audioRetryBtnPressed: {
    opacity: 0.9,
  },
  audioRetryText: {
    fontSize: 13,
    fontWeight: "900",
  },
  fillerImage: {
    marginTop: spacing.lg,
    width: "100%",
    height: 290,
    resizeMode: "contain",
    opacity: 0.9,
  },
  actionPressed: {
    transform: [{ translateY: 1 }],
  },
  inlineError: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: spacing.lg,
  },
  centerText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
});
