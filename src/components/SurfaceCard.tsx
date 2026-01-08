import React from "react";
import {
  StyleSheet,
  View,
  type ViewProps,
} from "react-native";

import { colors, radii, shadows, spacing } from "@/src/theme";

type Props = ViewProps & {
  children: React.ReactNode;
  variant?: "dark" | "light";
};

export function SurfaceCard({
  style,
  children,
  variant = "dark",
  ...rest
}: Props) {
  return (
    <View
      style={[
        styles.wrap,
        variant === "light" ? styles.wrapLight : styles.wrapDark,
        style,
      ]}
      {...rest}
    >
      {/* Bevel / relevo interno */}
      <View
        pointerEvents="none"
        style={variant === "light" ? styles.bevelTopLight : styles.bevelTop}
      />
      <View
        pointerEvents="none"
        style={
          variant === "light" ? styles.bevelBottomLight : styles.bevelBottom
        }
      />

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,

    ...shadows.md,
  },
  wrapDark: {
    backgroundColor: colors.surfaceCardBg,
    borderColor: colors.surfaceCardBorder,
  },
  wrapLight: {
    backgroundColor: colors.surfaceCardBgLight,
    borderColor: colors.surfaceCardBorderLight,
  },
  content: {
    padding: spacing.lg,
  },
  bevelTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: colors.bevelTop,
    opacity: 1,
  },
  bevelTopLight: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: colors.bevelTopLight,
    opacity: 1,
  },
  bevelBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: colors.bevelBottom,
    opacity: 1,
  },
  bevelBottomLight: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: colors.bevelBottomLight,
    opacity: 1,
  },
});
