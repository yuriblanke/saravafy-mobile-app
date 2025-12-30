import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/src/theme";

import { InviteRow, type AccessRole } from "./InviteRow";

type PendingInvite = {
  id: string;
  email: string;
  role: AccessRole;
};

type Props = {
  variant: "light" | "dark";
  items: PendingInvite[];
  isLoading: boolean;
  error: string | null;
  canManage: boolean;
  isBusy: (inviteId: string) => boolean;
  onOpenMenu: (invite: PendingInvite) => void;
};

export function PendingInvitesList({
  variant,
  items,
  isLoading,
  error,
  canManage,
  isBusy,
  onOpenMenu,
}: Props) {
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  const borderColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;

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
        Não foi possível carregar convites.
      </Text>
    );
  }

  if (items.length === 0) {
    return (
      <Text style={[styles.inlineText, { color: textSecondary }]}>
        Nenhum convite pendente.
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
      {items.map((inv, index) => {
        const busy = isBusy(inv.id);
        const isLast = index === items.length - 1;

        return (
          <InviteRow
            key={inv.id}
            variant={variant}
            email={inv.email}
            role={inv.role}
            isBusy={busy}
            isLast={isLast}
            onOpenMenu={() => onOpenMenu(inv)}
            menuDisabled={!canManage || busy}
            menuAccessibilityLabel="Ações do convite"
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
