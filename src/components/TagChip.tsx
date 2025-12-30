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

  const customColor =
    tone === "medium"
      ? colors.brass600
      : isLight
      ? colors.textPrimaryOnLight
      : colors.brass600;
  const pontoTextColor = isLight ? colors.textPrimaryOnLight : colors.paper100;

  return (
    <View
      style={[
        styles.wrap,
        kind === "custom"
          ? [styles.wrapCustom, { borderColor: customColor }]
          : variant === "light"
          ? styles.wrapLight
          : styles.wrapDarkTest,
        style,
      ]}
      {...rest}
    >
      <View style={styles.content} collapsable={false}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapDarkTest: {
    backgroundColor: colors.earth700,
  },
  wrap: {
    position: "relative",
    overflow: "hidden",
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  wrapCustom: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    elevation: 0,
  },
  content: {
    position: "relative",
    zIndex: 1,
    elevation: 1,
  },
  wrapDark: {
    backgroundColor: colors.earth700,
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
