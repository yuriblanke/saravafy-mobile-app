import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { EntidadePlaceholderSheet } from "@/src/components/collections/EntidadePlaceholderSheet";
import { PontoEntidadeOrixaChips } from "@/src/components/pontos/PontoEntidadeOrixaChips";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { useGlobalSafeAreaInsets } from "@/src/contexts/GlobalSafeAreaInsetsContext";
import { useLoginPrompt } from "@/src/contexts/LoginPromptContext";
import { usePontosSearch } from "@/src/hooks/usePontosSearch";
import { useCollectionPontosQuery } from "@/src/queries/collectionPontos";
import {
  incrementCollectionPontosCountInTerreiroLists,
  removePontoFromCollectionPontosList,
  upsertPontoInCollectionPontosList,
} from "@/src/queries/collectionsCache";
import { queryKeys } from "@/src/queries/queryKeys";
import { colors, getSaravafyBaseColor, spacing } from "@/src/theme";
import { normalizeTag } from "@/src/utils/mergeTags";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { parseEntidadeChipFieldsFromPontoRow } from "@/src/domain/entidade";
import {
  applyEntidadePlaceholder,
  lyricsHasEntidadePlaceholder,
} from "@/src/domain/entidadePlaceholder";
import { useEntidadesCatalogQuery } from "@/src/queries/entidadesCatalog";
import { PONTOS_ENTIDADE_ORIXA_EMBED } from "@/src/queries/pontoEntidadeSelect";
import {
  fetchActivePontoVersoesByPontoIds,
  type PontoVersaoPlayerRow,
} from "@/src/queries/pontoVersoes";
import {
  addPontoToCollection,
  type CollectionPontoEntidadeInput,
} from "@/src/screens/Home/data/collections_pontos";
import type { PlayerPonto } from "@/src/screens/Player/hooks/useCollectionPlayerData";

import {
  coerceStringArray,
  getErrorMessage,
  getLyricsPreview,
  resolveDefaultPontoVersaoId,
  toListPonto,
  toPlayerPonto,
  versaoCardTitle,
  type ListPonto,
} from "./addToCollectionModel";

function extractSuggestionTagsFromTitle(title: string): string[] {
  const raw = String(title ?? "").trim();
  if (!raw) return [];

  const stop = new Set([
    "de",
    "da",
    "do",
    "das",
    "dos",
    "e",
    "em",
    "na",
    "no",
    "para",
    "pra",
    "com",
  ]);

  // Preferência: se a pessoa escreveu algo tipo "Ogum, Exu" ou "#Ogum #Exu".
  const explicit = raw
    .split(/[#,|]/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => normalizeTag(t).length >= 3)
    .filter((t) => !stop.has(normalizeTag(t)));

  const seen = new Set<string>();
  const out: string[] = [];

  for (const t of explicit) {
    const key = normalizeTag(t);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= 5) return out;
  }

  // Fallback: extrai palavras do nome ("Coleção de Ogum" -> ["Ogum"]).
  const words = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-zA-Z0-9]+/g)
    .map((t) => t.trim())
    .filter(Boolean);

  for (const w of words) {
    const key = normalizeTag(w);
    if (key.length < 3) continue;
    if (stop.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
    if (out.length >= 5) break;
  }

  return out;
}

