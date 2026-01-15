import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/src/components/Badge";
import {
  PreferencesPageItem,
  PreferencesSection,
} from "@/src/components/preferences";
import type { MyTerreiroWithRole } from "@/src/queries/me";
import { usePreferencesTerreirosQuery } from "@/src/queries/me";
import { usePreferencesTerreirosRealtime } from "@/src/queries/preferencesTerreirosRealtime";
import { colors, spacing } from "@/src/theme";

import { getInitials } from "./utils";

type Props = {
  variant: "light" | "dark";
  onOpenActions: (terreiro: MyTerreiroWithRole) => void;
};

export function TerreirosSection({ variant, onOpenActions }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;
  const textMuted =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;

  const dividerColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;

  usePreferencesTerreirosRealtime(userId);

  const q = usePreferencesTerreirosQuery(userId);
  const myTerreiros = useMemo<MyTerreiroWithRole[]>(
    () => (Array.isArray(q.data) ? q.data : []),
    [q.data]
  );

  return (
    <PreferencesSection title="Meus terreiros" variant={variant}>
      <View style={styles.list}>
        {!userId ? (
          <Text style={[styles.helper, { color: textSecondary }]}>
            Faça login para ver seus terreiros.
          </Text>
        ) : q.isError ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void q.refetch();
            }}
            style={({ pressed }) => [
              styles.retryRow,
              { borderColor: dividerColor },
              pressed ? styles.retryRowPressed : null,
            ]}
          >
            <Text style={[styles.retryText, { color: textPrimary }]}>
              Tentar novamente
            </Text>
          </Pressable>
        ) : q.isFetching && myTerreiros.length === 0 ? (
          <Text style={[styles.helper, { color: textSecondary }]}>
            Carregando terreiros…
          </Text>
        ) : myTerreiros.length === 0 ? (
          <Text style={[styles.helper, { color: textSecondary }]}>
            Você ainda não participa de nenhum terreiro.
          </Text>
        ) : (
          myTerreiros.map((t) => (
            <PreferencesPageItem
              key={t.id}
              variant={variant}
              title={t.title}
              avatarUrl={t.cover_image_url ?? undefined}
              initials={getInitials(t.title)}
              subtitle={
                <View style={{ marginTop: 4 }}>
                  <Badge
                    label={
                      t.role === "admin"
                        ? "Admin"
                        : t.role === "editor"
                        ? "Editor"
                        : "Membro"
                    }
                    variant={variant}
                    appearance={t.role === "admin" ? "primary" : "secondary"}
                    style={{ alignSelf: "flex-start" }}
                  />
                </View>
              }
              showEditButton={false}
              rightAccessory={
                t.role === "admin" ||
                t.role === "editor" ||
                t.role === "member" ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Mais ações"
                    hitSlop={12}
                    onPress={(e) => {
                      (e as any)?.stopPropagation?.();
                      onOpenActions(t);
                    }}
                    style={({ pressed }) => [
                      styles.menuBtn,
                      pressed ? styles.menuBtnPressed : null,
                    ]}
                  >
                    <Ionicons
                      name="ellipsis-vertical"
                      size={18}
                      color={textMuted}
                    />
                  </Pressable>
                ) : null
              }
              onPress={() => {
                router.push({
                  pathname: "/terreiro" as any,
                  params: {
                    terreiroId: t.id,
                    terreiroTitle: t.title,
                    from: "/preferences",
                  },
                });
              }}
            />
          ))
        )}
      </View>
    </PreferencesSection>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  helper: {
    fontSize: 13,
    fontWeight: "600",
  },
  retryRow: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  retryRowPressed: {
    opacity: 0.9,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "800",
  },
  menuBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBtnPressed: {
    opacity: 0.75,
  },
});
