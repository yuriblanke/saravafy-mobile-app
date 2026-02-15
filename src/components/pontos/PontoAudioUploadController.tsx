import {
  uploadAudioForExistingPonto,
  type PontoExistingAudioUploadPhase,
} from "@/src/services/pontoExistingAudioUpload";
import { metroError, metroLog } from "@/src/utils/metroLog";
import * as FileSystem from "expo-file-system";
import React, { useCallback, useMemo, useRef, useState } from "react";

const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

export type PontoAudioUploadInput = {
  uri: string;
  mimeType: string;
  sizeBytes?: number | null;
};

export type PontoAudioUploadPhase =
  | "idle"
  | "initLoading"
  | "uploading"
  | "completing"
  | "success"
  | "error";

export type PontoAudioUploadResult = {
  pontoAudioId: string;
  submissionId: string | null;
};

export type PontoAudioUploadControllerRenderProps = {
  phase: PontoAudioUploadPhase;
  isUploading: boolean;
  progress: number; // 0..1
  errorMessage: string | null;
  result: PontoAudioUploadResult | null;
  start: () => Promise<PontoAudioUploadResult>;
  reset: () => void;
};

type Props = {
  pontoId: string;
  interpreterName: string;
  audio: PontoAudioUploadInput | null;

  /** Interpreter declaration/consent for public playback (required by UI). */
  interpreterConsent: boolean;

  /** Optional extra guard (e.g. consent check) */
  canStart?: boolean;

  /** Called when upload completes successfully. */
  onDone?: (result: PontoAudioUploadResult) => void;

  /** Render-prop so callers can reuse this flow with any UI. */
  children: (ctx: PontoAudioUploadControllerRenderProps) => React.ReactNode;
};

async function getFileSizeBytes(uri: string): Promise<number | null> {
  try {
    const info: any = await FileSystem.getInfoAsync(uri, { size: true } as any);
    const size = info && typeof info === "object" ? (info as any).size : null;
    return typeof size === "number" && Number.isFinite(size) ? size : null;
  } catch {
    return null;
  }
}

export function PontoAudioUploadController({
  pontoId,
  interpreterName,
  audio,
  interpreterConsent,
  canStart,
  onDone,
  children,
}: Props) {
  const [phase, setPhase] = useState<PontoAudioUploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<PontoAudioUploadResult | null>(null);

  const inFlightRef = useRef<Promise<PontoAudioUploadResult> | null>(null);

  const isUploading =
    phase === "initLoading" || phase === "uploading" || phase === "completing";

  const mapServicePhaseToProgress = useCallback(
    (servicePhase: PontoExistingAudioUploadPhase) => {
      if (servicePhase === "initLoading") {
        setPhase("initLoading");
        setProgress(0.15);
        return;
      }
      if (servicePhase === "uploading") {
        setPhase("uploading");
        setProgress(0.6);
        return;
      }
      if (servicePhase === "completing") {
        setPhase("completing");
        setProgress(0.9);
        return;
      }
      if (servicePhase === "success") {
        setPhase("success");
        setProgress(1);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    inFlightRef.current = null;
    setPhase("idle");
    setProgress(0);
    setErrorMessage(null);
    setResult(null);
  }, []);

  const start = useCallback(async () => {
    if (inFlightRef.current) return inFlightRef.current;

    const promise = (async () => {
      setErrorMessage(null);
      setResult(null);

      try {
        metroLog("PontoAudioUpload", "start", {
          pontoId,
          interpreterNamePresent: Boolean(String(interpreterName ?? "").trim()),
          interpreterConsent,
          hasAudio: Boolean(audio),
          mimeType: audio?.mimeType ?? null,
          sizeBytes: audio?.sizeBytes ?? null,
        });

        if (canStart === false) {
          throw new Error("Não é possível iniciar o envio agora.");
        }

        const pontoIdValue = String(pontoId ?? "").trim();
        if (!pontoIdValue) throw new Error("Ponto inválido.");

        const interpreter = String(interpreterName ?? "").trim();
        if (!interpreter) throw new Error("Preencha o nome do intérprete.");

        if (!interpreterConsent) {
          throw new Error("É necessário aceitar a declaração para enviar.");
        }

        if (!audio) throw new Error("Selecione um áudio.");

        const uri = String(audio.uri ?? "").trim();
        const mimeType = String(audio.mimeType ?? "")
          .trim()
          .toLowerCase();
        if (!uri) throw new Error("Arquivo inválido (uri ausente).");
        if (!mimeType) throw new Error("Arquivo inválido (mimeType ausente).");
        if (!mimeType.startsWith("audio/")) {
          throw new Error(
            "O arquivo selecionado não parece ser um áudio válido.",
          );
        }

        mapServicePhaseToProgress("initLoading");

        const resolvedSizeBytes =
          typeof audio.sizeBytes === "number"
            ? audio.sizeBytes
            : await getFileSizeBytes(uri);

        metroLog("PontoAudioUpload", "resolved file size", {
          sizeBytes: resolvedSizeBytes,
          maxBytes: MAX_AUDIO_BYTES,
        });

        if (
          typeof resolvedSizeBytes === "number" &&
          resolvedSizeBytes > MAX_AUDIO_BYTES
        ) {
          throw new Error("Arquivo muito grande. Máximo: 50 MB.");
        }

        const uploadRes = await uploadAudioForExistingPonto({
          pontoId: pontoIdValue,
          interpreterName: interpreter,
          interpreterConsent,
          fileUri: uri,
          mimeType,
          sizeBytes:
            typeof resolvedSizeBytes === "number" ? resolvedSizeBytes : 0,
          durationMs: null,
          onPhaseChange: mapServicePhaseToProgress,
        });

        const out: PontoAudioUploadResult = {
          pontoAudioId: uploadRes.pontoAudioId,
          submissionId: uploadRes.submissionId,
        };

        setPhase("success");
        setProgress(1);
        setResult(out);
        onDone?.(out);
        metroLog("PontoAudioUpload", "done", out);
        return out;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Não foi possível enviar.";
        metroError("PontoAudioUpload", "failed", e, {
          phase: "failed",
          pontoId,
          interpreterConsent,
          hasAudio: Boolean(audio),
        });
        setPhase("error");
        setErrorMessage(msg);
        throw e;
      } finally {
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = promise;
    return promise;
  }, [
    audio,
    canStart,
    interpreterConsent,
    interpreterName,
    mapServicePhaseToProgress,
    onDone,
    pontoId,
  ]);

  const ctx = useMemo<PontoAudioUploadControllerRenderProps>(
    () => ({
      phase,
      isUploading,
      progress,
      errorMessage,
      result,
      start,
      reset,
    }),
    [errorMessage, isUploading, phase, progress, reset, result, start],
  );

  return <>{children(ctx)}</>;
}
