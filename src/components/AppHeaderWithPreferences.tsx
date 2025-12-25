import { useAuth } from "@/contexts/AuthContext";
import { usePreferences, type ThemeMode } from "@/contexts/PreferencesContext";
import { Separator } from "@/src/components/Separator";
import {
  SettingsActionItem,
  SettingsRadioGroup,
  SettingsSection,
  SettingsSwitchItem,
  type SettingsRadioOption,
} from "@/src/components/settings";
import { colors, spacing } from "@/src/theme";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
    curimbaOnboardingDismissed,
    setCurimbaOnboardingDismissed,
  } = usePreferences();

  const variant = effectiveTheme;

  const isTerreirosActive =
    typeof pathname === "string" &&
    (pathname.startsWith("/terreiros") || pathname.startsWith("/terreiro"));
  const isPontosActive = !isTerreirosActive;

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;
  const textMuted =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;

  const settingsDividerColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;
  const settingsGroupBg =
    variant === "light" ? colors.inputBgLight : colors.inputBgDark;

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isContextSwitchOpen, setIsContextSwitchOpen] = useState(false);
  const [isCreateTerreiroPlaceholderOpen, setIsCreateTerreiroPlaceholderOpen] =
    useState(false);
  const [isCurimbaInfoOpen, setIsCurimbaInfoOpen] = useState(false);
  const [curimbaDontShowAgain, setCurimbaDontShowAgain] = useState(false);

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

  const contextSubtitle =
    activeContext.kind === "USER_PROFILE"
      ? "Usando como: Meu perfil"
      : "Usando como: Página do terreiro";

  const contextAvatarUrl =
    activeContext.kind === "USER_PROFILE"
      ? userPhotoUrl
      : activeTerreiro?.avatarUrl ?? activeContext.terreiroAvatarUrl;

  const contextInitials =
    activeContext.kind === "USER_PROFILE"
      ? initials
      : getInitials(activeTerreiro?.name ?? "Terreiro");

  useEffect(() => {
    if (!isContextSwitchOpen && !isProfileMenuOpen) return;
    if (!user?.id) return;
    if (loadingTerreirosAdmin) return;
    if (hasAttemptedTerreirosAdmin) return;

    fetchTerreirosQueAdministro(user.id);
  }, [
    isContextSwitchOpen,
    isProfileMenuOpen,
    user?.id,
    loadingTerreirosAdmin,
    hasAttemptedTerreirosAdmin,
    fetchTerreirosQueAdministro,
  ]);

  const openEditProfile = () => {
    setIsProfileMenuOpen(false);
    setIsContextSwitchOpen(false);
    Alert.alert("Editar perfil", "Em breve.");
  };

  const openChangePhoto = () => {
    setIsProfileMenuOpen(false);
    setIsContextSwitchOpen(false);
    Alert.alert("Trocar foto", "Em breve.");
  };

  const onSelectTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  const requestEnableCurimba = () => {
    if (curimbaOnboardingDismissed) {
      setCurimbaEnabled(true);
      return;
    }
    setCurimbaDontShowAgain(false);
    setIsCurimbaInfoOpen(true);
  };

  const onToggleCurimba = (next: boolean) => {
    if (next) {
      requestEnableCurimba();
      return;
    }
    setCurimbaEnabled(false);
  };

  const confirmEnableCurimba = () => {
    if (curimbaDontShowAgain) {
      setCurimbaOnboardingDismissed(true);
    }
    setCurimbaEnabled(true);
    setIsCurimbaInfoOpen(false);
  };

  const cancelEnableCurimba = () => {
    setCurimbaDontShowAgain(false);
    setIsCurimbaInfoOpen(false);
  };

  const onPressSwitchProfile = () => {
    setIsContextSwitchOpen(true);
  };

  const onPressCreateTerreiroPage = () => {
    setIsCreateTerreiroPlaceholderOpen(true);
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

        <Pressable
          accessibilityRole="button"
          onPress={() => setIsProfileMenuOpen(true)}
          style={styles.headerIdentity}
          hitSlop={10}
        >
          <Text
            style={[styles.headerIdentityText, { color: textPrimary }]}
            numberOfLines={1}
          >
            {contextTitle}
          </Text>

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
        </Pressable>
      </View>

      {/* Menu de preferências (bottom sheet simples) */}
      <BottomSheet
        visible={isProfileMenuOpen}
        variant={variant}
        onClose={() => {
          setIsContextSwitchOpen(false);
          setIsProfileMenuOpen(false);
        }}
      >
        <SettingsSection
          title="Contexto atual"
          titleColor={textMuted}
          descriptionColor={textSecondary}
        >
          <View style={styles.contextRow}>
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

            <View style={styles.contextTextCol}>
              <Text
                style={[styles.contextName, { color: textPrimary }]}
                numberOfLines={1}
              >
                {contextTitle}
              </Text>
              <Text
                style={[styles.contextSubtitle, { color: textSecondary }]}
                numberOfLines={1}
              >
                {contextSubtitle}
              </Text>
            </View>
          </View>

          <Separator variant={variant} />

          <SettingsActionItem
            label={
              loadingTerreirosAdmin
                ? "Carregando…"
                : terreirosAdmin.length > 0
                ? "Trocar perfil"
                : "Criar página de terreiro"
            }
            onPress={
              terreirosAdmin.length > 0
                ? onPressSwitchProfile
                : onPressCreateTerreiroPage
            }
            disabled={loadingTerreirosAdmin}
            textColor={textPrimary}
            hintColor={textMuted}
          />
        </SettingsSection>

        <View style={styles.settingsSectionGap} />

        <SettingsSection
          title="Conta"
          titleColor={textMuted}
          descriptionColor={textSecondary}
        >
          <SettingsActionItem
            label="Editar perfil"
            onPress={openEditProfile}
            textColor={textPrimary}
            hintColor={textMuted}
          />
          <Separator variant={variant} />
          <SettingsActionItem
            label="Trocar foto"
            onPress={openChangePhoto}
            textColor={textPrimary}
            hintColor={textMuted}
          />
        </SettingsSection>

        <View style={styles.settingsSectionGap} />

        <SettingsSection
          title="Aparência"
          description="Escolha como o app deve se comportar visualmente"
          titleColor={textMuted}
          descriptionColor={textSecondary}
        >
          <SettingsRadioGroup
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
              ] as const satisfies ReadonlyArray<SettingsRadioOption<ThemeMode>>
            }
            textColor={textPrimary}
            descriptionColor={textSecondary}
            borderColor={settingsDividerColor}
            cardBg={settingsGroupBg}
            selectedColor={colors.brass600}
          />
        </SettingsSection>

        <View style={styles.settingsSectionGap} />

        <SettingsSection
          title="Modo Curimba"
          description="Durante a gira: apenas letras, sem áudio, e tela sempre ligada."
          titleColor={textMuted}
          descriptionColor={textSecondary}
        >
          <SettingsSwitchItem
            label="Ativar"
            value={curimbaEnabled}
            onValueChange={onToggleCurimba}
            textColor={textPrimary}
          />
        </SettingsSection>

        <View style={styles.settingsSectionGapLarge} />
        <Separator variant={variant} />

        <SettingsActionItem
          label="Sair"
          chevron={false}
          textColor={colors.danger}
          hintColor={textMuted}
          onPress={() => {
            setIsContextSwitchOpen(false);
            setIsProfileMenuOpen(false);
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
        />
      </BottomSheet>

      {/* Modal placeholder: criação de página de terreiro */}
      <BottomSheet
        visible={isCreateTerreiroPlaceholderOpen}
        variant={variant}
        onClose={() => setIsCreateTerreiroPlaceholderOpen(false)}
      >
        <View>
          <Text style={[styles.sheetTitle, { color: textPrimary }]}>
            Em breve
          </Text>
          <Text style={[styles.infoText, { color: textSecondary }]}>
            A criação de página de terreiro ainda está em desenvolvimento.
          </Text>

          <View style={styles.infoButtons}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsCreateTerreiroPlaceholderOpen(false)}
              style={[styles.infoBtn, styles.infoBtnPrimary]}
            >
              <Text style={[styles.infoBtnText, { color: colors.paper50 }]}>
                Entendi
              </Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>

      {/* Submodal: troca de contexto (Meu perfil ↔ Página do terreiro) */}
      <BottomSheet
        visible={isContextSwitchOpen}
        variant={variant}
        onClose={() => setIsContextSwitchOpen(false)}
      >
        <View>
          <Text
            style={[styles.sheetTitle, { color: textPrimary }]}
            accessibilityRole="header"
          >
            Trocar perfil
          </Text>

          <SettingsSection
            title="Meu perfil"
            titleColor={textMuted}
            descriptionColor={textSecondary}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setActiveContext({ kind: "USER_PROFILE" });
                setIsContextSwitchOpen(false);
                router.replace("/home");
              }}
              style={({ pressed }) => [
                styles.contextOptionRow,
                pressed ? styles.contextOptionPressed : null,
              ]}
            >
              <View style={styles.avatarWrap}>
                {userPhotoUrl ? (
                  <Image
                    source={{ uri: userPhotoUrl }}
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
                      {initials}
                    </Text>
                  </View>
                )}
              </View>

              <Text
                style={[styles.contextOptionText, { color: textPrimary }]}
                numberOfLines={1}
              >
                {userDisplayName}
              </Text>
            </Pressable>
          </SettingsSection>

          <View style={styles.settingsSectionGap} />

          <SettingsSection
            title="Terreiros que administro"
            titleColor={textMuted}
            descriptionColor={textSecondary}
          >
            {loadingTerreirosAdmin ? (
              <Text
                style={[styles.emptyText, { color: textSecondary }]}
                numberOfLines={2}
              >
                Carregando…
              </Text>
            ) : erroTerreirosAdmin ? (
              <View>
                <Text
                  style={[styles.emptyText, { color: textSecondary }]}
                  numberOfLines={3}
                >
                  {erroTerreirosAdmin}
                </Text>
                <View style={styles.settingsSectionGapSmall} />
                <SettingsActionItem
                  label="Tentar novamente"
                  chevron={false}
                  onPress={() => {
                    if (!user?.id) return;
                    fetchTerreirosQueAdministro(user.id);
                  }}
                  textColor={textPrimary}
                  hintColor={textMuted}
                />
              </View>
            ) : terreirosAdmin.length === 0 ? (
              <Text
                style={[styles.emptyText, { color: textSecondary }]}
                numberOfLines={2}
              >
                Você ainda não administra nenhum terreiro.
              </Text>
            ) : (
              <View style={styles.contextOptionsList}>
                {terreirosAdmin.map((t) => (
                  <Pressable
                    key={t.id}
                    accessibilityRole="button"
                    onPress={() => {
                      setActiveContext({
                        kind: "TERREIRO_PAGE",
                        terreiroId: t.id,
                        terreiroName: t.name,
                        terreiroAvatarUrl: t.avatarUrl,
                      });
                      setIsContextSwitchOpen(false);
                      router.replace("/terreiro" as any);
                    }}
                    style={({ pressed }) => [
                      styles.contextOptionRow,
                      pressed ? styles.contextOptionPressed : null,
                    ]}
                  >
                    <View style={styles.avatarWrap}>
                      {t.avatarUrl ? (
                        <Image
                          source={{ uri: t.avatarUrl }}
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
                            style={[
                              styles.avatarInitials,
                              { color: textPrimary },
                            ]}
                          >
                            {getInitials(t.name)}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text
                      style={[styles.contextOptionText, { color: textPrimary }]}
                      numberOfLines={1}
                    >
                      {t.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </SettingsSection>
        </View>
      </BottomSheet>

      {/* Modal: primeira ativação do Curimba */}
      <BottomSheet
        visible={isCurimbaInfoOpen}
        variant={variant}
        onClose={cancelEnableCurimba}
      >
        <View>
          <Text style={[styles.sheetTitle, { color: textPrimary }]}>
            Modo Curimba
          </Text>

          <Text style={[styles.infoText, { color: textSecondary }]}>
            • Carrega apenas letras (sem áudio) para reduzir latência (resposta
            mais rápida).
          </Text>
          <Text style={[styles.infoText, { color: textSecondary }]}>
            • Mantém a tela ligada durante o uso.
          </Text>
          <Text style={[styles.infoText, { color: textSecondary }]}>
            • Pode aumentar consumo de bateria.
          </Text>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: curimbaDontShowAgain }}
            onPress={() => setCurimbaDontShowAgain((v) => !v)}
            style={styles.checkboxRow}
            hitSlop={8}
          >
            <View
              style={[
                styles.checkboxBox,
                curimbaDontShowAgain ? styles.checkboxBoxChecked : null,
                variant === "light"
                  ? styles.checkboxBoxLight
                  : styles.checkboxBoxDark,
              ]}
              pointerEvents="none"
            >
              {curimbaDontShowAgain && (
                <Text style={[styles.checkboxMark, { color: textPrimary }]}>
                  ✓
                </Text>
              )}
            </View>
            <Text
              style={[styles.checkboxText, { color: textSecondary }]}
              pointerEvents="none"
            >
              Não mostrar novamente
            </Text>
          </Pressable>

          <View style={styles.infoButtons}>
            <Pressable
              accessibilityRole="button"
              onPress={cancelEnableCurimba}
              style={[
                styles.infoBtn,
                variant === "light"
                  ? styles.infoBtnSecondaryLight
                  : styles.infoBtnSecondaryDark,
              ]}
            >
              <Text style={[styles.infoBtnText, { color: textPrimary }]}>
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={confirmEnableCurimba}
              style={[styles.infoBtn, styles.infoBtnPrimary]}
            >
              <Text style={[styles.infoBtnText, { color: colors.paper50 }]}>
                Ativar
              </Text>
            </Pressable>
          </View>
        </View>
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

  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlayBackdrop,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sheetDark: {
    backgroundColor: colors.surfaceCardBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceCardBorder,
  },
  sheetLight: {
    backgroundColor: colors.surfaceCardBgLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceCardBorderLight,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  settingsSectionGapSmall: {
    height: spacing.sm,
  },
  settingsSectionGap: {
    height: spacing.lg,
  },
  settingsSectionGapLarge: {
    height: spacing.xl,
  },

  contextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 6,
  },
  contextTextCol: {
    flex: 1,
    minWidth: 0,
  },
  contextName: {
    fontSize: 14,
    fontWeight: "800",
  },
  contextSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.85,
  },

  contextOptionRow: {
    minHeight: 44,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  contextOptionPressed: {
    opacity: 0.75,
  },
  contextOptionText: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "700",
  },
  contextOptionsList: {
    gap: 2,
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 18,
  },

  infoModal: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: spacing.md,
    paddingVertical: 4,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxBoxDark: {
    borderColor: colors.surfaceCardBorder,
    backgroundColor: colors.inputBgDark,
  },
  checkboxBoxLight: {
    borderColor: colors.surfaceCardBorderLight,
    backgroundColor: colors.paper100,
  },
  checkboxBoxChecked: {
    borderColor: colors.brass600,
  },
  checkboxMark: {
    fontSize: 12,
    lineHeight: 12,
    opacity: 1,
  },
  checkboxText: {
    fontSize: 13,
    fontWeight: "600",
  },
  infoButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  infoBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  infoBtnSecondaryDark: {
    borderColor: colors.surfaceCardBorder,
    backgroundColor: "transparent",
  },
  infoBtnSecondaryLight: {
    borderColor: colors.surfaceCardBorderLight,
    backgroundColor: "transparent",
  },
  infoBtnPrimary: {
    borderColor: colors.brass600,
    backgroundColor: colors.brass600,
  },
  infoBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
});
