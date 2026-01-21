import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

import { colors } from "@/src/theme";

type Props = ViewProps & {
  variant?: "dark" | "light";
};

export function Separator({ style, variant = "dark", ...rest }: Props) {
  return (
    <View
      style={[
        styles.sep,
        variant === "light" ? styles.sepLight : styles.sepDark,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  sep: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.9,
  },
  sepDark: {
    backgroundColor: colors.surfaceCardBorder,
  },
  sepLight: {
    backgroundColor: colors.surfaceCardBorderLight,
  },
});
