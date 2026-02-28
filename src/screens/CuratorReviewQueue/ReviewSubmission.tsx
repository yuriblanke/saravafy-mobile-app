import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { seekToSeconds } from "@/src/audio/rntpService";
import { AudioProgressSlider } from "@/src/components/AudioProgressSlider";
import { Badge } from "@/src/components/Badge";
import { TagChip } from "@/src/components/TagChip";
import { useIsCurator } from "@/src/hooks/useIsCurator";
import { useSubmissionCuration } from "@/src/hooks/useSubmissionCuration";
import { useSubmissionPlayback } from "@/src/hooks/useSubmissionPlayback";
import {
  extractSubmissionContentFromPayload,
  usePontoSubmissionById,
} from "@/src/queries/pontoSubmissions";
import { queryKeys } from "@/src/queries/queryKeys";
import { colors, spacing } from "@/src/theme";
import {
  normalizeTagsFromText,
  sanitizeOptionalText,
} from "@/src/utils/sanitizeReviewSubmission";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

  // Central contract: has_audio is the source of truth for playback.
  const isAudioReadyForPlayback = submission?.has_audio === true;

  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [interpreterName, setInterpreterName] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);

  // --- Secure audio playback state (RN Track Player) ---
  // RNTP is the single source of truth; playback URLs are resolved via Edge.
  const playback = useSubmissionPlayback(submission);
  const [audioUiError, setAudioUiError] = useState<string | null>(null);
  const audioPreloadStartedRef = useRef(false);

  const isThisSubmissionCurrent = playback.isCurrent;
  const isAudioPlaying = playback.isPlaying;
  const audioPositionMillis = playback.positionMillis;
  const audioDurationMillis = playback.durationMillis;
  const audioError = playback.error ? playback.error : audioUiError;
  const isStartingPlayback = playback.isLoadingPlaybackUrl;

  const hydratedRef = useRef(false);

  const handleSeekAudio = async (nextPositionMillis: number) => {
    if (!audioDurationMillis) return;
    if (!isThisSubmissionCurrent) return;

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
    if (!isAudioReadyForPlayback) return;
    if (!submissionId) return;

    if (audioPreloadStartedRef.current) return;

    // Don't disrupt another global track (single source of truth).
    if (
      playback.current !== null &&
      !(
        playback.current.kind === "submission" &&
        playback.current.id === submissionId
      )
    ) {
      return;
    }

    audioPreloadStartedRef.current = true;

    void (async () => {
      try {
        setAudioUiError(null);

        await playback.preload({
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
  }, [isAudioReadyForPlayback, submissionId]);

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
    enabled: isAudioUpload && submission?.has_audio === true && !!pontoAudioId,
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

  const curation = useSubmissionCuration(submission ?? null);
  const isMutatingAny = curation.isMutating;

  const isRejectNoteRequired = true;

  const isActionDisabled =
    isMutatingAny || !curation.isPendingSubmission || !submissionId;

  const approve = async () => {
    setInlineError(null);

    if (isActionDisabled) {
      const message = !curation.isPendingSubmission
        ? "Essa submission já foi revisada."
        : "Envio inválido.";
      setInlineError(message);
      showToast(message);
      return;
    }

    const result = await curation.approve({
      reviewNote: sanitizeOptionalText(reviewNote),
      draft: {
        title,
        lyrics,
        tagsText,
        authorName,
        interpreterName,
        artist: "",
        authorContact: "",
      },
      audioDurationMs: audioDurationMillis,
    });

    if (!result.ok) {
      if (result.error === "Já foi revisado.") {
        if (submissionId) {
          queryClient.setQueryData(
            queryKeys.pontosSubmissions.pending(),
            (prev: Array<{ id: string }> | undefined) =>
              (prev ?? []).filter((item) => item.id !== submissionId),
          );
        }
        showToast("Já foi revisado.");
        router.back();
        return;
      }
      setInlineError(result.error);
      showToast(result.error);
      return;
    }

    if (kindNorm === "audio_upload") {
      showToast("Áudio aprovado.");
    } else if (kindNorm === "correction") {
      showToast("Correção aprovada.");
    } else {
      showToast("Envio aprovado.");
    }

    router.back();
  };

  const reject = async () => {
    setInlineError(null);

    if (isActionDisabled) {
      const message = !curation.isPendingSubmission
        ? "Essa submission já foi revisada."
        : "Envio inválido.";
      setInlineError(message);
      showToast(message);
      return;
    }

    if (isRejectNoteRequired) {
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
            const result = await curation.reject({
              reviewNote: sanitizeOptionalText(reviewNote),
            });

            if (!result.ok) {
              if (result.error === "Já foi revisado.") {
                if (submissionId) {
                  queryClient.setQueryData(
                    queryKeys.pontosSubmissions.pending(),
                    (prev: Array<{ id: string }> | undefined) =>
                      (prev ?? []).filter((item) => item.id !== submissionId),
                  );
                }
                showToast("Já foi revisado.");
                router.back();
                return;
              }

              setInlineError(result.error);
              showToast(result.error);
              return;
            }

            if (kindNorm === "audio_upload") {
              showToast("Áudio rejeitado.");
            } else {
              showToast("Envio rejeitado.");
            }

            router.back();
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
          <ActivityIndicator color={colors.brass600} />
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
  const hasAudio = isAudioUpload || isAudioReadyForPlayback;

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

    if (!isAudioReadyForPlayback) {
      setAudioUiError(
        isAudioUpload
          ? "Áudio em revisão. Disponível em breve."
          : "Este envio não tem áudio.",
      );
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
      await playback.play({ title: reqTitle, artist: reqArtist });
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

          {!curation.isPendingSubmission ? (
            <Text style={[styles.inlineError, { color: textSecondary }]}>
              Essa submission já foi revisada.
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

          {isAudioUpload || isAudioReadyForPlayback ? (
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
                  {isAudioUpload
                    ? "Áudio em revisão. Disponível em breve."
                    : "Sem áudio disponível."}
                </Text>
              ) : (
                <>
                  {isAudioUpload ? (
                    pontoAudioMetaQuery.isLoading ? (
                      <View style={styles.audioLoadingRow}>
                        <ActivityIndicator color={colors.brass600} />
                        <Text
                          style={[
                            styles.audioMetaText,
                            { color: textSecondary },
                          ]}
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
                          style={[
                            styles.audioMetaLine,
                            { color: textSecondary },
                          ]}
                        >
                          {[
                            formatDurationFromMs(
                              pontoAudioMetaQuery.data.duration_ms,
                            ),
                            formatBytesAsMb(
                              pontoAudioMetaQuery.data.size_bytes,
                            ),
                            formatFromMime(pontoAudioMetaQuery.data.mime_type),
                          ]
                            .filter((v) => typeof v === "string" && v.trim())
                            .join(" • ")}
                        </Text>
                      </>
                    ) : null
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
              disabled={isActionDisabled}
              onPress={() => void reject()}
              style={({ pressed }) => [
                styles.rejectBtn,
                {
                  borderColor: colors.brass600,
                  opacity: isActionDisabled ? 0.7 : 1,
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
              disabled={isActionDisabled}
              onPress={() => void approve()}
              style={({ pressed }) => [
                styles.approveBtn,
                {
                  backgroundColor:
                    variant === "light" ? colors.forest700 : colors.forest300,
                  opacity: isActionDisabled ? 0.7 : 1,
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
                {isMutatingAny ? "Processando..." : "Aprovar"}
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
