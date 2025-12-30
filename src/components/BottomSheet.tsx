import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { useRootPagerOptional } from "@/contexts/RootPagerContext";
import { colors, spacing } from "@/src/theme";

// --- Swipe-to-close tuning ---
// Fechamento por duas vias:
// A) Drag normal: distância (dy)
// B) Flick down: velocidade (vy e/ou velocidade média calculada)
const MIN_DRAG_TO_CLOSE = 60;
const MIN_FLICK_VELOCITY = 0.35;
const MIN_DIRECTIONAL_DY = 1;
const HORIZONTAL_SLOP = 8;
const MIN_FLICK_AVG_PX_PER_S = 700;

type Props = {
  visible: boolean;
  onClose: () => void;
  variant: "dark" | "light";
  children: React.ReactNode;
  enableSwipeToClose?: boolean;
  /**
   * Optional fixed snap point for the sheet height.
   * Use a single value like ["75%"] to keep the sheet height stable.
   */
  snapPoints?: readonly (string | number)[];
};

function resolveSnapHeight(
  snap: string | number | undefined,
  screenHeight: number,
  maxHeight: number
) {
  if (typeof snap === "number" && Number.isFinite(snap)) {
    return Math.max(0, Math.min(Math.round(snap), maxHeight));
  }

  if (typeof snap === "string") {
    const trimmed = snap.trim();
    if (trimmed.endsWith("%")) {
      const raw = Number(trimmed.slice(0, -1));
      if (Number.isFinite(raw)) {
        const pct = Math.max(0, Math.min(raw, 100));
        return Math.max(
          0,
          Math.min(Math.round(screenHeight * (pct / 100)), maxHeight)
        );
      }
    }

    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber)) {
      return Math.max(0, Math.min(Math.round(asNumber), maxHeight));
    }
  }

  return undefined;
}

