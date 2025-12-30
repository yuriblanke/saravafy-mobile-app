import { useAuth } from "@/contexts/AuthContext";
import { useGestureBlock } from "@/contexts/GestureBlockContext";
import { supabase } from "@/lib/supabase";
import { ShareBottomSheet } from "@/src/components/ShareBottomSheet";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { TagChip } from "@/src/components/TagChip";
import {
  useCreateTerreiroMembershipRequest,
  useTerreiroMembershipStatus,
} from "@/src/hooks/terreiroMembership";
import { useTerreiroPontosCustomTagsMap } from "@/src/queries/terreiroPontoCustomTags";
import { useCollectionPlayerData } from "@/src/screens/Player/hooks/useCollectionPlayerData";
import { colors, spacing } from "@/src/theme";
import { isMediumTag, mergeCustomAndPointTags } from "@/src/utils/mergeTags";
import { buildShareMessageForColecao } from "@/src/utils/shareContent";
import { Ionicons } from "@expo/vector-icons";
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

import { useRootPager } from "@/contexts/RootPagerContext";

type CollectionRow = {
  id: string;
  title?: string | null;
  owner_terreiro_id?: string | null;
  visibility?: string | null;
};

function getErrorMessage(e: unknown): string {
  if (e instanceof Error && typeof e.message === "string" && e.message.trim()) {
    return e.message;
  }

  if (e && typeof e === "object") {
    const anyErr = e as any;
    if (typeof anyErr.message === "string" && anyErr.message.trim()) {
      return anyErr.message;
    }
  }

  return String(e);
}

