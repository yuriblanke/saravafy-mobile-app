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
import { dismissAllTooltips } from "@/src/components/TooltipPopover";
import { colors, spacing } from "@/src/theme";

// --- Swipe-to-close tuning ---
// Fechamento por duas vias:
// A) Drag normal: distância (dy)
// B) Flick down: velocidade (vy e/ou velocidade média calculada)
const MIN_DRAG_TO_CLOSE = 60;
const MIN_FLICK_VELOCITY = 0.35;
const MIN_DIRECTIONAL_DY = 0;
const HORIZONTAL_SLOP = 8;
const MIN_FLICK_AVG_PX_PER_S = 700;
const SCROLL_TOP_TOLERANCE_PX = 1;

// FAST FLICK: intenção do usuário é "fechar rápido" mesmo com dy pequeno.
// `vy` do PanResponder costuma variar em torno de ~0.5–2.0 em gestos reais.
const FAST_FLICK_VELOCITY = 1.2;
const CLOSE_DISTANCE_RATIO = 0.3;
const FAST_FLICK_TIME_MS = 120;

type Props = {
  visible: boolean;
  onClose: () => void;
  variant: "dark" | "light";
  children: React.ReactNode;
  enableSwipeToClose?: boolean;
  /**
   * When false, disables ScrollView scrolling (no scroll / no bounce).
   * Useful for sheets that rely on static layout + filler spacing.
   */
  scrollEnabled?: boolean;
  /**
   * Controls ScrollView bounce behavior.
   * Defaults to true to keep the current UX.
   */
  bounces?: boolean;
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
  scrollEnabled = true,
  bounces = true,
  snapPoints,
}: Props) {
  const { height: screenHeight } = useWindowDimensions();
  const rootPager = useRootPagerOptional();
  const setBottomSheetOpen = rootPager?.setIsBottomSheetOpen;
  const translateY = useRef(new Animated.Value(0)).current;
  const [sheetHeight, setSheetHeight] = useState(0);
  const scrollYRef = useRef(0);
  const isClosingRef = useRef(false);
  const isSwipeClosingRef = useRef(false);

  const gestureStartTsRef = useRef(0);
  const lastDyRef = useRef(0);

  useEffect(() => {
    if (!visible) {
      translateY.setValue(0);
      scrollYRef.current = 0;
      isClosingRef.current = false;
      isSwipeClosingRef.current = false;
    }
  }, [translateY, visible]);

  useEffect(() => {
    return () => {
      // Cleanup defensivo: se desmontar enquanto estava visível/fechando,
      // não queremos que um próximo mount fique "preso".
      isClosingRef.current = false;
      isSwipeClosingRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Quando o sheet está visível, bloqueia swipe horizontal global (tabs).
    // Home já faz isso manualmente, mas manter aqui garante consistência
    // para qualquer tela que use BottomSheet.
    if (!setBottomSheetOpen) return;
    setBottomSheetOpen(visible);
    return () => {
      // Cleanup no unmount (ou troca de rootPager) para não ficar preso em true.
      // IMPORTANTE: dependemos do setter (função), e não do objeto do context,
      // para evitar um "pisca" de false/true quando o provider recria o value.
      setBottomSheetOpen(false);
    };
  }, [setBottomSheetOpen, visible]);

  const maxSheetHeight = Math.round(screenHeight * 0.85);
  const fixedHeight = resolveSnapHeight(
    snapPoints?.[0],
    screenHeight,
    maxSheetHeight
  );

  const effectiveSheetHeight = useMemo(() => {
    // Altura efetiva para clamp do gesto:
    // - se tiver snap fixo: ele manda
    // - senão: usa o layout medido
    // - fallback: maxSheetHeight (evita valores absurdos antes do onLayout)
    if (typeof fixedHeight === "number" && fixedHeight > 0) return fixedHeight;
    if (sheetHeight > 0) return sheetHeight;
    return maxSheetHeight;
  }, [fixedHeight, maxSheetHeight, sheetHeight]);

  useEffect(() => {
    if (!visible) return;
    if (typeof fixedHeight !== "number") return;
    setSheetHeight(fixedHeight);
  }, [fixedHeight, visible]);

  const requestClose = useCallback(
    (
      reason?:
        | "swipe"
        | "swipe-fast"
        | "swipe-distance"
        | "backdrop"
        | "button"
        | "programmatic"
    ) => {
      // `onClose` aqui é tratado como `onRequestClose`: o parent é a fonte de verdade
      // (ele deve setar `visible=false`).
      // Guard idempotente: evita múltiplos `onClose` por swipe/backdrop/spam.
      void reason;
      if (!visible) return;
      if (isClosingRef.current) return;
      isClosingRef.current = true;
      onClose();
    },
    [onClose, visible]
  );

  const closeBySwipe = useCallback(() => {
    if (!visible) return;
    if (isClosingRef.current) return;
    if (isSwipeClosingRef.current) return;
    isSwipeClosingRef.current = true;

    const toValue = sheetHeight > 0 ? sheetHeight : 240;
    Animated.timing(translateY, {
      toValue,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      // IMPORTANTE: não resetar translateY para 0 aqui.
      // Se resetarmos para 0 antes do parent aplicar visible=false,
      // pode aparecer um frame "reaberto".
      requestClose("swipe");
    });
  }, [requestClose, sheetHeight, translateY, visible]);

  const beginGesture = useCallback(() => {
    const now = Date.now();
    gestureStartTsRef.current = now;
    lastDyRef.current = 0;
  }, []);

  const updateGesture = useCallback((dy: number) => {
    lastDyRef.current = dy;
  }, []);

  const shouldCloseFromRelease = useCallback(
    (dy: number, vy: number) => {
      if (!(dy > 0)) return false;

      // Distância: exige um arrasto mais "consciente" (proporcional à altura do sheet).
      const distanceThreshold = Math.max(
        MIN_DRAG_TO_CLOSE,
        Math.round(effectiveSheetHeight * CLOSE_DISTANCE_RATIO)
      );
      const dragClose = dy > distanceThreshold;

      const dt = (Date.now() - gestureStartTsRef.current) / 1000;
      const vAvg = dt > 0 ? dy / dt : 0;

      const flickClose =
        dy > MIN_DIRECTIONAL_DY &&
        (vy > MIN_FLICK_VELOCITY || vAvg > MIN_FLICK_AVG_PX_PER_S);

      return dragClose || flickClose;
    },
    [effectiveSheetHeight]
  );

  const createPanResponder = useCallback(
    (opts: { canCapture: () => boolean; captureOnStart?: boolean }) => {
      if (!enableSwipeToClose) return null;

      return PanResponder.create({
        onStartShouldSetPanResponderCapture: () => {
          // Captura no touch start apenas quando explicitamente habilitado.
          // No conteúdo isso rouba o ScrollView; no handle isso garante que
          // flicks extremamente rápidos não sejam classificados como "tap".
          if (!opts.captureOnStart) return false;
          return opts.canCapture();
        },
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
          const clamped = Math.max(
            0,
            Math.min(gesture.dy, effectiveSheetHeight)
          );
          updateGesture(clamped);
          translateY.setValue(clamped);
        },
        onPanResponderRelease: (_evt, gesture) => {
          const dy = lastDyRef.current || gesture.dy;
          const vy = gesture.vy;
          const vx = gesture.vx;
          const dtMs = Date.now() - gestureStartTsRef.current;

          // 1) FAST FLICK (prioridade máxima)
          // - fecha com pouco dy, se a intenção é claramente vertical para baixo.
          // - só avaliamos quando o conteúdo está no topo (ou quando o handle captura).
          const canSwipeCloseNow = opts.canCapture();
          const isPredominantlyVertical = Math.abs(vy) > Math.abs(vx);

          // Flick muito rápido: pouco dy + tempo curtíssimo já indica intenção
          const isQuickTapFlick =
            dy > MIN_DIRECTIONAL_DY && dtMs > 0 && dtMs < FAST_FLICK_TIME_MS;

          if (
            canSwipeCloseNow &&
            isPredominantlyVertical &&
            (vy > FAST_FLICK_VELOCITY || isQuickTapFlick)
          ) {
            closeBySwipe();
            return;
          }

          // 2) ARRASTO CONSCIENTE (distância)
          if (shouldCloseFromRelease(dy, vy)) {
            closeBySwipe();
            return;
          }

          // 3) Caso contrário: snap back
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
      effectiveSheetHeight,
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
      captureOnStart: true,
    });
  }, [createPanResponder]);

  const contentPanResponder = useMemo(() => {
    // CONTEÚDO: só fecha se scroll estiver no topo.
    return createPanResponder({
      canCapture: () => {
        // Tolerância porque o ScrollView pode ficar em valores fracionários
        // (bounce/float) mesmo "no topo".
        return (scrollYRef.current ?? 0) <= SCROLL_TOP_TOLERANCE_PX;
      },
    });
  }, [createPanResponder]);

  if (!visible) return null;

  return (
    <View style={styles.portal} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        style={styles.backdrop}
        onPress={() => requestClose("backdrop")}
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
            scrollEnabled={scrollEnabled}
            scrollEventThrottle={16}
            onScrollBeginDrag={() => {
              dismissAllTooltips();
            }}
            onScroll={(e) => {
              const nextY = e.nativeEvent.contentOffset?.y ?? 0;
              scrollYRef.current = nextY > 0 ? nextY : 0;
            }}
            // Permite scroll bouncing no topo para melhor UX
            bounces={bounces}
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
