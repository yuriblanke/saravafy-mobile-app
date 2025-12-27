import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { colors, spacing } from "@/src/theme";
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
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { AudioPlayerFooter } from "./components/AudioPlayerFooter";
import { PlayerContent } from "./components/PlayerContent";
import {
  useCollectionPlayerData,
  type CollectionPlayerItem,
} from "./hooks/useCollectionPlayerData";

const LYRICS_FONT_MIN = 14;
const LYRICS_FONT_MAX = 26;

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

  const { effectiveTheme } =
    require("@/contexts/PreferencesContext").usePreferences();
  const variant: "light" | "dark" = effectiveTheme;

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  const { items, isLoading, error, isEmpty, reload } = useCollectionPlayerData({
    collectionId,
  });

  const [lyricsFontSize, setLyricsFontSize] = useState(18);
  const [activeIndex, setActiveIndex] = useState(0);

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

  const onDecreaseFont = useCallback(() => {
    setLyricsFontSize((prev) => Math.max(LYRICS_FONT_MIN, prev - 2));
  }, []);

  const onIncreaseFont = useCallback(() => {
    setLyricsFontSize((prev) => Math.min(LYRICS_FONT_MAX, prev + 2));
  }, []);

  const getItemLayout = useCallback(
    (_: ArrayLike<CollectionPlayerItem> | null | undefined, index: number) => {
      return { length: width, offset: width * index, index };
    },
    [width]
  );

  if (isLoading) {
    return (
      <SaravafyScreen variant={variant}>
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
      </SaravafyScreen>
    );
  }

  if (error) {
    return (
      <SaravafyScreen variant={variant}>
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
        </View>
      </SaravafyScreen>
    );
  }

  if (isEmpty) {
    return (
      <SaravafyScreen variant={variant}>
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
      </SaravafyScreen>
    );
  }

  return (
    <SaravafyScreen variant={variant}>
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Diminuir fonte"
              onPress={onDecreaseFont}
              hitSlop={10}
              style={styles.headerIconBtn}
            >
              <Text style={[styles.fontBtnText, { color: textPrimary }]}>
                A-
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Aumentar fonte"
              onPress={onIncreaseFont}
              hitSlop={10}
              style={styles.headerIconBtn}
            >
              <Text style={[styles.fontBtnText, { color: textPrimary }]}>
                A+
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Menu"
              onPress={() => {
                // Placeholder de ações
              }}
              hitSlop={10}
              style={styles.headerIconBtn}
            >
              <Ionicons
                name="ellipsis-vertical"
                size={18}
                color={textPrimary}
              />
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
                />
              </View>
            )}
            onMomentumScrollEnd={(e) => {
              const nextIndex = Math.round(
                e.nativeEvent.contentOffset.x / width
              );
              if (Number.isFinite(nextIndex)) setActiveIndex(nextIndex);
            }}
            getItemLayout={getItemLayout}
            initialScrollIndex={initialIndex}
          />
        </View>

        <AudioPlayerFooter ponto={activePonto} variant={variant} />
      </View>
    </SaravafyScreen>
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
