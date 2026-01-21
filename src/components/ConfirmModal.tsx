import React, { useCallback } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/src/theme";

type Props = {
  visible: boolean;
  variant: "light" | "dark";

  title: string;
  body?: string;

  confirmLabel?: string;
  cancelLabel?: string;

  tone?: "danger" | "primary";
  busy?: boolean;
  disableConfirm?: boolean;

  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmModal({
  visible,
  variant,
  title,
  body,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "primary",
  busy = false,
  disableConfirm = false,
  onCancel,
  onConfirm,
}: Props) {
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

  const cardBg = variant === "light" ? colors.paper100 : colors.forest900;

  const confirmBg =
    tone === "danger" ? colors.danger : (colors.brass600 as string);

  const confirmText = colors.textPrimaryOnDark;

  const handleConfirm = useCallback(() => {
    if (busy) return;
    if (disableConfirm) return;
    onConfirm();
  }, [busy, disableConfirm, onConfirm]);

  const handleCancel = useCallback(() => {
    if (busy) return;
    onCancel();
  }, [busy, onCancel]);

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={handleCancel}
    >
      <Pressable style={styles.backdrop} onPress={handleCancel}>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: cardBg, borderColor: dividerColor },
          ]}
          onPress={(e) => {
            (e as any)?.stopPropagation?.();
          }}
        >
          <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>

          {body ? (
            <Text style={[styles.body, { color: textSecondary }]}>{body}</Text>
          ) : null}

          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              onPress={handleCancel}
              disabled={busy}
              style={({ pressed }) => [
                styles.btn,
                styles.btnSecondary,
                { borderColor: dividerColor },
                pressed ? styles.btnPressed : null,
                busy ? styles.btnDisabled : null,
              ]}
            >
              <Text style={[styles.btnText, { color: textPrimary }]}>
                {cancelLabel}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={handleConfirm}
              disabled={busy || disableConfirm}
              style={({ pressed }) => [
                styles.btn,
                { backgroundColor: confirmBg },
                pressed ? styles.btnPressed : null,
                busy || disableConfirm ? styles.btnDisabled : null,
              ]}
            >
              <Text style={[styles.btnText, { color: confirmText }]}>
                {busy ? "Aguarde…" : confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
  },
  body: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.92,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  btnSecondary: {
    borderWidth: 2,
  },
  btnText: {
    fontSize: 13,
    fontWeight: "900",
  },
  btnPressed: {
    opacity: 0.82,
  },
  btnDisabled: {
    opacity: 0.55,
  },
});
