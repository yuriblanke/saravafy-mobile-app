import { useAuth } from "@/contexts/AuthContext";
import { useCuratorMode } from "@/contexts/CuratorModeContext";
import { usePreferences, type ThemeMode } from "@/contexts/PreferencesContext";
import { useRootPager } from "@/contexts/RootPagerContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { AccessRoleInfo } from "@/src/components/AccessRoleInfo";
import { Badge } from "@/src/components/Badge";
import { BottomSheet } from "@/src/components/BottomSheet";
import { CurimbaExplainerBottomSheet } from "@/src/components/CurimbaExplainerBottomSheet";
import {
  PreferencesPageItem,
  PreferencesRadioGroup,
  PreferencesSection,
  PreferencesSwitchItem,
  type PreferencesRadioOption,
} from "@/src/components/preferences";
import { getGlobalRoleBadgeLabel } from "@/src/domain/globalRoles";
import { useIsCurator } from "@/src/hooks/useIsCurator";
import { useIsDevMaster } from "@/src/hooks/useIsDevMaster";
import { useMyEditableTerreirosQuery } from "@/src/queries/me";
import { queryKeys } from "@/src/queries/queryKeys";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

function getInitials(value: string | undefined) {
  const fallback = "YB";
  if (!value) return fallback;

  const raw = value.includes("@") ? value.split("@")[0] : value;
  const parts = raw
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(" ")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getDisplayName(value: string | undefined) {
  if (!value) return "Usuário";
  const raw = value.trim();
  if (!raw) return "Usuário";
  if (raw.includes("@")) return raw.split("@")[0];
  return raw;
}

type InviteRole = "admin" | "editor" | "member" | "follower";

type PendingCuratorInvite = {
  id: string;
  created_at: string;
};

type PendingTerreiroInvite = {
  id: string;
  terreiro_id: string;
  role: InviteRole;
  created_at: string;
  terreiro_title?: string | null;
};

function isColumnMissingError(message: string, columnName: string) {
  const m = String(message ?? "");
  return (
    m.includes(columnName) &&
    (m.includes("does not exist") || m.includes("column"))
  );
}

function getInviteRoleLabel(role: InviteRole): string {
  if (role === "admin") return "Admin";
  if (role === "editor") return "Editora";
  if (role === "member") return "Membro";
  return "Seguidora";
}

function normalizeEmail(value: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getFriendlyActionError(message: string) {
  const m = String(message ?? "").toLowerCase();
  if (!m) {
    return "Não foi possível concluir agora. Verifique sua conexão e tente novamente.";
  }

  if (
    m.includes("failed to fetch") ||
    m.includes("network") ||
    m.includes("timeout") ||
    m.includes("fetch")
  ) {
    return "Sem conexão no momento. Verifique sua internet e tente novamente.";
  }

  if (
    m.includes("permission") ||
    m.includes("not authorized") ||
    m.includes("row-level") ||
    m.includes("rls")
  ) {
    return "Você não tem permissão para concluir esta ação.";
  }

  return "Não foi possível concluir agora. Verifique sua conexão e tente novamente.";
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "";
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return "";
  try {
    return new Date(t).toLocaleDateString("pt-BR");
  } catch {
    return "";
  }
}

type AppHeaderWithPreferencesProps = {
  suspended?: boolean;
};

export function AppHeaderWithPreferences(props: AppHeaderWithPreferencesProps) {
  const { suspended = false } = props;
  const router = useRouter();
  const pathname = usePathname();
  const rootPager = useRootPager();
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const {
    themeMode,
    setThemeMode,
    effectiveTheme,
    curimbaEnabled,
    setCurimbaEnabled,
    curimbaOnboardingDismissed,
    setCurimbaOnboardingDismissed,
    startPagePreference,
    fetchTerreirosQueAdministro,
  } = usePreferences();

  const variant = effectiveTheme;
  const uiEnabled = !suspended;

  const isOnRootPager = typeof pathname === "string" && pathname === "/";

  const isTerreirosActive =
    isOnRootPager && rootPager
      ? rootPager.activeKey === "terreiros"
      : typeof pathname === "string" &&
        (pathname.startsWith("/terreiro") ||
          // Mantém o underline em "Terreiros" ao navegar dentro das playlists
          // de terreiros (collection/player), independente do contexto ativo.
          pathname.startsWith("/collection") ||
          pathname.startsWith("/player"));

  const isPontosActive =
    isOnRootPager && rootPager
      ? rootPager.activeKey === "pontos"
      : !isTerreirosActive;

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;
  const textMuted =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;

  const inputBg =
    variant === "light" ? colors.inputBgLight : colors.inputBgDark;
  const inputBorder =
    variant === "light" ? colors.inputBorderLight : colors.inputBorderDark;

  const dividerColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;

  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isCurimbaExplainerOpen, setIsCurimbaExplainerOpen] = useState(false);
  const [isCuratorAdminOpen, setIsCuratorAdminOpen] = useState(false);

  const [curatorInviteEmail, setCuratorInviteEmail] = useState("");
  const [curatorInviteInlineError, setCuratorInviteInlineError] = useState<
    string | null
  >(null);
  const [isCreatingCuratorInvite, setIsCreatingCuratorInvite] = useState(false);

  const userPhotoUrl =
    (typeof user?.user_metadata?.avatar_url === "string" &&
      user.user_metadata.avatar_url) ||
    (typeof user?.user_metadata?.picture === "string" &&
      user.user_metadata.picture) ||
    undefined;

  const initials = getInitials(
    (typeof user?.user_metadata?.name === "string" &&
      user.user_metadata.name) ||
      user?.email ||
      undefined
  );

  const userDisplayName = getDisplayName(
    (typeof user?.user_metadata?.name === "string" &&
      user.user_metadata.name) ||
      user?.email ||
      undefined
  );

  const userId = user?.id ?? null;
  const userEmail = typeof user?.email === "string" ? user.email : null;
  const normalizedUserEmail = userEmail ? userEmail.trim().toLowerCase() : null;

  const { isCurator, isLoading: isCuratorLoading } = useIsCurator();

  const {
    curatorModeEnabled,
    isLoading: curatorModeLoading,
    isSaving: curatorModeSaving,
    setCuratorModeEnabled,
  } = useCuratorMode();

  const { isDevMaster } = useIsDevMaster();

  const shouldShowCurator = !isCuratorLoading && isCurator;

  const curatorModeInfo = useMemo(() => {
    return {
      accessibilityLabel: "Ver detalhes do Modo Curator",
      title: "Modo Curator",
      body: "Ativa os botões de edição do papel de pessoa guardiã do acervo ao longo de toda a plataforma.",
      sections: [],
    };
  }, []);

  const myEditableTerreirosQuery = useMyEditableTerreirosQuery(userId);
  const myEditableTerreiros = useMemo(
    () => myEditableTerreirosQuery.data ?? [],
    [myEditableTerreirosQuery.data]
  );

  const myAdminTerreiros = useMemo(
    () => myEditableTerreiros.filter((t) => t.role === "admin"),
    [myEditableTerreiros]
  );

  const contextAvatarUrl = userPhotoUrl;
  const contextInitials = initials;

  const curatorInviteQuery = useQuery({
    queryKey: normalizedUserEmail
      ? queryKeys.curatorInvites.pendingForInvitee(normalizedUserEmail)
      : (["curatorInvites", "pendingForInvitee", null] as const),
    enabled:
      !!userId && !!normalizedUserEmail && isPreferencesOpen && !isCurator,
    staleTime: 0,
    queryFn: async () => {
      if (!normalizedUserEmail) return null;

      const res: any = await supabase
        .from("curator_invites")
        .select("id, created_at")
        .eq("status", "pending")
        .eq("email", normalizedUserEmail)
        .order("created_at", { ascending: true })
        .limit(1);

      if (res.error) {
        if (__DEV__) {
          console.warn("[PreferencesInvites] curator_invites error", res.error);
        }
        return null;
      }

      const row =
        Array.isArray(res.data) && res.data.length
          ? (res.data[0] as any)
          : null;
      if (!row?.id) return null;

      const invite: PendingCuratorInvite = {
        id: String(row.id),
        created_at: String(row.created_at ?? new Date().toISOString()),
      };

      return invite;
    },
  });

  const terreiroInvitesQuery = useQuery({
    queryKey: normalizedUserEmail
      ? queryKeys.terreiroInvites.pendingForInvitee(normalizedUserEmail)
      : (["terreiroInvites", "pendingForInvitee", null] as const),
    enabled: !!userId && !!normalizedUserEmail && isPreferencesOpen,
    staleTime: 0,
    queryFn: async () => {
      if (!normalizedUserEmail) return [] as PendingTerreiroInvite[];

      const selectWithTitle =
        "id, terreiro_id, role, created_at, terreiro:terreiros(title)";
      const selectWithName =
        "id, terreiro_id, role, created_at, terreiro:terreiros(name)";

      let res: any = await supabase
        .from("terreiro_invites")
        .select(selectWithTitle)
        .eq("status", "pending")
        .eq("email", normalizedUserEmail)
        .order("created_at", { ascending: true });

      if (res.error && isColumnMissingError(res.error.message, "title")) {
        res = await supabase
          .from("terreiro_invites")
          .select(selectWithName)
          .eq("status", "pending")
          .eq("email", normalizedUserEmail)
          .order("created_at", { ascending: true });
      }

      if (res.error) {
        if (__DEV__) {
          console.warn(
            "[PreferencesInvites] terreiro_invites error",
            res.error
          );
        }
        return [] as PendingTerreiroInvite[];
      }

      const rows: any[] = Array.isArray(res.data) ? res.data : [];
      return rows
        .map((row) => {
          const role = String(row?.role ?? "");
          const roleOk =
            role === "admin" ||
            role === "editor" ||
            role === "member" ||
            role === "follower";

          if (!row?.id || !row?.terreiro_id || !roleOk) return null;

          const terreiroTitle =
            typeof row?.terreiro?.title === "string"
              ? row.terreiro.title
              : typeof row?.terreiro?.name === "string"
              ? row.terreiro.name
              : null;

          const invite: PendingTerreiroInvite = {
            id: String(row.id),
            terreiro_id: String(row.terreiro_id),
            role: role as InviteRole,
            created_at: String(row.created_at ?? new Date().toISOString()),
            terreiro_title: terreiroTitle,
          };
          return invite;
        })
        .filter(Boolean) as PendingTerreiroInvite[];
    },
  });

  const [inviteProcessingKey, setInviteProcessingKey] = useState<string | null>(
    null
  );

  const pendingCuratorInvite = curatorInviteQuery.data ?? null;
  const pendingTerreiroInvites = terreiroInvitesQuery.data ?? [];

  const curatorInvitesAdminQuery = useQuery({
    queryKey: ["curatorInvites", "adminList"],
    enabled: !!userId && isDevMaster && isCuratorAdminOpen,
    staleTime: 0,
    queryFn: async () => {
      const res: any = await supabase
        .from("curator_invites")
        .select("id, email, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (res.error) {
        if (__DEV__) {
          console.warn(
            "[CuratorInvitesAdmin] curator_invites error",
            res.error
          );
        }
        throw new Error(
          typeof res.error.message === "string" ? res.error.message : "Erro"
        );
      }

      const rows = Array.isArray(res.data) ? res.data : [];
      return rows
        .map((row: any) => {
          const id = String(row?.id ?? "");
          if (!id) return null;
          return {
            id,
            email: String(row?.email ?? ""),
            status: String(row?.status ?? ""),
            created_at: String(row?.created_at ?? ""),
          };
        })
        .filter(Boolean) as {
        id: string;
        email: string;
        status: string;
        created_at: string;
      }[];
    },
  });

  const curatorInvitesAdmin = curatorInvitesAdminQuery.data ?? [];

  const acceptCuratorInvite = async (inviteId: string) => {
    if (!userId) return;
    setInviteProcessingKey(`curator:${inviteId}`);
    try {
      const payload = { p_invite_id: inviteId };
      const res: any = await supabase.rpc("accept_curator_invite", payload);

      if (res?.error) throw res.error;
      if (res?.data === false)
        throw new Error("accept_curator_invite returned false");

      queryClient.setQueryData(
        normalizedUserEmail
          ? queryKeys.curatorInvites.pendingForInvitee(normalizedUserEmail)
          : (["curatorInvites", "pendingForInvitee", null] as const),
        null
      );

      queryClient.invalidateQueries({
        queryKey: normalizedUserEmail
          ? queryKeys.curatorInvites.pendingForInvitee(normalizedUserEmail)
          : (["curatorInvites", "pendingForInvitee", null] as const),
        exact: true,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.globalRoles.isCurator(userId),
      });

      showToast(`Agora você é ${getGlobalRoleBadgeLabel("curator")}.`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (__DEV__) {
        console.error("[PreferencesInvites] accept curator failed", {
          inviteId,
          message,
          raw: e,
        });
      }
      showToast(
        "Não foi possível concluir agora. Verifique sua conexão e tente novamente."
      );
    } finally {
      setInviteProcessingKey(null);
    }
  };

  const rejectCuratorInvite = async (inviteId: string) => {
    if (!userId) return;
    setInviteProcessingKey(`curator:${inviteId}`);
    try {
      const payload = { p_invite_id: inviteId };
      const res: any = await supabase.rpc("reject_curator_invite", payload);

      if (res?.error) throw res.error;
      if (res?.data === false)
        throw new Error("reject_curator_invite returned false");

      queryClient.setQueryData(
        normalizedUserEmail
          ? queryKeys.curatorInvites.pendingForInvitee(normalizedUserEmail)
          : (["curatorInvites", "pendingForInvitee", null] as const),
        null
      );
      queryClient.invalidateQueries({
        queryKey: normalizedUserEmail
          ? queryKeys.curatorInvites.pendingForInvitee(normalizedUserEmail)
          : (["curatorInvites", "pendingForInvitee", null] as const),
        exact: true,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.globalRoles.isCurator(userId),
      });

      showToast("Convite recusado.");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (__DEV__) {
        console.error("[PreferencesInvites] reject curator failed", {
          inviteId,
          message,
          raw: e,
        });
      }
      showToast(
        "Não foi possível concluir agora. Verifique sua conexão e tente novamente."
      );
    } finally {
      setInviteProcessingKey(null);
    }
  };

  const acceptTerreiroInvite = async (invite: PendingTerreiroInvite) => {
    if (!userId) return;
    setInviteProcessingKey(`terreiro:${invite.id}`);
    try {
      const res: any = await supabase.rpc("accept_terreiro_invite", {
        p_invite_id: invite.id,
      });

      if (res?.error) throw res.error;
      if (res?.data === false)
        throw new Error("accept_terreiro_invite returned false");

      let warmOk = true;
      try {
        await fetchTerreirosQueAdministro(userId);
      } catch {
        warmOk = false;
      }

      if (normalizedUserEmail) {
        queryClient.invalidateQueries({
          queryKey:
            queryKeys.terreiroInvites.pendingForInvitee(normalizedUserEmail),
          exact: true,
        });
      }

      queryClient.invalidateQueries({
        queryKey: queryKeys.me.membership(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.terreiros(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.terreiroAccessIds(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.editableTerreiros(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.permissions(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.terreiros.editableByUser(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.accountable(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.editableByUserPrefix(userId),
      });

      if (warmOk) {
        showToast("Convite aceito.");
      } else {
        showToast(
          "Convite aceito, mas não foi possível atualizar permissões agora. Tente novamente em instantes."
        );
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (__DEV__) {
        console.error("[PreferencesInvites] accept terreiro failed", {
          inviteId: invite.id,
          terreiroId: invite.terreiro_id,
          message,
          raw: e,
        });
      }
      showToast(
        "Não foi possível concluir agora. Verifique sua conexão e tente novamente."
      );
    } finally {
      setInviteProcessingKey(null);
    }
  };

  const rejectTerreiroInvite = async (invite: PendingTerreiroInvite) => {
    if (!userId) return;
    setInviteProcessingKey(`terreiro:${invite.id}`);
    try {
      const res: any = await supabase.rpc("reject_terreiro_invite", {
        p_invite_id: invite.id,
      });

      if (res?.error) throw res.error;
      if (res?.data === false)
        throw new Error("reject_terreiro_invite returned false");

      if (normalizedUserEmail) {
        queryClient.invalidateQueries({
          queryKey:
            queryKeys.terreiroInvites.pendingForInvitee(normalizedUserEmail),
          exact: true,
        });
      }

      if (userId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.me.membership(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.me.terreiros(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.me.terreiroAccessIds(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.me.editableTerreiros(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.me.permissions(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.collections.editableByUserPrefix(userId),
        });
      }

      showToast("Convite recusado.");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (__DEV__) {
        console.error("[PreferencesInvites] reject terreiro failed", {
          inviteId: invite.id,
          terreiroId: invite.terreiro_id,
          message,
          raw: e,
        });
      }
      showToast(
        "Não foi possível concluir agora. Verifique sua conexão e tente novamente."
      );
    } finally {
      setInviteProcessingKey(null);
    }
  };

  const didLogPrefsVisibleRef = React.useRef(false);

  useEffect(() => {
    if (!isPreferencesOpen) {
      didLogPrefsVisibleRef.current = false;
      return;
    }

    if (didLogPrefsVisibleRef.current) return;
    didLogPrefsVisibleRef.current = true;

    if (__DEV__) {
      console.info("[PrefsDebug] visible", {
        userId,
        dataCount: myEditableTerreiros.length,
        isFetching: myEditableTerreirosQuery.isFetching,
      });
    }
  }, [
    isPreferencesOpen,
    myEditableTerreiros.length,
    myEditableTerreirosQuery.isFetching,
    userId,
  ]);

  const onSelectTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  const onToggleCurimba = (next: boolean) => {
    setCurimbaEnabled(next);

    if (next && !curimbaOnboardingDismissed) {
      if (__DEV__) {
        console.info("[Curimba] explainer requested (preferences)");
      }
      setIsCurimbaExplainerOpen(true);
    }
  };

  return (
    <>
      {uiEnabled ? (
        <View style={styles.header}>
          <View style={styles.headerNav}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                rootPager?.setActiveKey("pontos");
                if (!isOnRootPager) {
                  router.replace("/(app)");
                }
              }}
              hitSlop={10}
              style={styles.navItem}
            >
              <Text
                style={[
                  styles.navText,
                  {
                    color: textPrimary,
                    opacity: isPontosActive ? 1 : 0.7,
                    fontWeight: isPontosActive ? "800" : "700",
                  },
                ]}
              >
                Pontos
              </Text>
              <View
                style={[
                  styles.navUnderline,
                  {
                    backgroundColor: isPontosActive
                      ? colors.brass600
                      : "transparent",
                  },
                ]}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                rootPager?.setActiveKey("terreiros");
                if (!isOnRootPager) {
                  router.replace("/(app)");
                }
              }}
              hitSlop={10}
              style={styles.navItem}
            >
              <Text
                style={[
                  styles.navText,
                  {
                    color: textPrimary,
                    opacity: isTerreirosActive ? 1 : 0.7,
                    fontWeight: isTerreirosActive ? "800" : "700",
                  },
                ]}
              >
                Terreiros
              </Text>
              <View
                style={[
                  styles.navUnderline,
                  {
                    backgroundColor: isTerreirosActive
                      ? colors.brass600
                      : "transparent",
                  },
                ]}
              />
            </Pressable>
          </View>

          <View style={styles.headerIdentity}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir preferências"
              onPress={() => {
                if (__DEV__) {
                  console.info("[PrefsDebug] open", {
                    userId,
                    dataCount: myEditableTerreiros.length,
                    isFetching: myEditableTerreirosQuery.isFetching,
                  });
                }
                setIsPreferencesOpen(true);
              }}
              hitSlop={10}
              style={({ pressed }) => [
                styles.avatarTrigger,
                pressed ? styles.avatarTriggerPressed : null,
              ]}
            >
              <View style={styles.avatarTriggerStack} pointerEvents="none">
                <View style={styles.avatarWrap}>
                  {contextAvatarUrl ? (
                    <Image
                      source={{ uri: contextAvatarUrl }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatarPlaceholder,
                        variant === "light"
                          ? styles.avatarPlaceholderLight
                          : styles.avatarPlaceholderDark,
                      ]}
                    >
                      <Text
                        style={[styles.avatarInitials, { color: textPrimary }]}
                      >
                        {contextInitials}
                      </Text>
                    </View>
                  )}
                </View>

                <Ionicons name="chevron-down" size={14} color={textMuted} />
              </View>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Menu de preferências */}
      <BottomSheet
        visible={uiEnabled && isPreferencesOpen}
        variant={variant}
        onClose={() => {
          setIsPreferencesOpen(false);
        }}
      >
        <View style={styles.menuWrap}>
          <View style={styles.pagesList}>
            <PreferencesPageItem
              variant={variant}
              title={userDisplayName}
              subtitle={
                shouldShowCurator ? (
                  <Badge
                    label={getGlobalRoleBadgeLabel("curator")}
                    variant={variant}
                    appearance="primary"
                    style={{ maxWidth: 220 }}
                  />
                ) : null
              }
              rightAccessory={
                shouldShowCurator ? (
                  <>
                    <Switch
                      value={curatorModeEnabled}
                      onValueChange={(next) => {
                        void setCuratorModeEnabled(next);
                      }}
                      disabled={curatorModeLoading || curatorModeSaving}
                    />
                    <AccessRoleInfo variant={variant} info={curatorModeInfo} />
                  </>
                ) : null
              }
              showEditButton={false}
              avatarUrl={userPhotoUrl}
              initials={initials}
              onPress={undefined}
              onPressEdit={() => {
                setIsPreferencesOpen(false);
                setIsEditProfileOpen(true);
              }}
            />

            {!userId || !isDevMaster ? null : (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setIsCuratorAdminOpen(true);
                }}
                style={({ pressed }) => [
                  styles.prefActionRow,
                  {
                    borderColor: dividerColor,
                    backgroundColor: inputBg,
                  },
                  pressed ? styles.prefActionRowPressed : null,
                ]}
              >
                <View style={styles.prefActionLeft}>
                  <Text
                    style={[styles.prefActionTitle, { color: textPrimary }]}
                  >
                    Administrar guardiões
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={textSecondary}
                />
              </Pressable>
            )}

            {!userId || !normalizedUserEmail ? null : pendingCuratorInvite ? (
              <View
                style={[
                  styles.inviteCard,
                  { borderColor: dividerColor, backgroundColor: inputBg },
                ]}
              >
                <Text
                  style={[styles.inviteTitle, { color: textPrimary }]}
                  numberOfLines={2}
                >
                  Convite
                </Text>
                <Text
                  style={[styles.inviteBody, { color: textSecondary }]}
                  numberOfLines={6}
                >
                  Você foi convidada(o) para cuidar do acervo do Saravafy.
                </Text>

                <View style={styles.inviteActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Aceitar convite"
                    disabled={
                      inviteProcessingKey ===
                      `curator:${pendingCuratorInvite.id}`
                    }
                    onPress={() =>
                      void acceptCuratorInvite(pendingCuratorInvite.id)
                    }
                    style={({ pressed }) => [
                      styles.invitePrimaryBtn,
                      { borderColor: colors.brass600 },
                      pressed ? styles.inviteBtnPressed : null,
                      inviteProcessingKey ===
                      `curator:${pendingCuratorInvite.id}`
                        ? styles.inviteBtnDisabled
                        : null,
                    ]}
                  >
                    <Text style={styles.invitePrimaryBtnText}>
                      Aceitar convite
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Recusar convite"
                    disabled={
                      inviteProcessingKey ===
                      `curator:${pendingCuratorInvite.id}`
                    }
                    onPress={() =>
                      void rejectCuratorInvite(pendingCuratorInvite.id)
                    }
                    style={({ pressed }) => [
                      styles.inviteSecondaryBtn,
                      { borderColor: inputBorder },
                      pressed ? styles.inviteBtnPressed : null,
                      inviteProcessingKey ===
                      `curator:${pendingCuratorInvite.id}`
                        ? styles.inviteBtnDisabled
                        : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.inviteSecondaryBtnText,
                        { color: textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      Recusar convite
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {!userId ||
            !normalizedUserEmail ? null : pendingTerreiroInvites.length ? (
              <View style={styles.invitesList}>
                {pendingTerreiroInvites.map((invite) => {
                  const terreiroTitle =
                    typeof invite.terreiro_title === "string" &&
                    invite.terreiro_title.trim()
                      ? invite.terreiro_title.trim()
                      : "Terreiro";
                  const processing =
                    inviteProcessingKey === `terreiro:${invite.id}`;

                  return (
                    <View
                      key={invite.id}
                      style={[
                        styles.inviteCard,
                        { borderColor: dividerColor, backgroundColor: inputBg },
                      ]}
                    >
                      <Text
                        style={[styles.inviteTitle, { color: textPrimary }]}
                        numberOfLines={2}
                      >
                        Convite para: {terreiroTitle}
                      </Text>
                      <Text
                        style={[styles.inviteBody, { color: textSecondary }]}
                        numberOfLines={3}
                      >
                        Função: {getInviteRoleLabel(invite.role)}
                      </Text>

                      <View style={styles.inviteActions}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Aceitar convite"
                          disabled={processing}
                          onPress={() => void acceptTerreiroInvite(invite)}
                          style={({ pressed }) => [
                            styles.invitePrimaryBtn,
                            { borderColor: colors.brass600 },
                            pressed ? styles.inviteBtnPressed : null,
                            processing ? styles.inviteBtnDisabled : null,
                          ]}
                        >
                          <Text style={styles.invitePrimaryBtnText}>
                            Aceitar convite
                          </Text>
                        </Pressable>

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Recusar convite"
                          disabled={processing}
                          onPress={() => void rejectTerreiroInvite(invite)}
                          style={({ pressed }) => [
                            styles.inviteSecondaryBtn,
                            { borderColor: inputBorder },
                            pressed ? styles.inviteBtnPressed : null,
                            processing ? styles.inviteBtnDisabled : null,
                          ]}
                        >
                          <Text
                            style={[
                              styles.inviteSecondaryBtnText,
                              { color: textPrimary },
                            ]}
                            numberOfLines={1}
                          >
                            Recusar convite
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>

          <View
            style={[styles.blockDivider, { backgroundColor: dividerColor }]}
          />

          <PreferencesSection title="Meus terreiros" variant={variant}>
            <View style={styles.pagesList}>
              {!userId ? null : myEditableTerreirosQuery.isError ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void myEditableTerreirosQuery.refetch();
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
              ) : myEditableTerreirosQuery.isFetching &&
                myAdminTerreiros.length === 0 ? (
                <Text style={[styles.helperText, { color: textSecondary }]}>
                  Carregando terreiros…
                </Text>
              ) : myAdminTerreiros.length === 0 ? (
                <Text style={[styles.helperText, { color: textSecondary }]}>
                  Você ainda não é Admin em nenhum terreiro.
                </Text>
              ) : (
                myAdminTerreiros.map((t) => (
                  <PreferencesPageItem
                    key={t.id}
                    variant={variant}
                    title={t.title}
                    avatarUrl={t.cover_image_url ?? undefined}
                    initials={getInitials(t.title)}
                    onPress={() => {
                      setIsPreferencesOpen(false);
                      void Haptics.selectionAsync().catch(() => undefined);
                      router.push({
                        pathname: "/terreiro" as any,
                        params: { terreiroId: t.id, terreiroTitle: t.title },
                      });
                    }}
                    onPressEdit={() => {
                      router.push({
                        pathname: "/terreiro-editor" as any,
                        params: { mode: "edit", terreiroId: t.id },
                      });
                    }}
                  />
                ))
              )}
            </View>
          </PreferencesSection>

          <View
            style={[styles.blockDivider, { backgroundColor: dividerColor }]}
          />

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.push({
                pathname: "/terreiro-editor" as any,
                params: { mode: "create" },
              });
            }}
            style={({ pressed }) => [
              styles.createTerreiroBtn,
              { borderColor: colors.brass600 },
              pressed ? styles.createTerreiroBtnPressed : null,
            ]}
          >
            <Text style={styles.createTerreiroText}>Criar novo terreiro</Text>
          </Pressable>

          <View
            style={[styles.blockDivider, { backgroundColor: dividerColor }]}
          />

          <PreferencesSection title="Página inicial" variant={variant}>
            <View style={styles.startPageRow}>
              <Text style={[styles.startPageValue, { color: textPrimary }]}>
                {startPagePreference?.type === "TERREIRO"
                  ? startPagePreference.terreiroTitle ?? "Terreiro"
                  : "Home (Pontos)"}
              </Text>
            </View>
          </PreferencesSection>

          <View
            style={[styles.blockDivider, { backgroundColor: dividerColor }]}
          />

          <PreferencesSection title="Aparência" variant={variant}>
            <Text style={[styles.sectionDesc, { color: textSecondary }]}>
              Escolha como o app deve se comportar visualmente
            </Text>

            <PreferencesRadioGroup
              variant={variant}
              value={themeMode}
              onChange={onSelectTheme}
              options={
                [
                  {
                    key: "system",
                    label: "Sistema",
                    description: "Seguir o dispositivo",
                  },
                  { key: "light", label: "Claro" },
                  { key: "dark", label: "Escuro" },
                ] as const satisfies readonly PreferencesRadioOption<ThemeMode>[]
              }
            />
          </PreferencesSection>

          <View
            style={[styles.blockDivider, { backgroundColor: dividerColor }]}
          />

          <View style={styles.curimbaLogoutWrap}>
            <PreferencesSwitchItem
              variant={variant}
              title="Modo Curimba"
              description="Durante a gira: apenas letras, sem áudio, e tela sempre ligada."
              value={curimbaEnabled}
              onValueChange={onToggleCurimba}
            />

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setIsPreferencesOpen(false);
                Alert.alert("Sair", "Deseja sair da sua conta?", [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Sair",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        await signOut();
                      } finally {
                        router.replace("/login");
                      }
                    },
                  },
                ]);
              }}
              style={({ pressed }) => [
                styles.logoutRow,
                pressed ? styles.logoutPressed : null,
              ]}
            >
              <Text style={styles.logoutText}>Sair</Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={uiEnabled && isCuratorAdminOpen}
        variant={variant}
        onClose={() => {
          setIsCuratorAdminOpen(false);
          setCuratorInviteEmail("");
          setCuratorInviteInlineError(null);
        }}
      >
        <View style={styles.menuWrap}>
          <Text
            style={[styles.curatorAdminTitle, { color: textPrimary }]}
            numberOfLines={1}
          >
            Administrar guardiões
          </Text>

          <View style={styles.curatorAdminFormRow}>
            <TextInput
              value={curatorInviteEmail}
              onChangeText={(v) => {
                setCuratorInviteEmail(v);
                setCuratorInviteInlineError(null);
              }}
              placeholder="E-mail"
              placeholderTextColor={textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={[
                styles.curatorAdminInput,
                {
                  color: textPrimary,
                  borderColor: inputBorder,
                  backgroundColor: inputBg,
                },
              ]}
            />

            <Pressable
              accessibilityRole="button"
              disabled={isCreatingCuratorInvite}
              onPress={async () => {
                try {
                  const email = normalizeEmail(curatorInviteEmail);
                  if (!email || !email.includes("@")) {
                    setCuratorInviteInlineError("Informe um e-mail válido.");
                    return;
                  }

                  setIsCreatingCuratorInvite(true);

                  const res: any = await supabase.rpc("create_curator_invite", {
                    p_email: email,
                  });

                  if (res?.error) {
                    throw new Error(
                      typeof res.error.message === "string"
                        ? res.error.message
                        : "Erro ao convidar"
                    );
                  }

                  setCuratorInviteEmail("");
                  setCuratorInviteInlineError(null);

                  void curatorInvitesAdminQuery
                    .refetch()
                    .catch(() => undefined);
                  showToast("Convite enviado.");
                } catch (e) {
                  const message = e instanceof Error ? e.message : String(e);
                  setCuratorInviteInlineError(getFriendlyActionError(message));
                } finally {
                  setIsCreatingCuratorInvite(false);
                }
              }}
              style={({ pressed }) => [
                styles.curatorAdminBtn,
                pressed ? styles.inviteBtnPressed : null,
                isCreatingCuratorInvite ? styles.inviteBtnDisabled : null,
              ]}
            >
              <Text style={styles.curatorAdminBtnText}>Convidar</Text>
            </Pressable>
          </View>

          {curatorInviteInlineError ? (
            <Text
              style={[styles.helperText, { color: colors.brass600 }]}
              numberOfLines={3}
            >
              {curatorInviteInlineError}
            </Text>
          ) : null}

          <View
            style={[styles.curatorInvitesCard, { borderColor: dividerColor }]}
          >
            {curatorInvitesAdminQuery.isFetching ? (
              <View style={styles.curatorInviteRow}>
                <Text style={[styles.helperText, { color: textSecondary }]}>
                  Carregando convites…
                </Text>
              </View>
            ) : curatorInvitesAdminQuery.isError ? (
              <View style={styles.curatorInviteRow}>
                <Text style={[styles.helperText, { color: textSecondary }]}>
                  Não foi possível carregar os convites.
                </Text>
              </View>
            ) : curatorInvitesAdmin.length === 0 ? (
              <View style={styles.curatorInviteRow}>
                <Text style={[styles.helperText, { color: textSecondary }]}>
                  Nenhum convite encontrado.
                </Text>
              </View>
            ) : (
              curatorInvitesAdmin.map((invite, idx) => (
                <View
                  key={invite.id}
                  style={[
                    styles.curatorInviteRow,
                    idx === 0
                      ? null
                      : {
                          borderTopWidth: StyleSheet.hairlineWidth,
                          borderTopColor: dividerColor,
                        },
                  ]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[
                        styles.curatorInviteEmail,
                        { color: textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {invite.email}
                    </Text>
                    <Text style={[styles.helperText, { color: textSecondary }]}>
                      {invite.status} · {formatDateLabel(invite.created_at)}
                    </Text>
                  </View>

                  <View style={styles.curatorInviteRight}>
                    {invite.status === "pending" ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={async () => {
                          try {
                            const rpc: any = await supabase.rpc(
                              "cancel_curator_invite",
                              {
                                p_invite_id: invite.id,
                              }
                            );

                            if (rpc?.error) {
                              throw new Error(
                                typeof rpc.error.message === "string"
                                  ? rpc.error.message
                                  : "Erro"
                              );
                            }

                            void curatorInvitesAdminQuery
                              .refetch()
                              .catch(() => undefined);
                          } catch (e) {
                            const message =
                              e instanceof Error ? e.message : String(e);
                            showToast(getFriendlyActionError(message));
                          }
                        }}
                        style={({ pressed }) => [
                          styles.curatorInviteCancel,
                          pressed ? styles.inviteBtnPressed : null,
                        ]}
                      >
                        <Text style={styles.curatorInviteCancelText}>
                          Cancelar
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>

          <Image
            source={require("@/assets/images/filler.png")}
            style={styles.curatorAdminFiller}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>
      </BottomSheet>

      {/* Modal: editar perfil (placeholder silencioso) */}
      <BottomSheet
        visible={uiEnabled && isEditProfileOpen}
        variant={variant}
        onClose={() => setIsEditProfileOpen(false)}
      >
        <View />
      </BottomSheet>

      <CurimbaExplainerBottomSheet
        visible={uiEnabled && isCurimbaExplainerOpen}
        variant={variant}
        dontShowAgain={curimbaOnboardingDismissed}
        onChangeDontShowAgain={setCurimbaOnboardingDismissed}
        onClose={() => setIsCurimbaExplainerOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  navItem: {
    paddingVertical: 2,
  },
  navText: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  navUnderline: {
    height: 2,
    borderRadius: 999,
    marginTop: 3,
  },
  headerIdentity: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTrigger: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  avatarTriggerStack: {
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  avatarTriggerPressed: {
    opacity: 0.82,
  },
  avatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 999,
    overflow: "hidden",
  },
  avatarImage: {
    width: 32,
    height: 32,
    resizeMode: "cover",
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPlaceholderDark: {
    borderColor: colors.surfaceCardBorder,
    backgroundColor: colors.inputBgDark,
  },
  avatarPlaceholderLight: {
    borderColor: colors.surfaceCardBorderLight,
    backgroundColor: colors.paper100,
  },
  avatarInitials: {
    fontSize: 12,
    fontWeight: "700",
  },

  menuWrap: {
    gap: spacing.lg,
  },
  curimbaLogoutWrap: {
    gap: spacing.md,
  },
  pagesList: {
    gap: spacing.xs,
  },
  prefActionRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  prefActionRowPressed: {
    opacity: 0.82,
  },
  prefActionLeft: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  prefActionTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  prefActionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  curatorInvitesCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  curatorInviteRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  curatorInviteEmail: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "800",
  },
  curatorInviteRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  curatorInviteCancel: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  curatorInviteCancelText: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.danger,
  },
  helperText: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.85,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  retryRow: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  retryRowPressed: {
    opacity: 0.82,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "800",
  },
  blockDivider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.6,
  },
  createTerreiroBtn: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  createTerreiroBtnPressed: {
    opacity: 0.82,
  },
  createTerreiroText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.brass600,
  },
  curatorAdminTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  curatorAdminFormRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  curatorAdminInput: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "700",
  },
  curatorAdminBtn: {
    height: 44,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.brass600,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  curatorAdminBtnText: {
    color: colors.brass600,
    fontSize: 13,
    fontWeight: "900",
  },
  curatorAdminFiller: {
    width: "100%",
    height: 265,
    marginTop: spacing.lg,
  },
  sectionDesc: {
    marginBottom: spacing.sm,
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.9,
  },
  logoutRow: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  logoutPressed: {
    opacity: 0.82,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.danger,
  },
  startPageRow: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  startPageValue: {
    fontSize: 15,
    fontWeight: "800",
  },

  invitesList: {
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
  inviteBody: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.9,
  },
  inviteActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 2,
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
});
