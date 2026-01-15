import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { BottomSheet } from "@/src/components/BottomSheet";
import { Separator } from "@/src/components/Separator";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { useGlobalSafeAreaInsets } from "@/src/contexts/GlobalSafeAreaInsetsContext";
import {
  useCancelTerreiroInvite,
  useCreateTerreiroInvite,
  useRemoveTerreiroMember,
  useResendTerreiroInvite,
  useTerreiroInvites,
  useTerreiroMembers,
  useTerreiroMembershipStatus,
} from "@/src/hooks/terreiroMembership";
import { queryKeys } from "@/src/queries/queryKeys";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

type ManagementMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  showEmailLine: boolean;
  role: "admin" | "editor";
};

type ManagementInvite = {
  id: string;
  name: string;
  email: string;
  showEmailLine: boolean;
  role: "admin" | "editor";
  createdAtLabel: string;
};

function normalizeEmailLower(value: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
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

function getRoleLabel(role: "admin" | "editor"): string {
  return role === "admin" ? "Admin" : "Editor";
}

export default function AccessManager() {
  const router = useRouter();
  const params = useLocalSearchParams<{ terreiroId?: string }>();
  const terreiroId =
    typeof params.terreiroId === "string" ? params.terreiroId : "";

  const { user } = useAuth();
  const { effectiveTheme } = usePreferences();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
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

  // Check permissions - only admin can access
  const membershipQuery = useTerreiroMembershipStatus(terreiroId);
  const membership = membershipQuery.data;
  const myRole = membership.role;
  const canManage = membership.isActiveMember && myRole === "admin";

  useEffect(() => {
    if (!terreiroId) return;
    if (membershipQuery.isLoading) return;

    const role = membershipQuery.data?.role ?? null;
    const isActive = membershipQuery.data?.isActiveMember ?? false;

    if (isActive && role === "editor") {
      showToast("Acesso restrito à administração.");
      router.back();
    }
  }, [
    membershipQuery.data,
    membershipQuery.isLoading,
    router,
    showToast,
    terreiroId,
  ]);

  // Load data
  const membersHook = useTerreiroMembers(terreiroId);
  const invitesHook = useTerreiroInvites(terreiroId);
  const removeMemberHook = useRemoveTerreiroMember(terreiroId);
  const createInviteHook = useCreateTerreiroInvite(terreiroId);
  const cancelInviteHook = useCancelTerreiroInvite(terreiroId);
  const resendInviteHook = useResendTerreiroInvite();

  // Management members (admin + editor only)
  const managementMembers = useMemo<ManagementMember[]>(() => {
    if (!membersHook.items) return [];

    return membersHook.items
      .filter(
        (m) =>
          (m.role === "admin" || m.role === "editor") && m.status === "active"
      )
      .map((m) => {
        const profile = membersHook.profilesById[m.user_id];
        const email = (profile?.email ?? "").trim() || "Email indisponível";
        const fullName = (profile?.full_name ?? "").trim();
        const name = fullName ? fullName : email;
        const showEmailLine = !!fullName;

        return {
          id: m.user_id,
          userId: m.user_id,
          name,
          email,
          showEmailLine,
          role: m.role as "admin" | "editor",
        };
      });
  }, [membersHook.items, membersHook.profilesById]);

  // Management invites (admin + editor only)
  const managementInvites = useMemo<ManagementInvite[]>(() => {
    if (!invitesHook.pending) return [];

    return invitesHook.pending
      .filter((inv) => inv.role === "admin" || inv.role === "editor")
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
          role: inv.role as "admin" | "editor",
          createdAtLabel: formatTimeAgo(inv.created_at ?? null),
        };
      });
  }, [invitesHook.pending, invitesHook.profilesByEmailLower]);

  // UI State
  const [memberMenuTarget, setMemberMenuTarget] =
    useState<ManagementMember | null>(null);
  const [inviteMenuTarget, setInviteMenuTarget] =
    useState<ManagementInvite | null>(null);

  const [isInviteSheetOpen, setIsInviteSheetOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor">("admin");
  const [inviteError, setInviteError] = useState("");
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  const [isRoleSelectOpen, setIsRoleSelectOpen] = useState(false);

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

  const openMemberMenu = (item: ManagementMember) => {
    setMemberMenuTarget(item);
  };

  const closeMemberMenu = () => {
    setMemberMenuTarget(null);
  };

  const openInviteMenu = (item: ManagementInvite) => {
    setInviteMenuTarget(item);
  };

  const closeInviteMenu = () => {
    setInviteMenuTarget(null);
  };

  const openInviteSheet = () => {
    setInviteEmail("");
    setInviteRole("admin");
    setInviteError("");
    setIsInviteSheetOpen(true);
  };

  const closeInviteSheet = useCallback(() => {
    if (isSubmittingInvite) return;
    setIsInviteSheetOpen(false);
    setInviteEmail("");
    setInviteRole("admin");
    setInviteError("");
  }, [isSubmittingInvite]);

  const handleToggleRole = useCallback(
    (member: ManagementMember) => {
      const newRole = member.role === "admin" ? "editor" : "admin";

      setConfirmSheet({
        title: "Alterar papel na gestão",
        body: `Você está prestes a alterar o papel administrativo desta pessoa no terreiro.\n\nNovo papel: ${getRoleLabel(
          newRole
        )}`,
        confirmLabel: "Alterar papel",
        confirmTone: "primary",
        onConfirm: async () => {
          setIsConfirming(true);
          try {
            const res = await supabase
              .from("terreiro_members")
              .update({ role: newRole })
              .eq("terreiro_id", terreiroId)
              .eq("user_id", member.userId);

            if (res.error) {
              throw new Error(
                typeof res.error.message === "string"
                  ? res.error.message
                  : "Erro ao alterar papel"
              );
            }

            showToast("Papel atualizado com sucesso");
            membersHook.reload();

            // Invalidate membership queries
            if (user?.id) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.me.membership(user.id),
              });
              queryClient.invalidateQueries({
                queryKey: queryKeys.terreiros.withRole(user.id),
              });
            }
          } catch (e) {
            showToast(e instanceof Error ? e.message : "Erro ao alterar papel");
          } finally {
            setIsConfirming(false);
            setConfirmSheet(null);
          }
        },
      });
    },
    [terreiroId, membersHook, showToast, queryClient, user?.id]
  );

  const handleRemoveMember = useCallback(
    (member: ManagementMember) => {
      const isRemovingAdmin = member.role === "admin";
      const warningText = isRemovingAdmin
        ? "Esta pessoa perderá o acesso administrativo ao terreiro no Saravafy. Ela não poderá mais editar conteúdos ou gerenciar coleções.\n\nCertifique-se de que exista pelo menos uma pessoa administradora no terreiro."
        : "Esta pessoa perderá o acesso administrativo ao terreiro no Saravafy. Ela não poderá mais editar conteúdos ou gerenciar coleções.";

      setConfirmSheet({
        title: "Remover da gestão",
        body: warningText,
        confirmLabel: "Remover da gestão",
        confirmTone: "danger",
        onConfirm: async () => {
          setIsConfirming(true);
          try {
            const result = await removeMemberHook.remove(member.userId);
            if (result.ok) {
              showToast("Removido da gestão com sucesso");

              // Invalidate membership queries
              if (user?.id) {
                queryClient.invalidateQueries({
                  queryKey: queryKeys.me.membership(user.id),
                });
                queryClient.invalidateQueries({
                  queryKey: queryKeys.terreiros.withRole(user.id),
                });
              }
            } else {
              showToast(result.error || "Erro ao remover da gestão");
            }
          } finally {
            setIsConfirming(false);
            setConfirmSheet(null);
          }
        },
      });
    },
    [removeMemberHook, membersHook, showToast, queryClient, user?.id]
  );

  const handleCancelInvite = useCallback(
    (invite: ManagementInvite) => {
      setConfirmSheet({
        title: "Cancelar convite",
        body: "Este convite será cancelado e a pessoa não poderá mais acessar o terreiro como gestora.",
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
    async (invite: ManagementInvite) => {
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
        role: inviteRole,
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
  }, [
    inviteEmail,
    inviteRole,
    createInviteHook,
    showToast,
    closeInviteSheet,
  ]);

  const headerVisibleHeight = 52;
  const headerTotalHeight = headerVisibleHeight + (insets.top ?? 0);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  if (!canManage) {
    if (membership.isActiveMember && myRole === "editor") {
      return <View style={[styles.screen, { backgroundColor: baseBgColor }]} />;
    }

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
              Gestão do terreiro
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
            {confirmSheet?.title ?? "Confirmar"}
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
                Voltar
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
          {memberMenuTarget?.email ? (
            <Text style={[styles.sheetSubtitle, { color: textSecondary }]}>
              {memberMenuTarget.email}
            </Text>
          ) : null}

          <View style={styles.sheetActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Alterar papel"
              hitSlop={10}
              onPress={() => {
                const target = memberMenuTarget;
                closeMemberMenu();
                if (!target) return;
                setTimeout(() => handleToggleRole(target), 80);
              }}
              style={({ pressed }) => [
                styles.sheetActionRow,
                pressed ? styles.sheetActionPressed : null,
              ]}
            >
              <Ionicons name="swap-horizontal" size={18} color={textPrimary} />
              <Text style={[styles.sheetActionText, { color: textPrimary }]}>
                Alterar papel
              </Text>
            </Pressable>

            <Separator variant={variant} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remover da gestão"
              hitSlop={10}
              onPress={() => {
                const target = memberMenuTarget;
                closeMemberMenu();
                if (!target) return;
                setTimeout(() => handleRemoveMember(target), 80);
              }}
              style={({ pressed }) => [
                styles.sheetActionRow,
                pressed ? styles.sheetActionPressed : null,
              ]}
            >
              <Ionicons name="close-circle" size={18} color={dangerColor} />
              <Text style={[styles.sheetActionText, { color: dangerColor }]}>
                Remover da gestão
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
                setTimeout(() => handleCancelInvite(target), 80);
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
            Convidar para gestão
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

          <Text style={[styles.label, { color: textSecondary }]}>Papel</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsRoleSelectOpen(true)}
            disabled={isSubmittingInvite}
            style={({ pressed }) => [
              styles.selectField,
              {
                borderColor: inputBorder,
                backgroundColor: inputBg,
              },
              pressed ? styles.selectFieldPressed : null,
            ]}
          >
            <Text style={[styles.selectValue, { color: textPrimary }]}>
              {getRoleLabel(inviteRole)}
            </Text>
            <Ionicons name="chevron-down" size={18} color={textMuted} />
          </Pressable>

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

      {/* Role select sheet */}
      <BottomSheet
        visible={isRoleSelectOpen}
        variant={variant}
        onClose={() => setIsRoleSelectOpen(false)}
      >
        <View>
          <Text style={[styles.sheetTitle, { color: textPrimary }]}>
            Escolher papel
          </Text>

          <View style={styles.sheetActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setInviteRole("admin");
                setIsRoleSelectOpen(false);
              }}
              style={({ pressed }) => [
                styles.sheetActionRow,
                pressed ? styles.sheetActionPressed : null,
              ]}
            >
              <Text style={[styles.sheetActionText, { color: textPrimary }]}>
                Admin
              </Text>
            </Pressable>

            <Separator variant={variant} />

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setInviteRole("editor");
                setIsRoleSelectOpen(false);
              }}
              style={({ pressed }) => [
                styles.sheetActionRow,
                pressed ? styles.sheetActionPressed : null,
              ]}
            >
              <Text style={[styles.sheetActionText, { color: textPrimary }]}>
                Editor
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
            Gestão do terreiro
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
        {/* Section 1: Management members */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            Gestão do terreiro
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
                Erro ao carregar gestão
              </Text>
            </View>
          ) : managementMembers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                Você é a única pessoa na gestão deste terreiro.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {managementMembers.map((item) => (
                <View key={item.id} style={styles.listItem}>
                  <SurfaceCard variant={variant}>
                    <View style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text
                          style={[styles.itemEmail, { color: textPrimary }]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        {item.showEmailLine ? (
                          <Text
                            style={[styles.itemRole, { color: textMuted }]}
                            numberOfLines={1}
                          >
                            {item.email} · {getRoleLabel(item.role)}
                          </Text>
                        ) : (
                          <Text
                            style={[styles.itemRole, { color: textMuted }]}
                            numberOfLines={1}
                          >
                            {getRoleLabel(item.role)}
                          </Text>
                        )}
                      </View>

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
                  </SurfaceCard>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* CTA: Invite to management */}
        <View style={styles.ctaSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Convidar para gestão"
            onPress={openInviteSheet}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: inputBorder },
              pressed ? styles.secondaryButtonPressed : null,
            ]}
          >
            <Ionicons name="person-add" size={18} color={accentColor} />
            <Text style={[styles.secondaryButtonText, { color: textPrimary }]}>
              Convidar para gestão
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
          ) : managementInvites.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                Nenhum convite de gestão pendente.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {managementInvites.map((item) => (
                <View key={item.id} style={styles.listItem}>
                  <SurfaceCard variant={variant}>
                    <View style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text
                          style={[styles.itemEmail, { color: textPrimary }]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={[styles.itemRole, { color: textMuted }]}
                          numberOfLines={1}
                        >
                          {item.showEmailLine
                            ? `${item.email} · ${getRoleLabel(
                                item.role
                              )} · Pendente · ${item.createdAtLabel}`
                            : `${getRoleLabel(item.role)} · Pendente · ${
                                item.createdAtLabel
                              }`}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: spacing.md,
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
  itemEmail: {
    fontSize: 15,
    fontWeight: "900",
  },
  itemRole: {
    marginTop: 4,
    fontSize: 13,
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
    textAlign: "center",
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
  label: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontSize: 12,
    fontWeight: "700",
  },
  selectField: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
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
  selectFieldPressed: {
    opacity: 0.8,
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
