import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { TagChip } from "@/src/components/TagChip";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";

export type AccessRole = "admin" | "editor" | "member";
export type InviteStatus = "pending" | "accepted" | "rejected" | string;

function roleLabel(role: AccessRole) {
  if (role === "admin") return "Admin";
  if (role === "editor") return "Editor";
  return "Membro";
}

function statusLabel(status: InviteStatus) {
  if (status === "pending") return "Pendente";
  if (status === "accepted") return "Aceito";
  if (status === "rejected") return "Recusado";
  return status || "";
}

type Props = {
  variant: "light" | "dark";
  email: string;
  role: AccessRole;
  status?: InviteStatus;
  isBusy: boolean;
  onOpenMenu?: () => void;
  menuDisabled?: boolean;
  menuAccessibilityLabel?: string;
};

export function InviteRow({
  variant,
  email,
  role,
  isBusy,
  status,
  onOpenMenu,
  menuDisabled,
  menuAccessibilityLabel,
}: Props) {
  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textMuted =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;

  const canOpenMenu = typeof onOpenMenu === "function";
  const disabled = !!menuDisabled || isBusy;

  return (
    <View
      style={[
        styles.row,
        {
          borderColor:
            variant === "light"
              ? colors.surfaceCardBorderLight
              : colors.surfaceCardBorder,
        },
      ]}
    >
      <View style={styles.left}>
        <Text style={[styles.email, { color: textPrimary }]} numberOfLines={1}>
          {email}
        </Text>

        <View style={styles.badgesRow}>
          <TagChip label={roleLabel(role)} variant={variant} />
          {status ? (
            <TagChip label={statusLabel(status)} variant={variant} />
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        {canOpenMenu ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={menuAccessibilityLabel || "Mais ações"}
            onPress={onOpenMenu}
            disabled={disabled}
            hitSlop={10}
            style={({ pressed }) => [
              styles.menuBtn,
              pressed ? styles.actionPressed : null,
              disabled ? styles.actionDisabled : null,
            ]}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={textMuted} />
          </Pressable>
        ) : (
          <Text style={[styles.noActions, { color: textMuted }]} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  left: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  email: {
    fontSize: 13,
    fontWeight: "800",
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  menuBtn: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  noActions: {
    width: 1,
  },
});
