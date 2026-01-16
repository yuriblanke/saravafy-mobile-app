import { usePreferences } from "@/contexts/PreferencesContext";
import { Badge } from "@/src/components/Badge";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { useGlobalSafeAreaInsets } from "@/src/contexts/GlobalSafeAreaInsetsContext";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

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

function roleLabel(role: string | null | undefined) {
  const r = typeof role === "string" ? role.trim().toLowerCase() : "";
  if (r === "admin") return "Admin";
  if (r === "editor") return "Editor";
  if (r === "member") return "Membro";
  return null;
}

type MemberPayload = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role?: string | null;
  email?: string | null;
};

function decodeMemberParam(
  value: string | null | undefined
): MemberPayload | null {
  if (!value) return null;
  try {
    const raw = JSON.parse(decodeURIComponent(value));
    if (!raw || typeof raw !== "object") return null;
    const r = raw as any;
    const user_id = typeof r.user_id === "string" ? r.user_id : "";
    if (!user_id) return null;

    return {
      user_id,
      full_name: typeof r.full_name === "string" ? r.full_name : null,
      avatar_url: typeof r.avatar_url === "string" ? r.avatar_url : null,
      role: typeof r.role === "string" ? r.role : null,
      email: typeof r.email === "string" ? r.email : null,
    };
  } catch {
    return null;
  }
}

export default function TerreiroMemberProfile() {
  const router = useRouter();
  const params = useLocalSearchParams<{ member?: string }>();

  const { effectiveTheme } = usePreferences();
  const variant: "light" | "dark" = effectiveTheme;

  const insets = useGlobalSafeAreaInsets();

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;
  const baseBgColor = variant === "light" ? colors.paper50 : colors.forest900;
  const borderColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;

  const headerVisibleHeight = 52;
  const headerTotalHeight = headerVisibleHeight + (insets.top ?? 0);

  const member = useMemo(() => {
    return decodeMemberParam(
      typeof params.member === "string" ? params.member : null
    );
  }, [params.member]);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  const name = (member?.full_name ?? "").trim() || "(Sem nome)";
  const initials = getInitials(name);
  const roleText = roleLabel(member?.role ?? null);

  return (
    <View style={[styles.screen, { backgroundColor: baseBgColor }]}>
      <View
        style={[
          styles.fixedHeader,
          {
            height: headerTotalHeight,
            paddingTop: insets.top ?? 0,
            backgroundColor: baseBgColor,
            borderBottomColor: borderColor,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={goBack}
          hitSlop={10}
          style={styles.headerIconBtn}
        >
          <Ionicons name="chevron-back" size={22} color={textPrimary} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>
            Perfil
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <View style={[styles.content, { paddingTop: headerTotalHeight }]}>
        {!member ? (
          <View style={styles.center}>
            <Text style={[styles.centerText, { color: textSecondary }]}>
              Não foi possível abrir este perfil.
            </Text>
          </View>
        ) : (
          <View style={styles.inner}>
            <SurfaceCard variant={variant} style={styles.card}>
              <View style={styles.topRow}>
                <View style={styles.avatarWrap}>
                  {member.avatar_url ? (
                    <Image
                      source={{ uri: member.avatar_url }}
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

                <View style={styles.nameCol}>
                  <Text
                    style={[styles.name, { color: textPrimary }]}
                    numberOfLines={2}
                  >
                    {name}
                  </Text>

                  {roleText ? (
                    <View style={styles.badgesRow}>
                      <Badge
                        label={roleText}
                        variant={variant}
                        appearance="secondary"
                      />
                    </View>
                  ) : null}
                </View>
              </View>

              {member.email ? (
                <View style={styles.metaRow}>
                  <Ionicons
                    name="mail-outline"
                    size={16}
                    color={textSecondary}
                  />
                  <Text style={[styles.metaText, { color: textSecondary }]}>
                    {member.email}
                  </Text>
                </View>
              ) : null}
            </SurfaceCard>
          </View>
        )}
      </View>
    </View>
  );
}

const AVATAR = 64;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  headerRight: { width: 36 },
  content: { flex: 1 },
  inner: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  card: {
    padding: spacing.lg,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: "hidden",
  },
  avatarImage: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
  },
  avatarPlaceholder: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPlaceholderLight: {
    backgroundColor: colors.paper50,
  },
  avatarPlaceholderDark: {
    backgroundColor: colors.forest700,
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: "900",
  },
  nameCol: { flex: 1 },
  name: {
    fontSize: 18,
    fontWeight: "900",
  },
  badgesRow: {
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  metaRow: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  metaText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  center: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
