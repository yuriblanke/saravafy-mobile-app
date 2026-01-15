import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { PreferencesSection } from "@/src/components/preferences";
import { colors, spacing } from "@/src/theme";

import { ConfirmModal } from "./ConfirmModal";

type Props = {
  variant: "light" | "dark";
};

export function LogoutSection({ variant }: Props) {
  const { signOut } = useAuth();
  const { showToast } = useToast();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const dividerColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;

  const onConfirmLogout = useCallback(async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await signOut();
      setIsConfirmOpen(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      showToast(message || "Não foi possível sair agora.");
    } finally {
      setIsBusy(false);
    }
  }, [isBusy, showToast, signOut]);

  return (
    <PreferencesSection title="Conta" variant={variant}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sair"
        onPress={() => setIsConfirmOpen(true)}
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
        <View style={styles.logoutRow}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Sair</Text>
        </View>
      </Pressable>

      <ConfirmModal
        visible={isConfirmOpen}
        variant={variant}
        tone="danger"
        title="Sair da conta?"
        body="Você precisará entrar novamente para acessar seus terreiros e preferências."
        confirmLabel={isBusy ? "Saindo…" : "Sair"}
        cancelLabel="Cancelar"
        busy={isBusy}
        onCancel={() => {
          if (isBusy) return;
          setIsConfirmOpen(false);
        }}
        onConfirm={() => {
          void onConfirmLogout();
        }}
      />
    </PreferencesSection>
  );
}

const styles = StyleSheet.create({
  logoutBtn: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  logoutBtnPressed: {
    opacity: 0.92,
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.danger,
  },
});
