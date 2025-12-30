import React from "react";
import { StyleSheet, Text, View, type ViewProps } from "react-native";

import { colors, radii } from "@/src/theme";

type Props = ViewProps & {
  label: string;
  variant?: "dark" | "light";
  kind?: "ponto" | "custom";
  tone?: "default" | "medium";
};

export function TagChip({
  label,
  style,
  variant = "dark",
  kind = "ponto",
  tone = "default",
  ...rest
}: Props) {
  const isLight = variant === "light";

  // Tokens explícitos e fáceis de entender:
  // - fundo da tag normal no dark mantém o marrom (earth700)
  // - texto da tag normal no dark usa um token de texto em fundo escuro
  const tagBg = isLight ? colors.paper100 : colors.earth700;
  const textOnTag = isLight ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;

  const customColor =
    tone === "medium"
      ? colors.brass600
      : isLight
      ? colors.textPrimaryOnLight
      : colors.brass600;
  const pontoTextColor = textOnTag;

  if (__DEV__) {
    const debugEnabled = !!(globalThis as any).__SARAVAFY_DEBUG_TAGCHIP_COLORS__;
    if (debugEnabled) {
      const debugKey = `${variant}:${kind}:${tone}`;
      const store = ((globalThis as any).__SARAVAFY_DEBUG_TAGCHIP_COLORS_SEEN__ ??=
        new Set<string>());
      if (!store.has(debugKey)) {
        store.add(debugKey);
        console.info("[TagChip.colors]", {
          debugKey,
          variant,
          kind,
          tone,
          tagBg,
          textOnTag,
          customColor,
          resolvedText: kind === "custom" ? customColor : pontoTextColor,
        });
      }
    }
  }

  return (
    <View
      style={[
        styles.wrap,
        kind === "custom"
          ? [styles.wrapCustom, { borderColor: customColor }]
          : variant === "light"
          ? styles.wrapLight
          : [styles.wrapDarkTest, { backgroundColor: tagBg }],
        style,
      ]}
      {...rest}
    >
      <Text
        style={[
          styles.textBase,
          {
            color: kind === "custom" ? customColor : pontoTextColor,
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
  wrapDarkTest: {
    backgroundColor: colors.earth700,
  },
  wrap: {
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  wrapCustom: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  wrapLight: {
    backgroundColor: colors.paper100,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.earth700,
  },
  textBase: {
    fontSize: 12,
    fontWeight: "700",
  },
});
