import { useRootPagerOptional } from "@/contexts/RootPagerContext";
import { useToast } from "@/contexts/ToastContext";
import { EntidadePlaceholderSheet } from "@/src/components/collections/EntidadePlaceholderSheet";
import { SelectModal, type SelectItem } from "@/src/components/SelectModal";
import {
    applyEntidadePlaceholder,
    lyricsHasEntidadePlaceholder,
} from "@/src/domain/entidadePlaceholder";
import {
    useEditableCollections,
    type EditableCollection,
} from "@/src/queries/collections";
import {
    incrementCollectionPontosCountInTerreiroLists,
    removePontoFromCollectionPontosList,
    upsertPontoInCollectionPontosList,
} from "@/src/queries/collectionsCache";
import { useEntidadesCatalogQuery } from "@/src/queries/entidadesCatalog";
import { useMyEditableTerreirosQuery } from "@/src/queries/me";
import {
    cancelQueries,
    patchById,
    patchQueriesByPrefix,
    rollbackQueries,
    setQueriesDataSafe,
    snapshotQueries,
} from "@/src/queries/mutationUtils";
import type { PontoVersaoPlayerRow } from "@/src/queries/pontoVersoes";
import { queryKeys } from "@/src/queries/queryKeys";
import {
    getErrorMessage,
    resolveDefaultPontoVersaoId,
    toPlayerPonto,
    type ListPonto,
} from "@/src/screens/CollectionAddToCollection/addToCollectionModel";
import {
    addPontoToCollection,
    type CollectionPontoEntidadeInput,
} from "@/src/screens/Home/data/collections_pontos";
import type { Ponto } from "@/src/screens/Home/data/ponto";
import type { PlayerPonto } from "@/src/screens/Player/hooks/useCollectionPlayerData";
import { colors, getSaravafyBaseColor, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type CollectionsOwnerFilter = "all" | "user" | `terreiro:${string}`;

function playerPontoToListPonto(p: PlayerPonto): ListPonto {
  return {
    id: p.id,
    title: p.title,
    tags: Array.isArray(p.tags) ? p.tags : [],
    lyrics: p.lyrics,
    lyrics_preview_6: p.lyrics_preview_6 ?? null,
    entidadeNome: p.entidadeNome ?? null,
    orixaNome: p.orixaNome ?? null,
    versoes: Array.isArray(p.versoes) ? p.versoes : [],
  };
}

function playerPontoToPontoSnapshot(
  p: PlayerPonto,
  v: PontoVersaoPlayerRow | null,
): Ponto {
  return {
    id: p.id,
    title: p.title,
    tags: Array.isArray(p.tags) ? p.tags : [],
    lyrics: typeof v?.lyrics === "string" ? v.lyrics : p.lyrics,
    lyrics_preview_6:
      typeof v?.lyrics_preview_6 === "string"
        ? v.lyrics_preview_6
        : p.lyrics_preview_6 ?? null,
    author_name: p.author_name ?? null,
    is_public_domain: p.is_public_domain ?? null,
    entidade_id: p.entidade_id,
    entidadeNome: p.entidadeNome,
    orixaNome: p.orixaNome,
  };
}

type Props = {
  visible: boolean;
  onClose: () => void;
  playerPonto: PlayerPonto;
  activeVersao: PontoVersaoPlayerRow | null;
  userId: string;
  variant: "light" | "dark";
};

export function LibraryPlayerAddToCollectionModal(props: Props) {
  const {
    visible,
    onClose,
    playerPonto,
    activeVersao,
    userId,
    variant,
  } = props;

  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const rootPager = useRootPagerOptional();

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;
  const borderColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;

  const [collectionsFilter, setCollectionsFilter] =
    useState<CollectionsOwnerFilter>("all");
  const [isCollectionsFilterModalOpen, setIsCollectionsFilterModalOpen] =
    useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [entityCollectionId, setEntityCollectionId] = useState<string | null>(
    null,
  );

  const listPonto = useMemo(
    () => playerPontoToListPonto(playerPonto),
    [playerPonto],
  );

  const pontoVersaoId = useMemo(() => {
    if (activeVersao?.id) return activeVersao.id;
    return resolveDefaultPontoVersaoId(listPonto.versoes);
  }, [activeVersao?.id, listPonto.versoes]);

  const pontoSnapshot = useMemo(
    () => playerPontoToPontoSnapshot(playerPonto, activeVersao),
    [playerPonto, activeVersao],
  );

  const lyricsForEntidadeCheck = useMemo(() => {
    if (pontoVersaoId && activeVersao) return activeVersao.lyrics;
    const v = pontoVersaoId
      ? listPonto.versoes.find((x) => x.id === pontoVersaoId) ?? null
      : null;
    return v?.lyrics ?? listPonto.lyrics;
  }, [activeVersao, listPonto.lyrics, listPonto.versoes, pontoVersaoId]);

  useEffect(() => {
    rootPager?.setIsBottomSheetOpen(visible);
    return () => {
      if (visible) rootPager?.setIsBottomSheetOpen(false);
    };
  }, [rootPager, visible]);

  useEffect(() => {
    if (!visible) {
      setCollectionsFilter("all");
      setIsCollectionsFilterModalOpen(false);
      setAddError(null);
      setEntityCollectionId(null);
    }
  }, [visible]);

  const editableCollectionsQuery = useEditableCollections(userId);
  const editableCollections = useMemo(
    () => editableCollectionsQuery.data ?? [],
    [editableCollectionsQuery.data],
  );
  const collectionsError = editableCollectionsQuery.isError
    ? getErrorMessage(editableCollectionsQuery.error)
    : null;

  const myEditableTerreirosQuery = useMyEditableTerreirosQuery(userId);
  const myEditableTerreiros = useMemo(
    () => myEditableTerreirosQuery.data ?? [],
    [myEditableTerreirosQuery.data],
  );

  const collectionsFilterItems: SelectItem[] = useMemo(() => {
    const base: SelectItem[] = [
      { key: "all", label: "Todos", value: "all" },
      { key: "user", label: "Coleções do usuário", value: "user" },
    ];
    const terreiroItems = myEditableTerreiros.map((t) => ({
      key: `terreiro:${t.id}`,
      label: `Terreiro: ${t.title}`,
      value: `terreiro:${t.id}`,
    }));
    return [...base, ...terreiroItems];
  }, [myEditableTerreiros]);

  const collectionsFilterLabel = useMemo(() => {
    if (collectionsFilter === "all") return "Todos";
    if (collectionsFilter === "user") return "Coleções do usuário";
    if (collectionsFilter.startsWith("terreiro:")) {
      const id = collectionsFilter.slice("terreiro:".length);
      const match = myEditableTerreiros.find((t) => t.id === id);
      return `Terreiro: ${match?.title ?? "Terreiro"}`;
    }
    return "Todos";
  }, [collectionsFilter, myEditableTerreiros]);

  const visibleCollections = useMemo(() => {
    if (!userId) return [] as EditableCollection[];
    if (collectionsFilter === "all") return editableCollections;
    if (collectionsFilter === "user") {
      return editableCollections.filter(
        (c) => c.owner_user_id === userId && !c.owner_terreiro_id,
      );
    }
    if (collectionsFilter.startsWith("terreiro:")) {
      const id = collectionsFilter.slice("terreiro:".length);
      return editableCollections.filter((c) => c.owner_terreiro_id === id);
    }
    return editableCollections;
  }, [collectionsFilter, editableCollections, userId]);

  const getCollectionOwnerLabel = useCallback(
    (c: EditableCollection) => {
      if (c.owner_user_id === userId) return "Você";
      if (c.owner_terreiro_id) {
        return `Terreiro: ${c.terreiro_title ?? "Terreiro"}`;
      }
      return "";
    },
    [userId],
  );

  const entidadesCatalogQuery = useEntidadesCatalogQuery({
    enabled: !!entityCollectionId,
  });

  const addToCollectionMutation = useMutation({
    mutationFn: async (vars: {
      collectionId: string;
      pontoId: string;
      addedBy: string;
      pontoSnapshot?: Ponto | null;
      pontoVersaoId?: string | null;
      entidade?: CollectionPontoEntidadeInput | null;
      entidadeResolvedLabel?: string | null;
      listPonto?: ListPonto | null;
    }) => {
      const res = await addPontoToCollection({
        collectionId: vars.collectionId,
        pontoId: vars.pontoId,
        addedBy: vars.addedBy,
        pontoVersaoId: vars.pontoVersaoId ?? undefined,
        entidade: vars.entidade ?? null,
      });
      if (!res.ok) {
        throw new Error(res.error || "Erro ao adicionar ponto à coleção.");
      }
      return res;
    },
    onMutate: async (vars) => {
      const now = new Date().toISOString();
      const pontoSnap = vars.pontoSnapshot;
      const shouldPatch =
        !!pontoSnap && typeof pontoSnap.id === "string" && vars.listPonto;

      const filters = [
        { queryKey: queryKeys.collections.accountable(userId) },
        { queryKey: queryKeys.collections.editableByUserPrefix(userId) },
        { queryKey: queryKeys.collections.byId(vars.collectionId) },
        { queryKey: queryKeys.collections.pontos(vars.collectionId) },
        { queryKey: ["terreiros", "collectionsByTerreiro"] },
      ];

      await cancelQueries(queryClient, filters);
      const snap = snapshotQueries(queryClient, filters);

      setQueriesDataSafe<EditableCollection[]>(
        queryClient,
        { queryKey: queryKeys.collections.accountable(userId) },
        (old) => patchById(old ?? [], vars.collectionId, { updated_at: now }),
      );

      patchQueriesByPrefix<EditableCollection[]>(
        queryClient,
        queryKeys.collections.editableByUserPrefix(userId),
        (old) => patchById(old ?? [], vars.collectionId, { updated_at: now }),
      );

      setQueriesDataSafe<any>(
        queryClient,
        { queryKey: queryKeys.collections.byId(vars.collectionId) },
        (old: any) => {
          if (!old || typeof old !== "object") return old;
          return { ...old, updated_at: now };
        },
      );

      let didInsertPonto = false;
      let didIncrementCount = false;

      if (shouldPatch && vars.listPonto) {
        const lp = vars.listPonto;
        const explicit =
          typeof vars.pontoVersaoId === "string" && vars.pontoVersaoId.trim()
            ? vars.pontoVersaoId.trim()
            : null;
        const vid = explicit ?? resolveDefaultPontoVersaoId(lp.versoes);
        const v = vid ? lp.versoes.find((x) => x.id === vid) ?? null : null;
        const base = toPlayerPonto(lp);
        const label =
          typeof vars.entidadeResolvedLabel === "string"
            ? vars.entidadeResolvedLabel.trim()
            : "";
        let lyrics = v?.lyrics ?? base.lyrics;
        let lyrics_preview_6 =
          typeof v?.lyrics_preview_6 === "string"
            ? v.lyrics_preview_6
            : base.lyrics_preview_6;
        if (label && v && lyricsHasEntidadePlaceholder(lyrics)) {
          lyrics = applyEntidadePlaceholder(lyrics, label);
          if (typeof lyrics_preview_6 === "string") {
            lyrics_preview_6 = applyEntidadePlaceholder(
              lyrics_preview_6,
              label,
            );
          }
        }
        const collectionEntidadeResolve =
          vars.entidade?.kind === "custom"
            ? {
                entidadeTexto: vars.entidade.texto.trim(),
                entidadeLabelFromId: null as string | null,
              }
            : vars.entidade?.kind === "registered"
              ? {
                  entidadeTexto: null as string | null,
                  entidadeLabelFromId: label || null,
                }
              : null;
        const mappedPonto = {
          ...(v
            ? {
                ...base,
                lyrics,
                lyrics_preview_6,
              }
            : base),
          collectionPinnedVersaoId: vid ?? null,
          collectionEntidadeResolve,
        };

        const { didInsert } = upsertPontoInCollectionPontosList(queryClient, {
          collectionId: vars.collectionId,
          ponto: mappedPonto,
        });
        didInsertPonto = didInsert;

        if (didInsertPonto) {
          incrementCollectionPontosCountInTerreiroLists(queryClient, {
            collectionId: vars.collectionId,
            delta: 1,
          });
          didIncrementCount = true;
        }
      }

      return { snapshot: snap, didInsertPonto, didIncrementCount };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.snapshot) rollbackQueries(queryClient, ctx.snapshot);
      const msg =
        err instanceof Error
          ? err.message
          : "Erro ao adicionar ponto à coleção.";
      setAddError(__DEV__ ? msg : "Erro ao adicionar ponto à coleção.");
    },
    onSuccess: (data, vars, ctx) => {
      if (data?.alreadyExists) {
        if (ctx?.didInsertPonto) {
          removePontoFromCollectionPontosList(queryClient, {
            collectionId: vars.collectionId,
            pontoId: vars.pontoId,
          });
        }
        if (ctx?.didIncrementCount) {
          incrementCollectionPontosCountInTerreiroLists(queryClient, {
            collectionId: vars.collectionId,
            delta: -1,
          });
        }
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.accountable(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.editableByUserPrefix(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.byId(vars.collectionId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.pontos(vars.collectionId),
      });
      queryClient.invalidateQueries({
        queryKey: ["terreiros", "collectionsByTerreiro"],
      });
    },
  });

  const runAdd = useCallback(
    async (
      collectionId: string,
      entidade: CollectionPontoEntidadeInput | null,
      entidadeResolvedLabel: string | null,
    ) => {
      setAddError(null);
      try {
        const res = await addToCollectionMutation.mutateAsync({
          collectionId,
          pontoId: playerPonto.id,
          addedBy: userId,
          pontoSnapshot,
          pontoVersaoId,
          entidade,
          entidadeResolvedLabel,
          listPonto,
        });
        showToast(
          res.alreadyExists
            ? "Este ponto já estava na coleção"
            : "Ponto adicionado à coleção",
        );
        onClose();
      } catch {
        // onError já preenche addError
      }
    },
    [
      addToCollectionMutation,
      listPonto,
      onClose,
      playerPonto.id,
      pontoSnapshot,
      pontoVersaoId,
      showToast,
      userId,
    ],
  );

  const onPressCollection = useCallback(
    (collectionId: string) => {
      if (addToCollectionMutation.isPending) return;
      const needsEntity =
        !!pontoVersaoId && lyricsHasEntidadePlaceholder(lyricsForEntidadeCheck);
      if (needsEntity) {
        setEntityCollectionId(collectionId);
        return;
      }
      void runAdd(collectionId, null, null);
    },
    [
      addToCollectionMutation.isPending,
      lyricsForEntidadeCheck,
      pontoVersaoId,
      runAdd,
    ],
  );

  const onConfirmEntidade = useCallback(
    (choice: CollectionPontoEntidadeInput) => {
      const cid = entityCollectionId;
      if (!cid) return;
      setEntityCollectionId(null);
      const label =
        choice.kind === "custom"
          ? choice.texto.trim()
          : entidadesCatalogQuery.data?.find((o) => o.id === choice.entidadeId)
              ?.label ?? "";
      void runAdd(cid, choice, label);
    },
    [entityCollectionId, entidadesCatalogQuery.data, runAdd],
  );

  const baseBg = getSaravafyBaseColor(variant);
  const totalCount = editableCollections.length;
  const loadingLists =
    editableCollectionsQuery.isFetching && editableCollections.length === 0;

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <View
          style={[
            styles.root,
            {
              backgroundColor: baseBg,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={onClose}
              hitSlop={10}
              style={styles.headerBtn}
            >
              <Ionicons name="chevron-back" size={22} color={textPrimary} />
            </Pressable>
            <Text style={[styles.title, { color: textPrimary, flex: 1 }]}>
              Adicionar à coleção
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <Text style={[styles.subtitle, { color: textSecondary }]}>
            Escolha a playlist. A versão e a letra atuais no player serão usadas.
          </Text>

          <View style={styles.toolbar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Filtrar coleções"
              onPress={() => setIsCollectionsFilterModalOpen(true)}
              disabled={loadingLists && totalCount === 0}
              hitSlop={10}
              style={({ pressed }) => [
                styles.filterBtn,
                { borderColor },
                pressed ? { opacity: 0.85 } : null,
              ]}
            >
              <Ionicons name="funnel-outline" size={16} color={textSecondary} />
              <Text
                style={[styles.filterBtnText, { color: textPrimary }]}
                numberOfLines={1}
              >
                {collectionsFilterLabel}
              </Text>
              <Ionicons name="chevron-down" size={16} color={textSecondary} />
            </Pressable>
          </View>

          {collectionsError ? (
            <View style={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
              <Text style={[styles.bodyText, { color: colors.brass600 }]}>
                {collectionsError}
              </Text>
              <Pressable
                onPress={() => {
                  void editableCollectionsQuery.queries.editableTerreiroIds.refetch();
                  void editableCollectionsQuery.queries.collections.refetch();
                }}
                style={styles.retryBtn}
              >
                <Text style={{ color: textPrimary, fontWeight: "700" }}>
                  Tentar novamente
                </Text>
              </Pressable>
            </View>
          ) : loadingLists && totalCount === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator color={textPrimary} />
              <Text style={[styles.bodyText, { color: textSecondary }]}>
                Carregando coleções…
              </Text>
            </View>
          ) : totalCount === 0 ? (
            <Text style={[styles.bodyText, { color: textSecondary, paddingHorizontal: spacing.lg }]}>
              Você ainda não tem permissão para adicionar pontos em coleções.
            </Text>
          ) : visibleCollections.length === 0 ? (
            <Text style={[styles.bodyText, { color: textSecondary, paddingHorizontal: spacing.lg }]}>
              Nenhuma coleção nesse filtro.
            </Text>
          ) : (
            <>
              {addError ? (
                <Text
                  style={[
                    styles.bodyText,
                    { color: colors.brass600, paddingHorizontal: spacing.lg },
                  ]}
                >
                  {addError}
                </Text>
              ) : null}
              {addToCollectionMutation.isPending ? (
                <Text
                  style={[
                    styles.bodyText,
                    { color: textSecondary, paddingHorizontal: spacing.lg },
                  ]}
                >
                  Adicionando…
                </Text>
              ) : null}
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {visibleCollections.map((c) => {
                  const title = (c.title ?? "").trim() || "Coleção";
                  const ownerLabel = getCollectionOwnerLabel(c);
                  return (
                    <Pressable
                      key={c.id}
                      accessibilityRole="button"
                      disabled={addToCollectionMutation.isPending}
                      onPress={() => onPressCollection(c.id)}
                      style={({ pressed }) => [
                        styles.row,
                        {
                          borderColor,
                          opacity: addToCollectionMutation.isPending
                            ? 0.5
                            : pressed
                              ? 0.92
                              : 1,
                        },
                      ]}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={[styles.rowTitle, { color: textPrimary }]}
                          numberOfLines={1}
                        >
                          {title}
                        </Text>
                        {ownerLabel ? (
                          <Text
                            style={[styles.rowOwner, { color: textSecondary }]}
                            numberOfLines={1}
                          >
                            {ownerLabel}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}
        </View>
      </Modal>

      <SelectModal
        title="Filtrar coleções"
        visible={isCollectionsFilterModalOpen}
        variant={variant}
        items={collectionsFilterItems}
        onClose={() => setIsCollectionsFilterModalOpen(false)}
        onSelect={(value) => {
          if (
            value === "all" ||
            value === "user" ||
            value.startsWith("terreiro:")
          ) {
            setCollectionsFilter(value as CollectionsOwnerFilter);
          }
        }}
      />

      <EntidadePlaceholderSheet
        visible={!!entityCollectionId}
        variant={variant}
        onClose={() => setEntityCollectionId(null)}
        options={entidadesCatalogQuery.data ?? []}
        optionsLoading={entidadesCatalogQuery.isLoading}
        optionsError={
          entidadesCatalogQuery.error
            ? getErrorMessage(entidadesCatalogQuery.error)
            : null
        }
        onConfirm={onConfirmEntidade}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
    fontWeight: "600",
  },
  toolbar: {
    marginBottom: spacing.md,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: "100%",
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  centered: {
    paddingVertical: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  retryBtn: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  rowOwner: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
});
