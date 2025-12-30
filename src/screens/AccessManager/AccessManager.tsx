/*
import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { BottomSheet } from "@/src/components/BottomSheet";
import { SelectModal, type SelectItem } from "@/src/components/SelectModal";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import {
  PreferencesRadioGroup,
  type PreferencesRadioOption,
} from "@/src/components/preferences/PreferencesRadioGroup";
  const { user } = useAuth();
  const { showToast } = useToast();
  const { effectiveTheme } = usePreferences();
  usePendingTerreiroMembershipRequests,
  useReviewTerreiroMembershipRequest,
  useTerreiroInvites,
  useTerreiroMembers,
} from "@/src/hooks/terreiroMembership";
import { colors, radii, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type AccessTab = "people" | "requests" | "invites";

type AccessRole = "admin" | "editor" | "member";

type PersonItem = {
  id: string;
  name: string;
  email?: string;
  role: AccessRole;
};

type RequestItem = {
  id: string;
  name: string;
  email: string;
  requestedAtLabel: string;
};

type InviteItem = {
  id: string;
  email: string;
  role: AccessRole;
  statusLabel: string;
};

    const channel = supabase
      .channel(`terreiro_membership_requests:${terreiroId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
                  >
                    <View style={styles.itemRow}>
                      <View style={styles.itemMeta}>
                        <Text
                          style={[styles.itemTitle, { color: textPrimary }]}
                        >
                          {p.name}
                        </Text>
                        {p.email ? (
                          <Text style={[styles.itemSub, { color: textMuted }]}>
                            {p.email}
                          </Text>
                        ) : null}
                      </View>

                      <View
                        style={[
                          styles.rolePill,
                          {
                            borderColor:
                              variant === "light"
                                ? colors.surfaceCardBorderLight
                                : colors.surfaceCardBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.rolePillText,
                            { color: textSecondary },
                          ]}
                        >
                          {roleLabel(p.role)}
                        </Text>
                      </View>
                    </View>
                  </SurfaceCard>
                ))
              )}
            </View>
          ) : null}

          {tab === "requests" ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                  Pedidos pendentes
                </Text>
              </View>

              {isLoadingPending ? (
                <SurfaceCard variant={variant} style={styles.noticeCard}>
                  <Text style={[styles.noticeText, { color: textSecondary }]}>
                    Carregando pedidos...
                  </Text>
                </SurfaceCard>
              ) : pendingError ? (
                <SurfaceCard variant={variant} style={styles.noticeCard}>
                  <Text style={[styles.noticeText, { color: textSecondary }]}>
                    Não foi possível carregar os pedidos.
                  </Text>
                </SurfaceCard>
              ) : requestItems.length === 0 ? (
                <SurfaceCard variant={variant} style={styles.noticeCard}>
                  <Text style={[styles.noticeText, { color: textSecondary }]}>
                    Nenhum pedido pendente.
                  </Text>
                </SurfaceCard>
              ) : (
                requestItems.map((r) => (
                  <SurfaceCard
                    key={r.id}
                    variant={variant}
                    style={styles.itemCard}
                  >
                    <View style={styles.itemRow}>
                      <View style={styles.itemMeta}>
                        <Text
                          style={[styles.itemTitle, { color: textPrimary }]}
                        >
                          {r.name}
                        </Text>
                        <Text style={[styles.itemSub, { color: textMuted }]}>
                          {r.email} · {r.requestedAtLabel}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.actionsRow}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => onRejectRequest(r)}
                        disabled={isReviewProcessing}
                        style={({ pressed }) => [
                          styles.secondaryBtn,
                          pressed ? styles.btnPressed : null,
                          isReviewProcessing ? { opacity: 0.6 } : null,
                          {
                            borderColor:
                              variant === "light"
                                ? colors.surfaceCardBorderLight
                                : colors.surfaceCardBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.secondaryBtnText,
                            { color: textPrimary },
                          ]}
                        >
                          Recusar
                        </Text>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        onPress={() => onApproveRequest(r)}
                        disabled={isReviewProcessing}
                        style={({ pressed }) => [
                          styles.primaryBtn,
                          pressed ? styles.btnPressed : null,
                          isReviewProcessing ? { opacity: 0.6 } : null,
                          variant === "light"
                            ? styles.primaryBtnLight
                            : styles.primaryBtnDark,
                        ]}
                      >
                        <Text
                          style={
                            variant === "light"
                              ? styles.primaryBtnTextLight
                              : styles.primaryBtnTextDark
                          }
                        >
                          Aprovar
                        </Text>
                      </Pressable>
                    </View>
                  </SurfaceCard>
                ))
              )}
            </View>
          ) : null}

          {tab === "invites" ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                  Convites
                </Text>
                {canSeeManager ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setIsInviteSheetOpen(true)}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      pressed ? styles.btnPressed : null,
                      variant === "light"
                        ? styles.primaryBtnLight
                        : styles.primaryBtnDark,
                    ]}
                  >
                    <Text
                      style={
                        variant === "light"
                          ? styles.primaryBtnTextLight
                          : styles.primaryBtnTextDark
                      }
                    >
                      Convidar pessoa
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {isLoadingInvites ? (
                <SurfaceCard variant={variant} style={styles.noticeCard}>
                  <Text style={[styles.noticeText, { color: textSecondary }]}>
                    Carregando convites...
                  </Text>
                </SurfaceCard>
              ) : invitesError ? (
                <SurfaceCard variant={variant} style={styles.noticeCard}>
                  <Text style={[styles.noticeText, { color: textSecondary }]}>
                    Não foi possível carregar convites.
                  </Text>
                </SurfaceCard>
              ) : inviteItems.length === 0 ? (
                <SurfaceCard variant={variant} style={styles.noticeCard}>
                  <Text style={[styles.noticeText, { color: textSecondary }]}>
                    Nenhum convite encontrado.
                  </Text>
                </SurfaceCard>
              ) : (
                inviteItems.map((i) => (
                  <SurfaceCard
                    key={i.id}
                    variant={variant}
                    style={styles.itemCard}
                  >
                    <View style={styles.itemRow}>
                      <View style={styles.itemMeta}>
                        <Text
                          style={[styles.itemTitle, { color: textPrimary }]}
                        >
                          {i.email}
                        </Text>
                        <Text style={[styles.itemSub, { color: textMuted }]}>
                          {roleLabel(i.role)} · {i.statusLabel}
                        </Text>
                      </View>
                    </View>
                  </SurfaceCard>
                ))
              )}
            </View>
          ) : null}
        </SurfaceCard>
      </View>

      <BottomSheet
        visible={isInviteSheetOpen}
        variant={variant}
        onClose={() => {
          setIsInviteSheetOpen(false);
          setInviteError("");
        }}
      >
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: textPrimary }]}>
            Convidar pessoa
          </Text>
          {terreiroId ? (
            <Text style={[styles.sheetSub, { color: textMuted }]}>
              Terreiro: {terreiroTitle}
            </Text>
          ) : null}
        </View>

        <Text style={[styles.label, { color: textSecondary }]}>E-mail</Text>
        <TextInput
          value={inviteEmail}
          onChangeText={(v) => {
            setInviteEmail(v);
            setInviteError("");
          }}
          placeholder="local@dominio.tld"
          placeholderTextColor={textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[
            styles.input,
            {
              backgroundColor:
                variant === "light" ? colors.inputBgLight : colors.inputBgDark,
              borderColor:
                variant === "light"
                  ? colors.surfaceCardBorderLight
                  : colors.surfaceCardBorder,
              color: textPrimary,
            },
          ]}
        />

        {inviteError ? (
          <Text style={[styles.inlineError, { color: colors.danger }]}>
            {inviteError}
          </Text>
        ) : null}

        <Text style={[styles.label, { color: textSecondary }]}>Papel</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setIsInviteRoleModalOpen(true)}
          style={({ pressed }) => [
            styles.selectField,
            {
              backgroundColor:
                variant === "light" ? colors.inputBgLight : colors.inputBgDark,
              borderColor:
                variant === "light"
                  ? colors.surfaceCardBorderLight
                  : colors.surfaceCardBorder,
            },
            pressed ? styles.btnPressed : null,
          ]}
        >
          <Text style={[styles.selectValue, { color: textPrimary }]}>
            {roleLabel(inviteRole)}
          </Text>
          <Ionicons name="chevron-down" size={16} color={textMuted} />
        </Pressable>

        <View style={styles.sheetActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setIsInviteSheetOpen(false);
              setInviteError("");
            }}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed ? styles.btnPressed : null,
              {
                borderColor:
                  variant === "light"
                    ? colors.surfaceCardBorderLight
                    : colors.surfaceCardBorder,
              },
            ]}
          >
            <Text style={[styles.secondaryBtnText, { color: textPrimary }]}>
              Cancelar
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onSendInvite}
            disabled={isCreatingInvite || !terreiroId}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed ? styles.btnPressed : null,
              isCreatingInvite || !terreiroId ? { opacity: 0.6 } : null,
              variant === "light"
                ? styles.primaryBtnLight
                : styles.primaryBtnDark,
            ]}
          >
            <Text
              style={
                variant === "light"
                  ? styles.primaryBtnTextLight
                  : styles.primaryBtnTextDark
              }
            >
              Enviar convite
            </Text>
          </Pressable>
        </View>
      </BottomSheet>

      <SelectModal
        title="Papel"
        visible={isInviteRoleModalOpen}
        variant={variant}
        items={inviteRoleItems}
        onClose={() => setIsInviteRoleModalOpen(false)}
        onSelect={(value) => {
          const v = String(value) as AccessRole;
          if (v === "admin" || v === "editor" || v === "member") {
            setInviteRole(v);
            return;
          }
          setInviteRole("member");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerRow: {
    height: 52,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
    paddingHorizontal: spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  contextHeader: {
    marginTop: spacing.sm,
  },
  managerCard: {
    marginTop: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.92,
  },
  noticeCard: {
    paddingVertical: spacing.md,
  },
  noticeText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  itemCard: {
    paddingVertical: spacing.md,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  itemMeta: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  itemSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.9,
  },
  rolePill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDark: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.brass600,
  },
  primaryBtnLight: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.brass500,
  },
  primaryBtnTextDark: {
    color: colors.brass600,
    fontWeight: "900",
    fontSize: 13,
  },
  primaryBtnTextLight: {
    color: colors.brass500,
    fontWeight: "900",
    fontSize: 13,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "transparent",
  },
  secondaryBtnText: {
    fontWeight: "900",
    fontSize: 13,
  },
  btnPressed: {
    opacity: 0.85,
  },
  hint: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.9,
  },
  sheetHeader: {
    paddingBottom: spacing.sm,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  sheetSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.9,
  },
  label: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.92,
  },
  input: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "700",
  },
  inlineError: {
    marginTop: spacing.xs,
    fontSize: 12,
    fontWeight: "800",
  },
  selectField: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  selectValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  sheetActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});

*/

