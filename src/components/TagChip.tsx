import React from "react";
import { StyleSheet, Text, View, type ViewProps } from "react-native";

import { colors, spacing } from "@/src/theme";

export const TAG_CHIP_HEIGHT = 26;
export const TAG_CHIP_RADIUS = 6;

type Props = ViewProps & {
  label: string;
  variant?: "dark" | "light";
  kind?: "ponto" | "custom";
  appearance?: "primary" | "secondary";
  tone?: "default" | "medium";
};

export function TagChip({
  label,
  style,
  variant = "dark",
  kind = "ponto",
  appearance,
  tone = "default",
  ...rest
}: Props) {
  const isLight = variant === "light";

  const resolvedAppearance: "primary" | "secondary" =
    appearance ?? (kind === "custom" ? "secondary" : "primary");

  const baseBg = isLight ? colors.paper100 : colors.earth700;
  const baseBorder = isLight ? colors.inputBorderLight : colors.inputBorderDark;
  const baseText = isLight
    ? colors.textPrimaryOnLight
    : colors.textPrimaryOnDark;

  const accent = isLight ? colors.brass500 : colors.brass600;
  const medium = colors.brass600;

  const isMedium = tone === "medium";

  const bg =
    resolvedAppearance === "primary"
      ? isMedium
        ? medium
        : baseBg
      : "transparent";

  const borderColor =
    resolvedAppearance === "primary"
      ? isMedium
        ? medium
        : baseBorder
      : isMedium
      ? medium
      : accent;

  const textColor =
    resolvedAppearance === "primary"
      ? isMedium
        ? colors.paper50
        : baseText
      : isMedium
      ? medium
      : accent;

  if (__DEV__) {
    const debugEnabled = !!(globalThis as any)
      .__SARAVAFY_DEBUG_TAGCHIP_COLORS__;
    if (debugEnabled) {
      const debugKey = `${variant}:${resolvedAppearance}:${tone}`;
      const store = ((
        globalThis as any
      ).__SARAVAFY_DEBUG_TAGCHIP_COLORS_SEEN__ ??= new Set<string>());
      if (!store.has(debugKey)) {
        store.add(debugKey);
        console.info("[TagChip.colors]", {
          debugKey,
          variant,
          kind,
          appearance: resolvedAppearance,
          tone,
          bg,
          borderColor,
          textColor,
        });
      }
    }
  }

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth:
            resolvedAppearance === "primary" ? StyleSheet.hairlineWidth : 2,
        },
        style,
      ]}
      {...rest}
    >
      <Text
        style={[
          styles.textBase,
          {
            color: textColor,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: TAG_CHIP_HEIGHT,
    borderRadius: TAG_CHIP_RADIUS,
    paddingHorizontal: spacing.sm,
    paddingVertical: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  textBase: {
    fontSize: 12,
    fontWeight: "700",
  },
});
