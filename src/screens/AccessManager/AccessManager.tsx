import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { AppHeaderWithPreferences } from "@/src/components/AppHeaderWithPreferences";
import { BottomSheet } from "@/src/components/BottomSheet";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { SelectModal, type SelectItem } from "@/src/components/SelectModal";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import {
  PreferencesRadioGroup,
  type PreferencesRadioOption,
} from "@/src/components/preferences/PreferencesRadioGroup";
import {
  useCreateTerreiroInvite,
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

function roleLabel(role: AccessRole) {
  if (role === "admin") return "Admin";
  if (role === "editor") return "Editor";
  return "Membro";
}

function normalizeEmail(v: string) {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

function isValidEmail(email: string) {
  const e = normalizeEmail(email);
  if (!e) return false;
  if (e.includes(" ")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function formatRequestedAtLabel(createdAt?: string | null) {
  if (!createdAt) return "";
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (today.getTime() - thatDay.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  return d.toLocaleDateString("pt-BR");
}

function formatInviteStatusLabel(status: string) {
  if (status === "pending") return "Pendente";
  if (status === "accepted") return "Aceito";
  if (status === "rejected") return "Recusado";
  return status || "";
}

function friendlyMembershipReviewError(raw: string) {
  const m = String(raw ?? "").toLowerCase();
  if (!m) return "";
  if (
    m.includes("permission") ||
    m.includes("not authorized") ||
    m.includes("rls")
  ) {
    return "Você não tem permissão para aprovar este pedido.";
  }
  return raw;
}

export default function AccessManager() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { effectiveTheme, activeContext } = usePreferences();
  const { showToast } = useToast();

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

  const canSeeManager = useMemo(() => {
    const roleFromContext =
      activeContext?.kind === "TERREIRO_PAGE" ? activeContext.role : undefined;
    return roleFromContext === "admin" || roleFromContext === "editor";
  }, [activeContext]);

  const [tab, setTab] = useState<AccessTab>("people");
  const tabOptions = useMemo(() => {
    return [
      {
        key: "people",
        label: "Pessoas",
        description: "Admins, Editors e Membros",
      },
      {
        key: "requests",
        label: "Pedidos pendentes",
        description: "Solicitações para virar membro",
      },
      {
        key: "invites",
        label: "Convites",
        description: "Pendentes e histórico",
      },
    ] satisfies readonly PreferencesRadioOption<AccessTab>[];
  }, []);

  const [isInviteSheetOpen, setIsInviteSheetOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AccessRole>("member");
  const [inviteError, setInviteError] = useState<string>("");
  const [isInviteRoleModalOpen, setIsInviteRoleModalOpen] = useState(false);

  const inviteRoleItems: SelectItem[] = useMemo(
    () => [
      { key: "admin", label: "Admin", value: "admin" },
      { key: "editor", label: "Editor", value: "editor" },
      { key: "member", label: "Membro", value: "member" },
    ],
    []
  );

  const {
    items: memberRows,
    profilesById: memberProfiles,
    isLoading: isLoadingMembers,
    error: membersError,
    reload: reloadMembers,
  } = useTerreiroMembers(terreiroId);

  const {
    items: pendingRows,
    profilesById: pendingProfiles,
    isLoading: isLoadingPending,
    error: pendingError,
    reload: reloadPending,
  } = usePendingTerreiroMembershipRequests(terreiroId);

  const {
    items: inviteRows,
    isLoading: isLoadingInvites,
    error: invitesError,
    reload: reloadInvites,
  } = useTerreiroInvites(terreiroId);

  const { create: createInvite, isCreating: isCreatingInvite } =
    useCreateTerreiroInvite(terreiroId);

  const {
    approve,
    reject,
    isProcessing: isReviewProcessing,
  } = useReviewTerreiroMembershipRequest();

  useEffect(() => {
    if (!terreiroId || !canSeeManager) return;

    const channel = supabase
      .channel(`terreiro_membership_requests:${terreiroId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "terreiro_membership_requests",
          filter: `terreiro_id=eq.${terreiroId}`,
        },
        () => {
          reloadPending();
          showToast("Novo pedido de membro.");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [terreiroId, canSeeManager, reloadPending, showToast]);

  const peopleItems: PersonItem[] = useMemo(() => {
    return memberRows.map((m) => {
      const profile = memberProfiles[m.user_id];
      const name =
        (profile?.full_name && profile.full_name.trim()) ||
        (profile?.email && profile.email.trim()) ||
        "Usuário";

      const roleRaw = String(m.role ?? "");
      const role: AccessRole =
        roleRaw === "admin" || roleRaw === "editor" || roleRaw === "member"
          ? roleRaw
          : "member";

      return {
        id: m.user_id,
        name,
        email: profile?.email ?? undefined,
        role,
      };
    });
  }, [memberRows, memberProfiles]);

  const requestItems: RequestItem[] = useMemo(() => {
    return pendingRows.map((r) => {
      const profile = pendingProfiles[r.user_id];
      const name =
        (profile?.full_name && profile.full_name.trim()) ||
        (profile?.email && profile.email.trim()) ||
        "Solicitante";
      const email = (profile?.email && profile.email.trim()) || r.user_id;
      const requestedAtLabel = formatRequestedAtLabel(r.created_at);

      return {
        id: r.id,
        name,
        email,
        requestedAtLabel,
      };
    });
  }, [pendingRows, pendingProfiles]);

  const inviteItems: InviteItem[] = useMemo(() => {
    return inviteRows.map((i) => {
      const roleRaw = String(i.role ?? "");
      const role: AccessRole =
        roleRaw === "admin" || roleRaw === "editor" || roleRaw === "member"
          ? roleRaw
          : "member";

      return {
        id: i.id,
        email: i.email,
        role,
        statusLabel: formatInviteStatusLabel(i.status),
      };
    });
  }, [inviteRows]);

  const onSendInvite = useCallback(async () => {
    if (!canSeeManager) {
      showToast("Você não tem permissão para convidar.");
      return;
    }

    if (!terreiroId) {
      showToast("Terreiro inválido.");
      return;
    }

    const email = normalizeEmail(inviteEmail);
    if (!isValidEmail(email)) {
      setInviteError("Informe um e-mail válido.");
      return;
    }

    setInviteError("");

    const res = await createInvite({
      email,
      role: inviteRole,
    });

    if (!res.ok) {
      setInviteError(res.error || "Erro ao enviar convite.");
      return;
    }

    setIsInviteSheetOpen(false);
    setInviteEmail("");
    showToast(`Convite enviado para ${email} (${roleLabel(inviteRole)}).`);
    reloadInvites();
  }, [
    canSeeManager,
    createInvite,
    inviteEmail,
    inviteRole,
    reloadInvites,
    showToast,
    terreiroId,
  ]);

  const onApproveRequest = useCallback(
    async (req: RequestItem) => {
      if (!canSeeManager) {
        showToast("Você não tem permissão para aprovar.");
        return;
      }

      const res = await approve(req.id);
      if (!res.ok) {
        showToast(friendlyMembershipReviewError(res.error || "Erro."));
        return;
      }

      showToast("Pedido aprovado.");
      await Promise.all([reloadPending(), reloadMembers()]);
    },
    [approve, canSeeManager, reloadMembers, reloadPending, showToast]
  );

  const onRejectRequest = useCallback(
    async (req: RequestItem) => {
      if (!canSeeManager) {
        showToast("Você não tem permissão para recusar.");
        return;
      }

      const res = await reject(req.id);
      if (!res.ok) {
        showToast(friendlyMembershipReviewError(res.error || "Erro."));
        return;
      }

      showToast("Pedido recusado.");
      await Promise.all([reloadPending(), reloadMembers()]);
    },
    [canSeeManager, reject, reloadMembers, reloadPending, showToast]
  );

  return (
    <SaravafyScreen variant={variant}>
      <View style={styles.screen}>
        <AppHeaderWithPreferences />

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

        <View style={styles.content}>
          <SurfaceCard variant={variant} style={styles.titleCard}>
            <Text style={[styles.title, { color: textPrimary }]}>
              {terreiroTitle}
            </Text>
            <Text style={[styles.subtitle, { color: textSecondary }]}>
              Pessoas, pedidos e convites em um lugar só.
            </Text>
          </SurfaceCard>

          {!canSeeManager ? (
            <SurfaceCard variant={variant} style={styles.noticeCard}>
              <Text style={[styles.noticeText, { color: textSecondary }]}>
                Esta tela é para Admins e Editors. (Layout pronto; regras finais
                de permissão serão conectadas depois.)
              </Text>
            </SurfaceCard>
          ) : null}

          <PreferencesRadioGroup
            variant={variant}
            value={tab}
            onChange={setTab}
            options={tabOptions}
          />

          {tab === "people" ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                  Pessoas
                </Text>
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
              </View>

              {peopleItems.map((p) => (
                <SurfaceCard
                  key={p.id}
                  variant={variant}
                  style={styles.itemCard}
                >
                  <View style={styles.itemRow}>
                    <View style={styles.itemMeta}>
                      <Text style={[styles.itemTitle, { color: textPrimary }]}>
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
                        style={[styles.rolePillText, { color: textSecondary }]}
                      >
                        {roleLabel(p.role)}
                      </Text>
                    </View>
                  </View>
                </SurfaceCard>
              ))}

              <Text style={[styles.hint, { color: textMuted }]}>
                {isLoadingMembers
                  ? "Carregando pessoas..."
                  : membersError
                  ? "Não foi possível carregar pessoas."
                  : "Ações de promover/remover papéis perigosos ficam para depois."}
              </Text>
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
              </View>

              {inviteItems.map((i) => (
                <SurfaceCard
                  key={i.id}
                  variant={variant}
                  style={styles.itemCard}
                >
                  <View style={styles.itemRow}>
                    <View style={styles.itemMeta}>
                      <Text style={[styles.itemTitle, { color: textPrimary }]}>
                        {i.email}
                      </Text>
                      <Text style={[styles.itemSub, { color: textMuted }]}>
                        {roleLabel(i.role)} · {i.statusLabel}
                      </Text>
                    </View>
                  </View>
                </SurfaceCard>
              ))}

              <Text style={[styles.hint, { color: textMuted }]}>
                {isLoadingInvites
                  ? "Carregando convites..."
                  : invitesError
                  ? "Não foi possível carregar convites."
                  : "Histórico completo pode entrar depois; por ora, layout pronto."}
              </Text>
            </View>
          ) : null}
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
                  variant === "light"
                    ? colors.inputBgLight
                    : colors.inputBgDark,
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
                  variant === "light"
                    ? colors.inputBgLight
                    : colors.inputBgDark,
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
    </SaravafyScreen>
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
  titleCard: {
    marginTop: spacing.sm,
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
