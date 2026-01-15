import { useAuth } from "@/contexts/AuthContext";
import { useCuratorMode } from "@/contexts/CuratorModeContext";
import { useGestureBlock } from "@/contexts/GestureBlockContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useRootPager } from "@/contexts/RootPagerContext";
import { useToast } from "@/contexts/ToastContext";
import { BottomSheet } from "@/src/components/BottomSheet";
import {
  PontoUpsertModal,
  type PontoUpsertInitialValues,
} from "@/src/components/pontos/PontoUpsertModal";
import { SelectModal, type SelectItem } from "@/src/components/SelectModal";
import { SubmitPontoModal } from "@/src/components/SubmitPontoModal";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { TagChip } from "@/src/components/TagChip";
import { useIsCurator } from "@/src/hooks/useIsCurator";
import { usePontosSearch } from "@/src/hooks/usePontosSearch";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createCollection } from "./data/collections";
import { addPontoToCollection } from "./data/collections_pontos";
import type { Ponto } from "./data/ponto";
import { fetchAllPontos } from "./data/ponto";

import {
  useEditableCollections,
  type EditableCollection,
} from "@/src/queries/collections";
import {
  incrementCollectionPontosCountInTerreiroLists,
  removePontoFromCollectionPontosList,
  upsertPontoInCollectionPontosList,
} from "@/src/queries/collectionsCache";
import { useMyEditableTerreirosQuery } from "@/src/queries/me";
import {
  cancelQueries,
  makeTempId,
  patchById,
  patchQueriesByPrefix,
  removeById,
  replaceId,
  rollbackQueries,
  setQueriesDataSafe,
  snapshotQueries,
  upsertById,
} from "@/src/queries/mutationUtils";
import { queryKeys } from "@/src/queries/queryKeys";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

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

export function matchesQuery(point: Ponto, query: string) {
  const q = normalize(query);
  if (!q) return true;
  if (normalize(point.title).includes(q)) return true;
  if (normalize(point.lyrics).includes(q)) return true;
  return point.tags.some((t: string) => normalize(t).includes(q));
}

export function getLyricsPreview(lyrics: string, maxLines = 6) {
  const lines = lyrics
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const previewLines = lines.slice(0, maxLines);
  const preview = previewLines.join("\n");
  if (lines.length > maxLines) {
    return `${preview}\n…`;
  }
  return preview;
}

