import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { TagChip } from "@/src/components/TagChip";
import { colors, spacing } from "@/src/theme";

import { InviteRow, type AccessRole } from "./InviteRow";

type GestaoPerson = {
  userId: string;
  label: string;
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
    <View style={styles.list}>
      {items.map((p) => {
        const busy = isBusy(p.userId);
        const lastAdmin = p.role === "admin" && isLastAdmin(p.userId);

        return (
          <View key={p.userId} style={styles.rowWrap}>
            <InviteRow
              variant={variant}
              email={p.label}
              role={p.role}
              isBusy={busy}
              onOpenMenu={() => onOpenMenu(p)}
              menuDisabled={!canManage || busy}
              menuAccessibilityLabel={
                lastAdmin && canChangeRole ? "Ações (último admin)" : "Ações"
              }
            />

            {lastAdmin ? (
              <View style={styles.hintRow}>
                <TagChip label="Último admin" variant={variant} />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  rowWrap: {
    gap: 6,
  },
  hintRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  inlineText: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.9,
  },
});
