import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { TagChip } from "@/src/components/TagChip";
import { colors, spacing } from "@/src/theme";

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
  status: InviteStatus;
  showActions: boolean;
  isBusy: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export function InviteRow({
  variant,
  email,
  role,
  status,
  showActions,
  isBusy,
  onAccept,
  onDecline,
}: Props) {
  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textMuted =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;

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
          <TagChip label={statusLabel(status)} variant={variant} />
        </View>
      </View>

      {showActions ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onAccept}
            disabled={isBusy}
            hitSlop={10}
            style={({ pressed }) => [
              styles.actionBtn,
              pressed ? styles.actionPressed : null,
              isBusy ? styles.actionDisabled : null,
            ]}
          >
            <Text
              style={[styles.actionText, { color: colors.success }]}
              numberOfLines={1}
            >
              Aceitar
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onDecline}
            disabled={isBusy}
            hitSlop={10}
            style={({ pressed }) => [
              styles.actionBtn,
              pressed ? styles.actionPressed : null,
              isBusy ? styles.actionDisabled : null,
            ]}
          >
            <Text
              style={[styles.actionText, { color: colors.danger }]}
              numberOfLines={1}
            >
              Recusar
            </Text>
          </Pressable>
        </View>
      ) : (
        <Text style={[styles.noActions, { color: textMuted }]} />
      )}
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
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "900",
  },
  noActions: {
    width: 1,
  },
});
