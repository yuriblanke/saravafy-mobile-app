import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { usePreferences } from "@/contexts/PreferencesContext";
import {
  PreferencesSection,
  PreferencesSwitchItem,
} from "@/src/components/preferences";
import { colors, spacing } from "@/src/theme";

type Props = {
  variant: "light" | "dark";
  onOpenExplainer: () => void;
};

export function CurimbaSection({ variant, onOpenExplainer }: Props) {
  const { curimbaEnabled, setCurimbaEnabled } = usePreferences();

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  const dividerColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;

  return (
    <PreferencesSection title="Curimba" variant={variant}>
      <PreferencesSwitchItem
        variant={variant}
        title="Modo Curimba"
        description="Mostra apenas as letras e mantém a tela ligada"
        value={curimbaEnabled}
        onValueChange={(next) => setCurimbaEnabled(next)}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="O que é Modo Curimba"
        onPress={onOpenExplainer}
        style={({ pressed }) => [
          styles.infoRow,
          {
            borderColor: dividerColor,
            backgroundColor:
              variant === "light" ? colors.paper100 : colors.forest800,
          },
          pressed ? styles.infoRowPressed : null,
        ]}
      >
        <View style={styles.infoLeft}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={textSecondary}
          />
          <Text style={[styles.infoText, { color: textPrimary }]}>
            Entenda o modo
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={textSecondary} />
      </Pressable>
    </PreferencesSection>
  );
}

const styles = StyleSheet.create({
  infoRow: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoRowPressed: {
    opacity: 0.92,
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  infoText: {
    fontSize: 13,
    fontWeight: "800",
  },
});
