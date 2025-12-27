import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/src/theme";

type Props = {
  title: string;
  variant: "light" | "dark";
  children?: React.ReactNode;
};

export function PreferencesSection({ title, variant, children }: Props) {
  const titleColor =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
      {children ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  title: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  content: {
    gap: 0,
  },
});
