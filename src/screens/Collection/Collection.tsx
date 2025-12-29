import { supabase } from "@/lib/supabase";
import { AppHeaderWithPreferences } from "@/src/components/AppHeaderWithPreferences";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { ShareBottomSheet } from "@/src/components/ShareBottomSheet";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { TagChip } from "@/src/components/TagChip";
import { useCollectionPlayerData } from "@/src/screens/Player/hooks/useCollectionPlayerData";
import { colors, spacing } from "@/src/theme";
import { buildShareMessageForColecao } from "@/src/utils/shareContent";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type CollectionRow = {
  id: string;
  title?: string | null;
};

function getErrorMessage(e: unknown): string {
  if (e instanceof Error && typeof e.message === "string" && e.message.trim()) {
    return e.message;
  }

  if (e && typeof e === "object") {
    const anyErr = e as any;
    if (typeof anyErr.message === "string" && anyErr.message.trim()) {
      return anyErr.message;
    }
  }

  return String(e);
}

function getLyricsPreview(lyrics: string, maxLines = 4) {
  const lines = String(lyrics ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const previewLines = lines.slice(0, maxLines);
  const preview = previewLines.join("\n");
  if (lines.length > maxLines) return `${preview}\n…`;
  return preview;
}

export default function Collection() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const { showToast } = require("@/contexts/ToastContext").useToast();

  const { effectiveTheme } =
    require("@/contexts/PreferencesContext").usePreferences();
  const variant: "light" | "dark" = effectiveTheme;

  const collectionId = String(params.id ?? params.collectionId ?? "");
  const titleFallback =
    (typeof params.collectionTitle === "string" &&
      params.collectionTitle.trim()) ||
    (typeof params.name === "string" && params.name.trim()) ||
    "Coleção";

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;
  const textMuted =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;

  const [collection, setCollection] = useState<CollectionRow | null>(null);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const {
    items: orderedItems,
    isLoading: pontosLoading,
    error: pontosError,
    isEmpty: pontosEmpty,
    reload: reloadPontos,
  } = useCollectionPlayerData({ collectionId });

  const loadCollection = useCallback(async () => {
    if (!collectionId) {
      setCollection(null);
      setCollectionError("Collection inválida.");
      return;
    }

    setCollectionLoading(true);
    setCollectionError(null);

    try {
      const res = await supabase
        .from("collections")
        .select("id, title")
        .eq("id", collectionId)
        .single();

      if (res.error) {
        const anyErr = res.error as any;
        const message =
          typeof anyErr?.message === "string" && anyErr.message.trim()
            ? anyErr.message
            : "Erro ao carregar a collection.";
        const extra = [anyErr?.code, anyErr?.details, anyErr?.hint]
          .filter((v) => typeof v === "string" && v.trim().length > 0)
          .join(" | ");
        throw new Error(extra ? `${message} (${extra})` : message);
      }

      setCollection(res.data as any);
    } catch (e) {
      if (__DEV__) {
        console.info("[Collection] erro ao carregar collection", {
          collectionId,
          error: getErrorMessage(e),
          raw: e,
        });
      }
      setCollection(null);
      setCollectionError(getErrorMessage(e));
    } finally {
      setCollectionLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

  const title =
    (typeof collection?.title === "string" && collection.title.trim()) ||
    titleFallback;

  const shareMessage = buildShareMessageForColecao(title);

  const isLoading = collectionLoading || pontosLoading;
  const error = collectionError || pontosError;

  return (
    <SaravafyScreen variant={variant}>
      <View style={styles.screen}>
        <AppHeaderWithPreferences />

        <View style={styles.collectionHeader}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.headerIconBtn}
          >
            <Ionicons name="chevron-back" size={22} color={textPrimary} />
          </Pressable>

          <Text
            style={[styles.headerTitle, { color: textPrimary }]}
            numberOfLines={1}
          >
            {title}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Compartilhar"
            onPress={() => setIsShareOpen(true)}
            hitSlop={10}
            style={styles.headerIconBtn}
          >
            <Ionicons name="share-outline" size={18} color={textPrimary} />
          </Pressable>
        </View>

        <ShareBottomSheet
          visible={isShareOpen}
          variant={variant}
          message={shareMessage}
          onClose={() => setIsShareOpen(false)}
          showToast={showToast}
        />

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={[styles.bodyText, { color: textSecondary }]}>
              Carregando…
            </Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={[styles.bodyText, { color: textSecondary }]}>
              {error}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                loadCollection();
                reloadPontos();
              }}
              style={({ pressed }) => [
                styles.retryBtn,
                pressed && styles.retryBtnPressed,
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
        ) : pontosEmpty ? (
          <SurfaceCard variant={variant} style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Ionicons
                name="albums-outline"
                size={48}
                color={
                  variant === "light" ? colors.forest500 : colors.forest400
                }
                style={{ marginBottom: spacing.lg }}
              />
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>
                Esta coleção ainda não tem pontos
              </Text>
              <Text style={[styles.bodyText, { color: textSecondary }]}>
                Para montar esta coleção, procure pontos e adicione os que fazem
                sentido aqui.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/home")}
                style={({ pressed }) => [
                  styles.ctaButton,
                  pressed && styles.retryBtnPressed,
                  variant === "light"
                    ? styles.ctaButtonLight
                    : styles.ctaButtonDark,
                ]}
              >
                <Ionicons
                  name="search"
                  size={18}
                  color={
                    variant === "light" ? colors.brass500 : colors.brass600
                  }
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={
                    variant === "light"
                      ? styles.ctaTextLight
                      : styles.ctaTextDark
                  }
                >
                  Buscar pontos
                </Text>
              </Pressable>
              <Text style={[styles.emptyHint, { color: textMuted }]}>
                Ao abrir um ponto, toque em “Adicionar à coleção” e selecione
                esta coleção.
              </Text>
            </View>
          </SurfaceCard>
        ) : (
          <FlatList
            data={orderedItems}
            keyExtractor={(it) => `${it.position}-${it.ponto.id}`}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const preview = getLyricsPreview(item.ponto.lyrics);
              return (
                <View style={styles.cardGap}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      router.push({
                        pathname: "/player",
                        params: {
                          collectionId,
                          initialPontoId: item.ponto.id,
                        },
                      });
                    }}
                  >
                    <SurfaceCard variant={variant}>
                      <Text
                        style={[styles.itemTitle, { color: textPrimary }]}
                        numberOfLines={2}
                      >
                        {item.ponto.title}
                      </Text>

                      {item.ponto.tags.length > 0 ? (
                        <View style={styles.tagsWrap}>
                          {item.ponto.tags.map((t) => (
                            <TagChip key={t} label={t} variant={variant} />
                          ))}
                        </View>
                      ) : null}

                      <Text
                        style={[styles.preview, { color: textSecondary }]}
                        numberOfLines={6}
                      >
                        {preview}
                      </Text>
                    </SurfaceCard>
                  </Pressable>
                </View>
              );
            }}
          />
        )}
      </View>
    </SaravafyScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  collectionHeader: {
    height: 52,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
    paddingHorizontal: spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  retryBtn: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  retryBtnPressed: {
    opacity: 0.85,
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
  emptyCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  emptyContent: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: spacing.lg,
  },
  ctaButtonDark: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.brass600,
  },
  ctaButtonLight: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.brass500,
  },
  ctaTextDark: {
    color: colors.brass600,
    fontWeight: "900",
    fontSize: 14,
  },
  ctaTextLight: {
    color: colors.brass500,
    fontWeight: "900",
    fontSize: 14,
  },
  emptyHint: {
    fontSize: 12,
    marginTop: spacing.md,
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  cardGap: {
    marginBottom: spacing.md,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  preview: {
    paddingTop: spacing.sm,
    fontSize: 13,
    lineHeight: 18,
  },
});
