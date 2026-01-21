import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/src/components/BottomSheet";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  variant: "light" | "dark";
  dontShowAgain: boolean;
  onChangeDontShowAgain: (next: boolean) => void;
  onClose: () => void;
  context?: "player" | "preferences";
};

export function CurimbaExplainerBottomSheet({
  visible,
  variant,
  dontShowAgain,
  onChangeDontShowAgain,
  onClose,
  context = "player",
}: Props) {
  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  const borderColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;

  return (
    <BottomSheet
      visible={visible}
      variant={variant}
      onClose={onClose}
      snapPoints={[420]}
    >
      <View style={styles.wrap}>
        <Text style={[styles.title, { color: textPrimary }]}>Modo Curimba</Text>

        <Text style={[styles.body, { color: textSecondary }]}>
          Esse modo é ideal para cantar durante a gira: o Saravafy mostra apenas
          as letras (sem carregar áudio) e mantém a tela ligada enquanto estiver
          ativo.
          {context === "preferences"
            ? " Você pode ligar e desligar este modo diretamente pela página aberta do ponto, no ícone de atabaque."
            : " Você também pode ligar e desligar esse modo em Preferências."}
        </Text>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: dontShowAgain }}
          accessibilityLabel="Não mostrar novamente"
          onPress={() => onChangeDontShowAgain(!dontShowAgain)}
          style={({ pressed }) => [
            styles.checkboxRow,
            pressed && styles.pressed,
          ]}
        >
          <View
            style={[
              styles.checkboxBox,
              { borderColor },
              dontShowAgain ? { backgroundColor: colors.brass600 } : null,
            ]}
          >
            {dontShowAgain ? (
              <Ionicons
                name="checkmark"
                size={14}
                color={colors.textPrimaryOnDark}
              />
            ) : null}
          </View>
          <Text style={[styles.checkboxText, { color: textPrimary }]}>
            Não mostrar novamente
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Entendi"
          onPress={onClose}
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
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 8,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxText: {
    fontSize: 13,
    fontWeight: "800",
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
  pressed: {
    opacity: 0.85,
  },
});
