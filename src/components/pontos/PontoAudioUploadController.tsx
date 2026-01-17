import { supabase } from "@/lib/supabase";
import {
  finalizeAudioUploadAndCreateSubmission,
  initPontoAudioUpload,
  uploadToSignedUpload,
} from "@/src/api/pontoAudio";
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
  | "init"
  | "upload"
  | "post_upload"
  | "done"
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
  canStart,
  onDone,
  children,
}: Props) {
  const [phase, setPhase] = useState<PontoAudioUploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<PontoAudioUploadResult | null>(null);

  const inFlightRef = useRef<Promise<PontoAudioUploadResult> | null>(null);

  const isUploading = phase !== "idle" && phase !== "done" && phase !== "error";

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
        if (canStart === false) {
          throw new Error("Não é possível iniciar o envio agora.");
        }

        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!sessionData?.session?.access_token) {
          throw new Error("Você precisa estar logada para enviar áudio.");
        }

        const pontoIdValue = String(pontoId ?? "").trim();
        if (!pontoIdValue) throw new Error("Ponto inválido.");

        const interpreter = String(interpreterName ?? "").trim();
        if (!interpreter) throw new Error("Preencha o nome do intérprete.");

        if (!audio) throw new Error("Selecione um áudio.");

        const uri = String(audio.uri ?? "").trim();
        const mimeType = String(audio.mimeType ?? "").trim();
        if (!uri) throw new Error("Arquivo inválido (uri ausente).");
        if (!mimeType) throw new Error("Arquivo inválido (mimeType ausente).");

        setPhase("init");
        setProgress(0.1);

        const resolvedSizeBytes =
          typeof audio.sizeBytes === "number"
            ? audio.sizeBytes
            : await getFileSizeBytes(uri);

        if (
          typeof resolvedSizeBytes === "number" &&
          resolvedSizeBytes > MAX_AUDIO_BYTES
        ) {
          throw new Error("Arquivo muito grande. Máximo: 50 MB.");
        }

        const init = await initPontoAudioUpload({
          pontoId: pontoIdValue,
          interpreterName: interpreter,
          mimeType,
        });

        setPhase("upload");
        setProgress(0.2);

        await uploadToSignedUpload({
          bucket: init.bucket,
          path: init.path,
          signedUpload: init.signedUpload,
          fileUri: uri,
          mimeType,
        });

        setPhase("post_upload");
        setProgress(0.85);

        console.log("[audio] post-upload start", {
          pontoId: pontoIdValue,
          pontoAudioId: init.pontoAudioId,
          bucket: init.bucket,
          path: init.path,
        });

        const finalizeRes = await finalizeAudioUploadAndCreateSubmission({
          pontoId: pontoIdValue,
          pontoAudioId: init.pontoAudioId,
          uploadToken: init.uploadToken,
          sizeBytes:
            typeof resolvedSizeBytes === "number" ? resolvedSizeBytes : 0,
          durationMs: 0,
        });

        const out: PontoAudioUploadResult = {
          pontoAudioId: init.pontoAudioId,
          submissionId: finalizeRes.submissionId,
        };

        setPhase("done");
        setProgress(1);
        setResult(out);
        onDone?.(out);
        return out;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Não foi possível enviar.";
        setPhase("error");
        setErrorMessage(msg);
        throw e;
      } finally {
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = promise;
    return promise;
  }, [audio, canStart, interpreterName, onDone, pontoId]);

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
    [errorMessage, isUploading, phase, progress, reset, result, start]
  );

  return <>{children(ctx)}</>;
}