import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { BottomSheet } from "@/src/components/BottomSheet";
import { dismissAllTooltips } from "@/src/components/TooltipPopover";
import {
  useTerreiroInvites,
  useTerreiroMembers,
  useTerreiroMembershipStatus,
} from "@/src/hooks/terreiroMembership";
import { queryKeys } from "@/src/queries/queryKeys";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { TagChip } from "@/src/components/TagChip";

import { GestaoList } from "./GestaoList";
import { InviteModal, type InviteModalMode } from "./InviteModal";
import { type AccessRole, type InviteStatus } from "./InviteRow";
import { MembersList } from "./MembersList";
import { PendingInvitesList } from "./PendingInvitesList";

type TerreiroInviteLite = {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string | null;
};

type TerreiroMemberLite = {
  user_id: string;
  role: string | null;
  status: string | null;
};

type RemoveTarget =
  | { kind: "invite"; id: string; label: string; status: InviteStatus }
  | { kind: "member"; userId: string; label: string; role: AccessRole };

type MenuTarget =
  | {
      kind: "gestao";
      userId: string;
      displayName: string | null;
      email: string;
      role: Exclude<AccessRole, "member">;
    }
  | {
      kind: "member";
      userId: string;
      displayName: string | null;
      email: string;
    }
  | { kind: "invite"; id: string; email: string; role: AccessRole };

