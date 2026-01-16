import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { Badge } from "@/src/components/Badge";
import { PreferencesPageItem } from "@/src/components/preferences/PreferencesPageItem";
import { Separator } from "@/src/components/Separator";
import { useGlobalSafeAreaInsets } from "@/src/contexts/GlobalSafeAreaInsetsContext";
import { useTerreiroMembershipStatus } from "@/src/hooks/terreiroMembership";
import { queryKeys } from "@/src/queries/queryKeys";
import {
  fetchTerreiroMembersList,
  type TerreiroMemberAny,
  type TerreiroMembersVisibilityTier,
} from "@/src/queries/terreiroMembersRpc";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

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

function inferVisibilityTier(args: {
  isLoggedIn: boolean;
  membershipRole: string | null;
  isActiveMember: boolean;
}): TerreiroMembersVisibilityTier {
  if (!args.isLoggedIn) return "public";

  const role = typeof args.membershipRole === "string" ? args.membershipRole : null;
  const isActiveMember = args.isActiveMember === true;

  if (!isActiveMember || !role) return "public";
  if (role === "admin" || role === "editor") return "admin";
  if (role === "member") return "member";
  return "public";
}

function encodeMemberParam(member: TerreiroMemberAny): string {
  return encodeURIComponent(JSON.stringify(member));
}

type RenderItem = {
  id: string;
  title: string;
  initials: string;
  avatarUrl?: string;
  role?: string | null;
  email?: string | null;
  emailVerified?: boolean | null;
  raw: TerreiroMemberAny;
};

export default function TerreiroMembersList() {
  const router = useRouter();
  const params = useLocalSearchParams<{ terreiroId?: string }>();

  const terreiroId = typeof params.terreiroId === "string" ? params.terreiroId : "";

  const { user } = useAuth();
  const isLoggedIn = !!user?.id;

  const { showToast } = useToast();
  const { effectiveTheme } = usePreferences();
  const insets = useGlobalSafeAreaInsets();

  const variant: "light" | "dark" = effectiveTheme;

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;
  const baseBgColor = variant === "light" ? colors.paper50 : colors.forest900;
  const headerFgColor = textPrimary;

  const headerVisibleHeight = 52;
  const headerTotalHeight = headerVisibleHeight + (insets.top ?? 0);

  const membershipQuery = useTerreiroMembershipStatus(terreiroId);
  const membership = membershipQuery.data;

  const requestedTier = useMemo(() => {
    return inferVisibilityTier({
      isLoggedIn,
      membershipRole: membership.role,
      isActiveMember: membership.isActiveMember,
    });
  }, [isLoggedIn, membership.isActiveMember, membership.role]);

  const borderColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;

  const membersQuery = useQuery({
    queryKey: terreiroId
      ? queryKeys.terreiroMembersList({
          terreiroId,
          visibilityTier: requestedTier,
        })
      : [],
    enabled: !!terreiroId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!terreiroId) return [] as TerreiroMemberAny[];

      try {
        return await fetchTerreiroMembersList({
          terreiroId,
          visibilityTier: requestedTier,
        });
      } catch (e) {
        if (requestedTier !== "public") {
          try {
            const fallback = await fetchTerreiroMembersList({
              terreiroId,
              visibilityTier: "public",
            });
            if (__DEV__) {
              console.info("[TerreiroMembersList] fallback para lista pública", {
                terreiroId,
                from: requestedTier,
              });
            }
            if (isLoggedIn) {
              showToast("Mostrando a lista pública de membros.");
            }
            return fallback;
          } catch {
            // fallthrough
          }
        }
        throw e;
      }
    },
    placeholderData: (prev) => prev,
  });

  const items = useMemo<RenderItem[]>(() => {
    const arr = membersQuery.data ?? [];

    return arr
      .map((m) => {
        const id = typeof (m as any).user_id === "string" ? (m as any).user_id : "";
        if (!id) return null;

        const fullName = typeof (m as any).full_name === "string" ? (m as any).full_name : "";
        const title = fullName.trim() || "(Sem nome)";

        const avatarUrl =
          typeof (m as any).avatar_url === "string" ? (m as any).avatar_url : undefined;

        const role = typeof (m as any).role === "string" ? (m as any).role : null;
        const email = typeof (m as any).email === "string" ? (m as any).email : null;
        const emailVerified =
          typeof (m as any).email_verified === "boolean" ? (m as any).email_verified : null;

        return {
          id,
          title,
          initials: getInitials(title),
          avatarUrl,
          role,
          email,
          emailVerified,
          raw: m,
        } as RenderItem;
      })
      .filter(Boolean) as RenderItem[];
  }, [membersQuery.data]);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: RenderItem }) => {
      const roleText = roleLabel(item.role);

      const subtitle =
        item.email != null ? (
          <View style={styles.subtitleRow}>
            <Text style={[styles.subtitleText, { color: textSecondary }]} numberOfLines={1}>
              {item.email}
            </Text>
            {item.emailVerified === true ? (
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={colors.brass600}
                style={styles.verifiedIcon}
              />
            ) : null}
          </View>
        ) : null;

      const afterTitle = roleText ? (
        <Badge
          label={roleText}
          variant={variant}
          appearance="secondary"
          style={styles.roleBadge}
        />
      ) : null;

      return (
        <View>
          <PreferencesPageItem
            variant={variant}
            title={item.title}
            avatarUrl={item.avatarUrl}
            initials={item.initials}
            afterTitle={afterTitle}
            subtitle={subtitle}
            showEditButton={false}
            rightAccessory={<Ionicons name="chevron-forward" size={18} color={textSecondary} />}
            onPress={() => {
              router.push({
                pathname: "/terreiro-member-profile" as any,
                params: {
                  member: encodeMemberParam(item.raw),
                },
              });
            }}
          />
          <Separator variant={variant} />
        </View>
      );
    },
    [router, textSecondary, variant]
  );

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
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              onPress={goBack}
              hitSlop={10}
              style={styles.headerIconBtn}
            >
              <Ionicons name="chevron-back" size={22} color={headerFgColor} />
            </Pressable>
          </View>

          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: headerFgColor }]}>
              Membros
            </Text>
          </View>

          <View style={styles.headerRight} />
        </View>
      </View>

      <View style={[styles.content, { paddingTop: headerTotalHeight }]}
      >
        {membersQuery.isLoading && items.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={[styles.centerText, { color: textSecondary }]}>
              Carregando membros…
            </Text>
          </View>
        ) : membersQuery.isError ? (
          <View style={styles.center}>
            <Text style={[styles.errorText, { color: colors.brass600 }]}>
              Não foi possível carregar os membros.
            </Text>
            <Text style={[styles.centerText, { color: textSecondary }]}>
              {String(
                membersQuery.error instanceof Error
                  ? membersQuery.error.message
                  : "Erro"
              )}
            </Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.center}>
            <Text style={[styles.centerText, { color: textSecondary }]}>
              Nenhuma pessoa membro ativa ainda.
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={10}
            removeClippedSubviews
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  headerLeft: { width: 44, alignItems: "flex-start" },
  headerRight: { width: 44 },
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
  content: { flex: 1 },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  center: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  centerText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 2,
  },
  subtitleText: {
    fontSize: 13,
    fontWeight: "700",
  },
  verifiedIcon: {
    marginLeft: 2,
  },
  roleBadge: {
    marginLeft: spacing.sm,
  },
});
