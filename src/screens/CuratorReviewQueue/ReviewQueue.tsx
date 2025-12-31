import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
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

export default function ReviewQueueScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { effectiveTheme } = usePreferences();

  const variant = effectiveTheme;

  const { isCurator, isLoading: isCuratorLoading } = useIsCurator();

  const submissionsQuery = usePendingPontoSubmissions({
    enabled: !!isCurator && !isCuratorLoading,
  });

  useEffect(() => {
    if (isCuratorLoading) return;
    if (isCurator) return;

    showToast("Apenas curators acessam a fila de revisão.");
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
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={[styles.centerText, { color: textSecondary }]}>
          Carregando…
        </Text>
      </View>
    );
  }

  if (!isCurator) {
    return <View style={styles.screen} />;
  }

  return (
    <View style={styles.screen}>
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
            {String(submissionsQuery.error instanceof Error
              ? submissionsQuery.error.message
              : "Erro")}
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
            const authorName =
              (typeof s.author_name === "string" ? s.author_name : "")
                .trim()
                .slice(0, 80);
            const interpreterName =
              (typeof s.interpreter_name === "string"
                ? s.interpreter_name
                : "")
                .trim()
                .slice(0, 80);

            const peopleLine = [authorName, interpreterName]
              .filter(Boolean)
              .join(" — ");

            return (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                onPress={() => {
                  router.push((`/review-submissions/${s.id}` as any) as any);
                }}
                style={({ pressed }) => [
                  pressed ? styles.rowPressed : null,
                ]}
              >
                <SurfaceCard variant={variant} style={styles.card}>
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
                </SurfaceCard>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
