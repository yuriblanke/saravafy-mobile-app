import { useAuth } from "@/contexts/AuthContext";
import { useCuratorMode } from "@/contexts/CuratorModeContext";
import { usePreferences, type ThemeMode } from "@/contexts/PreferencesContext";
import { useTabController, type TabKey } from "@/contexts/TabControllerContext";
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
import { useGlobalSafeAreaInsets } from "@/src/contexts/GlobalSafeAreaInsetsContext";
import { usePreferencesOverlay } from "@/src/contexts/PreferencesOverlayContext";
import {
  formatTerreiroMemberKindLabel,
  formatTerreiroRoleLabel,
} from "@/src/domain/terreiroRoles";
import { getGlobalRoleBadgeLabel } from "@/src/domain/globalRoles";
import { useIsCurator } from "@/src/hooks/useIsCurator";
import { useIsDevMaster } from "@/src/hooks/useIsDevMaster";
import {
  usePreferencesTerreirosQuery,
  type MyTerreiroRole,
  type MyTerreiroWithRole,
} from "@/src/queries/me";
import {
  usePendingTerreiroInvitesForInviteeQuery,
  type PendingTerreiroInvite,
} from "@/src/queries/pendingTerreiroInvites";
import { usePreferencesTerreirosRealtime } from "@/src/queries/preferencesTerreirosRealtime";
import { queryKeys } from "@/src/queries/queryKeys";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { usePathname, useRouter, useSegments } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
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

type PendingCuratorInvite = {
  id: string;
  created_at: string;
};

function isColumnMissingError(message: string, columnName: string) {
  const m = String(message ?? "");
  return (
    m.includes(columnName) &&
    (m.includes("does not exist") || m.includes("column"))
  );
}

function isRpcFunctionParamMismatch(error: unknown, paramName: string) {
  const anyErr = error as any;
  const code = typeof anyErr?.code === "string" ? anyErr.code : "";
  const message = typeof anyErr?.message === "string" ? anyErr.message : "";
  const hint = typeof anyErr?.hint === "string" ? anyErr.hint : "";
  if (code !== "PGRST202") return false;
  return (
    message.includes(`(${paramName})`) ||
    message.includes(`parameter ${paramName}`) ||
    hint.includes("invite_id")
  );
}

function getInviteRoleLabel(role: unknown): string {
  return formatTerreiroRoleLabel(role);
}

