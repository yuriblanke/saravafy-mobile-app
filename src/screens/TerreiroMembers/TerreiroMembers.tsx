import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { BottomSheet } from "@/src/components/BottomSheet";
import { Separator } from "@/src/components/Separator";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { TagChip } from "@/src/components/TagChip";
import { useGlobalSafeAreaInsets } from "@/src/contexts/GlobalSafeAreaInsetsContext";
import {
  useCancelTerreiroInvite,
  useCreateTerreiroInvite,
  usePendingTerreiroMembershipRequests,
  useRemoveTerreiroMember,
  useResendTerreiroInvite,
  useReviewTerreiroMembershipRequest,
  useTerreiroInvites,
  useTerreiroMembers,
  useTerreiroMembershipStatus,
} from "@/src/hooks/terreiroMembership";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const fillerPng = require("@/assets/images/filler.png");

type MemberItem = {
  id: string;
  userId: string;
  name: string;
  email: string;
  showEmailLine: boolean;
};

type InviteItem = {
  id: string;
  name: string;
  email: string;
  showEmailLine: boolean;
  createdAtLabel: string;
};

function normalizeEmailLower(value: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

type RequestItem = {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  initials: string;
  requestedAtLabel: string;
  showEmailLine: boolean;
};

function getInitials(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return "?";

  const base = raw.includes("@") ? raw.split("@")[0] : raw;
  const parts = base
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(" ")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatTimeAgo(isoString: string | null): string {
  if (!isoString) return "";

  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diff = Math.max(0, now - then);

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "agora";
  if (minutes === 1) return "1 minuto atrás";
  if (minutes < 60) return `${minutes} minutos atrás`;
  if (hours === 1) return "1 hora atrás";
  if (hours < 24) return `${hours} horas atrás`;
  if (days === 1) return "1 dia atrás";
  return `${days} dias atrás`;
}

export default function TerreiroMembers() {
  const router = useRouter();
  const params = useLocalSearchParams<{ terreiroId?: string }>();
  const terreiroId =
    typeof params.terreiroId === "string" ? params.terreiroId : "";

  const { effectiveTheme } = usePreferences();
  const { showToast } = useToast();
  const insets = useGlobalSafeAreaInsets();

  const variant: "light" | "dark" = effectiveTheme;

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;
  const textMuted =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;
  const baseBgColor = variant === "light" ? colors.paper50 : colors.forest900;
  const headerFgColor = textPrimary;
  const dangerColor = colors.danger;
  const accentColor = colors.brass600;
  const inputBg =
    variant === "light" ? colors.inputBgLight : colors.inputBgDark;
  const inputBorder =
    variant === "light" ? colors.inputBorderLight : colors.inputBorderDark;

  // Check permissions
  const membershipQuery = useTerreiroMembershipStatus(terreiroId);
  const membership = membershipQuery.data;
  const myRole = membership.role;
  const canManage =
    membership.isActiveMember && (myRole === "admin" || myRole === "editor");

  // Load data
  const membersHook = useTerreiroMembers(terreiroId);
  const invitesHook = useTerreiroInvites(terreiroId);
  const requestsHook = usePendingTerreiroMembershipRequests(terreiroId);
  const reviewMutation = useReviewTerreiroMembershipRequest(terreiroId);
  const removeMemberHook = useRemoveTerreiroMember(terreiroId);
  const createInviteHook = useCreateTerreiroInvite(terreiroId);
  const cancelInviteHook = useCancelTerreiroInvite(terreiroId);
  const resendInviteHook = useResendTerreiroInvite();

  const [reviewingRequestIds, setReviewingRequestIds] = useState<
    Record<string, true>
  >({});

  // Member items (exclude admins and editors)
  const memberItems = useMemo<MemberItem[]>(() => {
    if (!membersHook.items) return [];

    return membersHook.items
      .filter((m) => m.role === "member" && m.status === "active")
      .map((m) => {
        const profile = membersHook.profilesById[m.user_id];
        const email = (profile?.email ?? "").trim();
        const fullName = (profile?.full_name ?? "").trim();
        const name = fullName ? fullName : email;
        const showEmailLine = !!fullName && !!email;

        return {
          id: m.user_id,
          userId: m.user_id,
          name,
          email,
          showEmailLine,
        };
      });
  }, [membersHook.items, membersHook.profilesById]);

  // Invite items
  const inviteItems = useMemo<InviteItem[]>(() => {
    if (!invitesHook.pending) return [];

    return invitesHook.pending
      .filter((inv) => inv.role === "member")
      .map((inv) => {
        const email = String(inv.email ?? "").trim();
        const profile =
          invitesHook.profilesByEmailLower[normalizeEmailLower(email)];
        const fullName = (profile?.full_name ?? "").trim();
        const name = fullName ? fullName : email;
        const showEmailLine = !!fullName;

        return {
          id: inv.id,
          name,
          email,
          showEmailLine,
          createdAtLabel: formatTimeAgo(inv.created_at ?? null),
        };
      });
  }, [invitesHook.pending, invitesHook.profilesByEmailLower]);

  // Request items
  const requestItems = useMemo<RequestItem[]>(() => {
    if (!requestsHook.items) return [];

    return requestsHook.items.map((req) => {
      const profile = requestsHook.profilesById[req.user_id];
      const email = (profile?.email ?? "").trim();
      const fullName = (profile?.full_name ?? "").trim();
      const name = fullName ? fullName : email;
      const avatarUrl = profile?.avatar_url || null;
      const initials = getInitials(name);
      const showEmailLine = !!fullName && !!email;

      return {
        id: req.id,
        userId: req.user_id,
        name,
        email,
        avatarUrl,
        initials,
        requestedAtLabel: formatTimeAgo(req.created_at ?? null),
        showEmailLine,
      };
    });
  }, [requestsHook.items, requestsHook.profilesById]);

  // Actions
  const [memberMenuTarget, setMemberMenuTarget] = useState<MemberItem | null>(
    null
  );
  const [inviteMenuTarget, setInviteMenuTarget] = useState<InviteItem | null>(
    null
  );

  const [isInviteSheetOpen, setIsInviteSheetOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  const openMemberMenu = (item: MemberItem) => {
    setMemberMenuTarget(item);
  };

  const closeMemberMenu = () => {
    setMemberMenuTarget(null);
  };

  const openInviteMenu = (item: InviteItem) => {
    setInviteMenuTarget(item);
  };

  const closeInviteMenu = () => {
    setInviteMenuTarget(null);
  };

  const openInviteSheet = () => {
    setInviteEmail("");
    setInviteError("");
    setIsInviteSheetOpen(true);
  };

  const closeInviteSheet = useCallback(() => {
    if (isSubmittingInvite) return;
    setIsInviteSheetOpen(false);
    setInviteEmail("");
    setInviteError("");
  }, [isSubmittingInvite]);

  const handleRemoveMember = useCallback(
    (member: MemberItem) => {
      void member;
    },
    [removeMemberHook, membersHook, showToast]
  );

  const handleCancelInvite = useCallback(
    (invite: InviteItem) => {
      void invite;
    },
    [cancelInviteHook, invitesHook, showToast]
  );

  const [confirmSheet, setConfirmSheet] = useState<null | {
    title: string;
    body?: string;
    confirmLabel: string;
    confirmTone: "danger" | "primary";
    onConfirm: () => Promise<void>;
  }>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const closeConfirmSheet = useCallback(() => {
    if (isConfirming) return;
    setConfirmSheet(null);
  }, [isConfirming]);

  const openConfirmRemoveMember = useCallback(
    (member: MemberItem) => {
      setConfirmSheet({
        title: "Remover membro?",
        body: `Tem certeza que deseja remover ${member.name}?`,
        confirmLabel: "Remover",
        confirmTone: "danger",
        onConfirm: async () => {
          setIsConfirming(true);
          try {
            const result = await removeMemberHook.remove(member.userId);
            if (result.ok) {
              showToast("Membro removido com sucesso");
            } else {
              showToast(result.error || "Erro ao remover membro");
            }
          } finally {
            setIsConfirming(false);
            setConfirmSheet(null);
          }
        },
      });
    },
    [membersHook, removeMemberHook, showToast]
  );

  const openConfirmCancelInvite = useCallback(
    (invite: InviteItem) => {
      setConfirmSheet({
        title: "Cancelar convite?",
        body: `Cancelar convite para ${invite.email}?`,
        confirmLabel: "Cancelar convite",
        confirmTone: "danger",
        onConfirm: async () => {
          setIsConfirming(true);
          try {
            const result = await cancelInviteHook.cancel(invite.id);
            if (result.ok) {
              showToast("Convite cancelado com sucesso");
            } else {
              showToast(result.error || "Erro ao cancelar convite");
            }
          } finally {
            setIsConfirming(false);
            setConfirmSheet(null);
          }
        },
      });
    },
    [cancelInviteHook, invitesHook, showToast]
  );

  const handleResendInvite = useCallback(
    async (invite: InviteItem) => {
      const result = await resendInviteHook.resend(invite.id);
      if (result.ok) {
        showToast("Convite reenviado com sucesso");
      } else {
        showToast(result.error || "Erro ao reenviar convite");
      }
    },
    [resendInviteHook, showToast]
  );

  const handleCreateInvite = useCallback(async () => {
    const email = inviteEmail.trim();
    if (!email) {
      setInviteError("Digite um email válido");
      return;
    }

    setIsSubmittingInvite(true);
    setInviteError("");

    try {
      const result = await createInviteHook.create({
        email,
        role: "member",
      });

      if (result.ok) {
        showToast("Convite enviado com sucesso");
        closeInviteSheet();
      } else {
        setInviteError(result.error || "Erro ao enviar convite");
      }
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Erro ao enviar convite");
    } finally {
      setIsSubmittingInvite(false);
    }
  }, [inviteEmail, createInviteHook, invitesHook, showToast, closeInviteSheet]);

  const handleApproveRequest = useCallback(
    async (request: RequestItem) => {
      if (reviewingRequestIds[request.id]) return;
      setReviewingRequestIds((prev) => ({ ...prev, [request.id]: true }));
      try {
        const result = await reviewMutation.approve(request.id);
        if (result.ok) {
          showToast("Solicitação aprovada com sucesso");
        } else {
          showToast(
            reviewMutation.friendlyError ||
              result.error ||
              "Erro ao aprovar solicitação"
          );
        }
      } catch (e) {
        showToast(
          e instanceof Error ? e.message : "Erro ao aprovar solicitação"
        );
      } finally {
        setReviewingRequestIds((prev) => {
          const next = { ...prev };
          delete next[request.id];
          return next;
        });
      }
    },
    [reviewMutation, reviewingRequestIds, showToast]
  );

  const handleRejectRequest = useCallback(
    async (request: RequestItem) => {
      if (reviewingRequestIds[request.id]) return;
      setReviewingRequestIds((prev) => ({ ...prev, [request.id]: true }));
      try {
        const result = await reviewMutation.reject(request.id);
        if (result.ok) {
          showToast("Solicitação recusada");
        } else {
          showToast(
            reviewMutation.friendlyError ||
              result.error ||
              "Erro ao recusar solicitação"
          );
        }
      } catch (e) {
        showToast(
          e instanceof Error ? e.message : "Erro ao recusar solicitação"
        );
      } finally {
        setReviewingRequestIds((prev) => {
          const next = { ...prev };
          delete next[request.id];
          return next;
        });
      }
    },
    [reviewMutation, reviewingRequestIds, showToast]
  );

  const headerVisibleHeight = 52;
  const headerTotalHeight = headerVisibleHeight + (insets.top ?? 0);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  if (!canManage) {
    return (
      <View style={[styles.screen, { backgroundColor: baseBgColor }]}>
        <View
          style={[
            styles.fixedHeader,
            {
              height: headerTotalHeight,
              paddingTop: insets.top ?? 0,
              backgroundColor: baseBgColor,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={goBack}
            hitSlop={10}
            style={styles.headerIconBtn}
          >
            <Ionicons name="chevron-back" size={22} color={headerFgColor} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: headerFgColor }]}>
              Membros do terreiro
            </Text>
          </View>
        </View>
        <View style={styles.content}>
          <Text style={[styles.emptyText, { color: textSecondary }]}>
            Você não tem permissão para acessar esta tela.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: baseBgColor }]}>
      {/* Confirm sheet */}
      <BottomSheet
        visible={!!confirmSheet}
        variant={variant}
        onClose={closeConfirmSheet}
      >
        <View>
          <Text style={[styles.sheetTitle, { color: textPrimary }]}>
            {confirmSheet?.title ?? ""}
          </Text>

          {confirmSheet?.body ? (
            <Text style={[styles.sheetSubtitle, { color: textSecondary }]}>
              {confirmSheet.body}
            </Text>
          ) : null}

          <View style={styles.sheetActions}>
            <Pressable
              accessibilityRole="button"
              disabled={isConfirming}
              onPress={closeConfirmSheet}
              style={({ pressed }) => [
                styles.sheetActionRow,
                pressed ? styles.sheetActionPressed : null,
                isConfirming ? styles.buttonDisabled : null,
              ]}
            >
              <Text style={[styles.sheetActionText, { color: textPrimary }]}>
                Cancelar
              </Text>
            </Pressable>

            <Separator variant={variant} />

            <Pressable
              accessibilityRole="button"
              disabled={isConfirming}
              onPress={() => {
                const action = confirmSheet?.onConfirm;
                if (!action) return;
                void action();
              }}
              style={({ pressed }) => [
                styles.sheetActionRow,
                pressed ? styles.sheetActionPressed : null,
                isConfirming ? styles.buttonDisabled : null,
              ]}
            >
              <Text
                style={[
                  styles.sheetActionText,
                  {
                    color:
                      confirmSheet?.confirmTone === "danger"
                        ? dangerColor
                        : textPrimary,
                  },
                ]}
              >
                {confirmSheet?.confirmLabel ?? "Confirmar"}
              </Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>

      {/* Member menu */}
      <BottomSheet
        visible={!!memberMenuTarget}
        variant={variant}
        onClose={closeMemberMenu}
      >
        <View>
          <Text style={[styles.sheetTitle, { color: textPrimary }]}>Ações</Text>
          {memberMenuTarget?.name ? (
            <Text style={[styles.sheetSubtitle, { color: textSecondary }]}>
              {memberMenuTarget.name}
            </Text>
          ) : null}

          <View style={styles.sheetActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remover membro"
              hitSlop={10}
              onPress={() => {
                const target = memberMenuTarget;
                closeMemberMenu();
                if (!target) return;
                setTimeout(() => openConfirmRemoveMember(target), 80);
              }}
              style={({ pressed }) => [
                styles.sheetActionRow,
                pressed ? styles.sheetActionPressed : null,
              ]}
            >
              <Ionicons name="person-remove" size={18} color={dangerColor} />
              <Text style={[styles.sheetActionText, { color: dangerColor }]}>
                Remover membro
              </Text>
            </Pressable>
          </View>

          <Image
            source={fillerPng}
            style={styles.sheetFiller}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>
      </BottomSheet>

      {/* Invite menu */}
      <BottomSheet
        visible={!!inviteMenuTarget}
        variant={variant}
        onClose={closeInviteMenu}
      >
        <View>
          <Text style={[styles.sheetTitle, { color: textPrimary }]}>Ações</Text>
          {inviteMenuTarget?.email ? (
            <Text style={[styles.sheetSubtitle, { color: textSecondary }]}>
              {inviteMenuTarget.email}
            </Text>
          ) : null}

          <View style={styles.sheetActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reenviar convite"
              hitSlop={10}
              onPress={() => {
                const target = inviteMenuTarget;
                closeInviteMenu();
                if (!target) return;
                setTimeout(() => handleResendInvite(target), 80);
              }}
              style={({ pressed }) => [
                styles.sheetActionRow,
                pressed ? styles.sheetActionPressed : null,
              ]}
            >
              <Ionicons name="mail-outline" size={18} color={textPrimary} />
              <Text style={[styles.sheetActionText, { color: textPrimary }]}>
                Reenviar convite
              </Text>
            </Pressable>

            <Separator variant={variant} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancelar convite"
              hitSlop={10}
              onPress={() => {
                const target = inviteMenuTarget;
                closeInviteMenu();
                if (!target) return;
                setTimeout(() => openConfirmCancelInvite(target), 80);
              }}
              style={({ pressed }) => [
                styles.sheetActionRow,
                pressed ? styles.sheetActionPressed : null,
              ]}
            >
              <Ionicons name="close-circle" size={18} color={dangerColor} />
              <Text style={[styles.sheetActionText, { color: dangerColor }]}>
                Cancelar convite
              </Text>
            </Pressable>
          </View>

          <Image
            source={fillerPng}
            style={styles.sheetFiller}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>
      </BottomSheet>

      {/* Invite sheet */}
      <BottomSheet
        visible={isInviteSheetOpen}
        variant={variant}
        onClose={closeInviteSheet}
      >
        <View style={styles.inviteSheet}>
          <Text style={[styles.sheetTitle, { color: textPrimary }]}>
            Convidar membro
          </Text>

          <View
            style={[
              styles.inputWrap,
              {
                borderColor: inputBorder,
                backgroundColor: inputBg,
              },
            ]}
          >
            <TextInput
              value={inviteEmail}
              onChangeText={setInviteEmail}
              style={[styles.input, { color: textPrimary }]}
              placeholder="Email do convidado"
              placeholderTextColor={textSecondary}
              selectionColor={accentColor}
              editable={!isSubmittingInvite}
              autoCorrect={false}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="done"
              onSubmitEditing={handleCreateInvite}
            />
          </View>

          {inviteError ? (
            <Text style={[styles.errorText, { color: dangerColor }]}>
              {inviteError}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enviar convite"
            disabled={isSubmittingInvite}
            onPress={handleCreateInvite}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.primaryButtonPressed : null,
              isSubmittingInvite ? styles.buttonDisabled : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>Enviar convite</Text>
          </Pressable>

          <Image
            source={fillerPng}
            style={styles.sheetFiller}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>
      </BottomSheet>

      {/* Fixed header */}
      <View
        style={[
          styles.fixedHeader,
          {
            height: headerTotalHeight,
            paddingTop: insets.top ?? 0,
            backgroundColor: baseBgColor,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={goBack}
          hitSlop={10}
          style={styles.headerIconBtn}
        >
          <Ionicons name="chevron-back" size={22} color={headerFgColor} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: headerFgColor }]}>
            Membros do terreiro
          </Text>
        </View>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerTotalHeight + spacing.lg },
        ]}
      >
        {/* Section 1: Members */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            Membros
          </Text>

          {membersHook.isLoading ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                Carregando…
              </Text>
            </View>
          ) : membersHook.error ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                Erro ao carregar membros
              </Text>
            </View>
          ) : memberItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                Nenhum membro cadastrado ainda.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {memberItems.map((item) => (
                <View key={item.id} style={styles.listItem}>
                  <SurfaceCard variant={variant}>
                    <View style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text
                          style={[styles.itemName, { color: textPrimary }]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        {item.showEmailLine ? (
                          <Text
                            style={[styles.itemEmail, { color: textMuted }]}
                            numberOfLines={1}
                          >
                            {item.email}
                          </Text>
                        ) : null}
                      </View>

                      <View style={styles.itemActions}>
                        <TagChip label="Membro" variant={variant} />

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Abrir menu"
                          hitSlop={10}
                          onPress={() => openMemberMenu(item)}
                          style={({ pressed }) => [
                            styles.menuButton,
                            pressed ? styles.menuButtonPressed : null,
                          ]}
                        >
                          <Ionicons
                            name="ellipsis-vertical"
                            size={18}
                            color={accentColor}
                          />
                        </Pressable>
                      </View>
                    </View>
                  </SurfaceCard>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* CTA: Invite member */}
        <View style={styles.ctaSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Convidar membro"
            onPress={openInviteSheet}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: inputBorder },
              pressed ? styles.secondaryButtonPressed : null,
            ]}
          >
            <Ionicons name="person-add" size={18} color={accentColor} />
            <Text style={[styles.secondaryButtonText, { color: textPrimary }]}>
              Convidar membro
            </Text>
          </Pressable>
        </View>

        {/* Section 2: Pending invites */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            Convites enviados
          </Text>

          {invitesHook.isLoading ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                Carregando…
              </Text>
            </View>
          ) : invitesHook.error ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                Erro ao carregar convites
              </Text>
            </View>
          ) : inviteItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                Nenhum convite pendente.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {inviteItems.map((item) => (
                <View key={item.id} style={styles.listItem}>
                  <SurfaceCard variant={variant}>
                    <View style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text
                          style={[styles.itemName, { color: textPrimary }]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={[styles.itemEmail, { color: textMuted }]}
                          numberOfLines={1}
                        >
                          {item.showEmailLine
                            ? `${item.email} · Pendente · ${item.createdAtLabel}`
                            : `Pendente · ${item.createdAtLabel}`}
                        </Text>
                      </View>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Abrir menu"
                        hitSlop={10}
                        onPress={() => openInviteMenu(item)}
                        style={({ pressed }) => [
                          styles.menuButton,
                          pressed ? styles.menuButtonPressed : null,
                        ]}
                      >
                        <Ionicons
                          name="ellipsis-vertical"
                          size={18}
                          color={accentColor}
                        />
                      </Pressable>
                    </View>
                  </SurfaceCard>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Section 3: Pending requests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>
              Pedidos de acesso
            </Text>
            {requestItems.length > 0 ? (
              <TagChip
                label={requestItems.length.toString()}
                variant={variant}
                appearance="primary"
              />
            ) : null}
          </View>

          {requestsHook.isLoading ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                Carregando…
              </Text>
            </View>
          ) : requestsHook.error ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                Erro ao carregar pedidos
              </Text>
            </View>
          ) : requestItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                Nenhum pedido de acesso no momento.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {requestItems.map((item) => (
                <View key={item.id} style={styles.listItem}>
                  <SurfaceCard variant={variant}>
                    <View style={styles.requestCard}>
                      <View style={styles.requestInfo}>
                        <View
                          style={[
                            styles.requestAvatarWrap,
                            {
                              borderColor: inputBorder,
                              backgroundColor: inputBg,
                            },
                          ]}
                        >
                          {item.avatarUrl ? (
                            <Image
                              source={{ uri: item.avatarUrl }}
                              style={styles.requestAvatarImage}
                            />
                          ) : (
                            <Text
                              style={[
                                styles.requestAvatarInitials,
                                { color: textPrimary },
                              ]}
                            >
                              {item.initials}
                            </Text>
                          )}
                        </View>

                        <View style={styles.requestTextCol}>
                          <Text
                            style={[styles.itemName, { color: textPrimary }]}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>

                          {item.showEmailLine ? (
                            <Text
                              style={[styles.itemEmail, { color: textMuted }]}
                              numberOfLines={1}
                            >
                              {item.email}
                            </Text>
                          ) : null}

                          <Text
                            style={[styles.itemTime, { color: textMuted }]}
                            numberOfLines={1}
                          >
                            {item.requestedAtLabel}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.requestActions}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Recusar"
                          disabled={!!reviewingRequestIds[item.id]}
                          onPress={() => handleRejectRequest(item)}
                          style={({ pressed }) => [
                            styles.requestButton,
                            styles.requestRejectButton,
                            { borderColor: dangerColor },
                            reviewingRequestIds[item.id]
                              ? styles.requestButtonDisabled
                              : null,
                            pressed ? styles.requestButtonPressed : null,
                          ]}
                        >
                          <Text
                            style={[
                              styles.requestButtonText,
                              { color: dangerColor },
                            ]}
                          >
                            Recusar
                          </Text>
                        </Pressable>

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Aprovar"
                          disabled={!!reviewingRequestIds[item.id]}
                          onPress={() => handleApproveRequest(item)}
                          style={({ pressed }) => [
                            styles.requestButton,
                            styles.requestApproveButton,
                            { backgroundColor: accentColor },
                            reviewingRequestIds[item.id]
                              ? styles.requestButtonDisabled
                              : null,
                            pressed ? styles.requestButtonPressed : null,
                          ]}
                        >
                          <Text
                            style={[
                              styles.requestButtonText,
                              { color: colors.paper50 },
                            ]}
                          >
                            Aprovar
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </SurfaceCard>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: spacing.lg }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 6,
    marginRight: 6,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  list: {
    gap: spacing.sm,
  },
  listItem: {},
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "900",
  },
  itemEmail: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
  },
  itemTime: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
  },
  menuButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  menuButtonPressed: {
    opacity: 0.7,
  },
  emptyState: {
    paddingVertical: spacing.md,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "700",
  },
  ctaSection: {
    marginBottom: spacing.lg,
  },
  secondaryButton: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },
  secondaryButtonPressed: {
    opacity: 0.82,
  },
  requestCard: {
    gap: spacing.md,
  },
  requestInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  requestAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  requestAvatarImage: {
    width: 44,
    height: 44,
  },
  requestAvatarInitials: {
    fontSize: 14,
    fontWeight: "900",
  },
  requestTextCol: {
    flex: 1,
    minWidth: 0,
  },
  requestActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  requestButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  requestRejectButton: {
    backgroundColor: "transparent",
  },
  requestApproveButton: {},
  requestButtonDisabled: {
    opacity: 0.55,
  },
  requestButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },
  requestButtonPressed: {
    opacity: 0.82,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  sheetSubtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.9,
  },
  sheetActions: {
    marginTop: spacing.md,
  },
  sheetActionRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sheetActionText: {
    fontSize: 14,
    fontWeight: "800",
  },
  sheetActionPressed: {
    opacity: 0.75,
  },
  sheetFiller: {
    width: "100%",
    height: 290,
    marginTop: spacing.lg,
  },
  inviteSheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  inputWrap: {
    marginTop: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: "center",
  },
  input: {
    fontSize: 14,
    fontWeight: "800",
  },
  errorText: {
    marginTop: spacing.sm,
    fontSize: 12,
    fontWeight: "800",
  },
  primaryButton: {
    marginTop: spacing.md,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.brass600,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.paper50,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
