import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { colors, spacing } from "@/src/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  variant: "dark" | "light";
  children: React.ReactNode;
  enableSwipeToClose?: boolean;
};

export function BottomSheet({
  visible,
  onClose,
  variant,
  children,
  enableSwipeToClose = true,
}: Props) {
  const translateY = useRef(new Animated.Value(0)).current;
  const [sheetHeight, setSheetHeight] = useState(0);

  useEffect(() => {
    if (!visible) {
      translateY.setValue(0);
    }
  }, [translateY, visible]);

  const closeBySwipe = () => {
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
  };

  const panResponder = useMemo(() => {
    if (!enableSwipeToClose) return null;

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => {
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

  if (!visible) return null;

  return (
    <View style={styles.portal} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.sheet,
            variant === "light" ? styles.sheetLight : styles.sheetDark,
            { transform: [{ translateY }] },
          ]}
          onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
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

          <Pressable onPress={() => undefined}>{children}</Pressable>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  portal: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlayBackdrop,
    justifyContent: "flex-end",
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
});
