import { useAuth } from "@/contexts/AuthContext";
import { useGestureGate } from "@/contexts/GestureGateContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { SaravafyStackScene } from "@/src/components/SaravafyStackScene";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { useTerreirosWithRoleQuery } from "@/src/queries/terreirosWithRole";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
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
import { type TerreiroListItem } from "./data/terreiros";

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
  if (c && s) return `${c}/${s}`;
  return c || s;
}

function formatLocation(neighborhood?: string, city?: string, state?: string) {
  const loc = formatCityState(city, state);
  const n =
    typeof neighborhood === "string" && neighborhood.trim()
      ? neighborhood.trim()
      : "";
  if (!loc) return "";
  if (n) return `${n} · ${loc}`;
  return loc;
}

function formatPhoneBr(digits: string) {
  const d = normalizePhoneDigits(digits);
  if (!d) return "";
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return d;
}

function normalizeInstagramHandle(handle?: string) {
  if (typeof handle !== "string") return "";
  let h = handle.trim();

  // Accept @handle
  h = h.replace(/^@+/, "");

  // Accept full URLs like https://instagram.com/handle
  h = h.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
  h = h.replace(/^instagram\.com\//i, "");

  // Strip query/hash and trailing slashes
  h = h.split(/[?#]/)[0] ?? "";
  h = h.replace(/\/+$/, "");

  // Keep only first path segment
  h = h.split("/")[0] ?? "";
  return h.trim();
}

function normalizePhoneDigits(phoneDigits?: string) {
  if (typeof phoneDigits !== "string") return "";
  return phoneDigits.replace(/\D/g, "");
}

async function openInstagram(handle: string) {
  const h = normalizeInstagramHandle(handle);
  if (!h) return;
  const web = `https://instagram.com/${encodeURIComponent(h)}`;
  Linking.openURL(web).catch(() => undefined);
}

async function openWhatsApp(phoneDigits: string) {
  const digits = normalizePhoneDigits(phoneDigits);
  if (!digits) return;
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  const web = `https://wa.me/${encodeURIComponent(full)}`;
  Linking.openURL(web).catch(() => undefined);
}

function TerreiroCard({
  item,
  variant,
  textPrimary,
  textSecondary,
  textMuted,
  expanded,
  onToggleExpanded,
  onOpenCollections,
}: {
  item: TerreiroListItem;
  variant: "light" | "dark";
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  expanded: boolean;
  onToggleExpanded: () => void;
  onOpenCollections: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const name =
    (typeof item.name === "string" && item.name.trim()) || "Terreiro";

  const location = formatLocation(item.neighborhood, item.city, item.state);

  const responsaveis = useMemo(() => {
    const list = Array.isArray(item.responsaveis) ? [...item.responsaveis] : [];
    list.sort((a, b) => {
      const ap = a.isPrimary ? 1 : 0;
      const bp = b.isPrimary ? 1 : 0;
      if (ap !== bp) return bp - ap;
      const ad = a.createdAt ?? "9999-12-31T23:59:59.999Z";
      const bd = b.createdAt ?? "9999-12-31T23:59:59.999Z";
      return ad.localeCompare(bd);
    });
    return list;
  }, [item.responsaveis]);

  const phone = normalizePhoneDigits(item.phoneDigits);
  const phoneIsWhatsApp = item.phoneIsWhatsApp === true;
  const instagram = normalizeInstagramHandle(item.instagramHandle);

  const linesOfWork =
    typeof item.linesOfWork === "string" && item.linesOfWork.trim()
      ? item.linesOfWork.trim()
      : "";
  const about =
    typeof item.about === "string" && item.about.trim()
      ? item.about.trim()
      : "";

  const hasImage =
    !imageFailed &&
    typeof item.coverImageUrl === "string" &&
    item.coverImageUrl.trim().length > 0;

  return (
    <Pressable accessibilityRole="button" onPress={onOpenCollections}>
      <SurfaceCard variant={variant}>
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <Text
              style={[styles.cardTitle, { color: textPrimary }]}
              numberOfLines={2}
            >
              {name}
            </Text>

            {location ? (
              <Text
                style={[styles.cardMeta, { color: textSecondary }]}
                numberOfLines={1}
              >
                {location}
              </Text>
            ) : null}

            {!expanded && about ? (
              <Text
                style={[styles.cardBody, { color: textSecondary }]}
                numberOfLines={2}
              >
                {about}
              </Text>
            ) : null}

            {!expanded ? (
              <View style={styles.collapsedActionsRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ver mais"
                  hitSlop={10}
                  onPress={() => {
                    onToggleExpanded();
                  }}
                  style={styles.chevronRow}
                >
                  <Text style={[styles.chevronText, { color: textMuted }]}>
                    Ver mais
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={textMuted} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver menos"
                hitSlop={10}
                onPress={() => {
                  onToggleExpanded();
                }}
                style={styles.chevronRow}
              >
                <Text style={[styles.chevronText, { color: textMuted }]}>
                  Ver menos
                </Text>
                <Ionicons name="chevron-up" size={18} color={textMuted} />
              </Pressable>
            )}
            {expanded ? (
              <>
                {responsaveis.length > 0 ? (
                  <View style={styles.cardBlock}>
                    <Text style={[styles.cardLabel, { color: textMuted }]}>
                      Responsáveis espirituais
                    </Text>
                    <View style={styles.listBlock}>
                      {responsaveis.map((r, idx) => (
                        <Text
                          key={`${r.name}:${idx}`}
                          style={[
                            styles.cardBody,
                            { color: textSecondary },
                            r.isPrimary ? styles.cardPrimaryBold : null,
                          ]}
                          numberOfLines={1}
                        >
                          {r.name}
                        </Text>
                      ))}
                    </View>
                  </View>
                ) : null}

                {linesOfWork ? (
                  <View style={styles.cardBlock}>
                    <Text style={[styles.cardLabel, { color: textMuted }]}>
                      Linhas de trabalho
                    </Text>
                    <Text style={[styles.cardBody, { color: textSecondary }]}>
                      {linesOfWork}
                    </Text>
                  </View>
                ) : null}

                {about ? (
                  <View style={styles.cardBlock}>
                    <Text style={[styles.cardLabel, { color: textMuted }]}>
                      Sobre
                    </Text>
                    <Text style={[styles.cardBody, { color: textSecondary }]}>
                      {about}
                    </Text>
                  </View>
                ) : null}

                {instagram || (phone && phoneIsWhatsApp) ? (
                  <View style={styles.cardBlock}>
                    <Text style={[styles.cardLabel, { color: textMuted }]}>
                      Contatos
                    </Text>
                    {instagram ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Abrir Instagram"
                        onPress={(e) => {
                          (e as any)?.stopPropagation?.();
                          void openInstagram(instagram);
                        }}
                      >
                        <View style={styles.contactLinkRow}>
                          <Ionicons
                            name="logo-instagram"
                            size={16}
                            color={textSecondary}
                          />
                          <Text
                            style={[styles.linkText, { color: textSecondary }]}
                            numberOfLines={1}
                          >
                            Instagram: @{instagram}
                          </Text>
                        </View>
                      </Pressable>
                    ) : null}
                    {phone && phoneIsWhatsApp ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Abrir WhatsApp"
                        onPress={(e) => {
                          (e as any)?.stopPropagation?.();
                          void openWhatsApp(phone);
                        }}
                      >
                        <View style={styles.contactLinkRow}>
                          <Ionicons
                            name="logo-whatsapp"
                            size={16}
                            color={textSecondary}
                          />
                          <Text
                            style={[styles.linkText, { color: textSecondary }]}
                            numberOfLines={1}
                          >
                            WhatsApp: {formatPhoneBr(phone)}
                          </Text>
                        </View>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </>
            ) : null}
          </View>

          <View style={styles.cardRight}>
            {hasImage ? (
              <Image
                source={{ uri: item.coverImageUrl as string }}
                resizeMode="cover"
                style={styles.cardImage}
                onError={() => setImageFailed(true)}
              />
            ) : (
              <Image
                source={require("@/assets/images/image_cover_filler.png")}
                resizeMode="cover"
                style={styles.cardImage}
              />
            )}

            {!expanded && (instagram || (phone && phoneIsWhatsApp)) ? (
              <View style={styles.iconRow}>
                {instagram ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Abrir Instagram"
                    hitSlop={10}
                    onPress={(e) => {
                      (e as any)?.stopPropagation?.();
                      void openInstagram(instagram);
                    }}
                    style={styles.actionIconBtn}
                  >
                    <Ionicons
                      name="logo-instagram"
                      size={18}
                      color={textMuted}
                    />
                  </Pressable>
                ) : null}

                {phone && phoneIsWhatsApp ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Abrir WhatsApp"
                    hitSlop={10}
                    onPress={(e) => {
                      (e as any)?.stopPropagation?.();
                      void openWhatsApp(phone);
                    }}
                    style={styles.actionIconBtn}
                  >
                    <Ionicons
                      name="logo-whatsapp"
                      size={18}
                      color={textMuted}
                    />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      </SurfaceCard>
    </Pressable>
  );
}

export default function Terreiros() {
  const router = useRouter();
  const { effectiveTheme } = usePreferences();
  const gestureGate = useGestureGate();
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
  const userId = user?.id ?? null;
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTerreiroId, setExpandedTerreiroId] = useState<string | null>(
    null
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpandedTerreiroId((prev) => (prev === id ? null : id));
  }, []);

  const terreirosQuery = useTerreirosWithRoleQuery(userId);
  const terreiros = useMemo(
    () => (terreirosQuery.data ?? []) as TerreiroListItem[],
    [terreirosQuery.data]
  );
  const isLoading = terreirosQuery.isFetching && terreiros.length === 0;
  const error = terreirosQuery.isError
    ? "Erro ao carregar os terreiros."
    : null;

  const filteredTerreiros = useMemo(() => {
    const q = normalize(searchQuery);
    if (!q) return terreiros;
    return terreiros.filter((t) => matchesTerreiroQuery(t, q));
  }, [terreiros, searchQuery]);

  return (
    <SaravafyStackScene theme={variant} variant="tabs" style={styles.screen}>
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
          <View style={styles.paddedBlock}>
            <Text style={[styles.bodyText, { color: textSecondary }]}>
              Carregando…
            </Text>
          </View>
        ) : error ? (
          <View style={[styles.paddedBlock, styles.errorBlock]}>
            <Text style={[styles.bodyText, { color: textSecondary }]}>
              {error}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void terreirosQuery.refetch();
              }}
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
          <View style={styles.paddedBlock}>
            <Text style={[styles.bodyText, { color: textSecondary }]}>
              Nenhum terreiro encontrado.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredTerreiros}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const expanded = expandedTerreiroId === item.id;
              return (
                <View style={styles.cardGap}>
                  <TerreiroCard
                    item={item}
                    variant={variant}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    textMuted={textMuted}
                    expanded={expanded}
                    onToggleExpanded={() => toggleExpanded(item.id)}
                    onOpenCollections={() => {
                      if (gestureGate.shouldBlockPress()) return;

                      const name =
                        (typeof item.name === "string" && item.name.trim()) ||
                        "Terreiro";

                      router.push({
                        pathname: "/terreiro" as any,
                        params: { terreiroId: item.id, terreiroTitle: name },
                      });
                    }}
                  />
                </View>
              );
            }}
          />
        )}
      </View>
    </SaravafyStackScene>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: spacing.md,
  },
  paddedBlock: {
    paddingHorizontal: spacing.lg,
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
    paddingHorizontal: spacing.lg,
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
    paddingHorizontal: spacing.lg,
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
    alignItems: "center",
    gap: spacing.xs,
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
  cardBlock: {
    gap: 2,
  },
  listBlock: {
    gap: 4,
    paddingTop: 2,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  cardPrimaryBold: {
    fontWeight: "800",
  },
  collapsedActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: spacing.sm,
    paddingTop: 2,
  },
  contactLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  chevronRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 6,
  },
  chevronText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  actionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  linkText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  cardImagePlaceholder: {
    borderWidth: StyleSheet.hairlineWidth,
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
