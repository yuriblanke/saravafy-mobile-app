import {
  safeParsePayload,
  type PendingPontoSubmission,
} from "@/src/queries/pontoSubmissions";
import { queryKeys } from "@/src/queries/queryKeys";
import {
  approveAudioUpload,
  approveCorrection,
  callRpcWithParamFallback,
  mapSubmissionCurationError,
  rejectAudioUpload,
  reviewPontoSubmission,
  updatePontoAudioDuration,
} from "@/src/services/submissionCuration";
import {
  normalizeTagsFromText,
  sanitizeOptionalText,
} from "@/src/utils/sanitizeReviewSubmission";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

type NewReviewDraft = {
  title: string;
  lyrics: string;
  tagsText: string;
  authorName: string;
  interpreterName: string;
  artist: string;
  authorContact: string;
};

type CurationAction = {
  mode: "approve" | "reject";
  reviewNote: string | null;
  draft?: NewReviewDraft;
  audioDurationMs?: number | null;
};

function toKind(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function useSubmissionCuration(
  submission: PendingPontoSubmission | null,
) {
  const queryClient = useQueryClient();

  const isPendingSubmission = submission?.status === "pending";

  const mutation = useMutation({
    mutationFn: async (action: CurationAction) => {
      if (!submission?.id) {
        throw new Error("Envio inválido.");
      }

      if (submission.status !== "pending") {
        throw new Error("submission_not_pending");
      }

      const kind = toKind(submission.kind);
      const note = sanitizeOptionalText(action.reviewNote);
      const payloadObj = safeParsePayload(submission.payload);

      if (action.mode === "approve") {
        if (kind === "audio_upload") {
          const pontoAudioId = sanitizeOptionalText(submission.ponto_audio_id);
          const durationMs =
            typeof action.audioDurationMs === "number" &&
            Number.isFinite(action.audioDurationMs)
              ? Math.round(action.audioDurationMs)
              : 0;

          if (!pontoAudioId) {
            throw new Error(
              "Dados inválidos para revisão. Revise os campos e tente novamente.",
            );
          }

          if (durationMs <= 0) {
            throw new Error(
              "Não foi possível aprovar porque a duração do áudio não foi registrada.",
            );
          }

          await updatePontoAudioDuration({ pontoAudioId, durationMs });

          try {
            return await approveAudioUpload({ p_submission_id: submission.id });
          } catch (error) {
            const raw =
              error && typeof error === "object" && "message" in (error as any)
                ? String((error as any).message ?? "")
                : "";
            const lower = raw.toLowerCase();
            if (
              lower.includes("invalid_activation") ||
              lower.includes("cannot activate ponto_audio")
            ) {
              return callRpcWithParamFallback("review_ponto_submission", {
                p_submission_id: submission.id,
                p_decision: "approved",
                p_review_note: null,
              });
            }
            throw error;
          }
        }

        if (kind === "correction") {
          return approveCorrection({
            p_submission_id: submission.id,
            p_review_note: note,
          });
        }

        const draft = action.draft;
        if (!draft) {
          throw new Error(
            "Dados inválidos para revisão. Revise os campos e tente novamente.",
          );
        }

        const isPublicDomain = submission.ponto_is_public_domain !== false;
        const hasAudio = submission.has_audio === true;
        const authorConsent = submission.author_consent_granted === true;
        const interpreterConsent =
          submission.interpreter_consent_granted === true;

        if (!isPublicDomain && !authorConsent) {
          throw new Error("missing_author_consent");
        }

        if (hasAudio && !interpreterConsent) {
          throw new Error("invalid_interpreter_consent");
        }

        const finalTitle = sanitizeOptionalText(draft.title);
        const finalLyrics = sanitizeOptionalText(draft.lyrics);
        if (!finalTitle) throw new Error("missing_title");
        if (!finalLyrics) throw new Error("missing_lyrics");

        const finalTags = normalizeTagsFromText(draft.tagsText);
        const finalAuthorName = sanitizeOptionalText(draft.authorName);
        const finalInterpreterName = sanitizeOptionalText(
          draft.interpreterName,
        );
        const finalArtist =
          sanitizeOptionalText(draft.artist) ??
          sanitizeOptionalText(payloadObj.artist);
        const finalAuthorContact =
          sanitizeOptionalText(draft.authorContact) ??
          sanitizeOptionalText(payloadObj.author_contact);

        return reviewPontoSubmission({
          p_submission_id: submission.id,
          p_decision: "approved",
          p_review_note: note,
          p_title: finalTitle,
          p_lyrics: finalLyrics,
          p_tags: finalTags,
          p_artist: finalArtist,
          p_author_name: finalAuthorName,
          p_interpreter_name: finalInterpreterName,
          p_has_author_consent: authorConsent,
          p_author_contact: finalAuthorContact,
        });
      }

      if (!note) {
        throw new Error("missing_review_note");
      }

      if (kind === "audio_upload") {
        return rejectAudioUpload({
          p_submission_id: submission.id,
          p_review_note: note,
        });
      }

      return reviewPontoSubmission({
        p_submission_id: submission.id,
        p_decision: "rejected",
        p_review_note: note,
        p_title: null,
        p_lyrics: null,
        p_tags: null,
        p_artist: null,
        p_author_name: null,
        p_interpreter_name: null,
        p_has_author_consent: null,
        p_author_contact: null,
      });
    },
    onSuccess: async (_data, action) => {
      if (!submission?.id) return;

      const nextStatus = action.mode === "approve" ? "approved" : "rejected";
      const note = sanitizeOptionalText(action.reviewNote);
      const reviewedAt = new Date().toISOString();

      queryClient.setQueryData(
        queryKeys.pontosSubmissions.byId(submission.id),
        (prev: PendingPontoSubmission | null | undefined) => {
          if (!prev) return prev ?? null;
          return {
            ...prev,
            status: nextStatus,
            reviewed_at: reviewedAt,
            review_note: note,
          } as PendingPontoSubmission;
        },
      );

      queryClient.setQueryData(
        queryKeys.pontosSubmissions.pending(),
        (prev: PendingPontoSubmission[] | undefined) => {
          const list = Array.isArray(prev) ? prev : [];
          return list.filter((item) => item.id !== submission.id);
        },
      );

      await queryClient.invalidateQueries({
        queryKey: queryKeys.pontosSubmissions.pending(),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.pontosSubmissions.byId(submission.id),
      });
      await queryClient.invalidateQueries({
        queryKey: ["collections", "pontos"],
      });

      if (submission.ponto_id) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.pontoAudios.byPontoId(submission.ponto_id),
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.pontoAudios.hasAnyUploadedByPontoId(
            submission.ponto_id,
          ),
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.pontosSubmissions.approvedAudioByPontoId(
            submission.ponto_id,
          ),
        });
        await queryClient.invalidateQueries({ queryKey: ["pontos"] });
      }
    },
  });

  const approve = useCallback(
    async (params: {
      reviewNote: string | null;
      draft?: NewReviewDraft;
      audioDurationMs?: number | null;
    }) => {
      try {
        await mutation.mutateAsync({
          mode: "approve",
          reviewNote: params.reviewNote,
          draft: params.draft,
          audioDurationMs: params.audioDurationMs,
        });
        return { ok: true as const, error: null };
      } catch (error) {
        return {
          ok: false as const,
          error: mapSubmissionCurationError(error),
          rawError: error,
        };
      }
    },
    [mutation],
  );

  const reject = useCallback(
    async (params: { reviewNote: string | null }) => {
      try {
        await mutation.mutateAsync({
          mode: "reject",
          reviewNote: params.reviewNote,
        });
        return { ok: true as const, error: null };
      } catch (error) {
        return {
          ok: false as const,
          error: mapSubmissionCurationError(error),
          rawError: error,
        };
      }
    },
    [mutation],
  );

  return {
    approve,
    reject,
    isPendingSubmission,
    isMutating: mutation.isPending,
  };
}
