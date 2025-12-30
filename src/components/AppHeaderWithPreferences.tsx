import { useAuth } from "@/contexts/AuthContext";
import { usePreferences, type ThemeMode } from "@/contexts/PreferencesContext";
import { useRootPager } from "@/contexts/RootPagerContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { AccessRoleInfo } from "@/src/components/AccessRoleInfo";
import { BottomSheet } from "@/src/components/BottomSheet";
import { CurimbaExplainerBottomSheet } from "@/src/components/CurimbaExplainerBottomSheet";
import {
  PreferencesPageItem,
  PreferencesRadioGroup,
  PreferencesSection,
  PreferencesSwitchItem,
  type PreferencesRadioOption,
} from "@/src/components/preferences";
import { TagChip } from "@/src/components/TagChip";
import {
  getGlobalRoleBadgeLabel,
  getGlobalRoleInfoProps,
} from "@/src/domain/globalRoles";
import { useIsCurator } from "@/src/hooks/useIsCurator";
import { useIsDevMaster } from "@/src/hooks/useIsDevMaster";
import { useMyEditableTerreirosQuery } from "@/src/queries/me";
import { queryKeys } from "@/src/queries/queryKeys";
import { InviteModal } from "@/src/screens/AccessManager/InviteModal";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { dismissAllTooltips } from "@/src/components/TooltipPopover";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";

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

