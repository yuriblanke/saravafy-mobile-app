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

import { colors, spacing } from "@/src/theme";

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
  const translateY = useRef(new Animated.Value(0)).current;
  const [sheetHeight, setSheetHeight] = useState(0);
  const scrollYRef = useRef(0);

  useEffect(() => {
    if (!visible) {
      translateY.setValue(0);
      scrollYRef.current = 0;
    }
  }, [translateY, visible]);

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

  const panResponder = useMemo(() => {
    if (!enableSwipeToClose) return null;

    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_evt, gesture) => {
        if (scrollYRef.current > 0) return false;
        return gesture.dy > 6 && Math.abs(gesture.dx) < 12;
      },
      onMoveShouldSetPanResponder: (_evt, gesture) => {
        if (scrollYRef.current > 0) return false;
        return gesture.dy > 6 && Math.abs(gesture.dx) < 12;
      },
      onPanResponderMove: (_evt, gesture) => {
        if (gesture.dy <= 0) return;
        translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_evt, gesture) => {
        const shouldClose = gesture.dy > 90 || gesture.vy > 0.75;
        if (shouldClose) {
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
  }, [closeBySwipe, enableSwipeToClose, translateY]);

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
        {...(panResponder ? panResponder.panHandlers : null)}
      >
        <View style={styles.handleWrap} pointerEvents="none">
          <View
            style={[
              styles.handle,
              variant === "light" ? styles.handleLight : styles.handleDark,
            ]}
          />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const nextY = e.nativeEvent.contentOffset?.y ?? 0;
            scrollYRef.current = nextY > 0 ? nextY : 0;
          }}
        >
          <Pressable onPress={() => undefined}>{children}</Pressable>
        </ScrollView>
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
