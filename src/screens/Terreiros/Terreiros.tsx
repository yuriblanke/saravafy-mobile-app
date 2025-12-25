import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { AppHeaderWithPreferences } from "@/src/components/AppHeaderWithPreferences";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { colors, spacing } from "@/src/theme";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  fetchTerreirosWithRole,
  type TerreiroListItem,
} from "./data/terreiros";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function matchesTerreiroQuery(terreiro: TerreiroListItem, query: string) {
  const q = normalize(query);
  if (!q) return true;
  return normalize(terreiro.name ?? "").includes(q);
}

export default function Terreiros() {
  const router = useRouter();
  const { effectiveTheme, setActiveContext } = usePreferences();
  const variant = effectiveTheme;

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;
  const textMuted =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;

  const { user } = useAuth();
  const [terreiros, setTerreiros] = useState<TerreiroListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTerreirosWithRole(user?.id ?? "");
      setTerreiros(data);
    } catch (e) {
      if (__DEV__) {
        console.info("[Terreiros] erro ao carregar", {
          error: e instanceof Error ? e.message : String(e),
        });
      }
      setError("Erro ao carregar os terreiros.");
      setTerreiros([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Recarrega quando user muda
  }, [user?.id]);

  const filteredTerreiros = useMemo(() => {
    const q = normalize(searchQuery);
    if (!q) return terreiros;
    return terreiros.filter((t) => matchesTerreiroQuery(t, q));
  }, [terreiros, searchQuery]);

  return (
    <SaravafyScreen variant={variant}>
      <View style={styles.screen}>
        <AppHeaderWithPreferences />

        <View style={styles.container}>
          {/* Título removido conforme solicitado */}
          <View style={styles.searchWrap}>
            <View
              style={[
                styles.searchInputWrap,
                variant === "light"
                  ? styles.searchInputWrapLight
                  : styles.searchInputWrapDark,
              ]}
            >
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar terreiro pelo nome"
                placeholderTextColor={textSecondary}
                style={[styles.searchInput, { color: textPrimary }]}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="never"
              />

              {searchQuery.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSearchQuery("")}
                  style={styles.clearButton}
                  hitSlop={10}
                >
                  <Text style={[styles.clearButtonText, { color: textMuted }]}>
                    ×
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {isLoading ? (
            <Text style={[styles.bodyText, { color: textSecondary }]}>
              Carregando…
            </Text>
          ) : error ? (
            <View style={styles.errorBlock}>
              <Text style={[styles.bodyText, { color: textSecondary }]}>
                {error}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={load}
                style={[
                  styles.retryBtn,
                  variant === "light"
                    ? styles.retryBtnLight
                    : styles.retryBtnDark,
                ]}
              >
                <Text style={[styles.retryText, { color: textPrimary }]}>
                  Tentar novamente
                </Text>
              </Pressable>
            </View>
          ) : filteredTerreiros.length === 0 ? (
            <Text style={[styles.bodyText, { color: textSecondary }]}>
              Nenhum terreiro encontrado.
            </Text>
          ) : (
            <FlatList
              data={filteredTerreiros}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const name =
                  (typeof item.name === "string" && item.name.trim()) ||
                  "Terreiro";

                return (
                  <View style={styles.cardGap}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setActiveContext({
                          kind: "TERREIRO_PAGE",
                          terreiroId: item.id,
                          terreiroName: name,
                          role: item.role ?? "follower",
                        });
                        router.push("/terreiro");
                      }}
                    >
                      <SurfaceCard variant={variant}>
                        <Text
                          style={[styles.cardTitle, { color: textPrimary }]}
                          numberOfLines={2}
                        >
                          {name}
                        </Text>
                      </SurfaceCard>
                    </Pressable>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </SaravafyScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sectionGapSmall: {
    height: spacing.sm,
  },
  searchWrap: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  searchInputWrap: {
    position: "relative",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 36,
    height: 44,
    justifyContent: "center",
  },
  searchInputWrapDark: {
    backgroundColor: colors.inputBgDark,
    borderColor: colors.inputBorderDark,
  },
  searchInputWrapLight: {
    backgroundColor: colors.inputBgLight,
    borderColor: colors.inputBorderLight,
  },
  searchInput: {
    fontSize: 14,
  },
  clearButton: {
    position: "absolute",
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    width: 24,
  },
  clearButtonText: {
    fontSize: 22,
    lineHeight: 22,
    fontWeight: "600",
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  errorBlock: {
    gap: spacing.md,
  },
  retryBtn: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  retryBtnDark: {
    borderColor: colors.surfaceCardBorder,
    backgroundColor: "transparent",
  },
  retryBtnLight: {
    borderColor: colors.surfaceCardBorderLight,
    backgroundColor: "transparent",
  },
  retryText: {
    fontSize: 13,
    fontWeight: "800",
  },
  listContent: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  cardGap: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlayBackdrop,
    justifyContent: "flex-end",
  },
  sheetDark: {
    backgroundColor: colors.surfaceCardBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceCardBorder,
  },
  sheetLight: {
    backgroundColor: colors.surfaceCardBgLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceCardBorderLight,
  },
  infoModal: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  infoButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  infoBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  infoBtnPrimary: {
    borderColor: colors.brass600,
    backgroundColor: colors.brass600,
  },
  infoBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
});
