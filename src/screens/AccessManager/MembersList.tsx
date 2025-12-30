import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/src/theme";

import { InviteRow } from "./InviteRow";

type MemberPerson = {
  userId: string;
  displayName: string | null;
  email: string;
};

type Props = {
  variant: "light" | "dark";
  items: MemberPerson[];
  isLoading: boolean;
  error: string | null;
  canManage: boolean;
  isBusy: (userId: string) => boolean;
  onOpenMenu: (person: MemberPerson) => void;
};

export function MembersList({
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
        Não foi possível carregar membros.
      </Text>
    );
  }

  if (items.length === 0) {
    return (
      <Text style={[styles.inlineText, { color: textSecondary }]}>
        Nenhum membro.
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
        const isLast = index === items.length - 1;

        return (
          <InviteRow
            key={p.userId}
            variant={variant}
            email={p.displayName || p.email}
            role="member"
            isBusy={busy}
            isLast={isLast}
            onOpenMenu={() => onOpenMenu(p)}
            menuDisabled={!canManage || busy}
            menuAccessibilityLabel="Ações do membro"
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
