import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import {
  getPontoAudioPlaybackUrlReview,
  getPontoAudioPlaybackUrlReviewBySubmission,
} from "@/src/api/pontoAudio";
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
import { Audio, type AVPlaybackStatus } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  if (res?.error && isRpcFunctionParamMismatch(res.error, "p_submission_id")) {
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

  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [interpreterName, setInterpreterName] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);

  // --- Secure audio playback state (audio_upload only) ---
  const soundRef = useRef<Audio.Sound | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioUrlExpiresAtMs, setAudioUrlExpiresAtMs] = useState<number | null>(
    null,
  );
  const [isFetchingAudioUrl, setIsFetchingAudioUrl] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const lastAudioUrlErrorRef = useRef<{
    status: number | null;
    noRetry: boolean;
    message: string;
  } | null>(null);

  const hydratedRef = useRef(false);

  const stopAndUnload = async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    setIsAudioPlaying(false);

    if (sound) {
      try {
        await sound.stopAsync();
      } catch {
        // ignore
      }
      try {
        await sound.unloadAsync();
      } catch {
        // ignore
      }
    }
  };

  const onAudioStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      setIsAudioPlaying(false);
      return;
    }

    setIsAudioPlaying(Boolean(status.isPlaying));
    if ((status as any).didJustFinish) {
      setIsAudioPlaying(false);
    }
  };

  useEffect(() => {
    hydratedRef.current = false;
    setTitle("");
    setAuthorName("");
    setInterpreterName("");
    setLyrics("");
    setTagsText("");
    setReviewNote("");
    setInlineError(null);

    // Reset audio playback state on submission change.
    setAudioError(null);
    setAudioUrl(null);
    setAudioUrlExpiresAtMs(null);
    void stopAndUnload();
  }, [submissionId]);

  // Cleanup on exit.
  useEffect(() => {
    return () => {
      void stopAndUnload();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const approve = async () => {
    setInlineError(null);

    if (!submissionId) {
      setInlineError("Envio inválido.");
      return;
    }

    const kind = typeof submission?.kind === "string" ? submission.kind : null;
    const isCorrection =
      typeof kind === "string" && kind.trim().toLowerCase() === "correction";

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

    Alert.alert(
      "Rejeitar envio",
      "Tem certeza que deseja rejeitar este envio?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Rejeitar",
          style: "destructive",
          onPress: async () => {
            const payload: RejectSubmissionRpcPayload = {
              p_submission_id: submissionId,
              p_review_note: sanitizeOptionalText(reviewNote),
            };

            try {
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

  const isAudioReadyForPlayback =
    isAudioUpload &&
    submission.has_audio === true &&
    !!pontoAudioId &&
    typeof submissionAudioBucketId === "string" &&
    submissionAudioBucketId.trim().length > 0 &&
    typeof submissionAudioObjectPath === "string" &&
    submissionAudioObjectPath.trim().length > 0;
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

  const ensureAudioUrl = async (options?: { force?: boolean }) => {
    if (!isAudioReadyForPlayback) {
      throw new Error("Áudio em revisão. Disponível em breve.");
    }
    if (!pontoAudioId) throw new Error("Áudio inválido.");

    const force = options?.force === true;
    const isExpired =
      typeof audioUrlExpiresAtMs === "number" &&
      Date.now() > audioUrlExpiresAtMs;

    if (!force && audioUrl && !isExpired) return;

    setIsFetchingAudioUrl(true);
    try {
      const tryBySubmissionFirst = Boolean(submissionId);

      const callBySubmission = async () =>
        await getPontoAudioPlaybackUrlReviewBySubmission(
          submissionId as string,
        );

      const callByAudioId = async () =>
        await getPontoAudioPlaybackUrlReview(pontoAudioId);

      let res: any;
      if (tryBySubmissionFirst) {
        try {
          res = await callBySubmission();
        } catch (err) {
          const kind =
            typeof (err as any)?.playbackKind === "string"
              ? (err as any).playbackKind
              : null;
          if (kind === "object_not_found") {
            res = await callByAudioId();
          } else {
            throw err;
          }
        }
      } else {
        res = await callByAudioId();
      }

      if (!res.url || typeof res.url !== "string") {
        throw new Error("Não foi possível obter a URL do áudio.");
      }

      setAudioUrl(res.url);
      setAudioUrlExpiresAtMs(Date.now() + res.expiresIn * 1000);
      lastAudioUrlErrorRef.current = null;
    } catch (e) {
      const kind =
        typeof (e as any)?.playbackKind === "string"
          ? (e as any).playbackKind
          : null;
      if (__DEV__ && kind === "object_not_found") {
        console.log("[audio] playback object not found (review)", {
          submissionId,
          pontoAudioId,
          audio_bucket_id: submissionAudioBucketId,
          audio_object_path: submissionAudioObjectPath,
          sbRequestId: (e as any)?.sbRequestId ?? null,
          status: (e as any)?.status ?? null,
        });
      }

      const status =
        typeof (e as any)?.status === "number" ? (e as any).status : null;
      const noRetry = (e as any)?.noRetry === true;
      const message =
        e instanceof Error && e.message.trim()
          ? e.message.trim()
          : "Não foi possível carregar o áudio.";
      lastAudioUrlErrorRef.current = { status, noRetry, message };
      throw e;
    } finally {
      setIsFetchingAudioUrl(false);
    }
  };

  const loadAudioIfNeeded = async () => {
    if (!audioUrl) return;
    if (soundRef.current) return;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUrl },
      { shouldPlay: false, progressUpdateIntervalMillis: 250 },
      onAudioStatus,
    );

    soundRef.current = sound;
  };

  const handleTogglePlay = async () => {
    setAudioError(null);
    if (!isAudioUpload) return;

    if (!isAudioReadyForPlayback) {
      setAudioError("Áudio em revisão. Disponível em breve.");
      return;
    }

    const sound = soundRef.current;

    // Pause if already playing.
    if (sound && isAudioPlaying) {
      await sound.pauseAsync();
      return;
    }

    // If we have a loaded sound but URL is expired, unload and get a fresh URL for resume.
    const urlExpired =
      typeof audioUrlExpiresAtMs === "number" &&
      Date.now() > audioUrlExpiresAtMs;
    if (urlExpired && sound && !isAudioPlaying) {
      await stopAndUnload();
      setAudioUrl(null);
      setAudioUrlExpiresAtMs(null);
    }

    try {
      await ensureAudioUrl();
      await loadAudioIfNeeded();

      const nextSound = soundRef.current;
      if (!nextSound) throw new Error("Não foi possível carregar o áudio.");
      await nextSound.playAsync();
    } catch (e) {
      setAudioError(
        e instanceof Error && e.message.trim()
          ? e.message
          : "Não foi possível tocar o áudio.",
      );
      await stopAndUnload();
    }
  };

  const handleRetryAudio = async () => {
    setAudioError(null);

    if (lastAudioUrlErrorRef.current?.noRetry) {
      setAudioError(lastAudioUrlErrorRef.current.message);
      return;
    }

    await stopAndUnload();
    setAudioUrl(null);
    setAudioUrlExpiresAtMs(null);
    try {
      await ensureAudioUrl({ force: true });
    } catch (e) {
      setAudioError(
        e instanceof Error && e.message.trim()
          ? e.message
          : "Não foi possível carregar o áudio.",
      );
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
            editable={!isMutating && !isAudioUpload}
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
            editable={!isMutating && !isAudioUpload}
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
                editable={!isMutating && !isAudioUpload}
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
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void handleRetryAudio()}
                        style={({ pressed }) => [
                          styles.audioRetryBtn,
                          { borderColor: colors.brass600 },
                          pressed ? styles.audioRetryBtnPressed : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.audioRetryText,
                            { color: colors.brass600 },
                          ]}
                        >
                          Tentar novamente
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    disabled={isFetchingAudioUrl}
                    onPress={() => void handleTogglePlay()}
                    style={({ pressed }) => [
                      styles.audioPlayBtn,
                      { borderColor: colors.brass600 },
                      pressed ? styles.audioPlayBtnPressed : null,
                      isFetchingAudioUrl ? { opacity: 0.7 } : null,
                    ]}
                  >
                    {isFetchingAudioUrl ? (
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
                </>
              )}
            </View>
          ) : null}

          <Text style={[styles.label, { color: textSecondary }]}>Letra</Text>
          <TextInput
            value={lyrics}
            onChangeText={setLyrics}
            editable={!isMutating && !isAudioUpload}
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
            editable={!isMutating && !isAudioUpload}
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
            editable={!isMutating}
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
              disabled={isMutating}
              onPress={() => void reject()}
              style={({ pressed }) => [
                styles.rejectBtn,
                {
                  borderColor: colors.brass600,
                  opacity: isMutating ? 0.7 : 1,
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
              disabled={isMutating}
              onPress={() => void approve()}
              style={({ pressed }) => [
                styles.approveBtn,
                {
                  backgroundColor:
                    variant === "light" ? colors.forest700 : colors.forest300,
                  opacity: isMutating ? 0.7 : 1,
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
                {isMutating ? "Enviando…" : "Aprovar"}
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