export default function Home() {
  // Adapta o padrão de tema igual Terreiros
  const { effectiveTheme } = usePreferences();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { showToast } = useToast();

  const { isCurator, refetch: refetchIsCurator } = useIsCurator();
  const { curatorModeEnabled } = useCuratorMode();
  const canEditPontos = !!userId && isCurator && curatorModeEnabled === true;
  const router = useRouter();
  const queryClient = useQueryClient();
  const rootPager = useRootPager();
  const { shouldBlockPress } = useGestureBlock();

  const [submitModalVisible, setSubmitModalVisible] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPonto, setEditingPonto] = useState<Ponto | null>(null);
  // Estado para modal de adicionar à coleção
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedPonto, setSelectedPonto] = useState<Ponto | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const addToCollectionMutation = useMutation({
    mutationFn: async (vars: {
      collectionId: string;
      pontoId: string;
      addedBy: string;
      pontoSnapshot?: Ponto | null;
    }) => {
      const res = await addPontoToCollection(vars);
      if (!res.ok) {
        throw new Error(res.error || "Erro ao adicionar ponto à coleção.");
      }
      return res;
    },
    onMutate: async (vars) => {
      if (!userId) return null;

      const now = new Date().toISOString();

      const pontoSnapshot = vars.pontoSnapshot;
      const shouldPatchPontosList =
        !!pontoSnapshot && typeof pontoSnapshot?.id === "string";

      const filters = [
        { queryKey: queryKeys.collections.accountable(userId) },
        { queryKey: queryKeys.collections.editableByUserPrefix(userId) },
        { queryKey: queryKeys.collections.byId(vars.collectionId) },
        { queryKey: queryKeys.collections.pontos(vars.collectionId) },
        { queryKey: ["terreiros", "collectionsByTerreiro"] },
      ];

      await cancelQueries(queryClient, filters);
      const snapshot = snapshotQueries(queryClient, filters);

      setQueriesDataSafe<EditableCollection[]>(
        queryClient,
        { queryKey: queryKeys.collections.accountable(userId) },
        (old) => patchById(old ?? [], vars.collectionId, { updated_at: now })
      );

      patchQueriesByPrefix<EditableCollection[]>(
        queryClient,
        queryKeys.collections.editableByUserPrefix(userId),
        (old) => patchById(old ?? [], vars.collectionId, { updated_at: now })
      );

      // Se existir cache do detalhe da collection, mantém consistente.
      setQueriesDataSafe<any>(
        queryClient,
        { queryKey: queryKeys.collections.byId(vars.collectionId) },
        (old: any) => {
          if (!old || typeof old !== "object") return old;
          return { ...old, updated_at: now };
        }
      );

      let didInsertPonto = false;
      let didIncrementCount = false;

      if (shouldPatchPontosList && pontoSnapshot) {
        const mappedPonto = {
          id: String(pontoSnapshot.id ?? ""),
          title:
            (typeof (pontoSnapshot as any).title === "string" &&
              (pontoSnapshot as any).title.trim()) ||
            "Ponto",
          artist:
            typeof (pontoSnapshot as any).artist === "string"
              ? (pontoSnapshot as any).artist
              : null,
          duration_seconds:
            typeof (pontoSnapshot as any).duration_seconds === "number"
              ? (pontoSnapshot as any).duration_seconds
              : null,
          audio_url:
            typeof (pontoSnapshot as any).audio_url === "string"
              ? (pontoSnapshot as any).audio_url
              : null,
          cover_url:
            typeof (pontoSnapshot as any).cover_url === "string"
              ? (pontoSnapshot as any).cover_url
              : null,
          lyrics:
            typeof (pontoSnapshot as any).lyrics === "string"
              ? (pontoSnapshot as any).lyrics
              : "",
          tags: Array.isArray((pontoSnapshot as any).tags)
            ? ((pontoSnapshot as any).tags as any[]).filter(
                (t) => typeof t === "string"
              )
            : [],
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

      return {
        snapshot,
        didInsertPonto,
        didIncrementCount,
      };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.snapshot) {
        rollbackQueries(queryClient, ctx.snapshot);
      }

      const msg =
        err instanceof Error
          ? err.message
          : "Erro ao adicionar ponto à coleção.";
      setAddError(__DEV__ ? msg : "Erro ao adicionar ponto à coleção.");
    },
    onSuccess: (data, vars, ctx) => {
      // Se já existia, desfaz o optimistic específico (mantém updated_at patch).
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
      if (!userId) return;

      // Invalidação mínima: mantém as listas e o detalhe corretos.
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

      // Atualiza contadores em todas as listas por-terreiro.
      queryClient.invalidateQueries({
        queryKey: ["terreiros", "collectionsByTerreiro"],
      });
    },
  });

  const [isCreatingCollection, setIsCreatingCollection] = useState(false);

  const [isCreateCollectionModalOpen, setIsCreateCollectionModalOpen] =
    useState(false);
  const [createCollectionTitle, setCreateCollectionTitle] = useState("");
  const [createCollectionError, setCreateCollectionError] = useState<
    string | null
  >(null);

  const createCollectionTitleInputRef = useRef<TextInput>(null);

  type CollectionsOwnerFilter = "all" | "user" | `terreiro:${string}`;
  const [collectionsFilter, setCollectionsFilter] =
    useState<CollectionsOwnerFilter>("all");
  const [isCollectionsFilterModalOpen, setIsCollectionsFilterModalOpen] =
    useState(false);

  const variant = effectiveTheme;
  const textPrimary =
    variant === "light" ? colors.forest800 : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light" ? colors.forest800 : colors.textSecondaryOnDark;
  const textMuted =
    variant === "light" ? colors.forest800 : colors.textMutedOnDark;

  const [searchQuery, setSearchQuery] = useState("");
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const {
    canSearch,
    isLoading: isSearching,
    results: searchResults,
    error: searchError,
    lastSearched,
  } = usePontosSearch(searchQuery, { enabled: true, limit: 20, offset: 0 });

  const queryHasText = useMemo(
    () => Boolean(searchQuery.trim()),
    [searchQuery]
  );

  type PontoListItem = Ponto & {
    lyrics_preview_6?: string | null;
    score?: number | null;
  };

  const searchedPontos: PontoListItem[] = useMemo(() => {
    if (!queryHasText || !canSearch) return [];
    return searchResults.map((r) => {
      return {
        id: r.id,
        title: r.title,
        artist: null,
        tags: r.tags,
        lyrics: r.lyrics,
        lyrics_preview_6: r.lyrics_preview_6,
        score: r.score,
      } satisfies PontoListItem;
    });
  }, [canSearch, queryHasText, searchResults]);

  const lastRefreshAtRef = useRef<number>(0);

  useEffect(() => {
    fetchAllPontos()
      .then(setPontos)
      .catch((e) => {
        if (__DEV__) {
          const msg = getErrorMessage(e);
          console.info("[Pontos] erro ao carregar", {
            message: msg,
            raw: e,
          });
        }
        setLoadError(__DEV__ ? getErrorMessage(e) : "Erro ao carregar pontos.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refetchIsCurator();

      // Mantém a lista consistente ao voltar de telas que podem criar/aprovar pontos
      // (ex.: fila de revisão). Throttle simples para evitar refetch em excesso.
      const now = Date.now();
      if (now - lastRefreshAtRef.current < 8_000) return;
      lastRefreshAtRef.current = now;

      fetchAllPontos()
        .then(setPontos)
        .catch(() => {
          // Silencioso: não quebra a tela se falhar em background.
        });
    }, [refetchIsCurator])
  );

  const editingInitialValues: PontoUpsertInitialValues | undefined =
    useMemo(() => {
      if (!editingPonto) return undefined;
      return {
        id: editingPonto.id,
        title: editingPonto.title,
        artist: editingPonto.artist ?? null,
        lyrics: editingPonto.lyrics,
        tags: editingPonto.tags,
      };
    }, [editingPonto]);

  // Fonte ÚNICA do BottomSheet: coleções editáveis (escrita) por regra de produto.
  const editableCollectionsQuery = useEditableCollections(userId);
  const editableCollections = useMemo(
    () => editableCollectionsQuery.data ?? [],
    [editableCollectionsQuery.data]
  );
  const collectionsError = editableCollectionsQuery.isError
    ? getErrorMessage(editableCollectionsQuery.error)
    : null;

  const myEditableTerreirosQuery = useMyEditableTerreirosQuery(userId);
  const myEditableTerreiros = useMemo(
    () => myEditableTerreirosQuery.data ?? [],
    [myEditableTerreirosQuery.data]
  );

  const collectionsFilterItems: SelectItem[] = useMemo(() => {
    const base: SelectItem[] = [
      { key: "all", label: "Todos", value: "all" },
      {
        key: "user",
        label: "Coleções do usuário",
        value: "user",
      },
    ];

    const terreiroItems = myEditableTerreiros.map((t) => {
      return {
        key: `terreiro:${t.id}`,
        label: `Terreiro: ${t.title}`,
        value: `terreiro:${t.id}`,
      } satisfies SelectItem;
    });

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

  const visibleEditableCollections = useMemo(() => {
    if (!userId) return [] as EditableCollection[];
    if (collectionsFilter === "all") return editableCollections;
    if (collectionsFilter === "user") {
      return editableCollections.filter(
        (c) => c.owner_user_id === userId && !c.owner_terreiro_id
      );
    }
    if (collectionsFilter.startsWith("terreiro:")) {
      const id = collectionsFilter.slice("terreiro:".length);
      return editableCollections.filter((c) => c.owner_terreiro_id === id);
    }
    return editableCollections;
  }, [collectionsFilter, editableCollections, userId]);

  const closeAddToCollectionSheet = useCallback(() => {
    setAddModalVisible(false);
    setIsCreateCollectionModalOpen(false);
    setCreateCollectionTitle("");
    setCreateCollectionError(null);
    setIsCollectionsFilterModalOpen(false);
    rootPager.setIsBottomSheetOpen(false);
  }, [rootPager]);

  useEffect(() => {
    if (!addModalVisible) return;
    if (__DEV__) {
      console.info("[AddToCollectionDebug] sheet visible", {
        userId,
        dataCount: editableCollections.length,
        isFetching: editableCollectionsQuery.isFetching,
      });
    }
  }, [
    addModalVisible,
    editableCollections.length,
    editableCollectionsQuery.isFetching,
    userId,
  ]);

  const openAddToCollectionSheet = useCallback(
    (ponto: Ponto) => {
      if (!userId) return;
      if (__DEV__) {
        console.info("[AddToCollectionDebug] open sheet", {
          userId,
          dataCount: editableCollections.length,
          isFetching: editableCollectionsQuery.isFetching,
        });
      }
      // IMPORTANT: o sheet abre sem "piscar" loading.
      // A lista é servida do cache (ou vazia) e refetch ocorre em background.
      setIsCreateCollectionModalOpen(false);
      setCreateCollectionTitle("");
      setCreateCollectionError(null);

      setSelectedPonto(ponto);
      setAddSuccess(false);
      setAddError(null);

      setAddModalVisible(true);
      rootPager.setIsBottomSheetOpen(true);
    },
    [
      editableCollections.length,
      editableCollectionsQuery.isFetching,
      rootPager,
      userId,
    ]
  );

  const getCollectionOwnerLabel = (c: EditableCollection) => {
    if (!userId) return "";
    if (c.owner_user_id === userId) return "Você";
    if (c.owner_terreiro_id) {
      return `Terreiro: ${c.terreiro_title ?? "Terreiro"}`;
    }
    return "";
  };

  const openCreateCollection = useCallback(() => {
    setCreateCollectionError(null);
    setCreateCollectionTitle("");
    setIsCreateCollectionModalOpen(true);
  }, []);

  useEffect(() => {
    if (!isCreateCollectionModalOpen) return;

    const t = setTimeout(() => {
      createCollectionTitleInputRef.current?.focus();
    }, 150);

    return () => clearTimeout(t);
  }, [isCreateCollectionModalOpen]);

  const createCollectionMutation = useMutation({
    mutationFn: async (vars: {
      title: string;
      ownerUserId: string | null;
      ownerTerreiroId: string | null;
    }): Promise<EditableCollection> => {
      if (!userId) {
        throw new Error("Usuário inválido.");
      }

      const res = await createCollection(vars);
      if (res.error || !res.data) {
        throw new Error(res.error || "Erro ao criar coleção.");
      }

      return {
        id: res.data.id,
        title: typeof res.data.title === "string" ? res.data.title : null,
        owner_user_id:
          typeof res.data.owner_user_id === "string"
            ? res.data.owner_user_id
            : null,
        owner_terreiro_id:
          typeof res.data.owner_terreiro_id === "string"
            ? res.data.owner_terreiro_id
            : null,
        terreiro_title:
          typeof res.data.terreiro_title === "string"
            ? res.data.terreiro_title
            : null,
        created_at:
          typeof res.data.created_at === "string"
            ? res.data.created_at
            : new Date().toISOString(),
        updated_at:
          typeof res.data.updated_at === "string"
            ? res.data.updated_at
            : new Date().toISOString(),
      };
    },
    onMutate: async (vars) => {
      if (!userId) return null;

      const now = new Date().toISOString();
      const tempId = makeTempId("collection");

      const optimistic: EditableCollection = {
        id: tempId,
        title: vars.title,
        owner_user_id: vars.ownerUserId,
        owner_terreiro_id: vars.ownerTerreiroId,
        terreiro_title: null,
        created_at: now,
        updated_at: now,
      };

      const filters = [
        { queryKey: queryKeys.collections.editableByUserPrefix(userId) },
        { queryKey: queryKeys.collections.accountable(userId) },
      ];

      await cancelQueries(queryClient, filters);
      const snapshot = snapshotQueries(queryClient, filters);

      patchQueriesByPrefix<EditableCollection[]>(
        queryClient,
        queryKeys.collections.editableByUserPrefix(userId),
        (old) => upsertById(old ?? [], optimistic, { prepend: true })
      );

      // AccountableCollections pode existir em outros lugares; manter consistente.
      setQueriesDataSafe<EditableCollection[]>(
        queryClient,
        { queryKey: queryKeys.collections.accountable(userId) },
        (old) => upsertById(old ?? [], optimistic, { prepend: true })
      );

      return { snapshot, tempId };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.snapshot) {
        rollbackQueries(queryClient, ctx.snapshot);
      }
      const msg = err instanceof Error ? err.message : "Erro ao criar coleção.";
      setCreateCollectionError(msg);
      showToast(msg);
    },
    onSuccess: (data, _vars, ctx) => {
      if (!userId) return;

      const realId = data.id;
      const tempId = ctx?.tempId;
      if (!tempId) return;

      const finalItem: EditableCollection = data;

      // Reconcilia em TODAS as queries já materializadas sob o prefix.
      patchQueriesByPrefix<EditableCollection[]>(
        queryClient,
        queryKeys.collections.editableByUserPrefix(userId),
        (old) => {
          const list = Array.isArray(old) ? old : [];
          const replaced = replaceId(list, tempId, realId);
          return upsertById(replaced, finalItem, { prepend: true });
        }
      );
      setQueriesDataSafe<EditableCollection[]>(
        queryClient,
        { queryKey: queryKeys.collections.accountable(userId) },
        (old) => {
          const list = Array.isArray(old) ? old : [];
          const replaced = replaceId(list, tempId, realId);
          return upsertById(replaced, finalItem, { prepend: true });
        }
      );
    },
    onSettled: (_data, _err, _vars, ctx) => {
      if (!userId) return;

      // Se o optimistic ficou "órfão" por algum motivo, limpa.
      if (ctx?.tempId) {
        patchQueriesByPrefix<EditableCollection[]>(
          queryClient,
          queryKeys.collections.editableByUserPrefix(userId),
          (old) => removeById(old ?? [], ctx.tempId)
        );
        setQueriesDataSafe<EditableCollection[]>(
          queryClient,
          { queryKey: queryKeys.collections.accountable(userId) },
          (old) => removeById(old ?? [], ctx.tempId)
        );
      }

      // Invalidação mínima: apenas scopes de collections do usuário.
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.editableByUserPrefix(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.accountable(userId),
      });
    },
  });

  const onCreateCollection = useCallback(async () => {
    if (!userId) return;

    const title = createCollectionTitle.trim().slice(0, 40);
    if (!title) {
      setCreateCollectionError("Informe um nome (até 40 caracteres).");
      return;
    }

    // Owner baseado APENAS no filtro local do sheet.
    const ownerTerreiroId = collectionsFilter.startsWith("terreiro:")
      ? collectionsFilter.slice("terreiro:".length)
      : null;
    const ownerUserId = ownerTerreiroId ? null : userId;

    setIsCreatingCollection(true);
    setCreateCollectionError(null);

    try {
      await createCollectionMutation.mutateAsync({
        title,
        ownerUserId,
        ownerTerreiroId,
      });

      setIsCreateCollectionModalOpen(false);
      setCreateCollectionTitle("");
    } catch {
      // Erro já tratado via onError.
    } finally {
      setIsCreatingCollection(false);
    }
  }, [
    collectionsFilter,
    createCollectionTitle,
    createCollectionMutation,
    userId,
  ]);

  const shouldShowSearchStates = queryHasText;
  const shouldShowSearchResults = queryHasText && canSearch;
  const listData: PontoListItem[] = shouldShowSearchResults
    ? searchedPontos
    : (pontos as PontoListItem[]);

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <Text>Carregando pontos…</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={{ color: colors.brass600 }}>{loadError}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.submitRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enviar ponto"
            onPress={() => {
              if (!user) {
                router.replace("/login");
                return;
              }
              setSubmitModalVisible(true);
            }}
            style={({ pressed }) => [
              styles.submitButton,
              pressed ? styles.submitButtonPressed : null,
            ]}
            hitSlop={10}
          >
            <View style={styles.submitButtonInner}>
              <Ionicons name="add" size={14} color={colors.brass600} />
              <Text style={styles.submitButtonText}>Enviar ponto</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <View
            style={[
              styles.searchInputWrap,
              variant === "light"
                ? styles.searchInputWrapLight
                : styles.searchInputWrapDark,
            ]}
          >
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar por título, letra ou tag"
              placeholderTextColor={textSecondary}
              style={[styles.searchInput, { color: textPrimary }]}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="never"
            />
            {searchQuery.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
                hitSlop={10}
              >
                <Text style={[styles.clearButtonText, { color: textMuted }]}>
                  ×
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {shouldShowSearchResults ? (
          searchError ? (
            <View style={{ paddingHorizontal: spacing.lg }}>
              <Text style={[styles.bodyText, { color: textSecondary }]}>
                {searchError}
              </Text>
            </View>
          ) : isSearching ? (
            <View
              style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}
            >
              <ActivityIndicator />
            </View>
          ) : searchedPontos.length === 0 && lastSearched ? (
            <View style={{ paddingHorizontal: spacing.lg }}>
              <Text style={[styles.bodyText, { color: textSecondary }]}>
                Nenhum ponto encontrado
              </Text>
            </View>
          ) : (
            <FlatList
              key={variant}
              data={listData}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              extraData={variant}
              renderItem={({ item }) => (
                <View style={styles.cardGap}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      const now = Date.now();
                      if (shouldBlockPress()) {
                        if (__DEV__) {
                          console.log("[PressGuard] blocked", {
                            screen: "Home",
                            now,
                          });
                        }
                        return;
                      }
                      if (__DEV__) {
                        console.log("[PressGuard] allowed", {
                          screen: "Home",
                          now,
                        });
                      }
                      if (__DEV__) {
                        console.log("[Navigation] click -> /player", {
                          screen: "Home",
                          now,
                          initialPontoId: item.id,
                        });
                      }
                      router.push({
                        pathname: "/player",
                        params: {
                          source: "all",
                          q: searchQuery,
                          initialPontoId: item.id,
                        },
                      });
                    }}
                  >
                    <SurfaceCard variant={variant} style={styles.cardContainer}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={[
                            styles.cardTitle,
                            { color: textPrimary, flex: 1 },
                          ]}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {item.title}
                        </Text>

                        <View style={styles.cardHeaderActions}>
                          {canEditPontos ? (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="Editar ponto"
                              style={styles.addToCollectionBtn}
                              hitSlop={10}
                              onPress={(e) => {
                                e.stopPropagation();
                                setEditingPonto(item);
                                setEditModalVisible(true);
                              }}
                            >
                              <Ionicons
                                name="pencil"
                                size={18}
                                color={
                                  variant === "light"
                                    ? colors.brass500
                                    : colors.brass600
                                }
                              />
                            </Pressable>
                          ) : null}

                          {user ? (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="Adicionar à coleção"
                              style={styles.addToCollectionBtn}
                              hitSlop={10}
                              onPress={(e) => {
                                // Evita abrir o player quando a intenção é adicionar
                                // à coleção.
                                e.stopPropagation();

                                openAddToCollectionSheet(item);
                              }}
                            >
                              <Ionicons
                                name="add"
                                size={18}
                                color={
                                  variant === "light"
                                    ? colors.brass500
                                    : colors.brass600
                                }
                              />
                            </Pressable>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.tagsRow}>
                        {item.tags.map((tag) => (
                          <TagChip key={tag} label={tag} variant={variant} />
                        ))}
                      </View>
                      <Text
                        style={[styles.cardPreview, { color: textSecondary }]}
                        numberOfLines={6}
                        ellipsizeMode="tail"
                      >
                        {item.lyrics_preview_6 ??
                          getLyricsPreview(item.lyrics, 6)}
                      </Text>
                    </SurfaceCard>
                  </Pressable>
                </View>
              )}
            />
          )
        ) : loadError ? (
          <View style={styles.errorBlock}>
            <Text style={[styles.bodyText, { color: textSecondary }]}>
              {loadError}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setLoadError(null);
                setIsLoading(true);
                fetchAllPontos()
                  .then(setPontos)
                  .catch((e) => {
                    if (__DEV__) {
                      console.info("[Pontos] erro ao carregar", {
                        error: e instanceof Error ? e.message : String(e),
                      });
                    }
                    setLoadError(
                      __DEV__ && e instanceof Error && e.message
                        ? e.message
                        : "Erro ao carregar pontos."
                    );
                  })
                  .finally(() => setIsLoading(false));
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
        ) : listData.length === 0 ? (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <Text style={[styles.bodyText, { color: textSecondary }]}>
              Nenhum ponto encontrado.
            </Text>
          </View>
        ) : (
          <FlatList
            key={variant}
            data={listData}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            extraData={variant}
            renderItem={({ item }) => (
              <View style={styles.cardGap}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    const now = Date.now();
                    if (shouldBlockPress()) {
                      if (__DEV__) {
                        console.log("[PressGuard] blocked", {
                          screen: "Home",
                          now,
                        });
                      }
                      return;
                    }
                    if (__DEV__) {
                      console.log("[PressGuard] allowed", {
                        screen: "Home",
                        now,
                      });
                    }
                    if (__DEV__) {
                      console.log("[Navigation] click -> /player", {
                        screen: "Home",
                        now,
                        initialPontoId: item.id,
                      });
                    }
                    router.push({
                      pathname: "/player",
                      params: {
                        source: "all",
                        q: searchQuery,
                        initialPontoId: item.id,
                      },
                    });
                  }}
                >
                  <SurfaceCard variant={variant} style={styles.cardContainer}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={[
                          styles.cardTitle,
                          { color: textPrimary, flex: 1 },
                        ]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {item.title}
                      </Text>

                      <View style={styles.cardHeaderActions}>
                        {canEditPontos ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Editar ponto"
                            style={styles.addToCollectionBtn}
                            hitSlop={10}
                            onPress={(e) => {
                              e.stopPropagation();
                              setEditingPonto(item);
                              setEditModalVisible(true);
                            }}
                          >
                            <Ionicons
                              name="pencil"
                              size={18}
                              color={
                                variant === "light"
                                  ? colors.brass500
                                  : colors.brass600
                              }
                            />
                          </Pressable>
                        ) : null}

                        {user ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Adicionar à coleção"
                            style={styles.addToCollectionBtn}
                            hitSlop={10}
                            onPress={(e) => {
                              // Evita abrir o player quando a intenção é adicionar
                              // à coleção.
                              e.stopPropagation();

                              openAddToCollectionSheet(item);
                            }}
                          >
                            <Ionicons
                              name="add"
                              size={18}
                              color={
                                variant === "light"
                                  ? colors.brass500
                                  : colors.brass600
                              }
                            />
                          </Pressable>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.tagsRow}>
                      {item.tags.map((tag) => (
                        <TagChip key={tag} label={tag} variant={variant} />
                      ))}
                    </View>
                    <Text
                      style={[styles.cardPreview, { color: textSecondary }]}
                      numberOfLines={6}
                      ellipsizeMode="tail"
                    >
                      {getLyricsPreview(item.lyrics, 6)}
                    </Text>
                  </SurfaceCard>
                </Pressable>
              </View>
            )}
          />
        )}
      </View>

      {/* Modal de adicionar à coleção */}
      <BottomSheet
        visible={addModalVisible}
        onClose={closeAddToCollectionSheet}
        variant={variant}
        snapPoints={["75%"]}
      >
        <View style={{ paddingBottom: 16 }}>
          <View style={styles.sheetHeaderRow}>
            <Text style={[styles.sheetTitle, { color: textPrimary }]}>
              Adicionar à coleção
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={closeAddToCollectionSheet}
              hitSlop={10}
              style={styles.sheetCloseBtn}
            >
              <Text style={[styles.sheetCloseText, { color: textPrimary }]}>
                ×
              </Text>
            </Pressable>
          </View>

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
          ) : (
            <>
              <View style={styles.sheetActionsRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Filtrar coleções"
                  onPress={() => setIsCollectionsFilterModalOpen(true)}
                  disabled={
                    editableCollectionsQuery.isFetching &&
                    editableCollections.length === 0
                  }
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.filterBtn,
                    pressed ? styles.filterBtnPressed : null,
                    editableCollectionsQuery.isFetching &&
                    editableCollections.length === 0
                      ? styles.btnDisabled
                      : null,
                  ]}
                >
                  <Ionicons
                    name="funnel-outline"
                    size={16}
                    color={textSecondary}
                  />
                  <Text
                    style={[
                      styles.filterBtnText,
                      { color: textPrimary, flexShrink: 1, minWidth: 0 },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {collectionsFilterLabel}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={textSecondary}
                  />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={openCreateCollection}
                  disabled={
                    isCreatingCollection ||
                    (editableCollectionsQuery.isFetching &&
                      editableCollections.length === 0)
                  }
                  style={({ pressed }) => [
                    styles.newCollectionCta,
                    pressed ? styles.newCollectionCtaPressed : null,
                    isCreatingCollection ? styles.btnDisabled : null,
                  ]}
                >
                  <Text style={styles.newCollectionCtaText}>
                    + Nova coleção
                  </Text>
                </Pressable>
              </View>

              {editableCollectionsQuery.isFetching &&
              editableCollections.length === 0 ? (
                <View style={styles.emptyBlock}>
                  <Text style={[styles.emptyTitle, { color: textPrimary }]}>
                    Carregando coleções…
                  </Text>
                </View>
              ) : editableCollections.length === 0 ? (
                <View style={styles.emptyBlock}>
                  <Text style={[styles.emptyTitle, { color: textPrimary }]}>
                    Você ainda não tem permissão…
                  </Text>
                  <Text style={[styles.emptyText, { color: textSecondary }]}>
                    Você ainda não tem permissão para adicionar pontos em
                    coleções. Peça acesso a uma coleção ou a um terreiro.
                  </Text>
                </View>
              ) : visibleEditableCollections.length === 0 ? (
                <View style={styles.emptyBlock}>
                  <Text style={[styles.emptyTitle, { color: textPrimary }]}>
                    Nenhuma coleção nesse filtro.
                  </Text>
                </View>
              ) : (
                <>
                  {isAdding ? (
                    <Text style={[styles.bodyText, { color: textSecondary }]}>
                      Adicionando…
                    </Text>
                  ) : addSuccess ? (
                    <Text
                      style={[styles.bodyText, { color: colors.forest500 }]}
                    >
                      Ponto adicionado à coleção
                    </Text>
                  ) : addError ? (
                    <Text style={[styles.bodyText, { color: colors.brass600 }]}>
                      {addError}
                    </Text>
                  ) : (
                    <Text style={[styles.bodyText, { color: textSecondary }]}>
                      Selecione uma coleção para adicionar o ponto.
                    </Text>
                  )}

                  <View style={styles.sheetList}>
                    {visibleEditableCollections.map((c) => {
                      const title = (c.title ?? "").trim() || "Coleção";
                      // SEMPRE mostra o label do terreiro quando aplicável
                      const ownerLabel = getCollectionOwnerLabel(c);

                      return (
                        <Pressable
                          key={c.id}
                          accessibilityRole="button"
                          disabled={isAdding || isCreatingCollection}
                          onPress={async () => {
                            if (!userId || !selectedPonto) return;

                            setIsAdding(true);
                            setAddError(null);
                            setAddSuccess(false);

                            try {
                              await addToCollectionMutation.mutateAsync({
                                collectionId: c.id,
                                pontoId: selectedPonto.id,
                                addedBy: userId,
                                pontoSnapshot: selectedPonto,
                              });
                            } catch (e) {
                              setIsAdding(false);
                              if (__DEV__) {
                                console.info(
                                  "[AddToCollection] unexpected error",
                                  e
                                );
                              }
                              return;
                            }

                            setIsAdding(false);

                            setAddSuccess(true);
                            showToast("Ponto adicionado à coleção");
                            setAddModalVisible(false);
                          }}
                          style={({ pressed }) => [
                            styles.collectionRow,
                            {
                              borderColor:
                                variant === "light"
                                  ? colors.surfaceCardBorderLight
                                  : colors.surfaceCardBorder,
                            },
                            pressed && styles.collectionRowPressed,
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

                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color={textSecondary}
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}
            </>
          )}
        </View>
      </BottomSheet>

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

      <BottomSheet
        visible={isCreateCollectionModalOpen}
        onClose={() => {
          setIsCreateCollectionModalOpen(false);
          setCreateCollectionError(null);
        }}
        variant={variant}
      >
        <View style={{ paddingBottom: 16 }}>
          <View style={styles.sheetHeaderRow}>
            <Text style={[styles.sheetTitle, { color: textPrimary }]}>
              Nova coleção
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setIsCreateCollectionModalOpen(false);
                setCreateCollectionError(null);
              }}
              hitSlop={10}
              style={styles.sheetCloseBtn}
            >
              <Text style={[styles.sheetCloseText, { color: textPrimary }]}>
                ×
              </Text>
            </Pressable>
          </View>

          <TextInput
            ref={createCollectionTitleInputRef}
            value={createCollectionTitle}
            onChangeText={(v) => {
              setCreateCollectionTitle(v.slice(0, 40));
              setCreateCollectionError(null);
            }}
            placeholder="Nome da coleção"
            placeholderTextColor={textSecondary}
            style={[
              styles.createModalInput,
              {
                color: textPrimary,
                borderColor:
                  variant === "light"
                    ? colors.inputBorderLight
                    : colors.inputBorderDark,
                backgroundColor:
                  variant === "light"
                    ? colors.inputBgLight
                    : colors.inputBgDark,
              },
            ]}
            autoCapitalize="sentences"
            autoCorrect={false}
          />

          {createCollectionError ? (
            <Text style={[styles.bodyText, { color: colors.brass600 }]}>
              {createCollectionError}
            </Text>
          ) : null}

          <View style={styles.createModalActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setIsCreateCollectionModalOpen(false);
                setCreateCollectionError(null);
              }}
              disabled={isCreatingCollection}
              style={({ pressed }) => [
                styles.secondaryActionBtn,
                {
                  borderColor:
                    variant === "light"
                      ? colors.inputBorderLight
                      : colors.inputBorderDark,
                  backgroundColor:
                    variant === "light"
                      ? colors.inputBgLight
                      : colors.inputBgDark,
                },
                pressed ? styles.dropdownPressed : null,
                isCreatingCollection ? styles.btnDisabled : null,
              ]}
            >
              <Text
                style={[styles.secondaryActionText, { color: textPrimary }]}
              >
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={onCreateCollection}
              disabled={isCreatingCollection}
              style={({ pressed }) => [
                styles.primaryActionBtn,
                pressed ? styles.dropdownPressed : null,
                isCreatingCollection ? styles.btnDisabled : null,
              ]}
            >
              <Text style={styles.primaryActionText}>Criar</Text>
            </Pressable>
          </View>

          <Image
            source={require("@/assets/images/filler.png")}
            style={styles.filler}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>
      </BottomSheet>

      <SubmitPontoModal
        visible={submitModalVisible}
        variant={variant}
        onClose={() => setSubmitModalVisible(false)}
        onSubmitted={() => {
          Alert.alert(
            "Enviado para curadoria",
            "Seu ponto foi enviado e será validado pelos curadores do Saravafy. Quando aprovado, ele entrará para a biblioteca do app."
          );
        }}
      />

      <PontoUpsertModal
        visible={editModalVisible}
        variant={variant}
        mode="edit"
        initialValues={editingInitialValues}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingPonto(null);
        }}
        onSuccess={(updated) => {
          if (!updated) return;
          setPontos((prev) =>
            prev.map((p) =>
              p.id === updated.id
                ? {
                    ...p,
                    title: updated.title,
                    artist: updated.artist ?? null,
                    lyrics: updated.lyrics,
                    tags: updated.tags,
                  }
                : p
            )
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    // Não definir backgroundColor aqui para deixar o layout controlar o fundo
  },
  container: {
    flex: 1,
    padding: 0,
  },
  submitRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xs,
  },
  submitButton: {
    alignSelf: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 4,
    backgroundColor: "transparent",
  },
  submitButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  submitButtonPressed: {
    opacity: 0.9,
  },
  submitButtonText: {
    color: colors.brass600,
    fontSize: 13,
    fontWeight: "900",
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 22,
  },
  errorBlock: {
    marginVertical: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  searchInputWrap: {
    position: "relative",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 36,
    height: 44,
    justifyContent: "center",
  },
  searchInputWrapDark: {
    backgroundColor: colors.inputBgDark,
    borderColor: colors.inputBorderDark,
  },
  searchInputWrapLight: {
    backgroundColor: colors.inputBgLight,
    borderColor: colors.inputBorderLight,
  },
  searchInput: {
    fontSize: 14,
  },
  clearButton: {
    position: "absolute",
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    width: 24,
  },
  clearButtonText: {
    fontSize: 22,
    lineHeight: 22,
    fontWeight: "600",
  },
  searchWrap: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  retryBtn: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
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
  cardGap: {
    marginBottom: spacing.md,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // ...existing code...
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  separator: {
    height: spacing.md,
  },
  cardContainer: {
    borderRadius: 18,
    // SurfaceCard já aplica sombra e background via theme
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.textPrimaryOnLight,
    marginBottom: spacing.sm,
    letterSpacing: 0.2,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardPreview: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondaryOnLight,
    marginTop: spacing.sm,
    marginBottom: 0,
  },
  addToCollectionBtn: {
    borderRadius: 8,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: colors.brass600,
  },

  cardHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },

  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCloseText: {
    fontSize: 22,
    lineHeight: 22,
    fontWeight: "600",
  },
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  createInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "700",
  },
  createBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.brass600,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnPressed: {
    opacity: 0.85,
  },
  createBtnText: {
    color: colors.brass600,
    fontSize: 13,
    fontWeight: "900",
  },
  dropdown: {
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: "900",
  },
  dropdownPressed: {
    opacity: 0.9,
  },
  sheetActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  filterBtn: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 6,
    paddingRight: spacing.sm,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  filterBtnPressed: {
    opacity: 0.85,
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: "900",
  },
  newCollectionCta: {
    alignSelf: "flex-end",
    paddingVertical: 6,
    marginBottom: spacing.sm,
    flexShrink: 0,
  },
  newCollectionCtaPressed: {
    opacity: 0.85,
  },
  newCollectionCtaText: {
    color: colors.brass600,
    fontSize: 14,
    fontWeight: "900",
  },
  emptyBlock: {
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900",
  },
  emptyText: {
    fontSize: 16,
    lineHeight: 22,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  createModalInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  createModalActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  filler: {
    width: "100%",
    height: 290,
    marginTop: spacing.lg,
  },
  secondaryActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: "900",
  },
  primaryActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.brass600,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.paper50,
  },
  sheetList: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  collectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "transparent",
  },
  collectionRowPressed: {
    opacity: 0.85,
  },
  collectionTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  collectionOwner: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
  },
});
