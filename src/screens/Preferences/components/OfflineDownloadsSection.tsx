import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  PreferencesSection,
} from "@/src/components/preferences";
import { clearAudiosForTerreiro } from "@/src/offline/audioCache";
import {
  listPackages,
  removePackage,
  syncTerreiroPackage,
  type TerreiroPackageMeta,
} from "@/src/offline/terreiroPackage";
import { queryKeys } from "@/src/queries/queryKeys";
import { colors, spacing } from "@/src/theme";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type Props = {
  variant: "light" | "dark";
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ms: number) {
  const d = new Date(ms);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month} ${h}:${m}`;
}

export function OfflineDownloadsSection({ variant }: Props) {
  const queryClient = useQueryClient();

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;
  const textMuted =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;
  const borderColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;

  const packagesQuery = useQuery({
    queryKey: queryKeys.offline.allPackages(),
    staleTime: 0,
    queryFn: () => listPackages(),
  });

  const packages = packagesQuery.data ?? [];
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const invalidateAll = React.useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.offline.allPackages(),
    });
  }, [queryClient]);

  const handleSync = React.useCallback(
    async (meta: TerreiroPackageMeta) => {
      setBusyId(meta.terreiroId);
      try {
        await syncTerreiroPackage(meta.terreiroId);
        await queryClient.invalidateQueries({
          queryKey: queryKeys.offline.terreiroPackage(meta.terreiroId),
        });
        await invalidateAll();
      } catch {
        /* silent */
      } finally {
        setBusyId(null);
      }
    },
    [queryClient, invalidateAll]
  );

  const handleRemove = React.useCallback(
    (meta: TerreiroPackageMeta) => {
      Alert.alert(
        "Remover download",
        `Deseja remover "${meta.terreiroName}" dos downloads offline?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Remover",
            style: "destructive",
            onPress: async () => {
              setBusyId(meta.terreiroId);
              try {
                await clearAudiosForTerreiro(meta.terreiroId);
                await removePackage(meta.terreiroId);
                await queryClient.invalidateQueries({
                  queryKey: queryKeys.offline.terreiroPackage(meta.terreiroId),
                });
                await invalidateAll();
              } catch {
                /* silent */
              } finally {
                setBusyId(null);
              }
            },
          },
        ]
      );
    },
    [queryClient, invalidateAll]
  );

  if (packages.length === 0) return null;

  return (
    <PreferencesSection title="DOWNLOADS OFFLINE" variant={variant}>
      {packages.map((meta) => {
        const isBusy = busyId === meta.terreiroId;
        return (
          <View
            key={meta.terreiroId}
            style={[styles.row, { borderColor }]}
          >
            <View style={styles.left}>
              <View
                style={[
                  styles.iconWrap,
                  variant === "light"
                    ? styles.iconWrapLight
                    : styles.iconWrapDark,
                ]}
              >
                <Ionicons
                  name="cloud-download-outline"
                  size={16}
                  color={textPrimary}
                />
              </View>
              <View style={styles.textCol}>
                <Text
                  style={[styles.title, { color: textPrimary }]}
                  numberOfLines={1}
                >
                  {meta.terreiroName}
                </Text>
                <Text style={[styles.subtitle, { color: textMuted }]}>
                  {meta.collectionsCount} coleções · {meta.pontosCount} pontos ·{" "}
                  {formatBytes(meta.bytesEstimate)}
                  {meta.audiosIncluded ? " · com áudios" : ""}
                </Text>
                <Text style={[styles.syncDate, { color: textMuted }]}>
                  Atualizado em {formatDate(meta.syncedAtMs)}
                </Text>
              </View>
            </View>

            <View style={styles.actions}>
              {isBusy ? (
                <ActivityIndicator
                  size="small"
                  color={colors.brass600}
                  style={styles.actionBtn}
                />
              ) : (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Atualizar"
                    onPress={() => void handleSync(meta)}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      pressed ? styles.actionBtnPressed : null,
                    ]}
                  >
                    <Ionicons name="sync" size={18} color={textSecondary} />
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remover"
                    onPress={() => handleRemove(meta)}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      pressed ? styles.actionBtnPressed : null,
                    ]}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={textSecondary}
                    />
                  </Pressable>
                </>
              )}
            </View>
          </View>
        );
      })}
    </PreferencesSection>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapDark: {
    borderColor: colors.surfaceCardBorder,
    backgroundColor: colors.inputBgDark,
  },
  iconWrapLight: {
    borderColor: colors.surfaceCardBorderLight,
    backgroundColor: colors.paper100,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  syncDate: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnPressed: {
    opacity: 0.7,
  },
});
