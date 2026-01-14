import { useAuth } from "@/contexts/AuthContext";
import { useGestureBlock } from "@/contexts/GestureBlockContext";
import { useTabController } from "@/contexts/TabControllerContext";
import { supabase } from "@/lib/supabase";
import { AddMediumTagSheet } from "@/src/components/AddMediumTagSheet";
import { RemoveMediumTagSheet } from "@/src/components/RemoveMediumTagSheet";
import { SaravafyStackScene } from "@/src/components/SaravafyStackScene";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { TagChip } from "@/src/components/TagChip";
import { TagPlusChip } from "@/src/components/TagPlusChip";
import {
  useCreateTerreiroMembershipRequest,
  useTerreiroMembershipStatus,
} from "@/src/hooks/terreiroMembership";
import { useTerreiroPontosCustomTagsMap } from "@/src/queries/terreiroPontoCustomTags";
import {
  consumeCollectionPontosDirty,
  putCollectionEditDraft,
} from "@/src/screens/CollectionEdit/draftStore";
import { useCollectionPlayerData } from "@/src/screens/Player/hooks/useCollectionPlayerData";
import { CollectionNameDetailsSheet } from "@/src/screens/Collection/CollectionNameDetailsSheet";
import { colors, spacing } from "@/src/theme";
import { buildShareMessageForColecao } from "@/src/utils/shareContent";
import { queryKeys } from "@/src/queries/queryKeys";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter, useSegments } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";

type CollectionRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  owner_user_id?: string | null;
  owner_terreiro_id?: string | null;
  visibility?: string | null;
  terreiro_title?: string | null;
  terreiro_cover_image_url?: string | null;
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