function normalizeEmail(value: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

type CuratorInviteRow = {
  id: string;
  email: string;
  status?: string | null;
  created_at?: string | null;
};

function GlobalRoleBadge({ label }: { label: string }) {
  return (
    <View style={styles.globalRoleBadge}>
      <Text style={styles.globalRoleBadgeText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function AppHeaderWithPreferences() {
  const router = useRouter();
  const pathname = usePathname();
  const rootPager = useRootPager();
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const {
    themeMode,
    setThemeMode,
    effectiveTheme,
    curimbaEnabled,
    setCurimbaEnabled,
    curimbaOnboardingDismissed,
    setCurimbaOnboardingDismissed,
    startPagePreference,
  } = usePreferences();

  const variant = effectiveTheme;

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

  const dividerColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;

  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isCurimbaExplainerOpen, setIsCurimbaExplainerOpen] = useState(false);
  const [isCuratorInviteOpen, setIsCuratorInviteOpen] = useState(false);
  const [isCuratorInviteSubmitting, setIsCuratorInviteSubmitting] =
    useState(false);

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

  const { isDevMaster, isLoading: isDevMasterLoading } = useIsDevMaster();
  const { isCurator, isLoading: isCuratorLoading } = useIsCurator();

  const shouldShowDevMaster = !isDevMasterLoading && isDevMaster;
  const shouldShowCurator =
    !shouldShowDevMaster && !isCuratorLoading && isCurator;

  const myEditableTerreirosQuery = useMyEditableTerreirosQuery(userId);
  const myEditableTerreiros = useMemo(
    () => myEditableTerreirosQuery.data ?? [],
    [myEditableTerreirosQuery.data]
  );

  const myAdminTerreiros = useMemo(
    () => myEditableTerreiros.filter((t) => t.role === "admin"),
    [myEditableTerreiros]
  );

  const curatorInvitesQuery = useQuery({
    queryKey: userId
      ? queryKeys.curatorInvites.pendingForDevMaster(userId)
      : ["curatorInvites", "pending", null],
    enabled: !!userId && shouldShowDevMaster && isPreferencesOpen,
    staleTime: 10_000,
    queryFn: async () => {
      const res = await supabase
        .from("curator_invites")
        .select("id, email, status, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (res.error) {
        if (__DEV__) {
          console.warn("[Prefs.curatorInvites] error", res.error);
        }
        return [] as CuratorInviteRow[];
      }

      const rows = (res.data ?? []) as any[];
      return rows
        .map((r) => ({
          id: String(r?.id ?? ""),
          email: normalizeEmail(String(r?.email ?? "")),
          status: typeof r?.status === "string" ? r.status : null,
          created_at: typeof r?.created_at === "string" ? r.created_at : null,
        }))
        .filter((r) => r.id && r.email);
    },
  });

  const pendingCuratorInvites = useMemo(() => {
    const items = curatorInvitesQuery.data ?? [];
    const seen: Record<string, true> = {};
    const out: CuratorInviteRow[] = [];
    for (const i of items) {
      const key = normalizeEmail(i.email);
      if (!key) continue;
      if (seen[key]) continue;
      seen[key] = true;
      out.push(i);
    }
    return out;
  }, [curatorInvitesQuery.data]);

  const cancelCuratorInvite = async (inviteId: string) => {
    if (!shouldShowDevMaster) {
      showToast("Você não tem permissão para isso.");
      return;
    }

    const rpc = await supabase.rpc("cancel_curator_invite", {
      invite_id: inviteId,
    });

    if (rpc.error) {
      showToast(
        "Não foi possível concluir agora. Verifique sua conexão e tente novamente."
      );
      return;
    }

    showToast("Convite cancelado.");
    await curatorInvitesQuery.refetch();
  };

  const contextAvatarUrl = userPhotoUrl;
  const contextInitials = initials;

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

      {/* Menu de preferências */}
      <BottomSheet
        visible={isPreferencesOpen}
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
              afterTitle={
                shouldShowDevMaster ? (
                  <>
                    <GlobalRoleBadge
                      label={getGlobalRoleBadgeLabel("dev_master")}
                    />
                    <AccessRoleInfo
                      variant={variant}
                      info={getGlobalRoleInfoProps("dev_master")}
                    />
                  </>
                ) : shouldShowCurator ? (
                  <>
                    <GlobalRoleBadge
                      label={getGlobalRoleBadgeLabel("curator")}
                    />
                    <AccessRoleInfo
                      variant={variant}
                      info={getGlobalRoleInfoProps("curator")}
                    />
                  </>
                ) : null
              }
              avatarUrl={userPhotoUrl}
              initials={initials}
              onPress={undefined}
              onPressEdit={() => {
                setIsPreferencesOpen(false);
                setIsEditProfileOpen(true);
              }}
            />
          </View>

          <View
            style={[styles.blockDivider, { backgroundColor: dividerColor }]}
          />

          {shouldShowDevMaster ? (
            <>
              <PreferencesSection
                title="Administração do acervo"
                variant={variant}
              >
                <View style={styles.pagesList}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      dismissAllTooltips();
                      setIsCuratorInviteOpen(true);
                    }}
                    style={({ pressed }) => [
                      styles.prefActionRow,
                      {
                        borderColor: dividerColor,
                        backgroundColor:
                          variant === "light"
                            ? colors.inputBgLight
                            : colors.inputBgDark,
                      },
                      pressed ? styles.prefActionRowPressed : null,
                    ]}
                  >
                    <View style={styles.prefActionLeft}>
                      <Text
                        style={[styles.prefActionTitle, { color: textPrimary }]}
                      >
                        Convidar {getGlobalRoleBadgeLabel("curator")}
                      </Text>
                      <View style={styles.prefActionMeta}>
                        <TagChip
                          label="Somente Dev Master"
                          variant={variant}
                          kind="custom"
                          tone="medium"
                        />
                        <AccessRoleInfo
                          variant={variant}
                          info={getGlobalRoleInfoProps("curator")}
                        />
                      </View>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={textMuted}
                    />
                  </Pressable>

                  {curatorInvitesQuery.isFetching &&
                  pendingCuratorInvites.length === 0 ? (
                    <Text style={[styles.helperText, { color: textSecondary }]}>
                      Carregando convites…
                    </Text>
                  ) : pendingCuratorInvites.length === 0 ? (
                    <Text style={[styles.helperText, { color: textSecondary }]}>
                      Nenhum convite pendente.
                    </Text>
                  ) : (
                    <View
                      style={[
                        styles.curatorInvitesCard,
                        {
                          borderColor: dividerColor,
                          backgroundColor:
                            variant === "light"
                              ? colors.inputBgLight
                              : colors.inputBgDark,
                        },
                      ]}
                    >
                      {pendingCuratorInvites.map((inv, idx) => {
                        const isLast = idx === pendingCuratorInvites.length - 1;
                        return (
                          <View
                            key={inv.id}
                            style={[
                              styles.curatorInviteRow,
                              {
                                borderBottomColor: dividerColor,
                                borderBottomWidth: isLast
                                  ? 0
                                  : StyleSheet.hairlineWidth,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.curatorInviteEmail,
                                { color: textPrimary },
                              ]}
                              numberOfLines={1}
                            >
                              {inv.email}
                            </Text>

                            <View style={styles.curatorInviteRight}>
                              <TagChip
                                label="Pendente"
                                variant={variant}
                                kind="custom"
                                tone="medium"
                              />
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`Cancelar convite para ${inv.email}`}
                                onPress={() => {
                                  Alert.alert(
                                    "Cancelar convite",
                                    `Cancelar convite para ${inv.email}?`,
                                    [
                                      { text: "Voltar", style: "cancel" },
                                      {
                                        text: "Cancelar convite",
                                        style: "destructive",
                                        onPress: () => {
                                          void cancelCuratorInvite(inv.id);
                                        },
                                      },
                                    ]
                                  );
                                }}
                                hitSlop={10}
                                style={({ pressed }) => [
                                  styles.curatorInviteCancel,
                                  pressed ? styles.prefActionRowPressed : null,
                                ]}
                              >
                                <Text style={styles.curatorInviteCancelText}>
                                  Cancelar
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </PreferencesSection>

              <View
                style={[styles.blockDivider, { backgroundColor: dividerColor }]}
              />
            </>
          ) : null}

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

      {/* Modal: editar perfil (placeholder silencioso) */}
      <BottomSheet
        visible={isEditProfileOpen}
        variant={variant}
        onClose={() => setIsEditProfileOpen(false)}
      >
        <View />
      </BottomSheet>

      <CurimbaExplainerBottomSheet
        visible={isCurimbaExplainerOpen}
        variant={variant}
        dontShowAgain={curimbaOnboardingDismissed}
        onChangeDontShowAgain={setCurimbaOnboardingDismissed}
        onClose={() => setIsCurimbaExplainerOpen(false)}
      />

      <InviteModal
        visible={isCuratorInviteOpen}
        variant={variant}
        mode="curator"
        inviteTitle={`Convidar ${getGlobalRoleBadgeLabel("curator")}`}
        fixedRoleLabel={getGlobalRoleBadgeLabel("curator")}
        infoProps={getGlobalRoleInfoProps("curator")}
        isSubmitting={isCuratorInviteSubmitting}
        onClose={() => {
          if (isCuratorInviteSubmitting) return;
          setIsCuratorInviteOpen(false);
        }}
        onSubmit={async ({ email }) => {
          if (!shouldShowDevMaster) {
            showToast("Você não tem permissão para convidar.");
            return;
          }

          const normalized = normalizeEmail(email);
          if (!normalized) {
            showToast("Informe um e-mail válido.");
            return;
          }

          const hasDuplicate = pendingCuratorInvites.some(
            (i) => normalizeEmail(i.email) === normalized
          );

          if (hasDuplicate) {
            showToast("Já existe um convite pendente para esse e-mail.");
            return;
          }

          setIsCuratorInviteSubmitting(true);
          try {
            const rpc = await supabase.rpc("create_curator_invite", {
              p_email: normalized,
            });

            if (rpc.error) {
              const msg =
                typeof rpc.error.message === "string" ? rpc.error.message : "";

              if (
                msg.includes("schema cache") ||
                msg.includes("Could not find the function")
              ) {
                showToast(
                  "O servidor ainda está atualizando. Tente novamente em alguns segundos."
                );
                return;
              }

              if (msg.includes("not_dev_master")) {
                showToast(
                  "Somente Dev Master pode convidar Guardiã do Acervo."
                );
                return;
              }

              if (msg.includes("invite_already_pending")) {
                showToast("Já existe um convite pendente para este e-mail.");
                return;
              }

              if (msg.includes("invalid_email")) {
                showToast("E-mail inválido.");
                return;
              }

              showToast(
                msg.trim()
                  ? msg
                  : "Não foi possível enviar o convite agora. Tente novamente."
              );
              return;
            }

            showToast("Convite enviado.");
            setIsCuratorInviteOpen(false);
            await curatorInvitesQuery.refetch();
          } finally {
            setIsCuratorInviteSubmitting(false);
          }
        }}
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
  globalRoleBadge: {
    maxWidth: 170,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.brass600,
  },
  globalRoleBadgeText: {
    color: colors.paper50,
    fontSize: 12,
    fontWeight: "900",
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
});