export default function AddToCollection() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { effectiveTheme } = usePreferences();
  const variant: "light" | "dark" = effectiveTheme;

  const { user } = useAuth();
  const { openLoginSheet } = useLoginPrompt();
  const userId = user?.id ?? null;
  const insets = useGlobalSafeAreaInsets();

  const collectionIdParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const collectionId = String(collectionIdParam ?? "").trim();

  const goBackToCollection = useCallback(() => {
    router.back();
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;

      const onHardwareBackPress = () => {
        goBackToCollection();
        return true;
      };

      const sub = BackHandler.addEventListener(
        "hardwareBackPress",
        onHardwareBackPress,
      );

      return () => sub.remove();
    }, [goBackToCollection]),
  );

  const baseBgColor = getSaravafyBaseColor(variant);
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

  const [searchQuery, setSearchQuery] = useState("");
  const queryHasText = useMemo(
    () => Boolean(searchQuery.trim()),
    [searchQuery],
  );

  const collectionQuery = useQuery({
    queryKey: collectionId ? queryKeys.collections.byId(collectionId) : [],
    enabled: !!collectionId,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {
      if (!collectionId) throw new Error("Coleção inválida.");

      const res = await supabase
        .from("collections")
        .select("id, title")
        .eq("id", collectionId)
        .single();

      if (res.error) {
        throw new Error(
          typeof res.error.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Erro ao carregar a coleção.",
        );
      }

      return {
        id: String((res.data as any)?.id ?? ""),
        title:
          typeof (res.data as any)?.title === "string"
            ? (res.data as any).title
            : null,
      } as { id: string; title: string | null };
    },
    placeholderData: (prev) => prev,
  });

  const collectionTitle =
    (typeof collectionQuery.data?.title === "string" &&
      collectionQuery.data.title.trim()) ||
    "Coleção";

  const suggestionTags = useMemo(() => {
    return extractSuggestionTagsFromTitle(collectionTitle);
  }, [collectionTitle]);

  const collectionPontosQuery = useCollectionPontosQuery(collectionId, {
    enabled: !!collectionId,
  });

  const alreadyInCollectionIds = useMemo(() => {
    const items = collectionPontosQuery.data ?? [];
    return new Set(
      items.map((it) => String(it?.ponto?.id ?? "")).filter(Boolean),
    );
  }, [collectionPontosQuery.data]);

  // Reusa a mesma queryKey do player (e mantém o mesmo shape) para evitar
  // duplicar fetch e evitar sobrescrever o cache com um shape incompatível.
  const allPontosQuery = useQuery({
    queryKey: ["pontos", "all", "public"] as const,
    enabled: true,
    staleTime: 3 * 60 * 1000,
    gcTime: 45 * 60 * 1000,
    queryFn: async () => {
      const res = await supabase
        .from("pontos")
        .select(
          `id, title, tags, author_name, is_public_domain, ${PONTOS_ENTIDADE_ORIXA_EMBED}, ponto_versoes!inner(lyrics, lyrics_preview_6)`,
        )
        .eq("is_active", true)
        .eq("restricted", false)
        .eq("ponto_versoes.is_canonical", true)
        .order("title", { ascending: true });

      if (res.error) {
        const anyErr = res.error as any;
        const message =
          typeof anyErr?.message === "string" && anyErr.message.trim()
            ? anyErr.message
            : "Erro ao carregar pontos.";
        throw new Error(message);
      }

      const rows = (res.data ?? []) as any[];
      const draft: (PlayerPonto | null)[] = rows.map((row) => {
        const id = String(row?.id ?? "").trim();
        if (!id) return null;

        const title =
          (typeof row?.title === "string" && row.title.trim()) || "Ponto";

        const versoesJoin = Array.isArray(row?.ponto_versoes)
          ? row.ponto_versoes
          : row?.ponto_versoes
            ? [row.ponto_versoes]
            : [];
        const versao = versoesJoin[0];
        const lyrics =
          typeof versao?.lyrics === "string" ? versao.lyrics : "";

        const chip = parseEntidadeChipFieldsFromPontoRow(row);

        return {
          id,
          title,
          artist: null,
          author_name:
            typeof row?.author_name === "string" ? row.author_name : null,
          is_public_domain:
            typeof row?.is_public_domain === "boolean"
              ? row.is_public_domain
              : null,
          duration_seconds: null,
          cover_url: null,
          lyrics,
          lyrics_preview_6:
            typeof versao?.lyrics_preview_6 === "string"
              ? versao.lyrics_preview_6
              : null,
          tags: coerceStringArray(row?.tags),
          entidade_id: chip.entidade_id,
          entidadeNome: chip.entidadeNome,
          orixaNome: chip.orixaNome,
          versoes: [],
        } satisfies PlayerPonto;
      });

      const ids = draft
        .filter(Boolean)
        .map((p) => p!.id)
        .filter(Boolean);
      const versoesMap = await fetchActivePontoVersoesByPontoIds(ids);

      const mapped: PlayerPonto[] = draft
        .filter(Boolean)
        .map((p) => {
          const versoes = versoesMap.get(p!.id) ?? [];
          const canonical =
            versoes.find((v) => v.is_canonical) ?? versoes[0] ?? null;
          const lyrics = canonical?.lyrics ?? p!.lyrics;
          const lyrics_preview_6 =
            typeof canonical?.lyrics_preview_6 === "string"
              ? canonical.lyrics_preview_6
              : p!.lyrics_preview_6;

          return {
            ...p!,
            lyrics,
            lyrics_preview_6,
            versoes,
          };
        });

      return mapped;
    },
    placeholderData: (prev) => prev,
  });

  const suggestions = useMemo(() => {
    const all = allPontosQuery.data ?? [];
    if (all.length === 0) return [] as ListPonto[];

    const tagNorms = suggestionTags.map((t) => normalizeTag(t)).filter(Boolean);

    if (tagNorms.length === 0) {
      return all.slice(0, 20).map(toListPonto);
    }

    const scored = all
      .map((p) => {
        const blob = [p.entidadeNome, p.orixaNome]
          .filter(Boolean)
          .join(" ");
        const pNorm = normalizeTag(blob);
        let score = 0;
        for (const wanted of tagNorms) {
          if (!wanted) continue;
          if (pNorm.includes(wanted) || wanted.includes(pNorm)) {
            score += 1;
          }
        }
        return { p, score };
      })
      .filter((it) => it.score > 0);

    scored.sort((a, b) => {
      const byScore = b.score - a.score;
      if (byScore !== 0) return byScore;
      return a.p.title.localeCompare(b.p.title);
    });

    return scored.slice(0, 20).map((it) => toListPonto(it.p));
  }, [allPontosQuery.data, suggestionTags]);

  const {
    canSearch,
    isLoading: isSearching,
    results: searchResults,
    error: searchError,
    lastSearched,
  } = usePontosSearch(searchQuery, { enabled: true, limit: 20, offset: 0 });

  const searchedPontos = useMemo(() => {
    const base = Array.isArray(searchResults) ? searchResults : [];
    return base
      .map((r) => {
        const id = String(r?.id ?? "").trim();
        if (!id) return null;

        return {
          id,
          title: String(r?.title ?? "Ponto"),
          tags: Array.isArray(r?.tags)
            ? r.tags.filter((t) => typeof t === "string")
            : [],
          lyrics: String(r?.lyrics ?? ""),
          lyrics_preview_6: r?.lyrics_preview_6 ?? null,
          entidadeNome:
            typeof r?.entidadeNome === "string" ? r.entidadeNome : null,
          orixaNome: typeof r?.orixaNome === "string" ? r.orixaNome : null,
          versoes: [] as PontoVersaoPlayerRow[],
        } satisfies ListPonto;
      })
      .filter(Boolean) as ListPonto[];
  }, [searchResults]);

  const shouldShowSearchResults = queryHasText && canSearch;

  const searchPontoIdsForFetch = useMemo(
    () => Array.from(new Set(searchedPontos.map((p) => p.id).filter(Boolean))),
    [searchedPontos],
  );

  const searchVersoesQuery = useQuery({
    queryKey: [
      "pontos",
      "versoesBatch",
      "addToCollectionSearch",
      searchPontoIdsForFetch.join("|"),
    ] as const,
    queryFn: () => fetchActivePontoVersoesByPontoIds(searchPontoIdsForFetch),
    enabled: shouldShowSearchResults && searchPontoIdsForFetch.length > 0,
    staleTime: 60_000,
  });

  const listData = useMemo(() => {
    if (!shouldShowSearchResults) {
      return suggestions;
    }
    const map = searchVersoesQuery.data;
    if (!map) {
      return searchedPontos.map((p) => ({
        ...p,
        versoes: [] as PontoVersaoPlayerRow[],
      }));
    }
    return searchedPontos.map((p) => ({
      ...p,
      versoes: map.get(p.id) ?? [],
    }));
  }, [
    shouldShowSearchResults,
    suggestions,
    searchedPontos,
    searchVersoesQuery.data,
  ]);

  const searchVersoesStillLoading =
    shouldShowSearchResults &&
    searchPontoIdsForFetch.length > 0 &&
    searchVersoesQuery.isLoading;

  const [addingIds, setAddingIds] = useState<string[]>([]);
  const [versionSheetCtx, setVersionSheetCtx] = useState<{
    ponto: ListPonto;
    /** Versão selecionada no carrossel ao abrir o sheet (realce). */
    highlightVersaoId: string | null;
  } | null>(null);
  const [entidadePickerCtx, setEntidadePickerCtx] = useState<{
    ponto: ListPonto;
    pontoVersaoId: string;
  } | null>(null);

  const entidadesCatalogQuery = useEntidadesCatalogQuery({
    enabled: !!entidadePickerCtx,
  });

  const addMutation = useMutation({
    mutationFn: async (vars: {
      ponto: ListPonto;
      pontoVersaoId?: string | null;
      entidade?: CollectionPontoEntidadeInput | null;
      /** Label já resolvido para otimista / substituição de `[entidade]`. */
      entidadeResolvedLabel?: string | null;
    }) => {
      if (!userId) {
        throw new Error("Entre para adicionar pontos.");
      }
      if (!collectionId) {
        throw new Error("Coleção inválida.");
      }

      const explicit =
        typeof vars.pontoVersaoId === "string" && vars.pontoVersaoId.trim()
          ? vars.pontoVersaoId.trim()
          : null;
      const vid = explicit ?? resolveDefaultPontoVersaoId(vars.ponto.versoes);

      const res = await addPontoToCollection({
        collectionId,
        pontoId: vars.ponto.id,
        addedBy: userId,
        pontoVersaoId: vid,
        entidade: vars.entidade ?? null,
      });

      if (!res.ok) {
        throw new Error(res.error || "Erro ao adicionar ponto à coleção.");
      }

      return res;
    },
    onMutate: async (vars) => {
      const pontoId = vars.ponto.id;

      setAddingIds((prev) =>
        prev.includes(pontoId) ? prev : [...prev, pontoId],
      );

      const explicit =
        typeof vars.pontoVersaoId === "string" && vars.pontoVersaoId.trim()
          ? vars.pontoVersaoId.trim()
          : null;
      const vid = explicit ?? resolveDefaultPontoVersaoId(vars.ponto.versoes);
      const v = vid
        ? vars.ponto.versoes.find((x) => x.id === vid) ?? null
        : null;
      const base = toPlayerPonto(vars.ponto);
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
      const playerPonto = {
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
        collectionId,
        ponto: playerPonto,
      });

      if (didInsert) {
        incrementCollectionPontosCountInTerreiroLists(queryClient, {
          collectionId,
          delta: 1,
        });
      }

      return { pontoId, didInsert };
    },
    onError: (e, vars, ctx) => {
      if (__DEV__) {
        console.info("[AddToCollection] erro", {
          message: getErrorMessage(e),
          raw: e,
        });
      }

      if (ctx?.didInsert && ctx.pontoId) {
        removePontoFromCollectionPontosList(queryClient, {
          collectionId,
          pontoId: ctx.pontoId,
        });
        incrementCollectionPontosCountInTerreiroLists(queryClient, {
          collectionId,
          delta: -1,
        });
      }

      showToast(getErrorMessage(e));
    },
    onSuccess: (res) => {
      showToast(
        res.alreadyExists
          ? "Este ponto já estava na coleção"
          : "Ponto adicionado à coleção",
      );
    },
    onSettled: (_data, _err, vars) => {
      const pontoId = vars?.ponto?.id;
      if (pontoId) {
        setAddingIds((prev) => prev.filter((id) => id !== pontoId));
      }

      if (collectionId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.collections.pontos(collectionId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.collections.byId(collectionId),
        });
      }
    },
  });

  const onPressAdd = useCallback(
    async (ponto: ListPonto) => {
      if (!collectionId) {
        showToast("Coleção inválida.");
        goBackToCollection();
        return;
      }

      if (!userId) {
        openLoginSheet({
          reason: "Para adicionar pontos a uma coleção, entre com sua conta.",
        });
        return;
      }

      if (alreadyInCollectionIds.has(ponto.id)) {
        showToast("Este ponto já está na coleção.");
        return;
      }

      if (searchVersoesStillLoading) {
        showToast("Carregando versões…");
        return;
      }

      if (ponto.versoes.length > 1) {
        setVersionSheetCtx({
          ponto,
          highlightVersaoId: resolveDefaultPontoVersaoId(ponto.versoes),
        });
        return;
      }

      const defaultId = resolveDefaultPontoVersaoId(ponto.versoes);
      const versaoSingle =
        defaultId != null
          ? ponto.versoes.find((x) => x.id === defaultId) ?? null
          : null;
      if (
        versaoSingle &&
        lyricsHasEntidadePlaceholder(versaoSingle.lyrics)
      ) {
        setEntidadePickerCtx({
          ponto,
          pontoVersaoId: defaultId!,
        });
        return;
      }

      try {
        await addMutation.mutateAsync({
          ponto,
          pontoVersaoId: defaultId,
        });
      } catch {
        // erro já tratado no onError
      }
    },
    [
      addMutation,
      alreadyInCollectionIds,
      collectionId,
      goBackToCollection,
      router,
      searchVersoesStillLoading,
      showToast,
      userId,
    ],
  );

  const closeVersionPicker = useCallback(() => {
    setVersionSheetCtx(null);
  }, []);

  const onPickVersaoFromSheet = useCallback(
    async (versaoId: string, ponto: ListPonto) => {
      setVersionSheetCtx(null);
      const v = ponto.versoes.find((x) => x.id === versaoId);
      if (v && lyricsHasEntidadePlaceholder(v.lyrics)) {
        setEntidadePickerCtx({
          ponto,
          pontoVersaoId: versaoId,
        });
        return;
      }
      try {
        await addMutation.mutateAsync({
          ponto,
          pontoVersaoId: versaoId,
        });
      } catch {
        // erro já tratado no onError
      }
    },
    [addMutation],
  );

  const onConfirmEntidadePlaceholder = useCallback(
    (choice: CollectionPontoEntidadeInput) => {
      const ctx = entidadePickerCtx;
      if (!ctx) return;
      setEntidadePickerCtx(null);
      const label =
        choice.kind === "custom"
          ? choice.texto.trim()
          : entidadesCatalogQuery.data?.find((o) => o.id === choice.entidadeId)
              ?.label ?? "";
      void addMutation.mutateAsync({
        ponto: ctx.ponto,
        pontoVersaoId: ctx.pontoVersaoId,
        entidade: choice,
        entidadeResolvedLabel: label,
      });
    },
    [addMutation, entidadePickerCtx, entidadesCatalogQuery.data],
  );

  const Header = (
    <View
      style={[
        styles.header,
        { borderColor, paddingTop: spacing.md + insets.top },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        onPress={goBackToCollection}
        hitSlop={10}
        style={({ pressed }) => [
          styles.headerIconBtn,
          pressed ? { opacity: 0.65 } : null,
        ]}
      >
        <Ionicons name="chevron-back" size={22} color={textPrimary} />
      </Pressable>

      <View style={styles.headerTitleWrap}>
        <Text
          style={[styles.headerTitle, { color: textPrimary }]}
          numberOfLines={1}
        >
          Adicionar a esta coleção
        </Text>
        <Text
          style={[styles.headerSubtitle, { color: textSecondary }]}
          numberOfLines={1}
        >
          {collectionTitle}
        </Text>
      </View>
    </View>
  );

  const SearchBar = (
    <View style={styles.searchWrap}>
      <View
        style={[
          styles.searchInputWrap,
          {
            backgroundColor:
              variant === "light" ? colors.inputBgLight : colors.inputBgDark,
            borderColor:
              variant === "light"
                ? colors.inputBorderLight
                : colors.inputBorderDark,
          },
        ]}
      >
        <Ionicons
          name="search"
          size={16}
          color={textMuted}
          style={{ marginRight: 10 }}
        />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar por título, letra ou tag"
          placeholderTextColor={textSecondary}
          style={[styles.searchInput, { color: textPrimary, flex: 1 }]}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="never"
          returnKeyType="search"
        />

        {searchQuery.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Limpar busca"
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
  );

  const renderItem = useCallback(
    ({ item }: { item: ListPonto }) => {
      const isAlready = alreadyInCollectionIds.has(item.id);
      const isAddingRow = addingIds.includes(item.id);
      const addBlockedByVersoesLoad = searchVersoesStillLoading;
      const disabled = isAlready || isAddingRow || addBlockedByVersoesLoad;
      const defaultVid = resolveDefaultPontoVersaoId(item.versoes);
      const defaultVersao = defaultVid
        ? item.versoes.find((x) => x.id === defaultVid) ?? null
        : null;
      const previewLyrics =
        defaultVersao != null
          ? defaultVersao.lyrics_preview_6 ??
            getLyricsPreview(defaultVersao.lyrics, 6)
          : item.lyrics_preview_6 ?? getLyricsPreview(item.lyrics, 6);
      const nVersoes = item.versoes.length;
      const versaoHint =
        nVersoes > 1
          ? `${nVersoes} versões — toque em + para escolher`
          : null;

      return (
        <View style={styles.cardGap}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.push({
                pathname: "/player",
                params: {
                  source: "all",
                  q: searchQuery,
                  initialPontoId: item.id,
                  /** Player usa isto para voltar ao fluxo “adicionar à coleção”, não só `router.back()`. */
                  addFlowCollectionId: collectionId,
                },
              });
            }}
          >
            <SurfaceCard variant={variant} style={styles.cardContainer}>
              <View style={styles.cardHeaderRow}>
                <View
                  style={{
                    flex: 1,
                    marginRight: spacing.sm,
                    minWidth: 0,
                  }}
                >
                  <Text
                    style={[styles.cardTitle, { color: textPrimary }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {item.title}
                  </Text>
                  {versaoHint ? (
                    <Text
                      style={[styles.versaoListHint, { color: textSecondary }]}
                      numberOfLines={1}
                    >
                      {versaoHint}
                    </Text>
                  ) : null}
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    disabled
                      ? isAlready
                        ? "Já adicionado"
                        : isAddingRow
                          ? "Adicionando"
                          : addBlockedByVersoesLoad
                            ? "Carregando versões"
                            : "Adicionar"
                      : "Adicionar"
                  }
                  onPress={(e) => {
                    e.stopPropagation();
                    void onPressAdd(item);
                  }}
                  disabled={disabled}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.addBtn,
                    {
                      borderColor,
                      opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  {isAddingRow || addBlockedByVersoesLoad ? (
                    <ActivityIndicator size="small" color={textPrimary} />
                  ) : (
                    <Ionicons
                      name={isAlready ? "checkmark" : "add"}
                      size={18}
                      color={textPrimary}
                    />
                  )}
                </Pressable>
              </View>

              {item.entidadeNome || item.orixaNome ? (
                <View style={styles.tagsRow}>
                  <PontoEntidadeOrixaChips
                    variant={variant}
                    entidadeNome={item.entidadeNome}
                    orixaNome={item.orixaNome}
                  />
                </View>
              ) : null}

              <Text
                style={[styles.cardPreview, { color: textSecondary }]}
                numberOfLines={6}
                ellipsizeMode="tail"
              >
                {previewLyrics}
              </Text>
            </SurfaceCard>
          </Pressable>
        </View>
      );
    },
    [
      addingIds,
      alreadyInCollectionIds,
      borderColor,
      collectionId,
      onPressAdd,
      router,
      searchQuery,
      searchVersoesStillLoading,
      textPrimary,
      textSecondary,
      variant,
    ],
  );

  const ListHeader = useMemo(() => {
    // Sem títulos de seção e sem UI de loading.
    // Mantemos apenas feedback de erro/empty (quando houve uma busca de fato).
    if (!shouldShowSearchResults) return null;

    if (searchError) {
      return (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          <Text style={[styles.bodyText, { color: textSecondary }]}>
            {searchError}
          </Text>
        </View>
      );
    }

    // Importante: `lastSearched` é setado no início da request. Não podemos
    // mostrar empty state enquanto ainda está carregando.
    if (!isSearching && searchedPontos.length === 0 && lastSearched) {
      return (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          <Text style={[styles.bodyText, { color: textSecondary }]}>
            Nenhum ponto foi encontrado
          </Text>
        </View>
      );
    }

    return null;
  }, [
    isSearching,
    lastSearched,
    searchError,
    searchedPontos.length,
    shouldShowSearchResults,
    textSecondary,
  ]);

  if (!collectionId) {
    return (
      <View style={[styles.screen, { backgroundColor: baseBgColor }]}>
        {Header}
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <Text style={[styles.bodyText, { color: textSecondary }]}>
            Coleção inválida.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: baseBgColor }]}>
      {Header}
      {SearchBar}

      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={ListHeader}
        renderItem={renderItem}
      />

      <Modal
        visible={!!versionSheetCtx}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeVersionPicker}
      >
        {versionSheetCtx ? (
          <View
            style={[
              styles.versionPickerRoot,
              {
                backgroundColor: baseBgColor,
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
              },
            ]}
          >
            <View style={styles.versionPickerHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Voltar"
                onPress={closeVersionPicker}
                hitSlop={10}
                style={styles.versionPickerBackBtn}
              >
                <Ionicons name="chevron-back" size={22} color={textPrimary} />
              </Pressable>
              <View style={styles.versionPickerHeaderTitles}>
                <Text
                  style={[styles.sheetTitle, { color: textPrimary }]}
                  numberOfLines={2}
                >
                  Escolher versão para a coleção
                </Text>
                <Text
                  style={[styles.sheetSubtitle, { color: textSecondary }]}
                  numberOfLines={2}
                >
                  {versionSheetCtx.ponto.title}
                </Text>
              </View>
            </View>

            <ScrollView
              style={styles.versionPickerScroll}
              contentContainerStyle={styles.versionPickerScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              {versionSheetCtx.ponto.versoes.map((v) => {
                const sheetPonto = versionSheetCtx.ponto;
                const rowTitle = versaoCardTitle(v, sheetPonto.title);
                const lyricsBody =
                  typeof v.lyrics === "string" && v.lyrics.length > 0
                    ? v.lyrics
                    : "—";
                const highlighted =
                  versionSheetCtx.highlightVersaoId != null &&
                  versionSheetCtx.highlightVersaoId === v.id;
                return (
                  <Pressable
                    key={v.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Adicionar versão: ${rowTitle}`}
                    onPress={() => void onPickVersaoFromSheet(v.id, sheetPonto)}
                    disabled={addingIds.includes(sheetPonto.id)}
                    style={({ pressed }) => [
                      styles.versaoSheetRow,
                      {
                        borderColor: highlighted ? textPrimary : borderColor,
                        borderWidth: highlighted ? 2 : StyleSheet.hairlineWidth,
                        opacity: pressed ? 0.92 : 1,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.versaoSheetRowTitle,
                          { color: textPrimary },
                        ]}
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
                      <Text
                        style={[styles.versaoSheetMeta, { color: textSecondary }]}
                      >
                        Versão {v.versao_num} de {sheetPonto.versoes.length}
                      </Text>
                      <Text
                        style={[
                          styles.versaoSheetLyricsFull,
                          { color: textSecondary },
                        ]}
                      >
                        {lyricsBody}
                      </Text>
                    </View>
                    <Ionicons
                      name="add-circle-outline"
                      size={22}
                      color={textPrimary}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </Modal>

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
        onConfirm={onConfirmEntidadePlaceholder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleWrap: {
    flex: 1,
    paddingLeft: spacing.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 36,
    height: 44,
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
  listContent: {
    paddingBottom: spacing.xl,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardGap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  cardContainer: {
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  versaoListHint: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: spacing.sm,
  },
  cardPreview: {
    paddingTop: spacing.sm,
    fontSize: 13,
    lineHeight: 18,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  sheetSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  versionPickerRoot: {
    flex: 1,
  },
  versionPickerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  versionPickerBackBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.xs,
  },
  versionPickerHeaderTitles: {
    flex: 1,
    minWidth: 0,
  },
  versionPickerScroll: {
    flex: 1,
  },
  versionPickerScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  versaoSheetRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  versaoSheetRowTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  versaoSheetMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
  },
  versaoSheetLyricsFull: {
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 20,
  },
});
