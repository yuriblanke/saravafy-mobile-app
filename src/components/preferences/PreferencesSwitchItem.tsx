import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { colors, spacing } from "@/src/theme";

type Props = {
  variant: "light" | "dark";
  title: string;
  description: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
};

export function PreferencesSwitchItem({
  variant,
  title,
  description,
  value,
  onValueChange,
}: Props) {
  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  return (
    <View style={styles.row}>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>
        <Text style={[styles.desc, { color: textSecondary }]}>
          {description}
        </Text>
      </View>

      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: colors.surfaceCardBorder,
          true: colors.brass600,
        }}
        thumbColor={colors.paper50}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 8,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
  },
  desc: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.9,
  },
});
