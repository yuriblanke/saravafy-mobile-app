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
  onDisabledMenuPress?: () => void;
  menuAccessibilityLabel?: string;
  isLast?: boolean;
};

export function InviteRow({
  variant,
  email,
  role,
  isBusy,
  status,
  onOpenMenu,
  menuDisabled,
  onDisabledMenuPress,
  menuAccessibilityLabel,
  isLast,
}: Props) {
  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textMuted =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;

  const canOpenMenu =
    typeof onOpenMenu === "function" || typeof onDisabledMenuPress === "function";
  const isMenuDisabled = !!menuDisabled || isBusy;
  const pressDisabled = isBusy || (menuDisabled && !onDisabledMenuPress);

  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor:
            variant === "light"
              ? colors.surfaceCardBorderLight
              : colors.surfaceCardBorder,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Text style={[styles.email, { color: textPrimary }]} numberOfLines={1}>
        {email}
      </Text>

      <View style={styles.meta}>
        <TagChip label={roleLabel(role)} variant={variant} />
        {status ? <TagChip label={statusLabel(status)} variant={variant} /> : null}

        {canOpenMenu ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={menuAccessibilityLabel || "Mais ações"}
            accessibilityState={{ disabled: isMenuDisabled }}
            onPress={() => {
              if (isMenuDisabled) {
                onDisabledMenuPress?.();
                return;
              }
              onOpenMenu?.();
            }}
            disabled={pressDisabled}
            hitSlop={10}
            style={({ pressed }) => [
              styles.menuBtn,
              pressed ? styles.actionPressed : null,
              isMenuDisabled ? styles.actionDisabled : null,
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
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  email: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "800",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
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
