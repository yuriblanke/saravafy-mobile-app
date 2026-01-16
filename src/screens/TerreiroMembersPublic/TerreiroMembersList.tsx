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
  fetchTerreiroMembersPage,
  type TerreiroMemberAny,
  type TerreiroMembersListTier,
} from "@/src/queries/terreiroMembersRpc";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

function getNextTier(tier: TerreiroMembersListTier): TerreiroMembersListTier {
  if (tier === "admins") return "members";
  if (tier === "members") return "public";
  return "public";
}

function encodeMemberParam(member: TerreiroMemberAny): string {
  const safe: any = { ...(member as any) };
  // Regra: não expor e-mail no front (nem via params).
  if ("email" in safe) delete safe.email;
  return encodeURIComponent(JSON.stringify(safe));
}

type RenderItem = {
  id: string;
  title: string;
  initials: string;
  avatarUrl?: string;
  role?: string | null;
  raw: TerreiroMemberAny;
};

export default function TerreiroMembersList() {
  const router = useRouter();
  const params = useLocalSearchParams<{ terreiroId?: string }>();

  const terreiroId =
    typeof params.terreiroId === "string" ? params.terreiroId : "";

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

  const PAGE_SIZE = 30;

  const initialTier = useMemo<TerreiroMembersListTier>(() => {
    // Regra de negócio: quem NÃO é membro também pode ver a lista,
    // mas sempre sem e-mail. Para garantir que sempre haja dados,
    // começamos em "public" e só promovemos o tier quando sabemos
    // que a pessoa é membro ativa.
    if (!isLoggedIn) return "public";
    return "public";
  }, [isLoggedIn]);

  const [effectiveTier, setEffectiveTier] =
    useState<TerreiroMembersListTier>(initialTier);

  // Se troca de terreiro ou muda auth state, recalcula tier inicial.
  useEffect(() => {
    setEffectiveTier(initialTier);
  }, [initialTier, terreiroId]);

  // Quando membership resolve, promovemos o tier (para mostrar badges de role).
  useEffect(() => {
    if (!isLoggedIn) return;
    if (membershipQuery.isLoading) return;
    if (membershipQuery.error) return;
    if (!membership?.isActiveMember || !membership?.role) return;

    const r = String(membership.role);
    const next: TerreiroMembersListTier =
      r === "admin" || r === "editor"
        ? "admins"
        : r === "member"
        ? "members"
        : "public";

    setEffectiveTier((prev) => (prev === next ? prev : next));
  }, [
    isLoggedIn,
    membership?.isActiveMember,
    membership?.role,
    membershipQuery.error,
    membershipQuery.isLoading,
  ]);

  const fallbackCountRef = useRef(0);
  const lastFallbackTierRef = useRef<TerreiroMembersListTier | null>(null);
  useEffect(() => {
    fallbackCountRef.current = 0;
    lastFallbackTierRef.current = null;
  }, [terreiroId]);

  const borderColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;

  const visibilityTierForQuery: "public" | "member" | "admin" =
    effectiveTier === "admins"
      ? "admin"
      : effectiveTier === "members"
      ? "member"
      : "public";

  const canQueryMembersList = useMemo(() => {
    if (!terreiroId) return false;
    // Evita flicker e tier errado enquanto membership está carregando.
    // Como começamos em "public", podemos carregar já.
    return true;
  }, [terreiroId]);

  const membersQuery = useInfiniteQuery({
    queryKey: terreiroId
      ? queryKeys.terreiroMembersListInfinite({
          terreiroId,
          visibilityTier: visibilityTierForQuery,
        })
      : [],
    enabled: canQueryMembersList,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (!terreiroId) return [] as TerreiroMemberAny[];
      const offset = typeof pageParam === "number" ? pageParam : 0;
      return await fetchTerreiroMembersPage(
        effectiveTier,
        terreiroId,
        PAGE_SIZE,
        offset
      );
    },
    getNextPageParam: (lastPage, allPages) => {
      const lastLen = Array.isArray(lastPage) ? lastPage.length : 0;
      if (lastLen === PAGE_SIZE) return allPages.length * PAGE_SIZE;
      return undefined;
    },
  });

  useEffect(() => {
    if (!membersQuery.isError) return;
    if (effectiveTier === "public") return;

    // Evita loop: no máximo 2 fallbacks (admins->members->public).
    if (fallbackCountRef.current >= 2) return;
    if (lastFallbackTierRef.current === effectiveTier) return;

    lastFallbackTierRef.current = effectiveTier;
    fallbackCountRef.current += 1;
    const next = getNextTier(effectiveTier);

    if (__DEV__) {
      console.info("[TerreiroMembersList] fallback tier", {
        terreiroId,
        from: effectiveTier,
        to: next,
        error:
          membersQuery.error instanceof Error
            ? membersQuery.error.message
            : String(membersQuery.error),
      });
    }

    setEffectiveTier(next);
    if (isLoggedIn && next === "public") {
      showToast("Mostrando a lista pública de membros.");
    }
  }, [
    effectiveTier,
    isLoggedIn,
    membersQuery.error,
    membersQuery.isError,
    showToast,
    terreiroId,
  ]);

  const items = useMemo<RenderItem[]>(() => {
    const arr = (membersQuery.data?.pages ?? []).flat();

    return arr
      .map((m) => {
        const id =
          typeof (m as any).user_id === "string" ? (m as any).user_id : "";
        if (!id) return null;

        const fullName =
          typeof (m as any).full_name === "string" ? (m as any).full_name : "";
        const title = fullName.trim() || "(Sem nome)";

        const avatarUrl =
          typeof (m as any).avatar_url === "string"
            ? (m as any).avatar_url
            : undefined;

        const role =
          typeof (m as any).role === "string" ? (m as any).role : null;

        return {
          id,
          title,
          initials: getInitials(title),
          avatarUrl,
          role,
          raw: m,
        } as RenderItem;
      })
      .filter((it): it is RenderItem => Boolean(it));
  }, [membersQuery.data]);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: RenderItem }) => {
      const roleText = roleLabel(item.role);

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
            subtitle={null}
            showEditButton={false}
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
    [router, variant]
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

      <View style={[styles.content, { paddingTop: headerTotalHeight }]}>
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
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (
                membersQuery.hasNextPage &&
                !membersQuery.isFetchingNextPage
              ) {
                void membersQuery.fetchNextPage();
              }
            }}
            ListFooterComponent={
              membersQuery.isFetchingNextPage ? (
                <View style={styles.footer}>
                  <ActivityIndicator />
                </View>
              ) : null
            }
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
  footer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
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