function isColumnMissingError(error: unknown, columnName: string) {
  const msg =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
      ? ((error as { message: string }).message ?? "")
      : "";

  const m = msg.toLowerCase();
  return (
    m.includes(columnName.toLowerCase()) &&
    (m.includes("does not exist") || m.includes("column"))
  );
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
  const segments = useSegments() as string[];
  const tabController = useTabController();
  const params = useLocalSearchParams();
  const { shouldBlockPress } = useGestureBlock();
  const queryClient = useQueryClient();

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

  const [isNameDetailsOpen, setIsNameDetailsOpen] = useState(false);
  const [isSavingNameDetails, setIsSavingNameDetails] = useState(false);
  const [isDeletingCollection, setIsDeletingCollection] = useState(false);

  const [h1Height, setH1Height] = useState<number | null>(null);
  const headerTitleOpacity = useRef(new Animated.Value(0)).current;
  const headerTitleVisibleRef = useRef(false);

  const isInTabs = segments.includes("(tabs)");
  const goToPontosTab = useCallback(() => {
    if (isInTabs) {
      tabController.goToTab("pontos");
      return;
    }

    router.replace("/(app)/(tabs)/(pontos)" as any);
  }, [isInTabs, router, tabController]);

  const terreiroIdFromParams =
    typeof params.terreiroId === "string" ? params.terreiroId : "";

  const terreiroId =
    typeof collection?.owner_terreiro_id === "string"
      ? collection.owner_terreiro_id
      : terreiroIdFromParams;
  const visibility =
    typeof collection?.visibility === "string" ? collection.visibility : "";
  const isMembersOnly = !!collection && visibility === "members";

  const membership = useTerreiroMembershipStatus(terreiroId);
  const createRequest = useCreateTerreiroMembershipRequest(
    isMembersOnly ? terreiroId : ""
  );

  const myRole = membership.data.role;
  const canEditCustomTags =
    !!terreiroId &&
    membership.data.isActiveMember &&
    (myRole === "admin" || myRole === "editor");

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
      goToPontosTab();
    }

    wasMemberRef.current = isMemberNow;
  }, [
    isLoggedIn,
    isMembersOnly,
    membership.data.isActiveMember,
    membership.isLoading,
    goToPontosTab,
    showToast,
  ]);

  const {
    items: orderedItems,
    isLoading: pontosLoading,
    error: pontosError,
    isEmpty: pontosEmpty,
    reload: reloadPontos,
  } = useCollectionPlayerData(
    { collectionId },
    {
      enabled: shouldLoadPontos,
      // Mostra cache (se existir) enquanto esperamos metadata/gate da collection.
      // Se a collection for members-only e o usuário não for membro, isso será
      // desativado assim que a metadata carregar.
      allowCachedWhileDisabled: !collection || !isMembersOnly || isMember,
    }
  );

  const pontoIds = useMemo(() => {
    return orderedItems
      .map((it) => String(it?.ponto?.id ?? ""))
      .filter(Boolean);
  }, [orderedItems]);

  // Leituras são públicas em contexto de terreiro (sem gate de role/membership).
  const canSeeMediumTags = !!terreiroId;
  const customTagsMapQuery = useTerreiroPontosCustomTagsMap(
    { terreiroId, pontoIds },
    { enabled: canSeeMediumTags && pontoIds.length > 0 }
  );
  const customTagsMap = customTagsMapQuery.data ?? {};

  const [mediumTargetPontoId, setMediumTargetPontoId] = useState<string | null>(
    null
  );

  const [deleteTarget, setDeleteTarget] = useState<null | {
    pontoId: string;
    tagId: string;
    tagLabel: string;
  }>(null);
  const loadCollection = useCallback(async () => {
    if (!collectionId) {
      setCollection(null);
      setCollectionError("Collection inválida.");
      return;
    }

    setCollectionLoading(true);
    setCollectionError(null);

    try {
      const baseSelect =
        "id, title, description, owner_terreiro_id, owner_user_id, visibility, terreiros:owner_terreiro_id (title, cover_image_url)";

      const res: any = await supabase
        .from("collections")
        .select(baseSelect)
        .eq("id", collectionId)
        .single();

      const finalRes: any =
        res.error && isColumnMissingError(res.error, "description")
          ? await supabase
              .from("collections")
              .select(
                "id, title, owner_terreiro_id, owner_user_id, visibility, terreiros:owner_terreiro_id (title, cover_image_url)"
              )
              .eq("id", collectionId)
              .single()
          : res;

      if (finalRes.error) {
        const anyErr = finalRes.error as any;
        const message =
          typeof anyErr?.message === "string" && anyErr.message.trim()
            ? anyErr.message
            : "Erro ao carregar a collection.";
        const extra = [anyErr?.code, anyErr?.details, anyErr?.hint]
          .filter((v) => typeof v === "string" && v.trim().length > 0)
          .join(" | ");
        throw new Error(extra ? `${message} (${extra})` : message);
      }

      const row = (finalRes.data ?? null) as any;
      const terreiroTitle =
        typeof row?.terreiros?.title === "string" ? row.terreiros.title : null;
      const terreiroCover =
        typeof row?.terreiros?.cover_image_url === "string"
          ? row.terreiros.cover_image_url
          : null;

      setCollection({
        id: String(row?.id ?? ""),
        title: typeof row?.title === "string" ? row.title : null,
        description:
          typeof row?.description === "string" ? row.description : null,
        owner_terreiro_id:
          typeof row?.owner_terreiro_id === "string" ? row.owner_terreiro_id : null,
        owner_user_id:
          typeof row?.owner_user_id === "string" ? row.owner_user_id : null,
        visibility: typeof row?.visibility === "string" ? row.visibility : null,
        terreiro_title: terreiroTitle,
        terreiro_cover_image_url: terreiroCover,
      });
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

  useFocusEffect(
    useCallback(() => {
      if (!collectionId) return;
      if (!consumeCollectionPontosDirty(collectionId)) return;

      reloadPontos();
      loadCollection();
    }, [collectionId, loadCollection, reloadPontos])
  );

  const title =
    (typeof collection?.title === "string" && collection.title.trim()) ||
    titleFallback;

  const terreiroTitle =
    (typeof collection?.terreiro_title === "string" &&
      collection.terreiro_title.trim()) ||
    (terreiroId ? "Terreiro" : "Coleção pessoal");
  const terreiroCoverImageUrl =
    typeof collection?.terreiro_cover_image_url === "string" &&
    collection.terreiro_cover_image_url.trim()
      ? collection.terreiro_cover_image_url.trim()
      : null;

  const canEditCollection =
    (!!user?.id &&
      typeof collection?.owner_user_id === "string" &&
      collection.owner_user_id === user.id) ||
    (!!terreiroId &&
      membership.data.isActiveMember &&
      (myRole === "admin" || myRole === "editor"));

  const openEdit = useCallback(() => {
    if (!collectionId) return;
    if (!canEditCollection) {
      showToast("Você não tem permissão para editar esta coleção.");
      return;
    }

    const draftKey = `collection-edit:${collectionId}:${Date.now().toString(
      36
    )}:${Math.random().toString(36).slice(2)}`;
    putCollectionEditDraft({
      draftKey,
      snapshot: {
        collectionId,
        collectionTitle: title,
        orderedItems,
        createdAt: Date.now(),
      },
    });

    router.push({
      pathname: "/collection/[id]/edit" as any,
      params: { id: collectionId, draftKey },
    });
  }, [canEditCollection, collectionId, orderedItems, router, showToast, title]);

  const isPendingView = isMembersOnly && isLoggedIn && hasPendingRequest;

  const handleShare = useCallback(async () => {
    let message = "";

    try {
      message = await buildShareMessageForColecao({
        collectionId,
        collectionTitle: title,
      });
    } catch (e) {
      if (__DEV__) {
        console.info("[Collection] erro ao gerar mensagem de share", {
          error: getErrorMessage(e),
        });
      }

      message = `Olha essa coleção “${title}” no Saravafy.`;
    }

    try {
      await Share.share({ message });
    } catch (e) {
      if (__DEV__) {
        console.info("[Collection] erro ao abrir share sheet", {
          error: getErrorMessage(e),
        });
      }
    }
  }, [collectionId, title]);

  const hasCachedPontos = orderedItems.length > 0;

  // Não bloquear UI com loading se já temos cache de pontos.
  const isLoading = (collectionLoading || pontosLoading) && !hasCachedPontos;
  const error = collectionError || pontosError;

  const pontosCountText = `${orderedItems.length} ponto(s)`;

  const setHeaderTitleVisible = useCallback(
    (visible: boolean) => {
      if (headerTitleVisibleRef.current === visible) return;
      headerTitleVisibleRef.current = visible;

      Animated.timing(headerTitleOpacity, {
        toValue: visible ? 1 : 0,
        duration: 160,
        useNativeDriver: true,
      }).start();
    },
    [headerTitleOpacity]
  );

  const onScroll = useCallback(
    (y: number) => {
      // Mostra o título pequeno no header apenas depois que o H1
      // já "passou" visualmente do topo (tipo Spotify).
      const base = typeof h1Height === "number" && h1Height > 0 ? h1Height : 44;
      const threshold = Math.max(0, base - 8);
      setHeaderTitleVisible(y >= threshold);
    },
    [h1Height, setHeaderTitleVisible]
  );

  const openNameDetails = useCallback(() => {
    setIsNameDetailsOpen(true);
  }, []);

  const saveNameDetails = useCallback(
    async (next: { title: string; description: string }) => {
      if (!collectionId) return;
      if (shouldBlockPress()) return;

      if (!canEditCollection) {
        showToast("Você não tem permissão para editar esta coleção.");
        return;
      }

      const nextTitle = String(next.title ?? "").trim();
      if (nextTitle.length < 2) {
        showToast("Nome muito curto.");
        return;
      }

      setIsSavingNameDetails(true);

      try {
        const updatePayload: any = {
          title: nextTitle,
          description: String(next.description ?? ""),
        };

        let req: any = supabase.from("collections").update(updatePayload).eq("id", collectionId);

        // Guard extra para evitar deletar/alterar fora do escopo permitido.
        if (user?.id && collection?.owner_user_id === user.id) {
          req = req.eq("owner_user_id", user.id);
        } else if (terreiroId) {
          req = req.eq("owner_terreiro_id", terreiroId);
        }

        const res: any = await req.select("id, title, description").single();

        // Compat: se coluna description não existe, re-tenta só com title.
        if (res.error && isColumnMissingError(res.error, "description")) {
          const res2: any = await supabase
            .from("collections")
            .update({ title: nextTitle })
            .eq("id", collectionId)
            .select("id, title")
            .single();

          if (res2.error) {
            throw new Error(
              typeof res2.error.message === "string" && res2.error.message.trim()
                ? res2.error.message
                : "Não foi possível salvar."
            );
          }

          setCollection((prev) =>
            prev
              ? {
                  ...prev,
                  title: typeof res2.data?.title === "string" ? res2.data.title : nextTitle,
                }
              : prev
          );
          showToast("Nome atualizado.");
          setIsNameDetailsOpen(false);
        } else {
          if (res.error) {
            throw new Error(
              typeof res.error.message === "string" && res.error.message.trim()
                ? res.error.message
                : "Não foi possível salvar."
            );
          }

          setCollection((prev) =>
            prev
              ? {
                  ...prev,
                  title:
                    typeof res.data?.title === "string" ? res.data.title : nextTitle,
                  description:
                    typeof res.data?.description === "string"
                      ? res.data.description
                      : String(next.description ?? ""),
                }
              : prev
          );

          showToast("Coleção atualizada.");
          setIsNameDetailsOpen(false);
        }

        if (user?.id) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.collections.accountable(user.id),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.collections.editableByUserPrefix(user.id),
          });
        }
        if (terreiroId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId),
          });
        }
      } catch (e) {
        showToast(getErrorMessage(e));
      } finally {
        setIsSavingNameDetails(false);
      }
    },
    [
      canEditCollection,
      collection?.owner_user_id,
      collectionId,
      queryClient,
      shouldBlockPress,
      showToast,
      terreiroId,
      user?.id,
    ]
  );

  const deleteCollection = useCallback(async () => {
    if (!collectionId) return;
    if (shouldBlockPress()) return;

    if (!canEditCollection) {
      showToast("Você não tem permissão para apagar esta coleção.");
      return;
    }

    setIsDeletingCollection(true);
    try {
      let req: any = supabase.from("collections").delete().eq("id", collectionId);

      if (user?.id && collection?.owner_user_id === user.id) {
        req = req.eq("owner_user_id", user.id);
      } else if (terreiroId) {
        req = req.eq("owner_terreiro_id", terreiroId);
      }

      const res: any = await req;
      if (res.error) {
        throw new Error(
          typeof res.error.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Não foi possível excluir a coleção."
        );
      }

      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.collections.accountable(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.collections.editableByUserPrefix(user.id),
        });
      }
      if (terreiroId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId),
        });
      }
      queryClient.removeQueries({ queryKey: queryKeys.collections.byId(collectionId) });
      queryClient.removeQueries({ queryKey: queryKeys.collections.pontos(collectionId) });

      setIsNameDetailsOpen(false);
      showToast("Coleção apagada.");
      router.back();
    } catch (e) {
      showToast(getErrorMessage(e));
    } finally {
      setIsDeletingCollection(false);
    }
  }, [
    canEditCollection,
    collection?.owner_user_id,
    collectionId,
    queryClient,
    router,
    shouldBlockPress,
    showToast,
    terreiroId,
    user?.id,
  ]);

  return (
    <SaravafyStackScene theme={variant} variant="stack" style={styles.screen}>
      <View style={styles.fixedHeader}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.headerIconBtn}
        >
          <Ionicons name="chevron-back" size={22} color={textPrimary} />
        </Pressable>

        <Animated.View
          style={[styles.headerInlineTitleWrap, { opacity: headerTitleOpacity }]}
          pointerEvents="none"
        >
          <Text
            style={[styles.headerInlineTitle, { color: textPrimary }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </Animated.View>

        <View style={styles.headerRightSpacer} />
      </View>

      <CollectionNameDetailsSheet
        visible={isNameDetailsOpen}
        variant={variant}
        initialTitle={title}
        initialDescription={collection?.description ?? ""}
        canEdit={canEditCollection}
        isSaving={isSavingNameDetails}
        isDeleting={isDeletingCollection}
        onClose={() => setIsNameDetailsOpen(false)}
        onSave={(next) => {
          void saveNameDetails(next);
        }}
        onDelete={() => {
          void deleteCollection();
        }}
      />

      <AddMediumTagSheet
        visible={!!mediumTargetPontoId}
        variant={variant}
        terreiroId={terreiroId}
        pontoId={mediumTargetPontoId ?? ""}
        canShowRemoveHint={canEditCustomTags}
        onClose={() => setMediumTargetPontoId(null)}
      />

      <RemoveMediumTagSheet
        visible={!!deleteTarget}
        variant={variant}
        terreiroId={terreiroId}
        pontoId={deleteTarget?.pontoId ?? ""}
        tagId={deleteTarget?.tagId ?? ""}
        tagLabel={deleteTarget?.tagLabel ?? ""}
        onClose={() => setDeleteTarget(null)}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        onScroll={(e) => {
          onScroll(e.nativeEvent.contentOffset.y);
        }}
      >
        <View style={styles.titleBlock}>
          <Text
            style={[styles.h1, { color: textPrimary }]}
            onLayout={(e) => {
              setH1Height(e.nativeEvent.layout.height);
            }}
          >
            {title}
          </Text>

          <View style={styles.terreiroRow}>
            <View
              style={[
                styles.terreiroAvatar,
                {
                  backgroundColor:
                    variant === "light" ? colors.surfaceCardBgLight : colors.surfaceCardBg,
                  borderColor:
                    variant === "light" ? colors.surfaceCardBorderLight : colors.surfaceCardBorder,
                },
              ]}
            >
              {terreiroCoverImageUrl ? (
                <Image
                  source={{ uri: terreiroCoverImageUrl }}
                  style={styles.terreiroAvatarImg}
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <Ionicons
                  name={terreiroId ? "home-outline" : "person-outline"}
                  size={16}
                  color={textMuted}
                />
              )}
            </View>

            <Text style={[styles.terreiroName, { color: textSecondary }]} numberOfLines={1}>
              {terreiroTitle}
            </Text>
          </View>

          <Text style={[styles.countText, { color: textMuted }]}>{pontosCountText}</Text>

          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Adicionar"
              onPress={() => {
                goToPontosTab();
              }}
              style={({ pressed }) => [
                styles.primaryActionBtn,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.primaryActionText}>Adicionar</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Editar"
              onPress={openEdit}
              style={({ pressed }) => [
                styles.secondaryActionBtn,
                {
                  borderColor:
                    variant === "light" ? colors.inputBorderLight : colors.inputBorderDark,
                  backgroundColor:
                    variant === "light" ? colors.inputBgLight : colors.inputBgDark,
                },
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={[styles.secondaryActionText, { color: textPrimary }]}>Editar</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Compartilhar"
              onPress={() => {
                void handleShare();
              }}
              hitSlop={10}
              style={({ pressed }) => [
                styles.iconActionBtn,
                pressed ? styles.pressed : null,
              ]}
            >
              <Ionicons name="share-outline" size={18} color={textPrimary} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nome e detalhes"
              onPress={openNameDetails}
              style={({ pressed }) => [
                styles.tertiaryActionBtn,
                {
                  borderColor:
                    variant === "light" ? colors.inputBorderLight : colors.inputBorderDark,
                  backgroundColor:
                    variant === "light" ? colors.inputBgLight : colors.inputBgDark,
                },
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={[styles.tertiaryActionText, { color: textPrimary }]}>Nome e detalhes</Text>
            </Pressable>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.centerInScroll}>
            <ActivityIndicator />
            <Text style={[styles.bodyText, { color: textSecondary }]}>Carregando…</Text>
          </View>
        ) : error ? (
          <View style={styles.centerInScroll}>
            <Text style={[styles.bodyText, { color: textSecondary }]}>{error}</Text>
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
              <Text style={[styles.retryText, { color: textPrimary }]}>Tentar novamente</Text>
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
                  goToPontosTab();
                }}
                style={({ pressed }) => [
                  styles.ctaButton,
                  pressed && styles.retryBtnPressed,
                  variant === "light" ? styles.ctaButtonLight : styles.ctaButtonDark,
                ]}
              >
                <Ionicons
                  name="search"
                  size={18}
                  color={variant === "light" ? colors.brass500 : colors.brass600}
                  style={{ marginRight: 8 }}
                />
                <Text style={variant === "light" ? styles.ctaTextLight : styles.ctaTextDark}>
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
                  onPress={() => router.replace("/login")}
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
                      router.replace("/login");
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
            scrollEnabled={false}
            keyExtractor={(it) => `${it.position}-${it.ponto.id}`}
            contentContainerStyle={[styles.listContent, { paddingBottom: spacing.xl }]}
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
                      <Text style={[styles.itemTitle, { color: textPrimary }]} numberOfLines={2}>
                        {item.ponto.title}
                      </Text>

                      {(() => {
                        const mediumTags = canSeeMediumTags
                          ? customTagsMap[item.ponto.id] ?? []
                          : [];
                        const pointTags = Array.isArray(item.ponto.tags)
                          ? item.ponto.tags
                          : [];

                        const hasAnyTags = mediumTags.length > 0 || pointTags.length > 0;
                        if (!hasAnyTags) return null;

                        return (
                          <View style={styles.tagsWrap}>
                            {canEditCustomTags && !!terreiroId ? (
                              <TagPlusChip
                                variant={variant}
                                accessibilityLabel="Adicionar médium"
                                onPress={() => setMediumTargetPontoId(item.ponto.id)}
                              />
                            ) : null}
                            {mediumTags.map((t) => (
                              <Pressable
                                key={`medium-${item.ponto.id}-${t.id}`}
                                accessibilityRole={canEditCustomTags ? "button" : undefined}
                                accessibilityLabel={
                                  canEditCustomTags ? `Remover médium ${t.tagText}` : undefined
                                }
                                onLongPress={
                                  canEditCustomTags
                                    ? () =>
                                        setDeleteTarget({
                                          pontoId: item.ponto.id,
                                          tagId: t.id,
                                          tagLabel: t.tagText,
                                        })
                                    : undefined
                                }
                                delayLongPress={350}
                                disabled={!canEditCustomTags}
                                style={({ pressed }) => [
                                  pressed && canEditCustomTags ? { opacity: 0.75 } : null,
                                ]}
                              >
                                <TagChip
                                  label={t.tagText}
                                  variant={variant}
                                  kind="custom"
                                  tone="medium"
                                />
                              </Pressable>
                            ))}
                            {pointTags.map((t) => (
                              <TagChip
                                key={`ponto-${item.ponto.id}-${t}`}
                                label={t}
                                variant={variant}
                              />
                            ))}
                          </View>
                        );
                      })()}

                      <Text style={[styles.preview, { color: textSecondary }]} numberOfLines={6}>
                        {preview}
                      </Text>
                    </SurfaceCard>
                  </Pressable>
                </View>
              );
            }}
          />
        )}
      </ScrollView>
    </SaravafyStackScene>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  fixedHeader: {
    height: 52,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInlineTitleWrap: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  headerInlineTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  headerRightSpacer: {
    width: 36,
    height: 36,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  titleBlock: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  h1: {
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
  },
  terreiroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  terreiroAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  terreiroAvatarImg: {
    width: 24,
    height: 24,
  },
  terreiroName: {
    fontSize: 13,
    fontWeight: "800",
    flex: 1,
  },
  countText: {
    fontSize: 12,
    fontWeight: "800",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
    marginTop: spacing.xs,
  },
  primaryActionBtn: {
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.brass600,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionText: {
    color: colors.paper50,
    fontSize: 13,
    fontWeight: "900",
  },
  secondaryActionBtn: {
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: "900",
  },
  iconActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceCardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  tertiaryActionBtn: {
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tertiaryActionText: {
    fontSize: 13,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.85,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  centerInScroll: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
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
    paddingTop: spacing.sm,
    paddingBottom: 0,
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
  addTagBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  addTagBtnPressed: {
    opacity: 0.85,
  },
  preview: {
    paddingTop: spacing.sm,
    fontSize: 13,
    lineHeight: 18,
  },
});
