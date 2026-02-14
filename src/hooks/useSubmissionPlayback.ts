import {
  ensureLoaded,
  getCurrentSubmissionId,
  loadAndPlay,
  togglePlayPause,
  useRntpPlayback,
} from "@/src/audio/rntpService";
import { extractSubmissionContentFromPayload } from "@/src/queries/pontoSubmissions";
import { useCallback, useMemo, useState } from "react";

export type SubmissionLike = {
  id: string;
  has_audio: boolean;
  payload?: unknown;
  author_name?: string | null;
  interpreter_name?: string | null;
};

function coerceTitle(raw: unknown) {
  const t = typeof raw === "string" ? raw.trim() : "";
  return t ? t : "Ponto";
}

function coerceArtist(raw: unknown) {
  const a = typeof raw === "string" ? raw.trim() : "";
  return a ? a : null;
}

export function useSubmissionPlayback(submission: SubmissionLike | null | undefined) {
  const rntp = useRntpPlayback(250);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const submissionId = typeof submission?.id === "string" ? submission.id : "";
  const hasAudio = submission?.has_audio === true;

  const content = useMemo(
    () => extractSubmissionContentFromPayload(submission?.payload),
    [submission?.payload],
  );

  const defaultTitle = coerceTitle(content?.title);
  const defaultArtist =
    coerceArtist(submission?.interpreter_name) ||
    coerceArtist(submission?.author_name) ||
    null;

  const isCurrent =
    rntp.current?.kind === "submission" && rntp.current.id === submissionId;

  const isLoadingPlaybackUrl = rntp.isLoading;
  const effectiveError = playbackError || (isCurrent ? rntp.error : null);

  const preload = useCallback(
    async (overrides?: { title?: string; artist?: string | null }) => {
      setPlaybackError(null);

      const sid = String(submissionId ?? "").trim();
      if (!sid) throw new Error("Envio inválido.");
      if (!hasAudio) throw new Error("Envio sem áudio.");

      await ensureLoaded({
        kind: "submission",
        submissionId: sid,
        title: coerceTitle(overrides?.title ?? defaultTitle),
        artist: overrides?.artist ?? defaultArtist,
      });
    },
    [defaultArtist, defaultTitle, hasAudio, submissionId],
  );

  const play = useCallback(
    async (overrides?: { title?: string; artist?: string | null }) => {
      setPlaybackError(null);

      const sid = String(submissionId ?? "").trim();
      if (!sid) throw new Error("Envio inválido.");
      if (!hasAudio) throw new Error("Envio sem áudio.");

      try {
        if (getCurrentSubmissionId() === sid) {
          await togglePlayPause();
          return;
        }

        await loadAndPlay({
          kind: "submission",
          submissionId: sid,
          title: coerceTitle(overrides?.title ?? defaultTitle),
          artist: overrides?.artist ?? defaultArtist,
        });
      } catch (e) {
        const msg =
          e instanceof Error && e.message.trim()
            ? e.message.trim()
            : "Não foi possível tocar o áudio.";
        setPlaybackError(msg);
        throw e;
      }
    },
    [defaultArtist, defaultTitle, hasAudio, submissionId],
  );

  return {
    current: rntp.current,
    hasAudio,
    isCurrent,
    isPlaying: isCurrent && rntp.isPlaying,
    positionMillis: isCurrent ? rntp.positionMillis : 0,
    durationMillis: isCurrent ? rntp.durationMillis : 0,
    isLoadingPlaybackUrl,
    error: effectiveError,
    preload,
    play,
    clearError: () => setPlaybackError(null),
  };
}
