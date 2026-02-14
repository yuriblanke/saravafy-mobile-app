import { useToast } from "@/contexts/ToastContext";
import { queryKeys } from "@/src/queries/queryKeys";
import {
  uploadSubmissionAudio,
  type SubmissionAudioFile,
} from "@/src/services/submissionAudio";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { useCallback } from "react";

export function useSubmissionAudioUpload(submissionId: string | null | undefined) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: async (vars: { submissionId: string; file: SubmissionAudioFile }) => {
      return uploadSubmissionAudio(vars);
    },
    onSuccess: async (_res, vars) => {
      const sid = String(vars.submissionId ?? "").trim();
      if (!sid) return;

      await queryClient.invalidateQueries({
        queryKey: queryKeys.pontosSubmissions.byId(sid),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.pontosSubmissions.pending(),
      });
    },
  });

  const uploadAudio = useCallback(async () => {
    const sid = String(submissionId ?? "").trim();
    if (!sid) {
      showToast("Envio inválido para anexar áudio.");
      return;
    }

    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (res.canceled) return;

      const asset =
        Array.isArray(res.assets) && res.assets.length > 0 ? res.assets[0] : null;
      if (!asset?.uri) return;

      const mimeType =
        typeof (asset as any).mimeType === "string" &&
        String((asset as any).mimeType).trim()
          ? String((asset as any).mimeType).trim()
          : null;

      const file: SubmissionAudioFile = {
        uri: asset.uri,
        name:
          typeof asset.name === "string" && asset.name.trim() ? asset.name : null,
        mimeType,
      };

      await mutation.mutateAsync({ submissionId: sid, file });
      showToast("Áudio anexado.");
    } catch (e) {
      const msg =
        e instanceof Error && e.message.trim()
          ? e.message.trim()
          : "Não foi possível anexar o áudio.";
      showToast(msg);
      throw e;
    }
  }, [mutation, showToast, submissionId]);

  return {
    uploadAudio,
    isUploading: mutation.isPending,
    error: mutation.error,
  };
}
