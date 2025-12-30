import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/src/theme";

import { InviteRow } from "./InviteRow";

type MemberPerson = {
  userId: string;
  label: string;
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
    <View style={styles.list}>
      {items.map((p) => {
        const busy = isBusy(p.userId);

        return (
          <InviteRow
            key={p.userId}
            variant={variant}
            email={p.label}
            role="member"
            isBusy={busy}
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
    gap: spacing.sm,
  },
  inlineText: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.9,
  },
});
