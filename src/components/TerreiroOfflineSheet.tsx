import { BottomSheet } from "@/src/components/BottomSheet";
import {
  clearAudiosForTerreiro,
  downloadAudiosForPackage,
  type AudioDownloadProgress,
} from "@/src/offline/audioCache";
import {
  getPackage,
  removePackage,
  syncTerreiroPackage,
  type SyncProgress,
  type TerreiroPackageMeta,
} from "@/src/offline/terreiroPackage";
import { queryKeys } from "@/src/queries/queryKeys";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ms: number) {
  const d = new Date(ms);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} às ${h}:${m}`;
}

function progressLabel(p: SyncProgress): string {
  switch (p.phase) {
    case "terreiro":
      return "Buscando dados do terreiro…";
    case "collections":
      return "Carregando coleções…";
    case "pontos":
      return p.total > 0
        ? `Baixando letras… (${p.current}/${p.total} coleções)`
        : "Baixando letras…";
    case "saving":
      return "Salvando no dispositivo…";
  }
}

type Props = {
  visible: boolean;
  onClose: () => void;
  terreiroId: string;
  terreiroName: string;
  variant: "light" | "dark";
};

export function TerreiroOfflineSheet({
  visible,
  onClose,
  terreiroId,
  terreiroName,
  variant,
}: Props) {
  const queryClient = useQueryClient();

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  const pkgQuery = useQuery({
    queryKey: queryKeys.offline.terreiroPackage(terreiroId),
    enabled: visible && !!terreiroId,
    staleTime: 0,
    queryFn: async (): Promise<TerreiroPackageMeta | null> => {
      const pkg = await getPackage(terreiroId);
      if (!pkg) return null;
      const totalPontos = Object.values(pkg.collectionPontos).reduce(
        (sum, items) => sum + items.length,
        0
      );
      return {
        terreiroId: pkg.terreiroId,
        terreiroName: pkg.terreiroName,
        syncedAtMs: pkg.syncedAtMs,
        bytesEstimate: pkg.bytesEstimate,
        audiosIncluded: pkg.audiosIncluded,
        collectionsCount: pkg.collections.length,
        pontosCount: totalPontos,
      };
    },
  });

  const meta = pkgQuery.data ?? null;
  const isDownloaded = meta !== null;

  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] =
    useState<AudioDownloadProgress | null>(null);
  const [isDownloadingAudio, setIsDownloadingAudio] = useState(false);

  const handleDownloadAudios = useCallback(async () => {
    setIsDownloadingAudio(true);
    setSyncError(null);
    try {
      await downloadAudiosForPackage(terreiroId, {
        onProgress: setAudioProgress,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.offline.terreiroPackage(terreiroId),
      });
    } catch (e) {
      const msg =
        e instanceof Error && e.message
          ? e.message
          : "Erro ao baixar áudios.";
      setSyncError(msg);
    } finally {
      setIsDownloadingAudio(false);
      setAudioProgress(null);
    }
  }, [queryClient, terreiroId]);

  const handleClearAudios = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      await clearAudiosForTerreiro(terreiroId);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.offline.terreiroPackage(terreiroId),
      });
    } catch {
      setSyncError("Erro ao remover áudios.");
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient, terreiroId]);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);
    setProgress(null);
    try {
      await syncTerreiroPackage(terreiroId, { onProgress: setProgress });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.offline.terreiroPackage(terreiroId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.offline.allPackages(),
      });
    } catch (e) {
      const msg =
        e instanceof Error && e.message ? e.message : "Erro ao sincronizar.";
      setSyncError(msg);
    } finally {
      setIsSyncing(false);
      setProgress(null);
    }
  }, [queryClient, terreiroId]);

  const handleRemove = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      await clearAudiosForTerreiro(terreiroId);
      await removePackage(terreiroId);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.offline.terreiroPackage(terreiroId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.offline.allPackages(),
      });
    } catch {
      setSyncError("Erro ao remover.");
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient, terreiroId]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      variant={variant}
      closeOnBackdropPress={!isSyncing}
    >
      <View style={styles.container}>
        <Text style={[styles.title, { color: textPrimary }]}>
          Salvar para offline
        </Text>

        <Text style={[styles.subtitle, { color: textSecondary }]}>
          {terreiroName}
        </Text>

        {isDownloaded ? (
          <View style={styles.metaWrap}>
            <Row
              label="Coleções"
              value={String(meta.collectionsCount)}
              color={textSecondary}
            />
            <Row
              label="Pontos"
              value={String(meta.pontosCount)}
              color={textSecondary}
            />
            <Row
              label="Tamanho"
              value={formatBytes(meta.bytesEstimate)}
              color={textSecondary}
            />
            <Row
              label="Última sincronização"
              value={formatDate(meta.syncedAtMs)}
              color={textSecondary}
            />
          </View>
        ) : (
          <Text style={[styles.description, { color: textSecondary }]}>
            Baixe as letras e coleções deste terreiro para acessá-las sem
            internet.
          </Text>
        )}

        {isSyncing && progress ? (
          <View style={styles.progressWrap}>
            <ActivityIndicator size="small" color={colors.brass600} />
            <Text style={[styles.progressText, { color: textSecondary }]}>
              {progressLabel(progress)}
            </Text>
          </View>
        ) : null}

        {isDownloadingAudio && audioProgress ? (
          <View style={styles.progressWrap}>
            <ActivityIndicator size="small" color={colors.brass600} />
            <Text style={[styles.progressText, { color: textSecondary }]}>
              {audioProgress.total > 0
                ? `Baixando áudios… (${audioProgress.current}/${audioProgress.total})`
                : "Preparando áudios…"}
            </Text>
          </View>
        ) : null}

        {syncError ? (
          <Text style={[styles.errorText, { color: textSecondary }]}>
            {syncError}
          </Text>
        ) : null}

        <View style={styles.actionsWrap}>
          <Pressable
            accessibilityRole="button"
            disabled={isSyncing || isDownloadingAudio}
            onPress={handleSync}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed ? styles.primaryBtnPressed : null,
              isSyncing || isDownloadingAudio ? styles.btnDisabled : null,
            ]}
          >
            <Ionicons
              name={isDownloaded ? "sync" : "download-outline"}
              size={16}
              color={colors.paper50}
              style={styles.btnIcon}
            />
            <Text style={styles.primaryBtnText}>
              {isSyncing
                ? "Sincronizando…"
                : isDownloaded
                ? "Atualizar letras"
                : "Baixar agora"}
            </Text>
          </Pressable>

          {isDownloaded ? (
            <>
              {meta.audiosIncluded ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={isSyncing || isDownloadingAudio}
                  onPress={handleClearAudios}
                  style={({ pressed }) => [
                    styles.dangerBtn,
                    { borderColor: colors.brass600 },
                    pressed ? styles.dangerBtnPressed : null,
                    isSyncing || isDownloadingAudio
                      ? styles.btnDisabled
                      : null,
                  ]}
                >
                  <Ionicons
                    name="musical-note"
                    size={16}
                    color={colors.brass600}
                    style={styles.btnIcon}
                  />
                  <Text style={styles.dangerBtnText}>Remover áudios</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={isSyncing || isDownloadingAudio}
                  onPress={handleDownloadAudios}
                  style={({ pressed }) => [
                    styles.dangerBtn,
                    { borderColor: colors.brass600 },
                    pressed ? styles.dangerBtnPressed : null,
                    isSyncing || isDownloadingAudio
                      ? styles.btnDisabled
                      : null,
                  ]}
                >
                  <Ionicons
                    name="musical-note"
                    size={16}
                    color={colors.brass600}
                    style={styles.btnIcon}
                  />
                  <Text style={styles.dangerBtnText}>
                    {isDownloadingAudio
                      ? "Baixando áudios…"
                      : "Baixar áudios"}
                  </Text>
                </Pressable>
              )}

              <Pressable
                accessibilityRole="button"
                disabled={isSyncing || isDownloadingAudio}
                onPress={handleRemove}
                style={({ pressed }) => [
                  styles.dangerBtn,
                  { borderColor: colors.brass600 },
                  pressed ? styles.dangerBtnPressed : null,
                  isSyncing || isDownloadingAudio
                    ? styles.btnDisabled
                    : null,
                ]}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={colors.brass600}
                  style={styles.btnIcon}
                />
                <Text style={styles.dangerBtnText}>Remover tudo</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </BottomSheet>
  );
}

function Row({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.metaRow}>
      <Text style={[styles.metaLabel, { color }]}>{label}</Text>
      <Text style={[styles.metaValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  metaWrap: {
    gap: 6,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  progressText: {
    fontSize: 13,
    fontWeight: "500",
  },
  errorText: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  actionsWrap: {
    gap: spacing.sm,
  },
  primaryBtn: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brass600,
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
  },
  primaryBtnPressed: {
    opacity: 0.85,
  },
  primaryBtnText: {
    color: colors.paper50,
    fontSize: 14,
    fontWeight: "800",
  },
  dangerBtn: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderRadius: 14,
    borderWidth: 2,
    paddingVertical: 12,
    gap: 8,
  },
  dangerBtnPressed: {
    opacity: 0.85,
  },
  dangerBtnText: {
    color: colors.brass600,
    fontSize: 14,
    fontWeight: "800",
  },
  btnIcon: {
    marginLeft: -2,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
