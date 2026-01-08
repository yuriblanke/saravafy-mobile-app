import { useCuratorMode } from "@/contexts/CuratorModeContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { AddMediumTagSheet } from "@/src/components/AddMediumTagSheet";
import { CurimbaExplainerBottomSheet } from "@/src/components/CurimbaExplainerBottomSheet";
import { ShareBottomSheet } from "@/src/components/ShareBottomSheet";
import {
  PontoUpsertModal,
  type PontoUpsertInitialValues,
} from "@/src/components/pontos/PontoUpsertModal";
import { useTerreiroMembershipStatus } from "@/src/hooks/terreiroMembership";
import { useIsCurator } from "@/src/hooks/useIsCurator";
import { useTerreiroPontosCustomTagsMap } from "@/src/queries/terreiroPontoCustomTags";
import { colors, spacing } from "@/src/theme";
import { buildShareMessageForPonto } from "@/src/utils/shareContent";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { AudioPlayerFooter } from "./components/AudioPlayerFooter";
import { PlayerContent } from "./components/PlayerContent";
import { PlayerSearchModal } from "./components/PlayerSearchModal";
import {
  useCollectionPlayerData,
  type CollectionPlayerItem,
} from "./hooks/useCollectionPlayerData";

const LYRICS_FONT_MIN = 14;
const LYRICS_FONT_MAX = 26;

const curimbaOnPng = require("@/assets/images/curimba-on.png");
const curimbaOffOnDarkPng = require("@/assets/images/curimba-off-on-dark.png");
const curimbaOffOnLightPng = require("@/assets/images/curimba-off-on-light.png");

function parseIntSafe(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (!Number.isFinite(i)) return null;
  return i;
}

