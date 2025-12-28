import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { AppHeaderWithPreferences } from "@/src/components/AppHeaderWithPreferences";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Linking,
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

function formatCityState(city?: string, state?: string) {
  const c = typeof city === "string" && city.trim() ? city.trim() : "";
  const s = typeof state === "string" && state.trim() ? state.trim() : "";
  if (!c && !s) return "";
  if (c && s) return `${c} · ${s}`;
  return c || s;
}

function normalizeInstagramHandle(handle?: string) {
  if (typeof handle !== "string") return "";
  const h = handle.trim().replace(/^@+/, "");
  return h;
}

function normalizePhoneDigits(phoneDigits?: string) {
  if (typeof phoneDigits !== "string") return "";
  return phoneDigits.replace(/\D/g, "");
}

function TerreiroCard({
  item,
  variant,
  textPrimary,
  textSecondary,
  textMuted,
  onPress,
}: {
  item: TerreiroListItem;
  variant: "light" | "dark";
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  onPress: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const name =
    (typeof item.name === "string" && item.name.trim()) || "Terreiro";

  const cityState = formatCityState(item.city, item.state);
  const phone = normalizePhoneDigits(item.phoneDigits);
  const instagram = normalizeInstagramHandle(item.instagramHandle);

  const hasActions = !!phone || !!instagram;

  const hasImage =
    !imageFailed &&
    typeof item.coverImageUrl === "string" &&
    item.coverImageUrl.trim().length > 0;

  const accentColor = variant === "light" ? colors.brass600 : colors.brass500;
  const pressedBg =
    variant === "light" ? colors.paper200 : "rgba(243,239,233,0.08)";

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <SurfaceCard variant={variant}>
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <Text
              style={[styles.cardTitle, { color: textPrimary }]}
              numberOfLines={2}
            >
              {name}
            </Text>

            {cityState ? (
              <Text
                style={[styles.cardMeta, { color: textSecondary }]}
                numberOfLines={1}
              >
                {cityState}
              </Text>
            ) : null}

            {hasActions ? (
              <View style={styles.cardActionsRow}>
                {phone ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Abrir WhatsApp"
                    hitSlop={10}
                    onPressIn={(e) => {
                      (e as any)?.stopPropagation?.();
                    }}
                    onPress={(e) => {
                      (e as any)?.stopPropagation?.();
                      Linking.openURL(`https://wa.me/55${phone}`).catch(
                        () => undefined
                      );
                    }}
                    style={({ pressed }) => [
                      styles.actionIconBtn,
                      pressed ? { backgroundColor: pressedBg } : null,
                    ]}
                  >
                    <Ionicons
                      name="logo-whatsapp"
                      size={18}
                      color={accentColor}
                    />
                  </Pressable>
                ) : null}

                {instagram ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Abrir Instagram"
                    hitSlop={10}
                    onPressIn={(e) => {
                      (e as any)?.stopPropagation?.();
                    }}
                    onPress={(e) => {
                      (e as any)?.stopPropagation?.();
                      Linking.openURL(
                        `https://instagram.com/${instagram}`
                      ).catch(() => undefined);
                    }}
                    style={({ pressed }) => [
                      styles.actionIconBtn,
                      pressed ? { backgroundColor: pressedBg } : null,
                    ]}
                  >
                    <Ionicons
                      name="logo-instagram"
                      size={18}
                      color={accentColor}
                    />
                  </Pressable>
                ) : null}

                {!phone && !instagram ? (
                  <Text style={[styles.cardMeta, { color: textMuted }]} />
                ) : null}
              </View>
            ) : null}
          </View>

          {hasImage ? (
            <View style={styles.cardRight}>
              <Image
                source={{ uri: item.coverImageUrl as string }}
                resizeMode="cover"
                style={styles.cardImage}
                onError={() => setImageFailed(true)}
              />
            </View>
          ) : null}
        </View>
      </SurfaceCard>
    </Pressable>
  );
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
  const userId = user?.id ?? "";
  const [terreiros, setTerreiros] = useState<TerreiroListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTerreirosWithRole(userId);
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
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

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
                return (
                  <View style={styles.cardGap}>
                    <TerreiroCard
                      item={item}
                      variant={variant}
                      textPrimary={textPrimary}
                      textSecondary={textSecondary}
                      textMuted={textMuted}
                      onPress={() => {
                        const name =
                          (typeof item.name === "string" && item.name.trim()) ||
                          "Terreiro";
                        setActiveContext({
                          kind: "TERREIRO_PAGE",
                          terreiroId: item.id,
                          terreiroName: name,
                          terreiroAvatarUrl: item.coverImageUrl,
                          role: item.role ?? "follower",
                        });
                        router.push("/terreiro");
                      }}
                    />
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

  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  cardLeft: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  cardRight: {
    justifyContent: "flex-start",
  },
  cardImage: {
    width: 92,
    height: 92,
    borderRadius: 12,
  },
  cardMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: 2,
  },
  actionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
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
