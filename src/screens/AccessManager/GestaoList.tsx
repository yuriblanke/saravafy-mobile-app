import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/src/theme";

import { InviteRow, type AccessRole } from "./InviteRow";

type GestaoPerson = {
  userId: string;
  displayName: string | null;
  email: string;
  role: Exclude<AccessRole, "member">;
};

type Props = {
  variant: "light" | "dark";
  items: GestaoPerson[];
  isLoading: boolean;
  error: string | null;
  canManage: boolean;
  canChangeRole: boolean;
  isLastAdmin: (userId: string) => boolean;
  isBusy: (userId: string) => boolean;
  onOpenMenu: (person: GestaoPerson) => void;
  onPressLastAdminMenuDisabled: () => void;
};

export function GestaoList({
  variant,
  items,
  isLoading,
  error,
  canManage,
  canChangeRole,
  isLastAdmin,
  isBusy,
  onOpenMenu,
  onPressLastAdminMenuDisabled,
}: Props) {
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  const borderColor =
    variant === "light" ? colors.surfaceCardBorderLight : colors.surfaceCardBorder;

  if (isLoading) {
    return (
      <Text style={[styles.inlineText, { color: textSecondary }]}>
        Carregando…
      </Text>
    );
  }

  if (error) {
    return (
      <Text style={[styles.inlineText, { color: textSecondary }]}>
        Não foi possível carregar a gestão.
      </Text>
    );
  }

  if (items.length === 0) {
    return (
      <Text style={[styles.inlineText, { color: textSecondary }]}>
        Nenhuma pessoa na gestão.
      </Text>
    );
  }

  return (
    <View
      style={[
        styles.list,
        { borderTopColor: borderColor, borderBottomColor: borderColor },
      ]}
    >
      {items.map((p, index) => {
        const busy = isBusy(p.userId);
        const lastAdmin = p.role === "admin" && isLastAdmin(p.userId);
        const isLast = index === items.length - 1;

        const menuDisabled = !canManage || busy || lastAdmin;

        return (
          <InviteRow
            key={p.userId}
            variant={variant}
            email={p.displayName || p.email}
            role={p.role}
            isBusy={busy}
            isLast={isLast}
            onOpenMenu={() => onOpenMenu(p)}
            menuDisabled={menuDisabled}
            onDisabledMenuPress={
              lastAdmin
                ? () => {
                    onPressLastAdminMenuDisabled();
                  }
                : undefined
            }
            menuAccessibilityLabel={
              lastAdmin && canChangeRole ? "Ações (último admin)" : "Ações"
            }
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inlineText: {
    paddingHorizontal: spacing.lg,
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.9,
  },
});