type RoleChangeTarget = {
  userId: string;
  label: string;
  from: Exclude<AccessRole, "member">;
  to: Exclude<AccessRole, "member">;
};

function normalizeEmail(v: string) {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

function isCannotRemoveLastAdminError(error: unknown) {
  const anyErr = error as any;
  const msg = typeof anyErr?.message === "string" ? anyErr.message : "";
  return msg.includes("cannot_remove_last_admin");
}

function isDuplicatePendingInviteError(error: unknown) {
  const anyErr = error as any;
  const code = typeof anyErr?.code === "string" ? anyErr.code : "";
  if (code === "23505") return true;

  const msg = typeof anyErr?.message === "string" ? anyErr.message : "";
  const m = msg.toLowerCase();
  return m.includes("duplicate") || m.includes("unique") || m.includes("23505");
}

function toAccessRole(raw: string): AccessRole {
  if (raw === "admin" || raw === "editor") return raw;
  return "member";
}

function createdAtMs(createdAt: string | null) {
  if (!createdAt) return 0;
  const t = new Date(createdAt).getTime();
  return Number.isFinite(t) ? t : 0;
}

export default function AccessManagerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const { user } = useAuth();
  const { showToast } = useToast();
  const { effectiveTheme } = usePreferences();
  const queryClient = useQueryClient();

  const variant: "light" | "dark" = effectiveTheme;

  const terreiroId = String(params.terreiroId ?? "");
  const terreiroTitle =
    (typeof params.terreiroTitle === "string" && params.terreiroTitle.trim()) ||
    "Gerenciar acesso";

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

  const { data: membership } = useTerreiroMembershipStatus(terreiroId);
  const canSeeManager =
    membership.isActiveMember &&
    (membership.role === "admin" || membership.role === "editor");
  const canChangeRoles = canSeeManager && membership.role === "admin";

  const {
    items: memberRows,
    profilesById: memberProfilesById,
    identityByUserId,
    isLoading: isLoadingMembers,
    error: membersError,
    reload: reloadMembers,
  } = useTerreiroMembers(terreiroId);

  const {
    items: inviteItems,
    isLoading: isLoadingInvites,
    error: invitesError,
    reload: reloadInvites,
  } = useTerreiroInvites(terreiroId);

  type TerreiroInviteModalMode = Exclude<InviteModalMode, "curator">;

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteModalMode, setInviteModalMode] =
    useState<TerreiroInviteModalMode>("gestao");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [busyActionKey, setBusyActionKey] = useState<string | null>(null);

  const [menuTarget, setMenuTarget] = useState<MenuTarget | null>(null);
  const [confirmRoleChangeTarget, setConfirmRoleChangeTarget] =
    useState<RoleChangeTarget | null>(null);

  const [confirmRemoveTarget, setConfirmRemoveTarget] =
    useState<RemoveTarget | null>(null);
  const [busyRemoveKey, setBusyRemoveKey] = useState<string | null>(null);

  const [removedInviteIds, setRemovedInviteIds] = useState<
    Record<string, true>
  >({});
  const [removedMemberIds, setRemovedMemberIds] = useState<
    Record<string, true>
  >({});

  const pendingInvites = useMemo(() => {
    const items = (inviteItems ?? []) as unknown as TerreiroInviteLite[];
    const next = items
      .filter((i) => !removedInviteIds[String(i?.id ?? "")])
      .filter((i) => String(i?.status ?? "") === "pending");

    next.sort((a, b) => {
      return (
        createdAtMs(b?.created_at ?? null) - createdAtMs(a?.created_at ?? null)
      );
    });

    return next;
  }, [inviteItems, removedInviteIds]);

  const openInviteModal = useCallback((mode: TerreiroInviteModalMode) => {
    setInviteModalMode(mode);
    setInviteModalVisible(true);
  }, []);

  const closeInviteModal = useCallback(() => {
    if (inviteSubmitting) return;
    setInviteModalVisible(false);
  }, [inviteSubmitting]);

  const closeMenu = useCallback(() => {
    if (busyActionKey) return;
    setMenuTarget(null);
  }, [busyActionKey]);

  const closeConfirmRoleChange = useCallback(() => {
    if (busyActionKey) return;
    setConfirmRoleChangeTarget(null);
  }, [busyActionKey]);

  const closeConfirmRemove = useCallback(() => {
    if (busyRemoveKey) return;
    setConfirmRemoveTarget(null);
  }, [busyRemoveKey]);

  const createInvite = useCallback(
    async (payload: { email: string; role: AccessRole }) => {
      if (!canSeeManager) {
        showToast("Você não tem permissão para convidar.");
        return;
      }
      if (!terreiroId) {
        showToast("Terreiro inválido.");
        return;
      }
      if (!user?.id) {
        showToast("Faça login para continuar.");
        return;
      }
      if (inviteSubmitting) return;

      const email = normalizeEmail(payload.email);

      setInviteSubmitting(true);
      try {
        const res = await supabase.from("terreiro_invites").insert({
          terreiro_id: terreiroId,
          email,
          role: payload.role,
          status: "pending",
          created_by: user.id,
        } as any);

        if (res.error) {
          if (isDuplicatePendingInviteError(res.error)) {
            showToast("Já existe um convite pendente para esse e-mail.");
            return;
          }

          showToast(
            typeof res.error.message === "string"
              ? res.error.message
              : "Não foi possível enviar o convite."
          );
          return;
        }

        showToast("Convite enviado.");
        setInviteModalVisible(false);
        await reloadInvites();
      } finally {
        setInviteSubmitting(false);
      }
    },
    [
      canSeeManager,
      inviteSubmitting,
      reloadInvites,
      showToast,
      terreiroId,
      user?.id,
    ]
  );

  const requestRoleToggle = useCallback((target: RoleChangeTarget) => {
    setConfirmRoleChangeTarget(target);
  }, []);

  const confirmRoleToggle = useCallback(async () => {
    if (!confirmRoleChangeTarget) return;
    if (!terreiroId) {
      showToast("Terreiro inválido.");
      return;
    }
    if (!canChangeRoles) {
      showToast("Você não tem permissão para alterar papéis.");
      return;
    }
    if (busyActionKey) return;

    const key = `role:${confirmRoleChangeTarget.userId}`;
    setBusyActionKey(key);
    try {
      const res = await supabase
        .from("terreiro_members")
        .update({ role: confirmRoleChangeTarget.to } as any)
        .eq("terreiro_id", terreiroId)
        .eq("user_id", confirmRoleChangeTarget.userId);

      if (res.error) {
        showToast(
          typeof res.error.message === "string"
            ? res.error.message
            : "Não foi possível alterar o papel."
        );
        return;
      }

      showToast("Papel atualizado.");
      setConfirmRoleChangeTarget(null);
      setMenuTarget(null);
      await reloadMembers();

      const myUserId = user?.id ?? null;
      if (myUserId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.me.membership(myUserId),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.terreiros.withRole(myUserId),
        });
      }
    } finally {
      setBusyActionKey(null);
    }
  }, [
    busyActionKey,
    canChangeRoles,
    confirmRoleChangeTarget,
    queryClient,
    reloadMembers,
    showToast,
    terreiroId,
    user?.id,
  ]);

  const openRemoveForInvite = useCallback((invite: TerreiroInviteLite) => {
    const id = String(invite?.id ?? "");
    if (!id) return;
    setConfirmRemoveTarget({
      kind: "invite",
      id,
      label: normalizeEmail(String(invite?.email ?? "")),
      status: String(invite?.status ?? "") as InviteStatus,
    });
  }, []);

  const openRemoveForMember = useCallback(
    (member: TerreiroMemberLite) => {
      const uid = String(member?.user_id ?? "");
      if (!uid) return;

      const profile = memberProfilesById[uid];
      const email = normalizeEmail(identityByUserId[uid]?.email ?? "");
      const displayName =
        typeof profile?.full_name === "string" && profile.full_name.trim()
          ? profile.full_name.trim()
          : null;
      const roleRaw = String(member?.role ?? "");
      const role: AccessRole =
        roleRaw === "admin" || roleRaw === "editor" || roleRaw === "member"
          ? roleRaw
          : "member";

      setConfirmRemoveTarget({
        kind: "member",
        userId: uid,
        label: displayName || email,
        role,
      });
    },
    [identityByUserId, memberProfilesById]
  );

  const confirmRemove = useCallback(async () => {
    if (!confirmRemoveTarget) return;
    if (!terreiroId) {
      showToast("Terreiro inválido.");
      return;
    }

    const myUserId = user?.id ?? null;

    if (confirmRemoveTarget.kind === "invite") {
      const key = `invite:${confirmRemoveTarget.id}`;
      if (busyRemoveKey) return;

      setBusyRemoveKey(key);
      try {
        const res = await supabase
          .from("terreiro_invites")
          .delete()
          .eq("id", confirmRemoveTarget.id);

        if (res.error) {
          showToast(
            "Não foi possível concluir agora. Verifique sua conexão e tente novamente."
          );
          return;
        }

        setRemovedInviteIds((prev) => ({
          ...prev,
          [confirmRemoveTarget.id]: true,
        }));

        showToast("Convite removido.");
        setConfirmRemoveTarget(null);

        await reloadInvites();

        if (myUserId) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.terreiros.withRole(myUserId),
          });
          void queryClient.invalidateQueries({
            queryKey: queryKeys.me.terreiros(myUserId),
          });
        }
      } finally {
        setBusyRemoveKey(null);
      }
      return;
    }

    // member
    const memberKey = `member:${confirmRemoveTarget.userId}`;
    if (busyRemoveKey) return;
    setBusyRemoveKey(memberKey);
    try {
      const rpc = await supabase.rpc("fn_remove_terreiro_member", {
        p_terreiro_id: terreiroId,
        p_user_id: confirmRemoveTarget.userId,
      });

      if (rpc.error) {
        if (isCannotRemoveLastAdminError(rpc.error)) {
          showToast(
            "Não é possível remover a última pessoa admin deste terreiro."
          );
          return;
        }

        showToast(
          "Não foi possível concluir agora. Verifique sua conexão e tente novamente."
        );
        return;
      }

      setRemovedMemberIds((prev) => ({
        ...prev,
        [confirmRemoveTarget.userId]: true,
      }));

      showToast("Acesso removido.");
      setConfirmRemoveTarget(null);

      await Promise.all([reloadMembers(), reloadInvites()]);

      if (myUserId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.me.membership(myUserId),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.me.permissions(myUserId),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.me.terreiros(myUserId),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.terreiros.withRole(myUserId),
        });
      }
    } finally {
      setBusyRemoveKey(null);
    }
  }, [
    busyRemoveKey,
    confirmRemoveTarget,
    queryClient,
    reloadInvites,
    reloadMembers,
    showToast,
    terreiroId,
    user?.id,
  ]);

  const visiblePeople = useMemo(() => {
    const rows = (memberRows ?? []) as unknown as TerreiroMemberLite[];
    return rows.filter((m) => {
      const uid = String(m?.user_id ?? "");
      if (!uid) return false;
      if (removedMemberIds[uid]) return false;

      const status = String(m?.status ?? "");
      return !status || status === "active";
    });
  }, [memberRows, removedMemberIds]);

  const gestaoPeople = useMemo(() => {
    return visiblePeople
      .filter((m) => {
        const r = String(m?.role ?? "");
        return r === "admin" || r === "editor";
      })
      .map((m) => {
        const uid = String(m.user_id ?? "");
        const profile = memberProfilesById[uid];
        const email = normalizeEmail(identityByUserId[uid]?.email ?? "");
        const displayName =
          typeof profile?.full_name === "string" && profile.full_name.trim()
            ? profile.full_name.trim()
            : null;
        const role =
          String(m.role ?? "") === "admin"
            ? ("admin" as const)
            : ("editor" as const);
        return {
          userId: uid,
          displayName,
          email,
          role,
        };
      });
  }, [identityByUserId, memberProfilesById, visiblePeople]);

  const memberPeople = useMemo(() => {
    return visiblePeople
      .filter((m) => String(m?.role ?? "") === "member")
      .map((m) => {
        const uid = String(m.user_id ?? "");
        const profile = memberProfilesById[uid];
        const email = normalizeEmail(identityByUserId[uid]?.email ?? "");
        const displayName =
          typeof profile?.full_name === "string" && profile.full_name.trim()
            ? profile.full_name.trim()
            : null;
        return {
          userId: uid,
          displayName,
          email,
        };
      });
  }, [identityByUserId, memberProfilesById, visiblePeople]);

  const adminCount = useMemo(() => {
    return visiblePeople.reduce((acc, m) => {
      return String(m?.role ?? "") === "admin" ? acc + 1 : acc;
    }, 0);
  }, [visiblePeople]);

  const isLastAdmin = useCallback(
    (_userId: string) => {
      return adminCount <= 1;
    },
    [adminCount]
  );

  const openMenuForGestao = useCallback(
    (p: {
      userId: string;
      displayName: string | null;
      email: string;
      role: "admin" | "editor";
    }) => {
      setMenuTarget({ kind: "gestao", ...p });
    },
    []
  );

  const openMenuForMember = useCallback(
    (p: { userId: string; displayName: string | null; email: string }) => {
      setMenuTarget({ kind: "member", ...p });
    },
    []
  );

  const openMenuForInvite = useCallback(
    (inv: { id: string; email: string; role: AccessRole }) => {
      setMenuTarget({ kind: "invite", ...inv });
    },
    []
  );

  const isBusyForMember = useCallback(
    (userId: string) => {
      return (
        busyRemoveKey === `member:${userId}` ||
        busyActionKey === `role:${userId}`
      );
    },
    [busyActionKey, busyRemoveKey]
  );

  const isBusyForInvite = useCallback(
    (inviteId: string) => {
      return busyRemoveKey === `invite:${inviteId}`;
    },
    [busyRemoveKey]
  );

  const isBusyForGestao = isBusyForMember;

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.headerIconBtn}
        >
          <Ionicons name="chevron-back" size={22} color={textPrimary} />
        </Pressable>

        <Text
          style={[styles.headerTitle, { color: textPrimary }]}
          numberOfLines={1}
        >
          Gerenciar acesso
        </Text>

        <View style={styles.headerIconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => dismissAllTooltips()}
      >
        <View style={styles.contextHeader}>
          <Text style={[styles.title, { color: textPrimary }]}>
            {terreiroTitle}
          </Text>
        </View>

        {!canSeeManager ? (
          <Text style={[styles.noticeText, { color: textSecondary }]}>
            Esta tela é para Admins e Editors.
          </Text>
        ) : null}

        <View style={styles.sectionsWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: textMuted }]}>
              Gestão do terreiro
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (!canSeeManager) {
                  showToast("Você não tem permissão para convidar.");
                  return;
                }
                openInviteModal("gestao");
              }}
              hitSlop={10}
              style={({ pressed }) => [pressed ? styles.actionPressed : null]}
            >
              <Text style={styles.actionText}>+ Convidar gestão</Text>
            </Pressable>
          </View>

          <View />

          <GestaoList
            variant={variant}
            items={gestaoPeople}
            isLoading={isLoadingMembers}
            error={membersError}
            canManage={canSeeManager}
            canChangeRole={canChangeRoles}
            isLastAdmin={isLastAdmin}
            isBusy={isBusyForGestao}
            onOpenMenu={openMenuForGestao}
            onPressLastAdminMenuDisabled={() => {
              showToast(
                "Para remover este usuário é necessário adicionar outro admin."
              );
            }}
          />

          <View />

          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: textMuted }]}>
              Membros
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (!canSeeManager) {
                  showToast("Você não tem permissão para convidar.");
                  return;
                }
                openInviteModal("membro");
              }}
              hitSlop={10}
              style={({ pressed }) => [pressed ? styles.actionPressed : null]}
            >
              <Text style={styles.actionText}>+ Convidar membro</Text>
            </Pressable>
          </View>

          <View />

          <MembersList
            variant={variant}
            items={memberPeople}
            isLoading={isLoadingMembers}
            error={membersError}
            canManage={canSeeManager}
            isBusy={isBusyForMember}
            onOpenMenu={openMenuForMember}
          />

          <View
            style={[styles.blockDivider, { backgroundColor: dividerColor }]}
          />

          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={[styles.sectionTitle, { color: textMuted }]}>
                Convites enviados
              </Text>
              <TagChip
                label="Pendente"
                variant={variant}
                kind="custom"
                tone="medium"
                style={styles.sectionHeaderChip}
              />
            </View>

            <View />
          </View>

          <View
            style={[styles.blockDivider, { backgroundColor: dividerColor }]}
          />

          <PendingInvitesList
            variant={variant}
            items={pendingInvites.map((i) => ({
              id: String(i.id),
              email: normalizeEmail(String(i.email ?? "")),
              role: toAccessRole(String(i.role ?? "")),
            }))}
            isLoading={isLoadingInvites}
            error={invitesError}
            canManage={canSeeManager}
            isBusy={isBusyForInvite}
            onOpenMenu={openMenuForInvite}
          />
        </View>

        <Image
          source={require("@/assets/images/filler.png")}
          style={styles.filler}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />

        <View style={styles.bottomPad} />
      </ScrollView>

      <InviteModal
        visible={inviteModalVisible}
        variant={variant}
        mode={inviteModalMode}
        isSubmitting={inviteSubmitting}
        onClose={closeInviteModal}
        onSubmit={createInvite}
      />

      <BottomSheet
        visible={!!menuTarget}
        variant={variant}
        onClose={closeMenu}
        snapPoints={[280]}
      >
        <View style={styles.menuSheet}>
          <Text style={[styles.menuTitle, { color: textPrimary }]}>
            {menuTarget?.kind === "invite"
              ? "Ações do convite"
              : menuTarget?.kind === "member"
              ? "Ações do membro"
              : "Ações da gestão"}
          </Text>

          {menuTarget?.kind === "gestao" ? (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (!canChangeRoles) {
                    showToast("Você não tem permissão para alterar papéis.");
                    return;
                  }
                  if (menuTarget.role === "admin" && adminCount <= 1) {
                    showToast(
                      "Não é possível alterar o papel do último admin."
                    );
                    return;
                  }
                  requestRoleToggle({
                    userId: menuTarget.userId,
                    label:
                      (typeof menuTarget.displayName === "string" &&
                      menuTarget.displayName.trim()
                        ? menuTarget.displayName.trim()
                        : menuTarget.email) || "",
                    from: menuTarget.role,
                    to: menuTarget.role === "admin" ? "editor" : "admin",
                  });
                }}
                disabled={
                  !canSeeManager ||
                  !canChangeRoles ||
                  busyActionKey != null ||
                  (menuTarget.role === "admin" && adminCount <= 1)
                }
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed ? styles.menuPressed : null,
                  !canChangeRoles ||
                  (menuTarget.role === "admin" && adminCount <= 1)
                    ? styles.menuDisabled
                    : null,
                ]}
              >
                <Text style={[styles.menuItemText, { color: textPrimary }]}>
                  Alterar papel
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  const uid = menuTarget.userId;
                  const role = menuTarget.role;
                  if (role === "admin" && adminCount <= 1) {
                    showToast(
                      "Não é possível remover a última pessoa admin deste terreiro."
                    );
                    return;
                  }
                  openRemoveForMember({
                    user_id: uid,
                    role,
                    status: "active",
                  });
                  setMenuTarget(null);
                }}
                disabled={
                  !canSeeManager ||
                  busyRemoveKey != null ||
                  (menuTarget.role === "admin" && adminCount <= 1)
                }
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed ? styles.menuPressed : null,
                  menuTarget.role === "admin" && adminCount <= 1
                    ? styles.menuDisabled
                    : null,
                ]}
              >
                <Text style={[styles.menuItemText, { color: colors.danger }]}>
                  Remover acesso
                </Text>
              </Pressable>
            </>
          ) : null}

          {menuTarget?.kind === "member" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                openRemoveForMember({
                  user_id: menuTarget.userId,
                  role: "member",
                  status: "active",
                });
                setMenuTarget(null);
              }}
              disabled={!canSeeManager || busyRemoveKey != null}
              style={({ pressed }) => [
                styles.menuItem,
                pressed ? styles.menuPressed : null,
              ]}
            >
              <Text style={[styles.menuItemText, { color: colors.danger }]}>
                Remover acesso
              </Text>
            </Pressable>
          ) : null}

          {menuTarget?.kind === "invite" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                openRemoveForInvite({
                  id: menuTarget.id,
                  email: menuTarget.email,
                  role: menuTarget.role,
                  status: "pending",
                  created_at: null,
                });
                setMenuTarget(null);
              }}
              disabled={!canSeeManager || busyRemoveKey != null}
              style={({ pressed }) => [
                styles.menuItem,
                pressed ? styles.menuPressed : null,
              ]}
            >
              <Text style={[styles.menuItemText, { color: colors.danger }]}>
                Cancelar convite
              </Text>
            </Pressable>
          ) : null}
        </View>
      </BottomSheet>

      <BottomSheet
        visible={!!confirmRoleChangeTarget}
        variant={variant}
        onClose={closeConfirmRoleChange}
        snapPoints={[300]}
      >
        <View style={styles.confirmSheet}>
          <Text style={[styles.confirmTitle, { color: textPrimary }]}>
            Alterar papel?
          </Text>

          <Text style={[styles.confirmBody, { color: textSecondary }]}>
            {confirmRoleChangeTarget?.from === "admin"
              ? "A pessoa deixará de ser admin e virará editor."
              : "A pessoa virará admin."}
          </Text>

          <Text style={[styles.confirmHint, { color: textSecondary }]}>
            {confirmRoleChangeTarget?.label || ""}
          </Text>

          <View style={styles.confirmActions}>
            <Pressable
              accessibilityRole="button"
              onPress={closeConfirmRoleChange}
              disabled={!!busyActionKey}
              style={({ pressed }) => [
                styles.confirmBtn,
                styles.confirmBtnSecondary,
                {
                  borderColor:
                    variant === "light"
                      ? colors.surfaceCardBorderLight
                      : colors.surfaceCardBorder,
                },
                pressed ? styles.confirmPressed : null,
                busyActionKey ? styles.confirmDisabled : null,
              ]}
            >
              <Text style={[styles.confirmBtnText, { color: textPrimary }]}>
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={confirmRoleToggle}
              disabled={!!busyActionKey}
              style={({ pressed }) => [
                styles.confirmBtn,
                styles.confirmBtnDanger,
                pressed ? styles.confirmPressed : null,
                busyActionKey ? styles.confirmDisabled : null,
              ]}
            >
              <Text style={styles.confirmBtnTextDanger}>Confirmar</Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={!!confirmRemoveTarget}
        variant={variant}
        onClose={closeConfirmRemove}
        snapPoints={[320]}
      >
        <View style={styles.confirmSheet}>
          <Text style={[styles.confirmTitle, { color: textPrimary }]}>
            {confirmRemoveTarget?.kind === "invite"
              ? "Remover convite?"
              : "Remover acesso?"}
          </Text>

          <Text style={[styles.confirmBody, { color: textSecondary }]}>
            {confirmRemoveTarget?.kind === "invite"
              ? "A pessoa não poderá mais aceitar este convite."
              : "A pessoa perde acesso ao terreiro e às coleções restritas."}
          </Text>

          <Text style={[styles.confirmHint, { color: textSecondary }]}>
            {confirmRemoveTarget?.label || ""}
          </Text>

          <View style={styles.confirmActions}>
            <Pressable
              accessibilityRole="button"
              onPress={closeConfirmRemove}
              disabled={!!busyRemoveKey}
              style={({ pressed }) => [
                styles.confirmBtn,
                styles.confirmBtnSecondary,
                {
                  borderColor:
                    variant === "light"
                      ? colors.surfaceCardBorderLight
                      : colors.surfaceCardBorder,
                },
                pressed ? styles.confirmPressed : null,
                busyRemoveKey ? styles.confirmDisabled : null,
              ]}
            >
              <Text style={[styles.confirmBtnText, { color: textPrimary }]}>
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={confirmRemove}
              disabled={!!busyRemoveKey}
              style={({ pressed }) => [
                styles.confirmBtn,
                styles.confirmBtnDanger,
                pressed ? styles.confirmPressed : null,
                busyRemoveKey ? styles.confirmDisabled : null,
              ]}
            >
              <Text style={styles.confirmBtnTextDanger}>Confirmar</Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  contextHeader: {
    marginBottom: spacing.lg,
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.9,
  },
  noticeText: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: spacing.lg,
  },
  inlineText: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.9,
  },
  sectionsWrap: {
    gap: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  sectionHeaderChip: {
    opacity: 0.9,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  actionText: {
    color: colors.brass600,
    fontSize: 13,
    fontWeight: "900",
  },
  actionPressed: {
    opacity: 0.7,
  },
  blockDivider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.6,
  },
  filler: {
    width: "100%",
    height: 265,
    marginTop: spacing.lg,
  },
  bottomPad: {
    height: spacing.xl,
  },
  confirmSheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: 8,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  confirmBody: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.95,
  },
  confirmHint: {
    fontSize: 12,
    fontWeight: "800",
    opacity: 0.9,
    marginTop: 4,
  },
  confirmActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  confirmBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  confirmBtnSecondary: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceCardBorder,
    backgroundColor: "transparent",
  },
  confirmBtnDanger: {
    backgroundColor: colors.danger,
  },
  confirmPressed: {
    opacity: 0.85,
  },
  confirmDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: "900",
  },
  confirmBtnTextDanger: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.paper50,
  },
  menuSheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: 8,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 6,
  },
  menuItem: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "900",
  },
  menuPressed: {
    opacity: 0.8,
  },
  menuDisabled: {
    opacity: 0.5,
  },
});