function getLyricsPreview(lyrics: string, maxLines = 4) {
  const lines = String(lyrics ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const previewLines = lines.slice(0, maxLines);
  const preview = previewLines.join("\n");
  if (lines.length > maxLines) return `${preview}\n…`;
  return preview;
}

export default function Collection() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rootPager = useRootPager();
  const { shouldBlockPress } = useGestureBlock();

  const { user } = useAuth();

  const { showToast } = require("@/contexts/ToastContext").useToast();

  const { effectiveTheme } =
    require("@/contexts/PreferencesContext").usePreferences();
  const variant: "light" | "dark" = effectiveTheme;

  const collectionId = String(params.id ?? params.collectionId ?? "");
  const titleFallback =
    (typeof params.collectionTitle === "string" &&
      params.collectionTitle.trim()) ||
    (typeof params.name === "string" && params.name.trim()) ||
    "Coleção";

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;
  const textMuted =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;

  const [collection, setCollection] = useState<CollectionRow | null>(null);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  const terreiroId =
    typeof collection?.owner_terreiro_id === "string"
      ? collection.owner_terreiro_id
      : "";
  const visibility =
    typeof collection?.visibility === "string" ? collection.visibility : "";
  const isMembersOnly = !!collection && visibility === "members";

  const membership = useTerreiroMembershipStatus(terreiroId);
  const createRequest = useCreateTerreiroMembershipRequest(
    isMembersOnly ? terreiroId : ""
  );

  const isLoggedIn = !!user?.id;
  const isMember = membership.data.isActiveMember;
  const hasPendingRequest = membership.data.hasPendingRequest;
  const shouldLoadPontos = !!collection && (!isMembersOnly || isMember);

  const wasMemberRef = useRef(false);
  useEffect(() => {
    if (!isMembersOnly) {
      wasMemberRef.current = false;
      return;
    }
    if (!isLoggedIn) return;
    if (membership.isLoading) return;

    const wasMember = wasMemberRef.current;
    const isMemberNow = membership.data.isActiveMember;

    if (wasMember && !isMemberNow) {
      showToast("Seu acesso a este terreiro foi removido.");
      rootPager?.setActiveKey("pontos");
      router.replace("/(app)");
    }

    wasMemberRef.current = isMemberNow;
  }, [
    isLoggedIn,
    isMembersOnly,
    membership.data.isActiveMember,
    membership.isLoading,
    rootPager,
    router,
    showToast,
  ]);

  const {
    items: orderedItems,
    isLoading: pontosLoading,
    error: pontosError,
    isEmpty: pontosEmpty,
    reload: reloadPontos,
  } = useCollectionPlayerData({ collectionId }, { enabled: shouldLoadPontos });

  const pontoIds = useMemo(() => {
    return orderedItems
      .map((it) => String(it?.ponto?.id ?? ""))
      .filter(Boolean);
  }, [orderedItems]);

  const canSeeCustomTags = !!terreiroId && membership.data.isActiveMember;
  const customTagsMapQuery = useTerreiroPontosCustomTagsMap(
    { terreiroId, pontoIds },
    { enabled: canSeeCustomTags && pontoIds.length > 0 }
  );
  const customTagsMap = customTagsMapQuery.data ?? {};

  const loadCollection = useCallback(async () => {
    if (!collectionId) {
      setCollection(null);
      setCollectionError("Collection inválida.");
      return;
    }

    setCollectionLoading(true);
    setCollectionError(null);

    try {
      const res = await supabase
        .from("collections")
        .select("id, title, owner_terreiro_id, visibility")
        .eq("id", collectionId)
        .single();

      if (res.error) {
        const anyErr = res.error as any;
        const message =
          typeof anyErr?.message === "string" && anyErr.message.trim()
            ? anyErr.message
            : "Erro ao carregar a collection.";
        const extra = [anyErr?.code, anyErr?.details, anyErr?.hint]
          .filter((v) => typeof v === "string" && v.trim().length > 0)
          .join(" | ");
        throw new Error(extra ? `${message} (${extra})` : message);
      }

      setCollection(res.data as any);
    } catch (e) {
      if (__DEV__) {
        console.info("[Collection] erro ao carregar collection", {
          collectionId,
          error: getErrorMessage(e),
          raw: e,
        });
      }
      setCollection(null);
      setCollectionError(getErrorMessage(e));
    } finally {
      setCollectionLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

  const title =
    (typeof collection?.title === "string" && collection.title.trim()) ||
    titleFallback;

  const isPendingView = isMembersOnly && isLoggedIn && hasPendingRequest;

  const openShare = useCallback(async () => {
    try {
      const message = await buildShareMessageForColecao(title);
      setShareMessage(message);
    } catch (e) {
      if (__DEV__) {
        console.info("[Collection] erro ao gerar mensagem de share", {
          error: getErrorMessage(e),
        });
      }

      setShareMessage(`Olha essa coleção “${title}” no Saravafy.`);
    }

    setIsShareOpen(true);
  }, [title]);

  const isLoading = collectionLoading || pontosLoading;
  const error = collectionError || pontosError;

  return (
    <View style={styles.screen}>
      <View style={styles.collectionHeader}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.headerIconBtn}
        >
          <Ionicons name="chevron-back" size={22} color={textPrimary} />
        </Pressable>

        <Text
          style={[styles.headerTitle, { color: textPrimary }]}
          numberOfLines={1}
        >
          {title}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Compartilhar"
          onPress={openShare}
          hitSlop={10}
          style={styles.headerIconBtn}
        >
          <Ionicons name="share-outline" size={18} color={textPrimary} />
        </Pressable>
      </View>

      <ShareBottomSheet
        visible={isShareOpen}
        variant={variant}
        message={shareMessage}
        onClose={() => setIsShareOpen(false)}
        showToast={showToast}
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={[styles.bodyText, { color: textSecondary }]}>
            Carregando…
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.bodyText, { color: textSecondary }]}>
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              loadCollection();
              reloadPontos();
              membership.reload();
            }}
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && styles.retryBtnPressed,
              variant === "light" ? styles.retryBtnLight : styles.retryBtnDark,
            ]}
          >
            <Text style={[styles.retryText, { color: textPrimary }]}>
              Tentar novamente
            </Text>
          </Pressable>
        </View>
      ) : pontosEmpty ? (
        <SurfaceCard variant={variant} style={styles.emptyCard}>
          <View style={styles.emptyContent}>
            <Ionicons
              name="albums-outline"
              size={48}
              color={variant === "light" ? colors.forest500 : colors.forest400}
              style={{ marginBottom: spacing.lg }}
            />
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>
              Esta coleção ainda não tem pontos
            </Text>
            <Text style={[styles.bodyText, { color: textSecondary }]}>
              Para montar esta coleção, procure pontos e adicione os que fazem
              sentido aqui.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                rootPager?.setActiveKey("pontos");
                router.replace("/(app)");
              }}
              style={({ pressed }) => [
                styles.ctaButton,
                pressed && styles.retryBtnPressed,
                variant === "light"
                  ? styles.ctaButtonLight
                  : styles.ctaButtonDark,
              ]}
            >
              <Ionicons
                name="search"
                size={18}
                color={variant === "light" ? colors.brass500 : colors.brass600}
                style={{ marginRight: 8 }}
              />
              <Text
                style={
                  variant === "light" ? styles.ctaTextLight : styles.ctaTextDark
                }
              >
                Buscar pontos
              </Text>
            </Pressable>
            <Text style={[styles.emptyHint, { color: textMuted }]}>
              Ao abrir um ponto, toque em “Adicionar à coleção” e selecione esta
              coleção.
            </Text>
          </View>
        </SurfaceCard>
      ) : isMembersOnly && !isMember ? (
        <View style={styles.gateWrap}>
          <SurfaceCard variant={variant} style={styles.gateCard}>
            <Text style={[styles.gateTitle, { color: textPrimary }]}>
              Coleção exclusiva para membros
            </Text>

            {!isLoggedIn ? (
              <Text style={[styles.gateBody, { color: textSecondary }]}>
                Entre para ver esta coleção.
              </Text>
            ) : isPendingView ? (
              <Text style={[styles.gateBody, { color: textSecondary }]}>
                Pedido enviado (pendente). Assim que for aprovado, você terá
                acesso.
              </Text>
            ) : (
              <Text style={[styles.gateBody, { color: textSecondary }]}>
                Para acessar, peça para se tornar membro do terreiro.
              </Text>
            )}

            <View style={styles.gateActions}>
              {!isLoggedIn ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/login")}
                  style={({ pressed }) => [
                    styles.gatePrimaryBtn,
                    pressed ? styles.gateBtnPressed : null,
                    variant === "light"
                      ? styles.gatePrimaryBtnLight
                      : styles.gatePrimaryBtnDark,
                  ]}
                >
                  <Text
                    style={
                      variant === "light"
                        ? styles.gatePrimaryTextLight
                        : styles.gatePrimaryTextDark
                    }
                  >
                    Entrar para ver esta coleção
                  </Text>
                </Pressable>
              ) : isPendingView ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    showToast("Cancelamento de pedido: TODO (backend).")
                  }
                  style={({ pressed }) => [
                    styles.gateSecondaryBtn,
                    pressed ? styles.gateBtnPressed : null,
                    {
                      borderColor:
                        variant === "light"
                          ? colors.surfaceCardBorderLight
                          : colors.surfaceCardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[styles.gateSecondaryText, { color: textPrimary }]}
                  >
                    Cancelar pedido
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={
                    createRequest.isCreating ||
                    membership.isLoading ||
                    !terreiroId
                  }
                  onPress={async () => {
                    if (!user?.id) {
                      router.push("/login");
                      return;
                    }

                    if (!terreiroId) {
                      showToast("Não foi possível identificar o terreiro.");
                      return;
                    }

                    if (membership.data.isActiveMember) {
                      showToast("Você já é membro deste terreiro.");
                      return;
                    }

                    const result = await createRequest.create();
                    if (result.ok) {
                      showToast(
                        result.alreadyExisted
                          ? "Pedido já enviado (pendente)."
                          : "Pedido enviado (pendente)."
                      );
                      await membership.reload();
                      return;
                    }

                    showToast(
                      "Não foi possível enviar o pedido agora. Tente novamente."
                    );
                  }}
                  style={({ pressed }) => [
                    styles.gatePrimaryBtn,
                    pressed ? styles.gateBtnPressed : null,
                    createRequest.isCreating ? styles.gateBtnPressed : null,
                    variant === "light"
                      ? styles.gatePrimaryBtnLight
                      : styles.gatePrimaryBtnDark,
                  ]}
                >
                  <Text
                    style={
                      variant === "light"
                        ? styles.gatePrimaryTextLight
                        : styles.gatePrimaryTextDark
                    }
                  >
                    Se tornar membro
                  </Text>
                </Pressable>
              )}
            </View>
          </SurfaceCard>

          <SurfaceCard variant={variant} style={styles.lockedCard}>
            <View style={styles.lockedRow}>
              <Ionicons
                name="lock-closed"
                size={18}
                color={textMuted}
                style={{ marginRight: 10 }}
              />
              <Text style={[styles.lockedText, { color: textSecondary }]}>
                Conteúdo disponível apenas para membros.
              </Text>
            </View>
          </SurfaceCard>
        </View>
      ) : (
        <FlatList
          data={orderedItems}
          keyExtractor={(it) => `${it.position}-${it.ponto.id}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const preview = getLyricsPreview(item.ponto.lyrics);
            return (
              <View style={styles.cardGap}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    const now = Date.now();
                    if (shouldBlockPress()) {
                      if (__DEV__) {
                        console.log("[PressGuard] blocked", {
                          screen: "Collection",
                          now,
                        });
                      }
                      return;
                    }

                    if (__DEV__) {
                      console.log("[PressGuard] allowed", {
                        screen: "Collection",
                        now,
                      });
                    }

                    if (__DEV__) {
                      console.log("[Navigation] click -> /player", {
                        screen: "Collection",
                        now,
                        collectionId,
                        initialPontoId: item.ponto.id,
                      });
                    }

                    router.push({
                      pathname: "/player",
                      params: {
                        collectionId,
                        initialPontoId: item.ponto.id,
                        terreiroId: terreiroId || undefined,
                      },
                    });
                  }}
                >
                  <SurfaceCard variant={variant}>
                    <Text
                      style={[styles.itemTitle, { color: textPrimary }]}
                      numberOfLines={2}
                    >
                      {item.ponto.title}
                    </Text>

                    {(() => {
                      const custom = canSeeCustomTags
                        ? customTagsMap[item.ponto.id] ?? []
                        : [];
                      const merged = mergeCustomAndPointTags(
                        custom,
                        item.ponto.tags
                      );

                      const hasAnyTags =
                        merged.custom.length > 0 || merged.point.length > 0;
                      if (!hasAnyTags) return null;

                      return (
                        <View style={styles.tagsWrap}>
                          {merged.custom.map((t) => (
                            <TagChip
                              key={`custom-${item.ponto.id}-${t}`}
                              label={t}
                              variant={variant}
                              kind="custom"
                              tone={isMediumTag(t) ? "medium" : "default"}
                            />
                          ))}
                          {merged.point.map((t) => (
                            <TagChip
                              key={`ponto-${item.ponto.id}-${t}`}
                              label={t}
                              variant={variant}
                            />
                          ))}
                        </View>
                      );
                    })()}

                    <Text
                      style={[styles.preview, { color: textSecondary }]}
                      numberOfLines={6}
                    >
                      {preview}
                    </Text>
                  </SurfaceCard>
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  collectionHeader: {
    height: 52,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
    paddingHorizontal: spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  retryBtn: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  retryBtnPressed: {
    opacity: 0.85,
  },
  retryBtnDark: {
    borderColor: colors.surfaceCardBorder,
    backgroundColor: "transparent",
  },
  retryBtnLight: {
    borderColor: colors.surfaceCardBorderLight,
    backgroundColor: "transparent",
  },
  retryText: {
    fontSize: 13,
    fontWeight: "800",
  },
  emptyCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  emptyContent: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: spacing.lg,
  },
  ctaButtonDark: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.brass600,
  },
  ctaButtonLight: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.brass500,
  },
  ctaTextDark: {
    color: colors.brass600,
    fontWeight: "900",
    fontSize: 14,
  },
  ctaTextLight: {
    color: colors.brass500,
    fontWeight: "900",
    fontSize: 14,
  },
  emptyHint: {
    fontSize: 12,
    marginTop: spacing.md,
    textAlign: "center",
  },
  gateWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  gateCard: {
    paddingVertical: spacing.md,
  },
  gateTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  gateBody: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    opacity: 0.92,
  },
  gateActions: {
    marginTop: spacing.md,
  },
  gatePrimaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  gatePrimaryBtnDark: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.brass600,
  },
  gatePrimaryBtnLight: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.brass500,
  },
  gatePrimaryTextDark: {
    color: colors.brass600,
    fontWeight: "900",
    fontSize: 14,
    textAlign: "center",
  },
  gatePrimaryTextLight: {
    color: colors.brass500,
    fontWeight: "900",
    fontSize: 14,
    textAlign: "center",
  },
  gateSecondaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "transparent",
  },
  gateSecondaryText: {
    fontWeight: "900",
    fontSize: 14,
    textAlign: "center",
  },
  gateBtnPressed: {
    opacity: 0.85,
  },
  lockedCard: {
    paddingVertical: spacing.md,
  },
  lockedRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  lockedText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  cardGap: {
    marginBottom: spacing.md,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  preview: {
    paddingTop: spacing.sm,
    fontSize: 13,
    lineHeight: 18,
  },
});