export default function PlayerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const { showToast } = useToast();

  const { isCurator } = useIsCurator();
  const { curatorModeEnabled } = useCuratorMode();
  const canEditPontos = isCurator && curatorModeEnabled === true;

  const source = typeof params.source === "string" ? params.source : null;
  const searchQuery = typeof params.q === "string" ? params.q : "";
  const terreiroId =
    typeof params.terreiroId === "string" ? params.terreiroId : "";

  const collectionId = String(params.collectionId ?? "");
  const initialPontoId =
    typeof params.initialPontoId === "string"
      ? params.initialPontoId
      : typeof params.pontoId === "string"
      ? params.pontoId
      : null;
  const initialPosition =
    typeof params.initialPosition === "string"
      ? parseIntSafe(params.initialPosition)
      : null;

  const { width } = useWindowDimensions();

  const {
    effectiveTheme,
    curimbaEnabled,
    setCurimbaEnabled,
    curimbaOnboardingDismissed,
    setCurimbaOnboardingDismissed,
  } = usePreferences();
  const variant: "light" | "dark" = effectiveTheme;

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  const { items, isLoading, error, isEmpty, reload, patchPontoById } =
    useCollectionPlayerData(
      source === "all" ? { mode: "all", query: searchQuery } : { collectionId }
    );

  const membership = useTerreiroMembershipStatus(terreiroId);
  // Leituras são públicas em contexto de terreiro (sem gate de role/membership).
  const canSeeMediumTags = !!terreiroId;

  const myTerreiroRole = membership.data.role;
  const canEditCustomTags =
    !!terreiroId &&
    membership.data.isActiveMember &&
    (myTerreiroRole === "admin" || myTerreiroRole === "editor");

  const pontoIds = useMemo(() => {
    return items.map((it) => it.ponto.id).filter(Boolean);
  }, [items]);

  const queryClient = useQueryClient();

  const customTagsMapQuery = useTerreiroPontosCustomTagsMap(
    { terreiroId, pontoIds },
    { enabled: canSeeMediumTags && pontoIds.length > 0 }
  );
  const customTagsMap = customTagsMapQuery.data ?? {};

  const [lyricsFontSize, setLyricsFontSize] = useState(20);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [isCurimbaExplainerOpen, setIsCurimbaExplainerOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [mediumTargetPontoId, setMediumTargetPontoId] = useState<string | null>(
    null
  );

  const deleteMediumTag = useCallback(
    (params: { pontoId: string; tagId: string; tagLabel: string }) => {
      if (!canEditCustomTags) return;
      if (!terreiroId) return;

      Alert.alert(
        "Remover médium",
        `Remover “${params.tagLabel}” deste ponto neste terreiro?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Remover",
            style: "destructive",
            onPress: async () => {
              const res = await supabase
                .from("terreiro_ponto_custom_tags")
                .delete()
                .eq("id", params.tagId)
                .eq("terreiro_id", terreiroId);

              if (res.error) {
                const msg =
                  typeof res.error.message === "string" &&
                  res.error.message.trim()
                    ? res.error.message
                    : "Erro ao remover médium.";

                const lower = msg.toLowerCase();
                if (
                  lower.includes("row-level security") ||
                  lower.includes("rls") ||
                  lower.includes("permission")
                ) {
                  showToast(
                    "Você não tem permissão para editar os médiums deste terreiro."
                  );
                  return;
                }

                showToast(msg);
                return;
              }

              queryClient.setQueriesData(
                {
                  predicate: (q) => {
                    const key = q.queryKey;
                    return (
                      Array.isArray(key) &&
                      key.length >= 3 &&
                      key[0] === "pontos" &&
                      key[1] === "customTags" &&
                      key[2] === terreiroId
                    );
                  },
                },
                (old) => {
                  const prev = (old ?? {}) as Record<
                    string,
                    {
                      id: string;
                      tagText: string;
                      tagTextNormalized: string;
                      createdAt: string;
                    }[]
                  >;

                  const existing = Array.isArray(prev[params.pontoId])
                    ? prev[params.pontoId]
                    : [];

                  return {
                    ...prev,
                    [params.pontoId]: existing.filter((t) => t.id !== params.tagId),
                  };
                }
              );
            },
          },
        ]
      );
    },
    [canEditCustomTags, queryClient, showToast, terreiroId]
  );

  const flatListRef = useRef<FlatList<CollectionPlayerItem> | null>(null);

  const initialIndex = useMemo(() => {
    if (items.length === 0) return 0;

    if (initialPontoId) {
      const idx = items.findIndex((it) => it.ponto.id === initialPontoId);
      if (idx >= 0) return idx;
    }

    if (initialPosition != null) {
      const idx = items.findIndex((it) => it.position === initialPosition);
      if (idx >= 0) return idx;
    }

    return 0;
  }, [items, initialPontoId, initialPosition]);

  useEffect(() => {
    setActiveIndex(initialIndex);

    if (items.length > 0 && flatListRef.current) {
      // Espera 1 tick para garantir layout
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
        });
      });
    }
  }, [items.length, initialIndex]);

  const activePonto = items[activeIndex]?.ponto ?? null;

  const editingInitialValues: PontoUpsertInitialValues | undefined =
    useMemo(() => {
      if (!activePonto?.id) return undefined;
      return {
        id: activePonto.id,
        title: activePonto.title,
        artist: activePonto.artist ?? null,
        lyrics: activePonto.lyrics,
        tags: activePonto.tags,
      };
    }, [activePonto]);

  const openShare = useCallback(() => {
    if (!activePonto?.id) {
      showToast("Não foi possível compartilhar este ponto.");
      return;
    }

    const message = buildShareMessageForPonto({
      pontoId: activePonto.id,
      pontoTitle: activePonto.title ?? "Ponto",
    });

    setShareMessage(message);
    setIsShareOpen(true);
  }, [activePonto?.id, activePonto?.title, showToast]);

  const onDecreaseFont = useCallback(() => {
    setLyricsFontSize((prev) => Math.max(LYRICS_FONT_MIN, prev - 2));
  }, []);

  const onIncreaseFont = useCallback(() => {
    setLyricsFontSize((prev) => Math.min(LYRICS_FONT_MAX, prev + 2));
  }, []);

  const onToggleCurimba = useCallback(() => {
    const next = !curimbaEnabled;
    setCurimbaEnabled(next);

    if (__DEV__) {
      console.info("[Curimba] toggle (player)", { enabled: next });
      console.info("[Curimba] áudio", { blocked: next });
    }

    if (next && !curimbaOnboardingDismissed) {
      setIsCurimbaExplainerOpen(true);
    }
  }, [curimbaEnabled, curimbaOnboardingDismissed, setCurimbaEnabled]);

  const getItemLayout = useCallback(
    (_: ArrayLike<CollectionPlayerItem> | null | undefined, index: number) => {
      return { length: width, offset: width * index, index };
    },
    [width]
  );

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.headerIconBtn}
          >
            <Ionicons name="chevron-back" size={22} color={textPrimary} />
          </Pressable>
        </View>
        <View style={styles.loadingCenter}>
          <ActivityIndicator />
          <Text style={[styles.loadingText, { color: textSecondary }]}>
            Carregando…
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.headerIconBtn}
          >
            <Ionicons name="chevron-back" size={22} color={textPrimary} />
          </Pressable>
        </View>

        <View style={styles.loadingCenter}>
          <Text style={[styles.errorText, { color: textSecondary }]}>
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={reload}
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && styles.retryBtnPressed,
              variant === "light" ? styles.retryBtnLight : styles.retryBtnDark,
            ]}
          >
            <Text style={[styles.retryText, { color: textPrimary }]}>
              Tentar novamente
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.headerIconBtn}
          >
            <Ionicons name="chevron-back" size={22} color={textPrimary} />
          </Pressable>
        </View>
        <View style={styles.loadingCenter}>
          <Text style={[styles.errorText, { color: textSecondary }]}>
            Collection vazia.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.headerIconBtn}
        >
          <Ionicons name="chevron-back" size={22} color={textPrimary} />
        </Pressable>

        <View style={styles.headerRight}>
          {canEditPontos && activePonto ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Editar ponto"
              onPress={() => setIsEditOpen(true)}
              hitSlop={10}
              style={styles.headerIconBtn}
            >
              <Ionicons name="pencil" size={18} color={textPrimary} />
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Compartilhar"
            onPress={openShare}
            hitSlop={10}
            style={styles.headerIconBtn}
          >
            <Ionicons name="share-outline" size={18} color={textPrimary} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              curimbaEnabled ? "Desativar Modo Curimba" : "Ativar Modo Curimba"
            }
            onPress={onToggleCurimba}
            hitSlop={10}
            style={styles.headerIconBtn}
          >
            <Image
              source={
                curimbaEnabled
                  ? curimbaOnPng
                  : variant === "light"
                  ? curimbaOffOnLightPng
                  : curimbaOffOnDarkPng
              }
              style={styles.curimbaIcon}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Diminuir fonte"
            onPress={onDecreaseFont}
            hitSlop={10}
            style={styles.headerIconBtn}
          >
            <Text style={[styles.fontBtnText, { color: textPrimary }]}>A-</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Aumentar fonte"
            onPress={onIncreaseFont}
            hitSlop={10}
            style={styles.headerIconBtn}
          >
            <Text style={[styles.fontBtnText, { color: textPrimary }]}>A+</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buscar ponto"
            onPress={() => setIsSearchOpen(true)}
            hitSlop={10}
            style={styles.headerIconBtn}
          >
            <Ionicons name="search" size={18} color={textPrimary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.body}>
        <FlatList
          ref={(node) => {
            flatListRef.current = node;
          }}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          data={items}
          keyExtractor={(it) => `${it.position}-${it.ponto.id}`}
          renderItem={({ item }) => (
            <View style={{ width }}>
              <PlayerContent
                ponto={item.ponto}
                variant={variant}
                lyricsFontSize={lyricsFontSize}
                mediumTags={
                  canSeeMediumTags ? customTagsMap[item.ponto.id] ?? [] : []
                }
                canAddMediumTag={canEditCustomTags}
                onPressAddMediumTag={() =>
                  setMediumTargetPontoId(item.ponto.id)
                }
                canDeleteMediumTag={canEditCustomTags}
                onLongPressMediumTag={(t) =>
                  deleteMediumTag({
                    pontoId: item.ponto.id,
                    tagId: t.id,
                    tagLabel: t.tagText,
                  })
                }
              />
            </View>
          )}
          onMomentumScrollEnd={(e) => {
            const nextIndex = Math.round(e.nativeEvent.contentOffset.x / width);
            if (Number.isFinite(nextIndex)) setActiveIndex(nextIndex);
          }}
          getItemLayout={getItemLayout}
          initialScrollIndex={initialIndex}
        />
      </View>

      <AudioPlayerFooter
        ponto={activePonto}
        variant={variant}
        curimbaEnabled={curimbaEnabled}
      />

      <PlayerSearchModal
        visible={isSearchOpen}
        variant={variant}
        onClose={() => setIsSearchOpen(false)}
      />

      <ShareBottomSheet
        visible={isShareOpen}
        variant={variant}
        message={shareMessage}
        onClose={() => setIsShareOpen(false)}
        showToast={showToast}
      />

      <AddMediumTagSheet
        visible={!!mediumTargetPontoId}
        variant={variant}
        terreiroId={terreiroId}
        pontoId={mediumTargetPontoId ?? ""}
        onClose={() => setMediumTargetPontoId(null)}
      />

      <CurimbaExplainerBottomSheet
        visible={isCurimbaExplainerOpen}
        variant={variant}
        dontShowAgain={curimbaOnboardingDismissed}
        onChangeDontShowAgain={setCurimbaOnboardingDismissed}
        onClose={() => setIsCurimbaExplainerOpen(false)}
      />

      <PontoUpsertModal
        visible={isEditOpen}
        variant={variant}
        mode="edit"
        initialValues={editingInitialValues}
        onCancel={() => setIsEditOpen(false)}
        onSuccess={(updated) => {
          if (!updated) return;
          patchPontoById(updated);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    height: 52,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  fontBtnText: {
    fontSize: 14,
    fontWeight: "900",
  },
  curimbaIcon: {
    width: 18,
    height: 18,
  },
  body: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "700",
  },
  errorText: {
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
    opacity: 0.8,
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
});
