import React, { useCallback } from "react";
import { Alert, Pressable, StyleSheet, Text } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { PreferencesSection } from "@/src/components/preferences";
import { colors, spacing } from "@/src/theme";

type Props = {
  variant: "light" | "dark";
};

export function LogoutSection({ variant }: Props) {
  const { signOut } = useAuth();
  const { showToast } = useToast();

  const dividerColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;

  const onLogout = useCallback(() => {
    Alert.alert("Sair", "Deseja sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: () => {
          signOut().catch((e) => {
            const message = e instanceof Error ? e.message : String(e);
            showToast(message || "Não foi possível sair agora.");
          });
        },
      },
    ]);
  }, [showToast, signOut]);

  return (
    <PreferencesSection title="Conta" variant={variant}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sair"
        onPress={onLogout}
        style={({ pressed }) => [
          styles.logoutBtn,
          {
            borderColor: dividerColor,
            backgroundColor:
              variant === "light" ? colors.paper100 : colors.forest800,
          },
          pressed ? styles.logoutBtnPressed : null,
        ]}
      >
        <Text style={styles.logoutText}>Sair</Text>
      </Pressable>
    </PreferencesSection>
  );
}

const styles = StyleSheet.create({
  logoutBtn: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  logoutBtnPressed: {
    opacity: 0.92,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.danger,
  },
});
