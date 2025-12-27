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
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/src/components/BottomSheet";

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
  const { user, signOut } = useAuth();
  const {
    themeMode,
    setThemeMode,
    effectiveTheme,
    activeContext,
    setActiveContext,
    terreirosAdmin,
    loadingTerreirosAdmin,
    erroTerreirosAdmin,
    hasAttemptedTerreirosAdmin,
    fetchTerreirosQueAdministro,
    curimbaEnabled,
    setCurimbaEnabled,
  } = usePreferences();

  const variant = effectiveTheme;

  const isTerreirosActive =
    typeof pathname === "string" &&
    (pathname.startsWith("/terreiros") ||
      pathname.startsWith("/terreiro") ||
      // Mantém o underline em "Terreiros" ao navegar dentro das playlists
      // de terreiros (collection/player), independente do contexto ativo.
      pathname.startsWith("/collection") ||
      pathname.startsWith("/player"));
  const isPontosActive = !isTerreirosActive;

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
  const [isCreateTerreiroOpen, setIsCreateTerreiroOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isEditTerreiroOpen, setIsEditTerreiroOpen] = useState(false);

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

  const activeTerreiro = useMemo(() => {
    if (activeContext.kind !== "TERREIRO_PAGE") return null;
    const fromList =
      terreirosAdmin.find((t) => t.id === activeContext.terreiroId) ?? null;

    if (fromList) {
      return {
        ...fromList,
        name: activeContext.terreiroName ?? fromList.name,
        avatarUrl: activeContext.terreiroAvatarUrl ?? fromList.avatarUrl,
      };
    }

    if (activeContext.terreiroId) {
      return {
        id: activeContext.terreiroId,
        name: activeContext.terreiroName ?? "Terreiro",
        avatarUrl: activeContext.terreiroAvatarUrl,
        role: "admin" as const,
      };
    }

    return null;
  }, [activeContext, terreirosAdmin]);

  const contextTitle =
    activeContext.kind === "USER_PROFILE"
      ? userDisplayName
      : activeTerreiro?.name ?? "Terreiro";

  const contextAvatarUrl =
    activeContext.kind === "USER_PROFILE"
      ? userPhotoUrl
      : activeTerreiro?.avatarUrl ?? activeContext.terreiroAvatarUrl;

  const contextInitials =
    activeContext.kind === "USER_PROFILE"
      ? initials
      : getInitials(activeTerreiro?.name ?? "Terreiro");

  useEffect(() => {
    if (!isPreferencesOpen) return;
    if (!user?.id) return;
    if (loadingTerreirosAdmin) return;
    if (hasAttemptedTerreirosAdmin) return;

    fetchTerreirosQueAdministro(user.id);
  }, [
    isPreferencesOpen,
    user?.id,
    loadingTerreirosAdmin,
    hasAttemptedTerreirosAdmin,
    fetchTerreirosQueAdministro,
  ]);

  const onSelectTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  const onToggleCurimba = (next: boolean) => {
    setCurimbaEnabled(next);
  };

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerNav}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/home")}
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
            onPress={() => router.replace("/terreiros" as any)}
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
          <Text
            style={[styles.headerIdentityText, { color: textPrimary }]}
            numberOfLines={1}
          >
            {contextTitle}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir preferências"
            onPress={() => setIsPreferencesOpen(true)}
            hitSlop={10}
            style={({ pressed }) => [
              styles.avatarTrigger,
              pressed ? styles.avatarTriggerPressed : null,
            ]}
          >
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
                onPressSwitch={() => {
                  setActiveContext({ kind: "USER_PROFILE" });
                  setIsPreferencesOpen(false);
                  router.replace("/home");
                }}
                onPressEdit={() => {
                  setIsPreferencesOpen(false);
                  setIsEditProfileOpen(true);
                }}
              />

              {loadingTerreirosAdmin ? (
                <Text style={[styles.helperText, { color: textSecondary }]}>
                  Carregando…
                </Text>
              ) : erroTerreirosAdmin ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (!user?.id) return;
                    fetchTerreirosQueAdministro(user.id);
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
              ) : (
                terreirosAdmin.map((t) => (
                  <PreferencesPageItem
                    key={t.id}
                    variant={variant}
                    title={t.name}
                    avatarUrl={t.avatarUrl}
                    initials={getInitials(t.name)}
                    isActive={
                      activeContext.kind === "TERREIRO_PAGE" &&
                      activeContext.terreiroId === t.id
                    }
                    onPressSwitch={() => {
                      setActiveContext({
                        kind: "TERREIRO_PAGE",
                        terreiroId: t.id,
                        terreiroName: t.name,
                        terreiroAvatarUrl: t.avatarUrl,
                        role: t.role,
                      });
                      setIsPreferencesOpen(false);
                      router.replace("/terreiro" as any);
                    }}
                    onPressEdit={() => {
                      setIsPreferencesOpen(false);
                      setIsEditTerreiroOpen(true);
                    }}
                  />
                ))
              )}
            </View>
          </PreferencesSection>

          <View style={[styles.blockDivider, { backgroundColor: dividerColor }]} />

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setIsPreferencesOpen(false);
              setIsCreateTerreiroOpen(true);
            }}
            style={({ pressed }) => [
              styles.createTerreiroBtn,
              { borderColor: colors.brass600 },
              pressed ? styles.createTerreiroBtnPressed : null,
            ]}
          >
            <Text style={styles.createTerreiroText}>Criar novo terreiro</Text>
          </Pressable>

          <View style={[styles.blockDivider, { backgroundColor: dividerColor }]} />

          <PreferencesSection title="Página inicial" variant={variant} />

          <View style={[styles.blockDivider, { backgroundColor: dividerColor }]} />

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

          <View style={[styles.blockDivider, { backgroundColor: dividerColor }]} />

          <PreferencesSwitchItem
            variant={variant}
            title="Modo Curimba"
            description="Durante a gira: apenas letras, sem áudio, e tela sempre ligada."
            value={curimbaEnabled}
            onValueChange={onToggleCurimba}
          />

          <View style={styles.finalGap} />

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
                    await signOut();
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
      </BottomSheet>

      {/* Modal: criar terreiro (placeholder silencioso) */}
      <BottomSheet
        visible={isCreateTerreiroOpen}
        variant={variant}
        onClose={() => setIsCreateTerreiroOpen(false)}
      >
        <View />
      </BottomSheet>

      {/* Modal: editar perfil (placeholder silencioso) */}
      <BottomSheet
        visible={isEditProfileOpen}
        variant={variant}
        onClose={() => setIsEditProfileOpen(false)}
      >
        <View />
      </BottomSheet>

      {/* Modal: editar terreiro (placeholder silencioso) */}
      <BottomSheet
        visible={isEditTerreiroOpen}
        variant={variant}
        onClose={() => {
          setIsEditTerreiroOpen(false);
        }}
      >
        <View />
      </BottomSheet>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: 220,
  },
  headerIdentityText: {
    fontSize: 13,
    fontWeight: "700",
    maxWidth: 160,
    opacity: 0.95,
  },
  avatarTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  finalGap: {
    height: spacing.lg,
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
});
