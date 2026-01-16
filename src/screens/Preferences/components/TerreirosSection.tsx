import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { useInviteGates } from "@/contexts/InviteGatesContext";
import { useToast } from "@/contexts/ToastContext";
import { Badge } from "@/src/components/Badge";
import {
  PreferencesPageItem,
  PreferencesSection,
} from "@/src/components/preferences";
import {
  getTerreiroInviteBodyCopy,
  getTerreiroInviteRoleBadgeLabel,
  TERREIRO_INVITE_DECIDE_LATER_TOAST,
} from "@/src/domain/terreiroInviteCopy";
import { formatTerreiroMemberKindLabel, formatTerreiroRoleLabel } from "@/src/domain/terreiroRoles";
import { useTerreiroInviteDecision } from "@/src/hooks/useTerreiroInviteDecision";
import type { MyTerreiroWithRole } from "@/src/queries/me";
import { usePreferencesTerreirosListItems } from "@/src/queries/preferencesTerreirosList";
import { usePreferencesTerreirosRealtime } from "@/src/queries/preferencesTerreirosRealtime";
import { bumpTerreiroInviteSnooze } from "@/src/utils/terreiroInviteSnooze";
import { colors, spacing } from "@/src/theme";

import { getInitials } from "./utils";

type Props = {
  variant: "light" | "dark";
  onOpenActions: (terreiro: MyTerreiroWithRole) => void;
};

