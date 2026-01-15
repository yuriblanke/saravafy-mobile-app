import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/src/components/BottomSheet";
import { Separator } from "@/src/components/Separator";
import type { MyTerreiroWithRole } from "@/src/queries/me";
import { colors, spacing } from "@/src/theme";

type Props = {
  variant: "light" | "dark";
  target: MyTerreiroWithRole | null;
  onClose: () => void;
};

export function TerreiroActionsSheet({ variant, target, onClose }: Props) {
  const router = useRouter();

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  const dangerColor = colors.danger;

  const canAdmin = target?.role === "admin";

  return (
    <BottomSheet
      visible={!!target}
      variant={variant}
      onClose={onClose}
      snapPoints={[300]}
    >
      <View style={styles.wrap}>
        <Text style={[styles.title, { color: textPrimary }]}>
          Ações do terreiro
        </Text>

        {target?.title ? (
          <Text
            style={[styles.subtitle, { color: textSecondary }]}
            numberOfLines={2}
          >
            {target.title}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (!target) return;
              onClose();
              router.push({
                pathname: "/terreiro" as any,
                params: { terreiroId: target.id, terreiroTitle: target.title },
              });
            }}
            style={({ pressed }) => [
              styles.actionRow,
              pressed ? styles.actionPressed : null,
            ]}
          >
            <Ionicons name="open-outline" size={18} color={textPrimary} />
            <Text style={[styles.actionText, { color: textPrimary }]}>
              Abrir
            </Text>
          </Pressable>

          <Separator variant={variant} />

          {canAdmin ? (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (!target) return;
                  onClose();
                  router.push({
                    pathname: "/terreiro-members" as any,
                    params: { terreiroId: target.id },
                  });
                }}
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed ? styles.actionPressed : null,
                ]}
              >
                <Ionicons name="people-outline" size={18} color={textPrimary} />
                <Text style={[styles.actionText, { color: textPrimary }]}>
                  Gerenciar membros
                </Text>
              </Pressable>

              <Separator variant={variant} />

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (!target) return;
                  onClose();
                  router.push({
                    pathname: "/access-manager" as any,
                    params: {
                      terreiroId: target.id,
                      terreiroTitle: target.title,
                    },
                  });
                }}
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed ? styles.actionPressed : null,
                ]}
              >
                <Ionicons name="key-outline" size={18} color={textPrimary} />
                <Text style={[styles.actionText, { color: textPrimary }]}>
                  Gerenciar gestão
                </Text>
              </Pressable>

              <Separator variant={variant} />

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (!target) return;
                  onClose();
                  router.push({
                    pathname: "/terreiro-editor" as any,
                    params: { mode: "edit", terreiroId: target.id },
                  });
                }}
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed ? styles.actionPressed : null,
                ]}
              >
                <Ionicons name="pencil" size={18} color={textPrimary} />
                <Text style={[styles.actionText, { color: textPrimary }]}>
                  Editar detalhes
                </Text>
              </Pressable>

              <Separator variant={variant} />

              <View style={styles.noteRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={dangerColor}
                />
                <Text style={[styles.noteText, { color: dangerColor }]}>
                  Saída do papel (admin/editor) fica para depois
                </Text>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.9,
  },
  actions: {
    marginTop: spacing.sm,
  },
  actionRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 10,
  },
  actionPressed: {
    opacity: 0.8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "800",
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  noteText: {
    fontSize: 12,
    fontWeight: "800",
  },
});