export function BottomSheet({
  visible,
  onClose,
  variant,
  children,
  enableSwipeToClose = true,
  snapPoints,
}: Props) {
  const { height: screenHeight } = useWindowDimensions();
  const rootPager = useRootPagerOptional();
  const translateY = useRef(new Animated.Value(0)).current;
  const [sheetHeight, setSheetHeight] = useState(0);
  const scrollYRef = useRef(0);

  const gestureStartTsRef = useRef(0);
  const lastMoveTsRef = useRef(0);
  const lastDyRef = useRef(0);

  useEffect(() => {
    if (!visible) {
      translateY.setValue(0);
      scrollYRef.current = 0;
    }
  }, [translateY, visible]);

  useEffect(() => {
    // Quando o sheet está visível, bloqueia swipe horizontal global (tabs).
    // Home já faz isso manualmente, mas manter aqui garante consistência
    // para qualquer tela que use BottomSheet.
    if (!rootPager) return;
    rootPager.setIsBottomSheetOpen(visible);
  }, [rootPager, visible]);

  const closeBySwipe = useCallback(() => {
    if (!visible) return;

    const toValue = sheetHeight > 0 ? sheetHeight : 240;
    Animated.timing(translateY, {
      toValue,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      translateY.setValue(0);
      onClose();
    });
  }, [onClose, sheetHeight, translateY, visible]);

  const beginGesture = useCallback(() => {
    const now = Date.now();
    gestureStartTsRef.current = now;
    lastMoveTsRef.current = now;
    lastDyRef.current = 0;
  }, []);

  const updateGesture = useCallback((dy: number) => {
    lastDyRef.current = dy;
    lastMoveTsRef.current = Date.now();
  }, []);

  const shouldCloseFromRelease = useCallback((dy: number, vy: number) => {
    if (!(dy > 0)) return false;

    const dragClose = dy > MIN_DRAG_TO_CLOSE;

    const dt = (Date.now() - gestureStartTsRef.current) / 1000;
    const vAvg = dt > 0 ? dy / dt : 0;

    const flickClose =
      dy > MIN_DIRECTIONAL_DY &&
      (vy > MIN_FLICK_VELOCITY || vAvg > MIN_FLICK_AVG_PX_PER_S);

    return dragClose || flickClose;
  }, []);

  const createPanResponder = useCallback(
    (opts: { canCapture: () => boolean }) => {
      if (!enableSwipeToClose) return null;

      return PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_evt, gesture) => {
          if (!opts.canCapture()) return false;

          const absX = Math.abs(gesture.dx);
          const absY = Math.abs(gesture.dy);

          // Captura cedo quando houver intenção vertical para baixo.
          // Evita conflito com swipe horizontal do app.
          return (
            gesture.dy > MIN_DIRECTIONAL_DY &&
            absY > absX &&
            absX < HORIZONTAL_SLOP
          );
        },
        onMoveShouldSetPanResponder: (_evt, gesture) => {
          if (!opts.canCapture()) return false;

          const absX = Math.abs(gesture.dx);
          const absY = Math.abs(gesture.dy);
          return (
            gesture.dy > MIN_DIRECTIONAL_DY &&
            absY > absX &&
            absX < HORIZONTAL_SLOP
          );
        },
        onPanResponderGrant: () => {
          beginGesture();
        },
        onPanResponderMove: (_evt, gesture) => {
          if (gesture.dy <= 0) return;
          updateGesture(gesture.dy);
          translateY.setValue(gesture.dy);
        },
        onPanResponderRelease: (_evt, gesture) => {
          const dy = lastDyRef.current || gesture.dy;
          const vy = gesture.vy;

          if (shouldCloseFromRelease(dy, vy)) {
            closeBySwipe();
            return;
          }

          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      });
    },
    [
      beginGesture,
      closeBySwipe,
      enableSwipeToClose,
      shouldCloseFromRelease,
      translateY,
      updateGesture,
    ]
  );

  const handlePanResponder = useMemo(() => {
    // HANDLE: swipe down sempre pode fechar.
    return createPanResponder({
      canCapture: () => true,
    });
  }, [createPanResponder]);

  const contentPanResponder = useMemo(() => {
    // CONTEÚDO: só fecha se scroll estiver no topo.
    return createPanResponder({
      canCapture: () => scrollYRef.current === 0,
    });
  }, [createPanResponder]);

  const maxSheetHeight = Math.round(screenHeight * 0.85);
  const fixedHeight = resolveSnapHeight(
    snapPoints?.[0],
    screenHeight,
    maxSheetHeight
  );

  useEffect(() => {
    if (!visible) return;
    if (typeof fixedHeight !== "number") return;
    setSheetHeight(fixedHeight);
  }, [fixedHeight, visible]);

  if (!visible) return null;

  return (
    <View style={styles.portal} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        style={styles.backdrop}
        onPress={onClose}
      />

      <Animated.View
        style={[
          styles.sheet,
          variant === "light" ? styles.sheetLight : styles.sheetDark,
          fixedHeight
            ? {
                height: fixedHeight,
                maxHeight: fixedHeight,
                transform: [{ translateY }],
              }
            : { maxHeight: maxSheetHeight, transform: [{ translateY }] },
        ]}
        onLayout={(e) => {
          if (fixedHeight) return;
          setSheetHeight(e.nativeEvent.layout.height);
        }}
      >
        <View
          style={styles.handleWrap}
          {...(handlePanResponder ? handlePanResponder.panHandlers : null)}
        >
          <View
            style={[
              styles.handle,
              variant === "light" ? styles.handleLight : styles.handleDark,
            ]}
          />
        </View>

        <View
          {...(contentPanResponder ? contentPanResponder.panHandlers : null)}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => {
              const nextY = e.nativeEvent.contentOffset?.y ?? 0;
              scrollYRef.current = nextY > 0 ? nextY : 0;
            }}
            // Permite scroll bouncing no topo para melhor UX
            bounces={true}
          >
            {children}
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  portal: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayBackdrop,
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
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

  handleWrap: {
    alignItems: "center",
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    opacity: 0.6,
  },
  handleDark: {
    backgroundColor: colors.textMutedOnDark,
  },
  handleLight: {
    backgroundColor: colors.textMutedOnLight,
  },

  scroll: {
    flexGrow: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