function normalizeEmail(value: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

const INVITE_GATE_SNOOZE_KEY_PREFIX = "inviteGate:snoozedInviteIds:v1:";

function getInviteGateSnoozeKey(emailLower: string) {
  return `${INVITE_GATE_SNOOZE_KEY_PREFIX}${emailLower}`;
}

async function loadInviteGateSnoozedInviteIds(emailLower: string) {
  const key = getInviteGateSnoozeKey(emailLower);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return new Set<string>();

  try {
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : [];
    return new Set(arr.map((x) => String(x)).filter(Boolean));
  } catch {
    return new Set<string>();
  }
}

async function saveInviteGateSnoozedInviteIds(
  emailLower: string,
  inviteIds: Set<string>
) {
  const key = getInviteGateSnoozeKey(emailLower);
  await AsyncStorage.setItem(key, JSON.stringify(Array.from(inviteIds)));
}

async function snoozeInviteGateInviteId(emailLower: string, inviteId: string) {
  const next = await loadInviteGateSnoozedInviteIds(emailLower);
  next.add(inviteId);
  await saveInviteGateSnoozedInviteIds(emailLower, next);
  return next;
}

async function unsnoozeInviteGateInviteId(
  emailLower: string,
  inviteId: string
) {
  const next = await loadInviteGateSnoozedInviteIds(emailLower);
  next.delete(inviteId);
  await saveInviteGateSnoozedInviteIds(emailLower, next);
  return next;
}

function getFriendlyActionError(message: string) {
  const m = String(message ?? "").toLowerCase();
  if (!m) {
    return "Não foi possível concluir agora. Verifique sua conexão e tente novamente.";
  }

  if (m.includes("cannot_remove_last_admin")) {
    return "Não é possível remover o último admin";
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
  const segments = useSegments() as string[];
  const tabController = useTabController();
  const { user } = useAuth();
  const { effectiveTheme } = usePreferences();

  const variant = effectiveTheme;
  const uiEnabled = !suspended;

  const isInTabs = segments.includes("(tabs)");

  const activeTab: TabKey = useMemo(() => {
    if (
      segments.includes("(terreiros)") ||
      (typeof pathname === "string" &&
        (pathname.startsWith("/terreiro") ||
          pathname.startsWith("/collection") ||
          pathname.startsWith("/player")))
    ) {
      return "terreiros";
    }

    if (segments.includes("(pontos)")) return "pontos";
    return "pontos";
  }, [pathname, segments]);

  const isTerreirosActive = activeTab === "terreiros";
  const isPontosActive = activeTab === "pontos";

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textMuted =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;

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

  const contextAvatarUrl = userPhotoUrl;
  const contextInitials = initials;

  if (!uiEnabled) return null;

  return (
    <View style={styles.header}>
      <View style={styles.headerNav}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (!isInTabs) {
              router.replace("/(app)/(tabs)/(pontos)" as any);
              return;
            }

            tabController.goToTab("pontos");
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
            if (!isInTabs) {
              router.replace("/(app)/(tabs)/(terreiros)" as any);
              return;
            }

            tabController.goToTab("terreiros");
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
            router.push("/preferences" as any);
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
                  <Text style={[styles.avatarInitials, { color: textPrimary }]}>
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
  );
}

export function PreferencesOverlaySheets(
  props: AppHeaderWithPreferencesProps = {}
) {
  const { suspended = false } = props;
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { isOpen, closePreferences } = usePreferencesOverlay();
  const insets = useGlobalSafeAreaInsets();
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

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isCurimbaExplainerOpen, setIsCurimbaExplainerOpen] = useState(false);
  const [isCuratorAdminOpen, setIsCuratorAdminOpen] = useState(false);

  const [curatorInviteEmail, setCuratorInviteEmail] = useState("");
  const [curatorInviteInlineError, setCuratorInviteInlineError] = useState<
    string | null
  >(null);
  const [isCreatingCuratorInvite, setIsCreatingCuratorInvite] = useState(false);

  useEffect(() => {
    if (isOpen) return;
    setIsEditProfileOpen(false);
    setIsCurimbaExplainerOpen(false);
    setIsCuratorAdminOpen(false);
    setCuratorInviteEmail("");
    setCuratorInviteInlineError(null);
    setIsCreatingCuratorInvite(false);
  }, [isOpen]);

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

  // Keep Preferences terreiros list in sync for this user.
  usePreferencesTerreirosRealtime(userId);

  const {
    isCurator,
    isLoading: isCuratorLoading,
    refetch: refetchIsCurator,
  } = useIsCurator();

  const {
    curatorModeEnabled,
    isLoading: curatorModeLoading,
    isSaving: curatorModeSaving,
    setCuratorModeEnabled,
  } = useCuratorMode();

  const { isDevMaster } = useIsDevMaster();

  const shouldShowCurator = !isCuratorLoading && isCurator;

  useEffect(() => {
    if (!isOpen) return;
    void refetchIsCurator();
  }, [isOpen, refetchIsCurator]);

  const curatorModeInfo = useMemo(() => {
    return {
      accessibilityLabel: "Ver detalhes do Modo Guardião",
      title: "Modo Guardião",
      body: "Ativa os botões de edição do papel de pessoa guardiã do acervo ao longo de toda a plataforma.",
      sections: [],
    };
  }, []);

  const myTerreirosQuery = usePreferencesTerreirosQuery(userId);
  const myTerreiros = useMemo<MyTerreiroWithRole[]>(
    () => myTerreirosQuery.data ?? [],
    [myTerreirosQuery.data]
  );

  const [terreiroMenuTarget, setTerreiroMenuTarget] =
    useState<MyTerreiroWithRole | null>(null);

  const closeTerreiroMenu = () => setTerreiroMenuTarget(null);

  const openTerreiroMenu = (item: MyTerreiroWithRole) => {
    if (item.role !== "admin" && item.role !== "curimba") return;
    setTerreiroMenuTarget(item);
  };

  const curatorInviteQuery = useQuery({
    queryKey: normalizedUserEmail
      ? queryKeys.curatorInvites.pendingForInvitee(normalizedUserEmail)
      : (["curatorInvites", "pendingForInvitee", null] as const),
    enabled: !!userId && !!normalizedUserEmail && isOpen && !isCurator,
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

  const terreiroInvitesQuery = usePendingTerreiroInvitesForInviteeQuery({
    normalizedEmail: normalizedUserEmail,
    enabled: !!userId && isOpen,
  });

  const [inviteProcessingKey, setInviteProcessingKey] = useState<string | null>(
    null
  );

  const [leaveRoleTarget, setLeaveRoleTarget] = useState<{
    terreiroId: string;
    terreiroTitle: string;
    role: Exclude<MyTerreiroRole, "member">;
  } | null>(null);
  const [leaveRoleConfirmText, setLeaveRoleConfirmText] = useState("");
  const [leaveRoleBusy, setLeaveRoleBusy] = useState(false);

  const [leaveTerreiroBusy, setLeaveTerreiroBusy] = useState(false);

  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);

  const isLeaveRoleModalOpen = !!leaveRoleTarget;
  const canConfirmLeaveRole =
    leaveRoleConfirmText.trim().toLowerCase() === "sair";

  const isCannotRemoveLastAdminError = (error: unknown) => {
    const anyErr = error as any;
    const msg = typeof anyErr?.message === "string" ? anyErr.message : "";
    const m = msg.toLowerCase();
    return (
      m.includes("não é possível remover o último admin") ||
      m.includes("cannot_remove_last_admin")
    );
  };

  const countActiveAdmins = async (
    terreiroId: string
  ): Promise<number | null> => {
    try {
      let res: any = await supabase
        .from("terreiro_members")
        .select("user_id", { count: "exact", head: true })
        .eq("terreiro_id", terreiroId)
        .eq("role", "admin")
        .eq("status", "active");

      if (res.error && isColumnMissingError(res.error.message, "status")) {
        res = await supabase
          .from("terreiro_members")
          .select("user_id", { count: "exact", head: true })
          .eq("terreiro_id", terreiroId)
          .eq("role", "admin");
      }

      if (res.error) return null;

      const count = typeof res.count === "number" ? res.count : null;
      return count;
    } catch {
      return null;
    }
  };

  const requestLeaveRole = async (item: MyTerreiroWithRole) => {
    if (!userId) return;
    if (item.role !== "admin" && item.role !== "curimba") return;

    if (item.role === "admin") {
      const count = await countActiveAdmins(item.id);
      if (count === 1) {
        showToast(
          "Defina outra pessoa admin em Gerenciar acessos antes de sair."
        );
        return;
      }
    }

    setLeaveRoleConfirmText("");
    setLeaveRoleTarget({
      terreiroId: item.id,
      terreiroTitle: item.title,
      role: item.role,
    });
  };

  const closeLeaveRoleModal = () => {
    if (leaveRoleBusy) return;
    setLeaveRoleTarget(null);
    setLeaveRoleConfirmText("");
  };

  const closeLogoutConfirm = () => {
    if (logoutBusy) return;
    setIsLogoutConfirmOpen(false);
  };

  const confirmLogout = async () => {
    if (logoutBusy) return;
    setLogoutBusy(true);
    try {
      await signOut();
    } finally {
      setLogoutBusy(false);
      setIsLogoutConfirmOpen(false);
      closePreferences();
      router.replace("/login");
    }
  };

  const confirmLeaveRole = async () => {
    if (!userId) return;
    if (!leaveRoleTarget) return;
    if (!canConfirmLeaveRole) return;

    setLeaveRoleBusy(true);
    try {
      const rpc = await supabase.rpc("fn_remove_terreiro_member", {
        p_terreiro_id: leaveRoleTarget.terreiroId,
        p_user_id: userId,
      });

      if (rpc.error) {
        if (isCannotRemoveLastAdminError(rpc.error)) {
          showToast(
            "Defina outra pessoa admin em Gerenciar acessos antes de sair."
          );
          return;
        }

        showToast(getFriendlyActionError(rpc.error.message));
        return;
      }

      // Optimistic: remove from list immediately
      queryClient.setQueryData(
        userId ? queryKeys.me.terreirosWithRole(userId) : [],
        (prev: any) => {
          const arr = Array.isArray(prev) ? prev : [];
          return arr.filter(
            (t: any) => String(t?.id ?? "") !== leaveRoleTarget.terreiroId
          );
        }
      );

      // Invalidate related caches
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.terreirosWithRole(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.membership(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.permissions(userId),
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
        queryKey: queryKeys.terreiros.withRole(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.accountable(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.editableByUserPrefix(userId),
      });

      showToast(
        leaveRoleTarget.role === "admin"
          ? "Você deixou de ser admin deste terreiro."
          : "Você deixou de ser curimba deste terreiro."
      );
      closeLeaveRoleModal();
    } finally {
      setLeaveRoleBusy(false);
    }
  };

  const confirmLeaveTerreiro = async (item: MyTerreiroWithRole) => {
    if (!userId) return;
    if (leaveTerreiroBusy) return;
    if (item.role !== "member") return;

    setLeaveTerreiroBusy(true);
    try {
      const res = await supabase
        .from("terreiro_members")
        .delete()
        .eq("terreiro_id", item.id)
        .eq("user_id", userId);

      if (res.error) {
        showToast(getFriendlyActionError(res.error.message));
        return;
      }

      // Drop membership immediately so edit permissions disappear right away.
      queryClient.setQueryData(queryKeys.me.membership(userId), (prev: any) => {
        const arr = Array.isArray(prev) ? prev : [];
        return arr.filter(
          (r: any) => String(r?.terreiro_id ?? "") !== String(item.id)
        );
      });

      // Invalidate related caches
      queryClient.invalidateQueries({
        queryKey: queryKeys.preferences.terreiros(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.membership(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.permissions(userId),
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
        queryKey: queryKeys.terreiros.withRole(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.accountable(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.editableByUserPrefix(userId),
      });

      showToast("Você saiu do terreiro.");
    } finally {
      setLeaveTerreiroBusy(false);
    }
  };

  const pendingCuratorInvite = curatorInviteQuery.data ?? null;
  const pendingTerreiroInvites = useMemo(
    () => terreiroInvitesQuery.data ?? [],
    [terreiroInvitesQuery.data]
  );

  const [inviteGateSnoozedInviteIds, setInviteGateSnoozedInviteIds] =
    useState<Set<string>>(new Set());

  useEffect(() => {
    if (!normalizedUserEmail) {
      setInviteGateSnoozedInviteIds(new Set());
      return;
    }

    let cancelled = false;
    void loadInviteGateSnoozedInviteIds(normalizedUserEmail).then((ids) => {
      if (cancelled) return;
      setInviteGateSnoozedInviteIds(ids);
    });

    return () => {
      cancelled = true;
    };
  }, [normalizedUserEmail]);

  const visiblePendingTerreiroInvites = useMemo(
    () =>
      pendingTerreiroInvites.filter(
        (i) => !inviteGateSnoozedInviteIds.has(String(i?.id ?? ""))
      ),
    [inviteGateSnoozedInviteIds, pendingTerreiroInvites]
  );

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

      void refetchIsCurator();

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

      void refetchIsCurator();

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
      let res: any = await supabase.rpc("accept_terreiro_invite", {
        invite_id: invite.id,
      });

      if (res?.error && isRpcFunctionParamMismatch(res.error, "invite_id")) {
        res = await supabase.rpc("accept_terreiro_invite", {
          p_invite_id: invite.id,
        });
      }

      if (res?.error) throw res.error;
      if (res?.data === false)
        throw new Error("accept_terreiro_invite returned false");

      if (normalizedUserEmail) {
        setInviteGateSnoozedInviteIds((prev) => {
          const next = new Set(prev);
          next.delete(invite.id);
          return next;
        });
        void unsnoozeInviteGateInviteId(normalizedUserEmail, invite.id);
      }

      // Optimistic: remove invite from list immediately
      if (normalizedUserEmail) {
        queryClient.setQueryData(
          queryKeys.terreiroInvites.pendingForInvitee(normalizedUserEmail),
          (prev: any) => {
            const arr = Array.isArray(prev) ? prev : [];
            return arr.filter((i: any) => String(i?.id ?? "") !== invite.id);
          }
        );
      }

      // Optimistic: add terreiro to "Meus terreiros" immediately (when applicable)
      if (
        invite.role === "admin" ||
        invite.role === "curimba" ||
        invite.role === "member"
      ) {
        queryClient.setQueryData(
          queryKeys.me.terreirosWithRole(userId),
          (prev: any) => {
            const arr = Array.isArray(prev) ? prev : [];
            const already = arr.some(
              (t: any) => String(t?.id ?? "") === invite.terreiro_id
            );
            if (already) return arr;
            return [
              ...arr,
              {
                id: invite.terreiro_id,
                title: invite.terreiro_title || "Terreiro",
                cover_image_url: null,
                role:
                  invite.role === "admin"
                    ? "admin"
                    : invite.role === "curimba"
                    ? "curimba"
                    : "member",
              },
            ];
          }
        );
      }

      let warmOk = true;
      if (invite.role === "admin" || invite.role === "curimba") {
        try {
          await fetchTerreirosQueAdministro(userId);
        } catch {
          warmOk = false;
        }
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
        queryKey: queryKeys.me.terreirosWithRole(userId),
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
      let res: any = await supabase.rpc("reject_terreiro_invite", {
        invite_id: invite.id,
      });

      if (res?.error && isRpcFunctionParamMismatch(res.error, "invite_id")) {
        res = await supabase.rpc("reject_terreiro_invite", {
          p_invite_id: invite.id,
        });
      }

      if (res?.error) throw res.error;
      if (res?.data === false)
        throw new Error("reject_terreiro_invite returned false");

      if (normalizedUserEmail) {
        setInviteGateSnoozedInviteIds((prev) => {
          const next = new Set(prev);
          next.delete(invite.id);
          return next;
        });
        void unsnoozeInviteGateInviteId(normalizedUserEmail, invite.id);
      }

      // Optimistic: remove invite from list immediately
      if (normalizedUserEmail) {
        queryClient.setQueryData(
          queryKeys.terreiroInvites.pendingForInvitee(normalizedUserEmail),
          (prev: any) => {
            const arr = Array.isArray(prev) ? prev : [];
            return arr.filter((i: any) => String(i?.id ?? "") !== invite.id);
          }
        );
      }

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
          queryKey: queryKeys.me.terreirosWithRole(userId),
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
    if (!isOpen) {
      didLogPrefsVisibleRef.current = false;
      return;
    }

    if (didLogPrefsVisibleRef.current) return;
    didLogPrefsVisibleRef.current = true;

    if (__DEV__) {
      console.info("[PrefsDebug] visible", {
        userId,
        dataCount: myTerreiros.length,
        isFetching: myTerreirosQuery.isFetching,
      });
    }
  }, [isOpen, myTerreiros.length, myTerreirosQuery.isFetching, userId]);

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

  const closeThen = (navigate: () => void) => {
    // Preferences is rendered inside a global RN <Modal />.
    // Any Expo Router navigation while it is open will appear "behind" it.
    // Close first, then navigate on the next tick.
    closePreferences();
    setTimeout(() => {
      navigate();
    }, 0);
  };

  return (
    <>
      {/* Menu de preferências */}
      <BottomSheet
        visible={
          uiEnabled &&
          isOpen &&
          !isEditProfileOpen &&
          !isCuratorAdminOpen &&
          !isCurimbaExplainerOpen &&
          !terreiroMenuTarget &&
          !isLeaveRoleModalOpen &&
          !isLogoutConfirmOpen
        }
        variant={variant}
        onClose={() => {
          closePreferences();
        }}
      >
        <View style={[styles.menuWrap, { paddingBottom: insets.bottom }]}>
          <View style={styles.pagesList}>
            <PreferencesPageItem
              variant={variant}
              title={userDisplayName}
              afterTitle={
                <View style={styles.profileTitleRight}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Editar ${userDisplayName}`}
                    onPress={() => {
                      setIsEditProfileOpen(true);
                    }}
                    hitSlop={12}
                    style={({ pressed }) => [
                      styles.profileEditBtn,
                      pressed ? styles.profileEditBtnPressed : null,
                    ]}
                  >
                    <Ionicons name="pencil" size={18} color={textMuted} />
                  </Pressable>
                </View>
              }
              subtitle={
                shouldShowCurator ? (
                  <View style={styles.profileBadgeRow}>
                    <View style={styles.profileBadgeLeft}>
                      <Badge
                        label={getGlobalRoleBadgeLabel("curator")}
                        variant={variant}
                        appearance="primary"
                        style={{ maxWidth: 220 }}
                      />
                      <AccessRoleInfo
                        variant={variant}
                        info={curatorModeInfo}
                      />
                    </View>

                    <View style={styles.profileBadgeRight}>
                      <Switch
                        value={curatorModeEnabled}
                        onValueChange={(next) => {
                          void setCuratorModeEnabled(next);
                        }}
                        disabled={curatorModeLoading || curatorModeSaving}
                      />
                    </View>
                  </View>
                ) : null
              }
              rightAccessory={null}
              showEditButton={false}
              avatarUrl={userPhotoUrl}
              initials={initials}
              onPress={undefined}
              onPressEdit={undefined}
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
              </Pressable>
            )}

            {!shouldShowCurator ? null : (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  closeThen(() => {
                    router.push("/review-submissions" as any);
                  });
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
                    Revisar envios
                  </Text>
                </View>
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
            !normalizedUserEmail ? null : visiblePendingTerreiroInvites.length ? (
              <View style={styles.invitesList}>
                {visiblePendingTerreiroInvites.map((invite) => {
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

                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        <Badge
                          label={getInviteRoleLabel(invite.role)}
                          variant={variant}
                          appearance={
                            invite.role === "admin" ? "primary" : "secondary"
                          }
                          style={{ alignSelf: "flex-start" }}
                        />

                        {invite.role === "member" ? (
                          (() => {
                            const label = formatTerreiroMemberKindLabel(
                              (invite as any)?.member_kind
                            );
                            if (!label) return null;
                            return (
                              <Badge
                                label={label}
                                variant={variant}
                                appearance="secondary"
                                style={{ alignSelf: "flex-start" }}
                              />
                            );
                          })()
                        ) : null}
                      </View>

                      <View
                        style={[
                          styles.inviteActions,
                          { flexDirection: "column", alignItems: "stretch" },
                        ]}
                      >
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Aceitar convite"
                          disabled={processing}
                          onPress={() => void acceptTerreiroInvite(invite)}
                          style={({ pressed }) => [
                            styles.invitePrimaryBtn,
                            { borderColor: colors.brass600, flex: 0 },
                            pressed ? styles.inviteBtnPressed : null,
                            processing ? styles.inviteBtnDisabled : null,
                          ]}
                        >
                          <Text style={styles.invitePrimaryBtnText}>
                            Aceitar convite
                          </Text>
                        </Pressable>

                        <View style={styles.inviteActions}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Recusar convite"
                            disabled={processing}
                            onPress={() => void rejectTerreiroInvite(invite)}
                            style={({ pressed }) => [
                              styles.inviteSecondaryBtn,
                              { borderColor: inputBorder, flex: 1 },
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
                              Recusar
                            </Text>
                          </Pressable>

                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Decidir depois"
                            disabled={processing}
                            onPress={() => {
                              if (!normalizedUserEmail) return;

                              setInviteGateSnoozedInviteIds((prev) => {
                                const next = new Set(prev);
                                next.add(invite.id);
                                return next;
                              });

                              void snoozeInviteGateInviteId(
                                normalizedUserEmail,
                                invite.id
                              );

                              showToast("Tudo bem. Você pode decidir depois.");
                            }}
                            style={({ pressed }) => [
                              styles.inviteSecondaryBtn,
                              { borderColor: inputBorder, flex: 1 },
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
                              Decidir depois
                            </Text>
                          </Pressable>
                        </View>
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
              {!userId ? null : myTerreirosQuery.isError ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void myTerreirosQuery.refetch();
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
              ) : myTerreirosQuery.isFetching && myTerreiros.length === 0 ? (
                <Text style={[styles.helperText, { color: textSecondary }]}>
                  Carregando terreiros…
                </Text>
              ) : myTerreiros.length === 0 ? (
                <Text style={[styles.helperText, { color: textSecondary }]}>
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
                      <View
                        style={{
                          marginTop: 4,
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        <Badge
                          label={formatTerreiroRoleLabel(t.role)}
                          variant={variant}
                          appearance={
                            t.role === "admin" ? "primary" : "secondary"
                          }
                          style={{ alignSelf: "flex-start" }}
                        />

                        {t.role === "member" ? (
                          (() => {
                            const label = formatTerreiroMemberKindLabel(
                              (t as any)?.member_kind
                            );
                            if (!label) return null;
                            return (
                              <Badge
                                label={label}
                                variant={variant}
                                appearance="secondary"
                                style={{ alignSelf: "flex-start" }}
                              />
                            );
                          })()
                        ) : null}
                      </View>
                    }
                    showEditButton={false}
                    rightAccessory={
                      t.role === "admin" || t.role === "curimba" ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Mais ações"
                          hitSlop={12}
                          onPress={(e) => {
                            // Prevent row press.
                            (e as any)?.stopPropagation?.();
                            void Haptics.selectionAsync().catch(
                              () => undefined
                            );
                            openTerreiroMenu(t);
                          }}
                          style={({ pressed }) => [
                            styles.terreiroMenuBtn,
                            pressed ? styles.terreiroMenuBtnPressed : null,
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
                      closePreferences();
                      void Haptics.selectionAsync().catch(() => undefined);
                      setTimeout(() => {
                        router.push({
                          pathname: "/terreiro" as any,
                          params: { terreiroId: t.id, terreiroTitle: t.title },
                        });
                      }, 0);
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
              // Keep preferences open; open the editor modal on top.
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
                setIsLogoutConfirmOpen(true);
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

      <Modal
        transparent
        animationType="fade"
        visible={uiEnabled && isLogoutConfirmOpen}
        onRequestClose={closeLogoutConfirm}
      >
        <Pressable
          style={styles.leaveRoleBackdrop}
          onPress={closeLogoutConfirm}
        >
          <Pressable
            style={[
              styles.leaveRoleCard,
              {
                backgroundColor:
                  variant === "light" ? colors.paper100 : colors.forest900,
                borderColor: dividerColor,
              },
            ]}
            onPress={(e) => {
              (e as any)?.stopPropagation?.();
            }}
          >
            <View style={styles.logoutHeaderRow}>
              <View
                style={[
                  styles.logoutIconWrap,
                  {
                    borderColor: dividerColor,
                    backgroundColor:
                      variant === "light"
                        ? "rgba(220, 38, 38, 0.10)"
                        : "rgba(248, 113, 113, 0.12)",
                  },
                ]}
              >
                <Ionicons
                  name="log-out-outline"
                  size={18}
                  color={colors.danger}
                />
              </View>

              <View style={styles.logoutHeaderTextCol}>
                <Text style={[styles.leaveRoleTitle, { color: textPrimary }]}>
                  Sair do Saravafy
                </Text>
                <Text
                  style={[styles.logoutBody, { color: textSecondary }]}
                  numberOfLines={4}
                >
                  Você será desconectada(o) desta conta neste dispositivo. Você
                  pode entrar novamente quando quiser.
                </Text>
              </View>
            </View>

            <View style={styles.leaveRoleActionsRow}>
              <Pressable
                accessibilityRole="button"
                onPress={closeLogoutConfirm}
                disabled={logoutBusy}
                style={({ pressed }) => [
                  styles.leaveRoleBtn,
                  styles.leaveRoleBtnSecondary,
                  { borderColor: dividerColor },
                  pressed ? styles.leaveRoleBtnPressed : null,
                  logoutBusy ? styles.leaveRoleBtnDisabled : null,
                ]}
              >
                <Text style={[styles.leaveRoleBtnText, { color: textPrimary }]}>
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => void confirmLogout()}
                disabled={logoutBusy}
                style={({ pressed }) => [
                  styles.leaveRoleBtn,
                  styles.leaveRoleBtnDanger,
                  pressed ? styles.leaveRoleBtnPressed : null,
                  logoutBusy ? styles.leaveRoleBtnDisabled : null,
                ]}
              >
                <Text style={styles.leaveRoleBtnTextDanger}>
                  {logoutBusy ? "Saindo…" : "Sair"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <BottomSheet
        visible={uiEnabled && isCuratorAdminOpen}
        variant={variant}
        onClose={() => {
          setIsCuratorAdminOpen(false);
          setCuratorInviteEmail("");
          setCuratorInviteInlineError(null);
        }}
      >
        <View style={[styles.menuWrap, { paddingBottom: insets.bottom }]}>
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

      <BottomSheet
        visible={
          uiEnabled &&
          isOpen &&
          !!terreiroMenuTarget &&
          !isEditProfileOpen &&
          !isCuratorAdminOpen &&
          !isCurimbaExplainerOpen
        }
        variant={variant}
        onClose={closeTerreiroMenu}
        snapPoints={[280]}
      >
        <View style={styles.terreiroMenuSheet}>
          <Text style={[styles.terreiroMenuTitle, { color: textPrimary }]}>
            Ações do terreiro
          </Text>

          {terreiroMenuTarget ? (
            <Text
              style={[styles.terreiroMenuHint, { color: textSecondary }]}
              numberOfLines={2}
            >
              {terreiroMenuTarget.title}
            </Text>
          ) : null}

          {terreiroMenuTarget?.role === "admin" ? (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  const t = terreiroMenuTarget;
                  if (!t) return;
                  closeTerreiroMenu();
                  router.push({
                    pathname: "/terreiro-members" as any,
                    params: { terreiroId: t.id },
                  });
                }}
                style={({ pressed }) => [
                  styles.terreiroMenuItem,
                  pressed ? styles.terreiroMenuItemPressed : null,
                ]}
              >
                <Text
                  style={[styles.terreiroMenuItemText, { color: textPrimary }]}
                >
                  Gerenciar membros
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  const t = terreiroMenuTarget;
                  if (!t) return;
                  closeTerreiroMenu();
                  router.push({
                    pathname: "/access-manager" as any,
                    params: { terreiroId: t.id, terreiroTitle: t.title },
                  });
                }}
                style={({ pressed }) => [
                  styles.terreiroMenuItem,
                  pressed ? styles.terreiroMenuItemPressed : null,
                ]}
              >
                <Text
                  style={[styles.terreiroMenuItemText, { color: textPrimary }]}
                >
                  Gerenciar gestão
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  const t = terreiroMenuTarget;
                  if (!t) return;
                  closeTerreiroMenu();
                  router.push({
                    pathname: "/terreiro-editor" as any,
                    params: { mode: "edit", terreiroId: t.id },
                  });
                }}
                style={({ pressed }) => [
                  styles.terreiroMenuItem,
                  pressed ? styles.terreiroMenuItemPressed : null,
                ]}
              >
                <Text
                  style={[styles.terreiroMenuItemText, { color: textPrimary }]}
                >
                  Renomear e editar detalhes
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  const t = terreiroMenuTarget;
                  if (!t) return;
                  closeTerreiroMenu();
                  void requestLeaveRole(t);
                }}
                style={({ pressed }) => [
                  styles.terreiroMenuItem,
                  pressed ? styles.terreiroMenuItemPressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.terreiroMenuItemText,
                    { color: colors.danger },
                  ]}
                >
                  Sair do papel de admin
                </Text>
              </Pressable>
            </>
          ) : terreiroMenuTarget?.role === "curimba" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const t = terreiroMenuTarget;
                if (!t) return;
                closeTerreiroMenu();
                void requestLeaveRole(t);
              }}
              style={({ pressed }) => [
                styles.terreiroMenuItem,
                pressed ? styles.terreiroMenuItemPressed : null,
              ]}
            >
              <Text
                style={[styles.terreiroMenuItemText, { color: colors.danger }]}
              >
                Sair do papel de curimba
              </Text>
            </Pressable>
          ) : terreiroMenuTarget?.role === "member" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const t = terreiroMenuTarget;
                if (!t) return;
                closeTerreiroMenu();

                Alert.alert(
                  "Deixar de ser membro",
                  "Você vai deixar de ser membro e perder acesso ao conteúdo e às coleções deste terreiro.",
                  [
                    { text: "Cancelar", style: "cancel" },
                    {
                      text: leaveTerreiroBusy ? "Saindo…" : "Sair",
                      style: "destructive",
                      onPress: () => {
                        void confirmLeaveTerreiro(t);
                      },
                    },
                  ]
                );
              }}
              style={({ pressed }) => [
                styles.terreiroMenuItem,
                pressed ? styles.terreiroMenuItemPressed : null,
              ]}
            >
              <Text
                style={[styles.terreiroMenuItemText, { color: colors.danger }]}
              >
                Deixar de ser membro
              </Text>
            </Pressable>
          ) : null}
        </View>
      </BottomSheet>

      <Modal
        transparent
        animationType="fade"
        visible={uiEnabled && isOpen && isLeaveRoleModalOpen}
        onRequestClose={closeLeaveRoleModal}
      >
        <Pressable
          style={styles.leaveRoleBackdrop}
          onPress={() => {
            closeLeaveRoleModal();
          }}
        >
          <Pressable
            style={[
              styles.leaveRoleCard,
              {
                backgroundColor:
                  variant === "light" ? colors.paper100 : colors.forest900,
                borderColor: dividerColor,
              },
            ]}
            onPress={(e) => {
              (e as any)?.stopPropagation?.();
            }}
          >
            <Text
              style={[styles.leaveRoleTitle, { color: textPrimary }]}
              numberOfLines={2}
            >
              {leaveRoleTarget?.role === "admin"
                ? "Sair do papel de admin?"
                : "Sair do papel de curimba?"}
            </Text>

            <Text
              style={[styles.leaveRoleBody, { color: textSecondary }]}
              numberOfLines={6}
            >
              Você perderá acesso de gestão deste terreiro. Para confirmar,
              digite
              {' "sair"'} abaixo.
            </Text>

            {leaveRoleTarget ? (
              <Text style={[styles.leaveRoleHint, { color: textSecondary }]}>
                {leaveRoleTarget.terreiroTitle}
              </Text>
            ) : null}

            <TextInput
              value={leaveRoleConfirmText}
              onChangeText={setLeaveRoleConfirmText}
              placeholder='Digite "sair"'
              placeholderTextColor={textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!leaveRoleBusy}
              style={[
                styles.leaveRoleInput,
                {
                  color: textPrimary,
                  borderColor: inputBorder,
                  backgroundColor: inputBg,
                },
              ]}
            />

            <View style={styles.leaveRoleActionsRow}>
              <Pressable
                accessibilityRole="button"
                onPress={closeLeaveRoleModal}
                disabled={leaveRoleBusy}
                style={({ pressed }) => [
                  styles.leaveRoleBtn,
                  styles.leaveRoleBtnSecondary,
                  { borderColor: dividerColor },
                  pressed ? styles.leaveRoleBtnPressed : null,
                  leaveRoleBusy ? styles.leaveRoleBtnDisabled : null,
                ]}
              >
                <Text style={[styles.leaveRoleBtnText, { color: textPrimary }]}>
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => void confirmLeaveRole()}
                disabled={leaveRoleBusy || !canConfirmLeaveRole}
                style={({ pressed }) => [
                  styles.leaveRoleBtn,
                  styles.leaveRoleBtnDanger,
                  pressed ? styles.leaveRoleBtnPressed : null,
                  leaveRoleBusy || !canConfirmLeaveRole
                    ? styles.leaveRoleBtnDisabled
                    : null,
                ]}
              >
                <Text style={styles.leaveRoleBtnTextDanger}>
                  {leaveRoleBusy ? "Saindo…" : "Sair"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
    backgroundColor: "transparent",
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
  profileTitleRight: {
    marginLeft: "auto",
  },
  profileEditBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  profileEditBtnPressed: {
    opacity: 0.75,
  },
  profileBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    width: "100%",
  },
  profileBadgeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
    minWidth: 0,
  },
  profileBadgeRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm,
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
    height: 290,
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

  terreiroMenuBtn: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  terreiroMenuBtnPressed: {
    opacity: 0.7,
  },
  terreiroMenuSheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: 8,
  },
  terreiroMenuTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  terreiroMenuHint: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.9,
    marginBottom: 6,
  },
  terreiroMenuItem: {
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 12,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  terreiroMenuItemPressed: {
    opacity: 0.8,
  },
  terreiroMenuItemText: {
    fontSize: 14,
    fontWeight: "900",
  },

  leaveRoleBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  leaveRoleCard: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: 10,
  },
  leaveRoleTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  leaveRoleBody: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.92,
  },
  leaveRoleHint: {
    fontSize: 13,
    fontWeight: "800",
    opacity: 0.95,
  },
  leaveRoleInput: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "800",
  },
  leaveRoleActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 4,
  },
  leaveRoleBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  leaveRoleBtnSecondary: {
    borderWidth: 2,
  },
  leaveRoleBtnDanger: {
    backgroundColor: colors.danger,
  },
  leaveRoleBtnPressed: {
    opacity: 0.82,
  },
  leaveRoleBtnDisabled: {
    opacity: 0.55,
  },
  leaveRoleBtnText: {
    fontSize: 13,
    fontWeight: "900",
  },
  leaveRoleBtnTextDanger: {
    color: colors.paper50,
    fontSize: 13,
    fontWeight: "900",
  },

  logoutHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  logoutIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutHeaderTextCol: {
    flex: 1,
    gap: 6,
  },
  logoutBody: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.92,
    lineHeight: 18,
  },
});
