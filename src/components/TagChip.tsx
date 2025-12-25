import React from "react";
import { StyleSheet, Text, View, type ViewProps } from "react-native";

import { colors, radii } from "@/src/theme";

const noise = require("@/assets/textures/noise_128.png");

type Props = ViewProps & {
  label: string;
  variant?: "dark" | "light";
};

export function TagChip({ label, style, variant = "dark", ...rest }: Props) {
  // ...existing code...
  return (
    <View
      style={[
        styles.wrap,
        variant === "light" ? styles.wrapLight : styles.wrapDarkTest,
        style,
      ]}
      {...rest}
    >
      <View style={styles.content} collapsable={false}>
        <Text
          style={[
            styles.textBase,
            {
              color:
                variant === "light"
                  ? colors.textPrimaryOnLight
                  : colors.paper100,
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
  noiseImage: {
    opacity: 0.1,
  },
});
