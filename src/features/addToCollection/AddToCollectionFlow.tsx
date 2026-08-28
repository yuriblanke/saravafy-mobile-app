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
import {
  fetchActivePontoVersoesByPontoIds,
  type PontoVersaoPlayerRow,
} from "@/src/queries/pontoVersoes";
import { queryKeys } from "@/src/queries/queryKeys";
import { getErrorMessage } from "@/src/lib/errors";
import {
  resolveDefaultPontoVersaoId,
  toPlayerPonto,
  versaoCardTitle,
  type ListPonto,
} from "@/src/screens/CollectionAddToCollection/addToCollectionModel";
import {
  addPontoToCollection,
  type CollectionPontoEntidadeInput,
} from "@/src/screens/Home/data/collections_pontos";
import type { Ponto } from "@/src/screens/Home/data/ponto";
import { colors, getSaravafyBaseColor, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

type Phase = "versao" | "colecao";

export type AddToCollectionFlowProps = {
  visible: boolean;
  onClose: () => void;
  ponto: Ponto;
  userId: string;
  variant: "light" | "dark";

  /** Pre-selected versão (Player passes activeVersao.id). */
  initialPontoVersaoId?: string | null;
  /** When false, skip versão phase entirely (use initialPontoVersaoId or canonical). Default true. */
  allowVersionSelection?: boolean;
  /** Pre-loaded versões; skips internal fetch when provided. */
  initialVersoes?: PontoVersaoPlayerRow[];

  /** Show owner filter (Todos / Usuário / Terreiro:X). Default true. */
  showCollectionFilter?: boolean;
  /** Slot rendered next to the filter in the coleção phase (e.g. "+ Nova coleção"). */
  collectionsToolbarExtra?: ReactNode;
  /**
   * Fired whenever the internal collections owner filter changes. Lets a host
   * that renders its own affordance in `collectionsToolbarExtra` (e.g. Home's
   * "+ Nova coleção") know which owner (user/terreiro) is currently selected,
   * since the filter UI itself lives entirely inside this component.
   */
  onCollectionsFilterChange?: (filter: CollectionsOwnerFilter) => void;
};

function pontoToListPontoBase(p: Ponto): ListPonto {
  return {
    id: p.id,
    title: p.title,
    tags: Array.isArray(p.tags) ? p.tags : [],
    lyrics: p.lyrics,
    lyrics_preview_6: p.lyrics_preview_6 ?? null,
    entidadeNome: p.entidadeNome ?? null,
    orixaNome: p.orixaNome ?? null,
    versoes: [],
  };
}

function VersaoPickerRows(props: {
  ponto: ListPonto;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderColor: string;
  defaultHighlightId: string | null;
  onPick: (versaoId: string, lp: ListPonto) => void;
}) {
  const {
    ponto,
    textPrimary,
    textSecondary,
    textMuted,
    borderColor,
    defaultHighlightId,
    onPick,
  } = props;

  return (
    <>
      {ponto.versoes.map((v) => {
        const rowTitle = versaoCardTitle(v, ponto.title);
        const lyricsBody =
          typeof v.lyrics === "string" && v.lyrics.length > 0 ? v.lyrics : "—";
        const highlighted =
          defaultHighlightId != null && defaultHighlightId === v.id;
        return (
          <Pressable
            key={v.id}
            accessibilityRole="button"
            accessibilityLabel={`Usar versão: ${rowTitle}`}
            onPress={() => onPick(v.id, ponto)}
            style={({ pressed }) => [
              styles.versaoRow,
              {
                borderColor: highlighted ? textPrimary : borderColor,
                borderWidth: highlighted ? 2 : StyleSheet.hairlineWidth,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.versaoRowTitle, { color: textPrimary }]}
                numberOfLines={2}
              >
                {rowTitle}
                {v.is_canonical ? (
                  <Text style={{ color: textMuted, fontWeight: "600" }}>
                    {" "}
                    · canônica
                  </Text>
                ) : null}
              </Text>
              <Text style={[styles.versaoRowMeta, { color: textSecondary }]}>
                Versão {v.versao_num} de {ponto.versoes.length}
              </Text>
              <Text
                style={[styles.versaoRowLyricsFull, { color: textSecondary }]}
              >
                {lyricsBody}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={textPrimary} />
          </Pressable>
        );
      })}
    </>
  );
}

export function AddToCollectionFlow(props: AddToCollectionFlowProps) {
  const {
    visible,
    onClose,
    ponto,
    userId,
    variant,
    initialPontoVersaoId = null,
    allowVersionSelection = true,
    initialVersoes,
    showCollectionFilter = true,
    collectionsToolbarExtra,
    onCollectionsFilterChange,
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
  const textMuted =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;
  const borderColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;
  const baseBg = getSaravafyBaseColor(variant);

  const [phase, setPhase] = useState<Phase>(
    allowVersionSelection ? "versao" : "colecao",
  );
  const [pendingCommit, setPendingCommit] = useState<{
    listPonto: ListPonto;
    pontoVersaoId: string | null;
    entidade: CollectionPontoEntidadeInput | null;
    entidadeResolvedLabel: string | null;
  } | null>(null);
  const [entidadePickerCtx, setEntidadePickerCtx] = useState<{
    listPonto: ListPonto;
    pontoVersaoId: string;
    deferredCollectionId: string | null;
  } | null>(null);
  const [collectionsFilter, setCollectionsFilter] =
    useState<CollectionsOwnerFilter>("all");
  const [isCollectionsFilterModalOpen, setIsCollectionsFilterModalOpen] =
    useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const hasInitialVersoes =
    Array.isArray(initialVersoes) && initialVersoes.length > 0;

  const versoesQuery = useQuery({
    queryKey: queryKeys.pontos.versoesBatch("addToCollectionFlow", ponto.id),
    queryFn: () => fetchActivePontoVersoesByPontoIds([ponto.id]),
    enabled: visible && !hasInitialVersoes,
    staleTime: 60_000,
  });

  const listPonto: ListPonto = useMemo(() => {
    const base = pontoToListPontoBase(ponto);
    if (hasInitialVersoes) {
      return { ...base, versoes: initialVersoes ?? [] };
    }
    const map = versoesQuery.data;
    if (!map) return base;
    const versoes = map.get(ponto.id) ?? [];
    const canonical = versoes.find((v) => v.is_canonical) ?? versoes[0] ?? null;
    const lyrics = canonical?.lyrics ?? base.lyrics;
    const lyrics_preview_6 =
      typeof canonical?.lyrics_preview_6 === "string"
        ? canonical.lyrics_preview_6
        : base.lyrics_preview_6;
    return { ...base, lyrics, lyrics_preview_6, versoes };
  }, [hasInitialVersoes, initialVersoes, ponto, versoesQuery.data]);

  const versoesLoading =
    visible && !hasInitialVersoes && versoesQuery.isLoading;

  const defaultVersaoHighlightId = useMemo(() => {
    if (!listPonto.versoes.length) return null;
    return resolveDefaultPontoVersaoId(listPonto.versoes);
  }, [listPonto.versoes]);

  const effectivePontoVersaoId = useMemo(() => {
    if (allowVersionSelection) return pendingCommit?.pontoVersaoId ?? null;
    if (initialPontoVersaoId) return initialPontoVersaoId;
    return resolveDefaultPontoVersaoId(listPonto.versoes);
  }, [
    allowVersionSelection,
    initialPontoVersaoId,
    listPonto.versoes,
    pendingCommit?.pontoVersaoId,
  ]);

  const lyricsForEntidadeCheck = useMemo(() => {
    const vid = effectivePontoVersaoId;
    const v = vid ? listPonto.versoes.find((x) => x.id === vid) ?? null : null;
    return v?.lyrics ?? listPonto.lyrics;
  }, [effectivePontoVersaoId, listPonto.lyrics, listPonto.versoes]);

  useEffect(() => {
    rootPager?.setIsBottomSheetOpen(visible);
    return () => {
      if (visible) rootPager?.setIsBottomSheetOpen(false);
    };
  }, [rootPager, visible]);

  useEffect(() => {
    if (!visible) {
      setPhase(allowVersionSelection ? "versao" : "colecao");
      setPendingCommit(null);
      setEntidadePickerCtx(null);
      setCollectionsFilter("all");
      setIsCollectionsFilterModalOpen(false);
      setAddError(null);
    }
  }, [allowVersionSelection, visible]);

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
    if (!showCollectionFilter) return editableCollections;
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
  }, [collectionsFilter, editableCollections, showCollectionFilter, userId]);

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
    enabled: !!entidadePickerCtx,
  });

  const addMutation = useMutation({
    mutationFn: async (vars: {
      collectionId: string;
      pontoId: string;
      addedBy: string;
      pontoSnapshot: Ponto;
      pontoVersaoId: string | null;
      entidade: CollectionPontoEntidadeInput | null;
      entidadeResolvedLabel: string | null;
      listPonto: ListPonto;
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

      const filters = [
        { queryKey: queryKeys.collections.accountable(userId) },
        { queryKey: queryKeys.collections.editableByUserPrefix(userId) },
        { queryKey: queryKeys.collections.byId(vars.collectionId) },
        { queryKey: queryKeys.collections.pontos(vars.collectionId) },
        { queryKey: queryKeys.terreiros.collectionsByTerreiroPrefix() },
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
          lyrics_preview_6 = applyEntidadePlaceholder(lyrics_preview_6, label);
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
        ...(v ? { ...base, lyrics, lyrics_preview_6 } : base),
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
        queryKey: queryKeys.terreiros.collectionsByTerreiroPrefix(),
      });
    },
  });

  const runAdd = useCallback(
    async (params: {
      collectionId: string;
      pontoVersaoId: string | null;
      entidade: CollectionPontoEntidadeInput | null;
      entidadeResolvedLabel: string | null;
      listPontoOverride?: ListPonto;
    }) => {
      setAddError(null);
      try {
        const res = await addMutation.mutateAsync({
          collectionId: params.collectionId,
          pontoId: ponto.id,
          addedBy: userId,
          pontoSnapshot: ponto,
          pontoVersaoId: params.pontoVersaoId,
          entidade: params.entidade,
          entidadeResolvedLabel: params.entidadeResolvedLabel,
          listPonto: params.listPontoOverride ?? listPonto,
        });
        showToast(
          res.alreadyExists
            ? "Este ponto já estava na coleção"
            : "Ponto adicionado à coleção",
        );
        onClose();
      } catch {
        // onError sets addError
      }
    },
    [addMutation, listPonto, onClose, ponto, showToast, userId],
  );

  const goToColecaoStep = useCallback(
    (payload: {
      listPonto: ListPonto;
      pontoVersaoId: string | null;
      entidade: CollectionPontoEntidadeInput | null;
      entidadeResolvedLabel: string | null;
    }) => {
      setPendingCommit(payload);
      setPhase("colecao");
    },
    [],
  );

  const proceedAfterVersaoChosen = useCallback(
    (lp: ListPonto, pontoVersaoId: string | null) => {
      const v = pontoVersaoId
        ? lp.versoes.find((x) => x.id === pontoVersaoId) ?? null
        : null;
      const lyricsForCheck = v?.lyrics ?? lp.lyrics;
      if (lyricsHasEntidadePlaceholder(lyricsForCheck) && pontoVersaoId) {
        setEntidadePickerCtx({
          listPonto: lp,
          pontoVersaoId,
          deferredCollectionId: null,
        });
        return;
      }
      goToColecaoStep({
        listPonto: lp,
        pontoVersaoId,
        entidade: null,
        entidadeResolvedLabel: null,
      });
    },
    [goToColecaoStep],
  );

  const onPickVersao = useCallback(
    (versaoId: string, lp: ListPonto) => {
      proceedAfterVersaoChosen(lp, versaoId);
    },
    [proceedAfterVersaoChosen],
  );

  const onPressCollection = useCallback(
    (collectionId: string) => {
      if (addMutation.isPending) return;

      if (allowVersionSelection) {
        // Home-style: pendingCommit already prepared in phase 1
        if (!pendingCommit) return;
        void runAdd({
          collectionId,
          pontoVersaoId: pendingCommit.pontoVersaoId,
          entidade: pendingCommit.entidade,
          entidadeResolvedLabel: pendingCommit.entidadeResolvedLabel,
          listPontoOverride: pendingCommit.listPonto,
        });
        return;
      }

      // Player-style: check entidade now since no phase 1 ran
      const vid = effectivePontoVersaoId;
      if (vid && lyricsHasEntidadePlaceholder(lyricsForEntidadeCheck)) {
        setEntidadePickerCtx({
          listPonto,
          pontoVersaoId: vid,
          deferredCollectionId: collectionId,
        });
        return;
      }
      void runAdd({
        collectionId,
        pontoVersaoId: vid,
        entidade: null,
        entidadeResolvedLabel: null,
      });
    },
    [
      addMutation.isPending,
      allowVersionSelection,
      effectivePontoVersaoId,
      listPonto,
      lyricsForEntidadeCheck,
      pendingCommit,
      runAdd,
    ],
  );

  const onConfirmEntidade = useCallback(
    (choice: CollectionPontoEntidadeInput) => {
      const ctx = entidadePickerCtx;
      if (!ctx) return;
      setEntidadePickerCtx(null);
      const label =
        choice.kind === "custom"
          ? choice.texto.trim()
          : entidadesCatalogQuery.data?.find((o) => o.id === choice.entidadeId)
              ?.label ?? "";

      if (ctx.deferredCollectionId) {
        // Player-style: collection already chosen, commit now
        void runAdd({
          collectionId: ctx.deferredCollectionId,
          pontoVersaoId: ctx.pontoVersaoId,
          entidade: choice,
          entidadeResolvedLabel: label,
          listPontoOverride: ctx.listPonto,
        });
        return;
      }

      // Home-style: defer commit to colleção phase
      goToColecaoStep({
        listPonto: ctx.listPonto,
        pontoVersaoId: ctx.pontoVersaoId,
        entidade: choice,
        entidadeResolvedLabel: label,
      });
    },
    [entidadePickerCtx, entidadesCatalogQuery.data, goToColecaoStep, runAdd],
  );

  const handleBack = useCallback(() => {
    if (allowVersionSelection && phase === "colecao") {
      setPhase("versao");
      setPendingCommit(null);
      return;
    }
    onClose();
  }, [allowVersionSelection, phase, onClose]);

  const totalCount = editableCollections.length;
  const loadingLists =
    editableCollectionsQuery.isFetching && editableCollections.length === 0;

  const headerTitle =
    allowVersionSelection && phase === "versao"
      ? "Escolher versão"
      : "Adicionar à coleção";
  const headerSubtitle =
    allowVersionSelection && phase === "versao"
      ? "Toque na versão com a letra que você quer usar na coleção."
      : !allowVersionSelection
        ? "Escolha a playlist. A versão e a letra atuais no player serão usadas."
        : "Selecione a coleção (playlist).";

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
              accessibilityLabel={
                allowVersionSelection && phase === "colecao" ? "Voltar" : "Fechar"
              }
              onPress={handleBack}
              hitSlop={10}
              style={styles.headerBtn}
            >
              <Ionicons name="chevron-back" size={22} color={textPrimary} />
            </Pressable>
            <Text style={[styles.title, { color: textPrimary, flex: 1 }]}>
              {headerTitle}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={onClose}
              hitSlop={10}
              style={styles.headerBtn}
            >
              <Text style={[styles.closeText, { color: textPrimary }]}>×</Text>
            </Pressable>
          </View>

          <Text style={[styles.subtitle, { color: textSecondary }]}>
            {headerSubtitle}
          </Text>

          {phase === "versao" ? (
            versoesLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator color={textPrimary} />
              </View>
            ) : (
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
              >
                {listPonto.versoes.length === 0 ? (
                  <View style={styles.emptyVersoesBlock}>
                    <Text style={[styles.bodyText, { color: textSecondary }]}>
                      Nenhuma versão cadastrada para este ponto. A coleção usará
                      a letra principal do cartão.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Continuar para escolher a coleção"
                      onPress={() => proceedAfterVersaoChosen(listPonto, null)}
                      style={({ pressed }) => [
                        styles.continuarBtn,
                        {
                          backgroundColor:
                            variant === "light"
                              ? colors.forest700
                              : colors.brass500,
                          opacity: pressed ? 0.88 : 1,
                        },
                      ]}
                    >
                      <Text style={styles.continuarBtnText}>Continuar</Text>
                    </Pressable>
                  </View>
                ) : (
                  <VersaoPickerRows
                    ponto={listPonto}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    textMuted={textMuted}
                    borderColor={borderColor}
                    defaultHighlightId={defaultVersaoHighlightId}
                    onPick={onPickVersao}
                  />
                )}
              </ScrollView>
            )
          ) : (
            <>
              {(showCollectionFilter || collectionsToolbarExtra) && (
                <View style={styles.toolbar}>
                  {showCollectionFilter && (
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
                      <Ionicons
                        name="funnel-outline"
                        size={16}
                        color={textSecondary}
                      />
                      <Text
                        style={[styles.filterBtnText, { color: textPrimary }]}
                        numberOfLines={1}
                      >
                        {collectionsFilterLabel}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={16}
                        color={textSecondary}
                      />
                    </Pressable>
                  )}
                  {collectionsToolbarExtra}
                </View>
              )}

              {collectionsError ? (
                <View style={{ gap: spacing.sm }}>
                  <Text style={[styles.bodyText, { color: colors.brass600 }]}>
                    {collectionsError}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void editableCollectionsQuery.queries.editableTerreiroIds.refetch();
                      void editableCollectionsQuery.queries.collections.refetch();
                    }}
                    style={[
                      styles.retryBtn,
                      variant === "light"
                        ? styles.retryBtnLight
                        : styles.retryBtnDark,
                    ]}
                  >
                    <Text style={[styles.retryText, { color: textPrimary }]}>
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
                <View style={styles.emptyBlock}>
                  <Text style={[styles.emptyTitle, { color: textPrimary }]}>
                    Você ainda não tem permissão…
                  </Text>
                  <Text style={[styles.emptyText, { color: textSecondary }]}>
                    Você ainda não tem permissão para adicionar pontos em
                    coleções.
                  </Text>
                </View>
              ) : visibleCollections.length === 0 ? (
                <View style={styles.emptyBlock}>
                  <Text style={[styles.emptyTitle, { color: textPrimary }]}>
                    Nenhuma coleção nesse filtro.
                  </Text>
                </View>
              ) : (
                <>
                  {addError ? (
                    <Text style={[styles.bodyText, { color: colors.brass600 }]}>
                      {addError}
                    </Text>
                  ) : addMutation.isPending ? (
                    <Text style={[styles.bodyText, { color: textSecondary }]}>
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
                      const disabled = addMutation.isPending;
                      return (
                        <Pressable
                          key={c.id}
                          accessibilityRole="button"
                          disabled={disabled}
                          onPress={() => onPressCollection(c.id)}
                          style={({ pressed }) => [
                            styles.collectionRow,
                            {
                              borderColor,
                              opacity: disabled ? 0.5 : pressed ? 0.92 : 1,
                            },
                          ]}
                        >
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text
                              style={[
                                styles.collectionTitle,
                                { color: textPrimary },
                              ]}
                              numberOfLines={1}
                            >
                              {title}
                            </Text>
                            {ownerLabel ? (
                              <Text
                                style={[
                                  styles.collectionOwner,
                                  { color: textSecondary },
                                ]}
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
            const next = value as CollectionsOwnerFilter;
            setCollectionsFilter(next);
            onCollectionsFilterChange?.(next);
          }
        }}
      />

      <EntidadePlaceholderSheet
        visible={!!entidadePickerCtx}
        variant={variant}
        onClose={() => setEntidadePickerCtx(null)}
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
  closeText: {
    fontSize: 28,
    lineHeight: 28,
    fontWeight: "300",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
    fontWeight: "600",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: "wrap",
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  emptyBlock: {
    paddingVertical: spacing.lg,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  emptyVersoesBlock: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  continuarBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  continuarBtnText: {
    color: colors.paper50,
    fontSize: 16,
    fontWeight: "800",
  },
  retryBtn: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  retryBtnLight: {
    borderColor: colors.surfaceCardBorderLight,
  },
  retryBtnDark: {
    borderColor: colors.surfaceCardBorder,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "700",
  },
  collectionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  collectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  collectionOwner: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  versaoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  versaoRowTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  versaoRowMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
  },
  versaoRowLyricsFull: {
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 20,
  },
});
