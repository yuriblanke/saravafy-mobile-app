import { useAuth } from "@/contexts/AuthContext";
import { usePreferences, type ThemeMode } from "@/contexts/PreferencesContext";
import {
  PreferencesPageItem,
  PreferencesRadioGroup,
  PreferencesSection,
  PreferencesSwitchItem,
  type PreferencesRadioOption,
} from "@/src/components/preferences";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useRootPager } from "@/contexts/RootPagerContext";

import { BottomSheet } from "@/src/components/BottomSheet";
import { CurimbaExplainerBottomSheet } from "@/src/components/CurimbaExplainerBottomSheet";
import { useMyEditableTerreirosQuery } from "@/src/queries/me";

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

export function AppHeaderWithPreferences() {
  const router = useRouter();
  const pathname = usePathname();
  const rootPager = useRootPager();
  const { user, signOut } = useAuth();
  const {
    themeMode,
    setThemeMode,
    effectiveTheme,
    activeContext,
    setActiveContext,
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

  const myEditableTerreirosQuery = useMyEditableTerreirosQuery(userId);
  const myEditableTerreiros = myEditableTerreirosQuery.data ?? [];

  const activeTerreiro = useMemo(() => {
    if (activeContext.kind !== "TERREIRO_PAGE") return null;

    if (activeContext.terreiroId) {
      return {
        id: activeContext.terreiroId,
        name: activeContext.terreiroName ?? "Terreiro",
        avatarUrl: activeContext.terreiroAvatarUrl,
        role: "admin" as const,
      };
    }

    return null;
  }, [activeContext]);

  const contextAvatarUrl =
    activeContext.kind === "USER_PROFILE"
      ? userPhotoUrl
      : activeTerreiro?.avatarUrl ?? activeContext.terreiroAvatarUrl;

  const contextInitials =
    activeContext.kind === "USER_PROFILE"
      ? initials
      : getInitials(activeTerreiro?.name ?? "Terreiro");

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
          <PreferencesSection title="Minhas páginas" variant={variant}>
            <View style={styles.pagesList}>
              <PreferencesPageItem
                variant={variant}
                title={userDisplayName}
                avatarUrl={userPhotoUrl}
                initials={initials}
                isActive={activeContext.kind === "USER_PROFILE"}
                onPressSwitch={async () => {
                  try {
                    await Promise.resolve(
                      setActiveContext({ kind: "USER_PROFILE" })
                    );
                    await Haptics.selectionAsync();
                  } catch {
                    // silêncio
                  }
                  // Trocar para a página de Pontos no RootPager, mas não navegar
                  rootPager?.setActiveKey("pontos");
                }}
                onPressEdit={() => {
                  setIsPreferencesOpen(false);
                  setIsEditProfileOpen(true);
                }}
              />

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
                myEditableTerreiros.length === 0 ? (
                <Text style={[styles.helperText, { color: textSecondary }]}>
                  Carregando terreiros…
                </Text>
              ) : myEditableTerreiros.length === 0 ? (
                <Text style={[styles.helperText, { color: textSecondary }]}>
                  Você ainda não tem acesso a terreiros como Admin/Editor.
                </Text>
              ) : (
                myEditableTerreiros.map((t) => (
                  <PreferencesPageItem
                    key={t.id}
                    variant={variant}
                    title={t.title}
                    avatarUrl={t.cover_image_url ?? undefined}
                    initials={getInitials(t.title)}
                    isActive={
                      activeContext.kind === "TERREIRO_PAGE" &&
                      activeContext.terreiroId === t.id
                    }
                    onPressSwitch={async () => {
                      try {
                        await Promise.resolve(
                          setActiveContext({
                            kind: "TERREIRO_PAGE",
                            terreiroId: t.id,
                            terreiroName: t.title,
                            terreiroAvatarUrl: t.cover_image_url ?? undefined,
                            role: t.role,
                          })
                        );
                        await Haptics.selectionAsync();
                      } catch {
                        // silêncio
                      }
                      // Não navegar - apenas trocar contexto e manter modal aberto
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