export function TerreirosSection({ variant, onOpenActions }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { bumpTerreiroSnoozeVersion } = useInviteGates();
  const userId = user?.id ?? null;
  const normalizedUserEmail =
    typeof (user as any)?.email === "string"
      ? String((user as any).email)
          .trim()
          .toLowerCase()
      : null;

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

  const { items, membershipsQuery: q } = usePreferencesTerreirosListItems({
    userId,
    normalizedEmail: normalizedUserEmail,
  });

  const myTerreiros = useMemo<MyTerreiroWithRole[]>(
    () => (Array.isArray(q.data) ? q.data : []),
    [q.data]
  );

  const inviteDecision = useTerreiroInviteDecision({
    userId,
    normalizedEmail: normalizedUserEmail,
  });

  const hasAnyTerreiro = myTerreiros.length > 0;

  const createTerreiroItem = userId ? (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        router.push({
          pathname: "/terreiro-editor" as any,
          params: { mode: "create" },
        });
      }}
      style={({ pressed }) =>
        hasAnyTerreiro
          ? [
              styles.newTerreiroLink,
              pressed ? styles.newTerreiroLinkPressed : null,
            ]
          : [
              styles.createTerreiroBtn,
              pressed ? styles.createTerreiroBtnPressed : null,
            ]
      }
    >
      {hasAnyTerreiro ? (
        <>
          <Ionicons name="add" size={18} color={colors.brass600} />
          <Text style={styles.newTerreiroText}>Novo Terreiro</Text>
        </>
      ) : (
        <Text style={styles.createTerreiroText}>Criar terreiro</Text>
      )}
    </Pressable>
  ) : null;

  return (
    <PreferencesSection title="Meus terreiros" variant={variant}>
      <View style={styles.list}>
        {createTerreiroItem}

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
        ) : items.length === 0 ? (
          <Text style={[styles.helper, { color: textSecondary }]}>
            Você ainda não participa de nenhum terreiro.
          </Text>
        ) : (
          items.map((item) => {
            if (item.type === "invite") {
              const invite = item.invite;
              const terreiroTitle =
                typeof invite.terreiro_title === "string" &&
                invite.terreiro_title.trim()
                  ? invite.terreiro_title.trim()
                  : "Terreiro";

              const roleLabel = getTerreiroInviteRoleBadgeLabel(invite.role);
              const bodyCopy = getTerreiroInviteBodyCopy(invite.role);

              const processing =
                inviteDecision.processingInviteId === invite.id;

              return (
                <View
                  key={`invite:${invite.id}`}
                  style={[styles.inviteCard, { borderColor: dividerColor }]}
                >
                  <Text style={[styles.inviteTitle, { color: textPrimary }]}>
                    {terreiroTitle}
                  </Text>

                  <View style={styles.inviteBadges}>
                    <Badge
                      label={roleLabel}
                      variant={variant}
                      appearance={
                        invite.role === "admin" ? "primary" : "secondary"
                      }
                      style={{ alignSelf: "flex-start" }}
                    />
                  </View>

                  {bodyCopy ? (
                    <Text
                      style={[styles.inviteBody, { color: textSecondary }]}
                    >
                      {bodyCopy}
                    </Text>
                  ) : null}

                  <View style={styles.inviteActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Aceitar convite"
                      disabled={processing}
                      onPress={() => void inviteDecision.accept(invite)}
                      style={({ pressed }) => [
                        styles.invitePrimaryBtn,
                        { borderColor: colors.brass600 },
                        pressed ? styles.inviteBtnPressed : null,
                        processing ? styles.inviteBtnDisabled : null,
                      ]}
                    >
                      <Text style={styles.invitePrimaryBtnText}>Aceitar</Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Recusar convite"
                      disabled={processing}
                      onPress={() => void inviteDecision.reject(invite)}
                      style={({ pressed }) => [
                        styles.inviteSecondaryBtn,
                        { borderColor: dividerColor },
                        pressed ? styles.inviteBtnPressed : null,
                        processing ? styles.inviteBtnDisabled : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.inviteSecondaryBtnText,
                          { color: textPrimary },
                        ]}
                      >
                        Recusar
                      </Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Decidir depois"
                      disabled={processing}
                      onPress={() => {
                        if (!normalizedUserEmail) return;
                        void bumpTerreiroInviteSnooze(
                          normalizedUserEmail,
                          invite.id
                        ).then(() => {
                          bumpTerreiroSnoozeVersion();
                        });
                        showToast(TERREIRO_INVITE_DECIDE_LATER_TOAST);
                      }}
                      style={({ pressed }) => [
                        styles.inviteSecondaryBtn,
                        { borderColor: dividerColor },
                        pressed ? styles.inviteBtnPressed : null,
                        processing ? styles.inviteBtnDisabled : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.inviteSecondaryBtnText,
                          { color: textPrimary },
                        ]}
                      >
                        Decidir depois
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            }

            const t = item.terreiro;
            const roleLabel = formatTerreiroRoleLabel(t.role);
            const kindLabel =
              t.role === "member"
                ? formatTerreiroMemberKindLabel(t.member_kind)
                : "";

            return (
              <PreferencesPageItem
                key={`membership:${t.id}`}
                variant={variant}
                title={t.title}
                avatarUrl={t.cover_image_url ?? undefined}
                initials={getInitials(t.title)}
                subtitle={
                  <View style={{ marginTop: 4, flexDirection: "row", gap: 8 }}>
                    <Badge
                      label={roleLabel}
                      variant={variant}
                      appearance={t.role === "admin" ? "primary" : "secondary"}
                      style={{ alignSelf: "flex-start" }}
                    />
                    {t.role === "member" && kindLabel ? (
                      <Badge
                        label={kindLabel}
                        variant={variant}
                        appearance="secondary"
                        style={{ alignSelf: "flex-start" }}
                      />
                    ) : null}
                  </View>
                }
                showEditButton={false}
                rightAccessory={
                  t.role === "admin" ||
                  t.role === "curimba" ||
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
            );
          })
        )}
      </View>
    </PreferencesSection>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  inviteCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  inviteTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  inviteBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  inviteBody: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  inviteActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 4,
  },
  invitePrimaryBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: colors.brass600,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  invitePrimaryBtnText: {
    color: colors.paper50,
    fontSize: 13,
    fontWeight: "900",
  },
  inviteSecondaryBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  inviteSecondaryBtnText: {
    fontSize: 13,
    fontWeight: "900",
  },
  inviteBtnPressed: {
    opacity: 0.82,
  },
  inviteBtnDisabled: {
    opacity: 0.6,
  },
  helper: {
    fontSize: 13,
    fontWeight: "600",
  },
  createTerreiroBtn: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: colors.brass600,
    borderColor: colors.brass600,
    alignItems: "center",
    justifyContent: "center",
  },
  createTerreiroBtnPressed: {
    opacity: 0.85,
  },
  createTerreiroText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.paper50,
  },
  newTerreiroLink: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  newTerreiroLinkPressed: {
    opacity: 0.75,
  },
  newTerreiroText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.brass600,
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
