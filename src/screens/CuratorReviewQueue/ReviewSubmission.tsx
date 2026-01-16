import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function getErrorMessage(error: unknown): string {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as any).message)
      : "";
  return message.trim() ? message.trim() : "Erro";
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
  return "Envio";
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

  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [interpreterName, setInterpreterName] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);

  const hydratedRef = useRef(false);

  useEffect(() => {
    hydratedRef.current = false;
    setTitle("");
    setAuthorName("");
    setInterpreterName("");
    setLyrics("");
    setTagsText("");
    setReviewNote("");
    setInlineError(null);
  }, [submissionId]);

  useEffect(() => {
    if (hydratedRef.current) return;
    if (!submission) return;

    hydratedRef.current = true;
    const content = extractSubmissionContentFromPayload(submission.payload);
    setTitle(content.title ?? "");
    setAuthorName(
      typeof submission.author_name === "string" ? submission.author_name : ""
    );
    setInterpreterName(
      typeof submission.interpreter_name === "string"
        ? submission.interpreter_name
        : ""
    );
    setLyrics(content.lyrics ?? "");
    setTagsText((content.tags ?? []).join(", "));
    setReviewNote("");
  }, [submission]);

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
      }
    );
  };

  const reviewNewMutation = useMutation({
    mutationFn: async (payload: RpcPayload) => {
      const res: any = await supabase.rpc("review_ponto_submission", payload);
      if (res?.error) {
        throw new Error(
          typeof res.error?.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Erro ao revisar envio."
        );
      }
      return res?.data ?? null;
    },
  });

  const approveCorrectionMutation = useMutation({
    mutationFn: async (payload: ApproveCorrectionRpcPayload) => {
      const res: any = await supabase.rpc(
        "approve_ponto_correction_submission",
        payload
      );
      if (res?.error) {
        throw new Error(
          typeof res.error?.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Erro ao aprovar correção."
        );
      }
      return res?.data ?? null;
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (payload: RejectSubmissionRpcPayload) => {
      const res: any = await supabase.rpc("reject_ponto_submission", payload);
      if (res?.error) {
        throw new Error(
          typeof res.error?.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Erro ao rejeitar envio."
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

        console.error("[CuratorReview] erro ao aprovar correction", {
          submissionId,
          kind,
          error: raw,
        });

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
    const hasAudio = submission?.has_audio === true;
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

              console.error("[CuratorReview] erro ao rejeitar submission", {
                submissionId,
                kind: submission?.kind ?? null,
                error: raw,
              });

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
      ]
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
  const hasAudio = submission.has_audio === true;
  const authorConsentGranted = submission.author_consent_granted === true;
  const interpreterConsentGranted =
    submission.interpreter_consent_granted === true;
  const consentLine = [
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
            editable={!isMutating}
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
            editable={!isMutating}
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
                editable={!isMutating}
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

          <Text style={[styles.label, { color: textSecondary }]}>Letra</Text>
          <TextInput
            value={lyrics}
            onChangeText={setLyrics}
            editable={!isMutating}
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
            editable={!isMutating}
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
