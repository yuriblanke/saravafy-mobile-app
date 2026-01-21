import React from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors, radii, spacing } from "@/src/theme";

export type SelectItem = { key: string; label: string; value: string };

export function SelectModal({
  title,
  visible,
  variant,
  items,
  emptyLabel,
  onClose,
  onSelect,
}: {
  title: string;
  visible: boolean;
  variant: "light" | "dark";
  items: SelectItem[];
  emptyLabel?: string;
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textMuted =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;
  const divider =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;
  const sheetBg =
    variant === "light" ? colors.surfaceCardBgLight : colors.surfaceCardBg;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View
          style={[
            styles.sheet,
            { backgroundColor: sheetBg, borderColor: divider },
          ]}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              hitSlop={10}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed ? styles.closeBtnPressed : null,
              ]}
            >
              <Text style={[styles.closeText, { color: textMuted }]}>×</Text>
            </Pressable>
          </View>

          <View style={[styles.divider, { backgroundColor: divider }]} />

          {items.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: textMuted }]}>
                {emptyLabel ?? "Nenhuma opção disponível."}
              </Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(i) => i.key}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    onSelect(item.value);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    pressed ? styles.rowPressed : null,
                  ]}
                >
                  <Text style={[styles.rowText, { color: textPrimary }]}>
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayBackdrop,
  },
  sheetWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  sheet: {
    width: "100%",
    maxHeight: "70%",
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnPressed: {
    opacity: 0.85,
  },
  closeText: {
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 22,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: "center",
  },
  rowPressed: {
    opacity: 0.92,
  },
  rowText: {
    fontSize: 14,
    fontWeight: "800",
  },
  emptyWrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.9,
    textAlign: "center",
  },
});
