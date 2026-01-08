import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/src/components/BottomSheet";
import { colors, spacing } from "@/src/theme";

type Props = {
  visible: boolean;
  variant: "light" | "dark";
  onAcknowledge: () => void;
};

export function MediumTagRemoveHintBottomSheet({
  visible,
  variant,
  onAcknowledge,
}: Props) {
  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  return (
    <BottomSheet
      visible={visible}
      variant={variant}
      // Require explicit acknowledgement.
      closeOnBackdropPress={false}
      enableSwipeToClose={false}
      onClose={() => {
        // Intentionally noop: only close via "Entendi".
      }}
      snapPoints={[360]}
      scrollEnabled={false}
      bounces={false}
    >
      <View style={styles.wrap}>
        <Text style={[styles.title, { color: textPrimary }]}>
          Remover tag de médium
        </Text>

        <Text style={[styles.body, { color: textSecondary }]}>
          Para excluir uma tag de médium, pressione e segure a tag.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Entendi"
          onPress={onAcknowledge}
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && styles.primaryBtnPressed,
          ]}
        >
          <Text style={styles.primaryBtnText}>Entendi</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  primaryBtn: {
    minHeight: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brass600,
  },
  primaryBtnPressed: {
    opacity: 0.9,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.textPrimaryOnDark,
  },
});
