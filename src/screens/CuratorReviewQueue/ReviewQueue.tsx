import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { Badge } from "@/src/components/Badge";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { useIsCurator } from "@/src/hooks/useIsCurator";
import { usePendingPontoSubmissions } from "@/src/queries/pontoSubmissions";
import { colors, spacing } from "@/src/theme";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "";
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return "";
  try {
    return new Date(t).toLocaleDateString("pt-BR");
  } catch {
    return "";
  }
}

function toKindLabel(kind: string | null | undefined) {
  const k = typeof kind === "string" ? kind.trim().toLowerCase() : "";
  if (k === "correction") return "Correção";
  if (k === "problem") return "Problema";
  return "Envio";
}

export default function ReviewQueueScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { effectiveTheme } = usePreferences();

  const variant = effectiveTheme;

  // Match the Preferences menu (BottomSheet) background.
  const bgColor =
    variant === "light" ? colors.surfaceCardBgLight : colors.surfaceCardBg;

  const { isCurator, isLoading: isCuratorLoading } = useIsCurator();

  const submissionsQuery = usePendingPontoSubmissions({
    enabled: !!isCurator && !isCuratorLoading,
  });

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

  const items = useMemo(() => submissionsQuery.data ?? [], [submissionsQuery]);

  if (isCuratorLoading) {
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

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.safeArea, { backgroundColor: bgColor }]}
    >
      <View style={[styles.screen, { backgroundColor: bgColor }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: textPrimary }]}>
            Fila de revisão
          </Text>
          <Text style={[styles.subtitle, { color: textSecondary }]}>
            Envios pendentes
          </Text>
        </View>

        {submissionsQuery.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={[styles.centerText, { color: textSecondary }]}>
              Carregando envios…
            </Text>
          </View>
        ) : submissionsQuery.isError ? (
          <View style={styles.center}>
            <Text style={[styles.errorText, { color: colors.brass600 }]}>
              Não foi possível carregar a fila.
            </Text>
            <Text style={[styles.centerText, { color: textSecondary }]}>
              {String(
                submissionsQuery.error instanceof Error
                  ? submissionsQuery.error.message
                  : "Erro"
              )}
            </Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.center}>
            <Text style={[styles.centerText, { color: textSecondary }]}>
              Nenhum envio pendente.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {items.map((s) => {
              const dateLabel = formatDateLabel(s.created_at ?? null);
              const title = s.title?.trim() || "(Sem título)";
              const authorName = (
                typeof s.author_name === "string" ? s.author_name : ""
              )
                .trim()
                .slice(0, 80);
              const interpreterName = (
                typeof s.interpreter_name === "string" ? s.interpreter_name : ""
              )
                .trim()
                .slice(0, 80);

              const peopleLine = [authorName, interpreterName]
                .filter(Boolean)
                .join(" — ");

              const kindLabel = toKindLabel(s.kind);
              const submitterEmail =
                typeof s.submitter_email === "string" ? s.submitter_email : "";
              const issuePreview =
                typeof s.issue_details === "string"
                  ? s.issue_details.trim()
                  : "";

              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  onPress={() => {
                    router.push(`/review-submissions/${s.id}` as any as any);
                  }}
                  style={({ pressed }) => [pressed ? styles.rowPressed : null]}
                >
                  <SurfaceCard variant={variant} style={styles.card}>
                    <View style={styles.cardTopRow}>
                      <Badge label={kindLabel} variant={variant} />
                      {submitterEmail ? (
                        <Text
                          style={[styles.cardMeta, { color: textSecondary }]}
                          numberOfLines={1}
                        >
                          {submitterEmail}
                        </Text>
                      ) : (
                        <View />
                      )}
                    </View>

                    <Text
                      style={[styles.cardTitle, { color: textPrimary }]}
                      numberOfLines={2}
                    >
                      {title}
                    </Text>

                    {peopleLine ? (
                      <Text
                        style={[styles.cardMeta, { color: textSecondary }]}
                        numberOfLines={1}
                      >
                        {peopleLine}
                      </Text>
                    ) : null}

                    {dateLabel ? (
                      <Text
                        style={[styles.cardMeta, { color: textSecondary }]}
                        numberOfLines={1}
                      >
                        Enviado em {dateLabel}
                      </Text>
                    ) : null}

                    {issuePreview ? (
                      <Text
                        style={[styles.cardMeta, { color: textSecondary }]}
                        numberOfLines={2}
                      >
                        {issuePreview}
                      </Text>
                    ) : null}
                  </SurfaceCard>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
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
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
  },
  list: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  card: {
    padding: spacing.md,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  rowPressed: {
    opacity: 0.92,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 19,
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
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
  errorText: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
});
