import React from "react";
import { StyleSheet, Text, View, type ViewProps } from "react-native";

import { colors, radii, spacing } from "@/src/theme";

type BadgeAppearance = "primary" | "secondary";

type Props = ViewProps & {
  label: string;
  variant: "light" | "dark";
  appearance?: BadgeAppearance;
};

export function Badge({
  label,
  variant,
  appearance = "primary",
  style,
  ...rest
}: Props) {
  const isLight = variant === "light";
  const accent = isLight ? colors.brass500 : colors.brass600;

  const bg = appearance === "primary" ? accent : "transparent";
  const border = accent;
  const text = appearance === "primary" ? colors.paper50 : accent;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: appearance === "primary" ? StyleSheet.hairlineWidth : 2,
        },
        style,
      ]}
      {...rest}
    >
      <Text style={[styles.text, { color: text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  text: {
    fontSize: 12,
    fontWeight: "900",
  },
});
