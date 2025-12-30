import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SurfaceCard } from "@/src/components/SurfaceCard";
import { colors, spacing } from "@/src/theme";

type Props = {
  variant: "light" | "dark";
  title: string;
  actionLabel?: string;
  onPressAction?: () => void;
  children: React.ReactNode;
};

export function AccessSection({
  variant,
  title,
  actionLabel,
  onPressAction,
  children,
}: Props) {
  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;

  const hasAction =
    typeof actionLabel === "string" &&
    actionLabel.trim().length > 0 &&
    typeof onPressAction === "function";

  return (
    <SurfaceCard variant={variant} style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>

        {hasAction ? (
          <Pressable
            accessibilityRole="button"
            onPress={onPressAction}
            hitSlop={10}
            style={({ pressed }) => [pressed ? styles.actionPressed : null]}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.body}>{children}</View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
  },
  headerRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    flex: 1,
  },
  actionText: {
    color: colors.brass600,
    fontSize: 13,
    fontWeight: "900",
  },
  actionPressed: {
    opacity: 0.7,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
});
