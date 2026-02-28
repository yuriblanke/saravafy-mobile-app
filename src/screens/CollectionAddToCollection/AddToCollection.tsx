import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
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
  BackHandler,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  addPontoToCollection,
  removePontoFromCollection,
} from "@/src/screens/Home/data/collections_pontos";
import type { PlayerPonto } from "@/src/screens/Player/hooks/useCollectionPlayerData";

type ListPonto = {
  id: string;
  title: string;
  tags: string[];
  lyrics: string;
  lyrics_preview_6?: string | null;
};

function joinTags(tags: string[], max = 3): string {
  const list = Array.isArray(tags) ? tags.filter(Boolean) : [];
  if (list.length === 0) return "";
  const slice = list.slice(0, max);
  const out = slice.join(" · ");
  if (list.length > max) return `${out} · …`;
  return out;
}

function getErrorMessage(e: unknown): string {
  if (e instanceof Error && typeof e.message === "string" && e.message.trim()) {
    return e.message;
  }
  if (e && typeof e === "object") {
    const anyErr = e as any;
    if (typeof anyErr?.message === "string" && anyErr.message.trim()) {
      return anyErr.message;
    }
  }
  return String(e);
}

function getLyricsPreview(lyrics: string, maxLines = 6) {
  const repeatMarkerRe = /\(\s*[234]\s*x\s*\)/i;
  const lines = String(lyrics ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !repeatMarkerRe.test(l));

  const previewLines = lines.slice(0, maxLines);
  const preview = previewLines.join("\n");
  if (lines.length > maxLines) return `${preview}\n…`;
  return preview;
}

function coerceStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (v): v is string => typeof v === "string" && v.trim().length > 0,
    );
  }
  if (typeof value === "string") {
    return value
      .split(/[,|]/g)
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

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

function toPlayerPonto(p: ListPonto): PlayerPonto {
  return {
    id: p.id,
    title: p.title,
    artist: null,
    duration_seconds: null,
    cover_url: null,
    lyrics: p.lyrics,
    tags: Array.isArray(p.tags) ? p.tags : [],
  };
}

function toListPonto(p: PlayerPonto): ListPonto {
  return {
    id: p.id,
    title: p.title,
    lyrics: p.lyrics,
    tags: Array.isArray(p.tags) ? p.tags : [],
  };
}

export default function AddToCollection() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { effectiveTheme } = usePreferences();
  const variant: "light" | "dark" = effectiveTheme;

  const { user } = useAuth();
  const userId = user?.id ?? null;

  const collectionIdParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const collectionIdLegacyParam = Array.isArray(params.collectionId)
    ? params.collectionId[0]
    : params.collectionId;
  const collectionId = String(
    collectionIdParam ?? collectionIdLegacyParam ?? "",
  ).trim();

  const goBackToCollection = useCallback(() => {
    if (!collectionId) {
      router.back();
      return;
    }

    // Importante: esta tela está em outro Stack group que a tela de Collection.
    // `router.back()` pode voltar para uma rota sem params; navegamos
    // explicitamente para garantir que o id exista.
    router.replace({
      pathname: "/collection/[id]" as any,
      params: { id: collectionId },
    });
  }, [collectionId, router]);

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

  const selectedColor = textPrimary;

  const initialSearchQuery = typeof params.q === "string" ? params.q : "";
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
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
          "id, title, lyrics, lyrics_preview_6, tags, duration_seconds, cover_url, author_name, is_public_domain",
        )
        .eq("is_active", true)
        .eq("restricted", false)
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
      const mapped: PlayerPonto[] = rows
        .map((row) => {
          const id = String(row?.id ?? "").trim();
          if (!id) return null;

          const title =
            (typeof row?.title === "string" && row.title.trim()) || "Ponto";
          const lyrics = typeof row?.lyrics === "string" ? row.lyrics : "";

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
            duration_seconds:
              typeof row?.duration_seconds === "number"
                ? row.duration_seconds
                : row?.duration_seconds == null
                  ? null
                  : Number(row.duration_seconds),
            cover_url:
              typeof row?.cover_url === "string" ? row.cover_url : null,
            lyrics,
            lyrics_preview_6:
              typeof row?.lyrics_preview_6 === "string"
                ? row.lyrics_preview_6
                : null,
            tags: coerceStringArray(row?.tags),
          } satisfies PlayerPonto;
        })
        .filter(Boolean) as PlayerPonto[];

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
        const pTags = (p.tags ?? []).map((t) => normalizeTag(t));
        let score = 0;
        for (const wanted of tagNorms) {
          if (pTags.some((pt) => pt.includes(wanted) || wanted.includes(pt))) {
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
        } satisfies ListPonto;
      })
      .filter(Boolean) as ListPonto[];
  }, [searchResults]);

  const shouldShowSearchStates = queryHasText;
  const shouldShowSearchResults = queryHasText && canSearch;
  const listData = shouldShowSearchResults ? searchedPontos : suggestions;

  const [addingIds, setAddingIds] = useState<string[]>([]);
  const [removingIds, setRemovingIds] = useState<string[]>([]);

  const addMutation = useMutation({
    mutationFn: async (vars: { ponto: ListPonto }) => {
      if (!userId) {
        throw new Error("Entre para adicionar pontos.");
      }
      if (!collectionId) {
        throw new Error("Coleção inválida.");
      }

      const res = await addPontoToCollection({
        collectionId,
        pontoId: vars.ponto.id,
        addedBy: userId,
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

      const playerPonto = toPlayerPonto(vars.ponto);
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

  const removeMutation = useMutation({
    mutationFn: async (vars: { ponto: ListPonto }) => {
      if (!userId) {
        throw new Error("Entre para remover pontos.");
      }
      if (!collectionId) {
        throw new Error("Coleção inválida.");
      }

      const res = await removePontoFromCollection({
        collectionId,
        pontoId: vars.ponto.id,
      });

      if (!res.ok) {
        throw new Error(res.error || "Erro ao remover ponto da coleção.");
      }

      return res;
    },
    onMutate: async (vars) => {
      const pontoId = vars.ponto.id;

      setRemovingIds((prev) =>
        prev.includes(pontoId) ? prev : [...prev, pontoId],
      );

      const { didRemove } = removePontoFromCollectionPontosList(queryClient, {
        collectionId,
        pontoId,
      });

      if (didRemove) {
        incrementCollectionPontosCountInTerreiroLists(queryClient, {
          collectionId,
          delta: -1,
        });
      }

      return { pontoId, didRemove, ponto: vars.ponto };
    },
    onError: (e, _vars, ctx) => {
      if (__DEV__) {
        console.info("[AddToCollection] erro ao remover", {
          message: getErrorMessage(e),
          raw: e,
        });
      }

      if (ctx?.didRemove && ctx.pontoId) {
        const playerPonto = toPlayerPonto(ctx.ponto);
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
      }

      showToast(getErrorMessage(e));
    },
    onSuccess: () => {
      showToast("Ponto removido da coleção");
    },
    onSettled: (_data, _err, vars) => {
      const pontoId = vars?.ponto?.id;
      if (pontoId) {
        setRemovingIds((prev) => prev.filter((id) => id !== pontoId));
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
        showToast("Entre para adicionar pontos.");
        router.replace("/login");
        return;
      }

      if (alreadyInCollectionIds.has(ponto.id)) {
        showToast("Este ponto já está na coleção.");
        return;
      }

      try {
        await addMutation.mutateAsync({ ponto });
      } catch {
        // erro já tratado no onError
      }
    },
    [
      addMutation,
      alreadyInCollectionIds,
      collectionId,
      router,
      showToast,
      userId,
    ],
  );

  const onPressToggleSelected = useCallback(
    async (ponto: ListPonto) => {
      if (!collectionId) {
        showToast("Coleção inválida.");
        goBackToCollection();
        return;
      }

      if (!userId) {
        showToast("Entre para editar esta coleção.");
        router.replace("/login");
        return;
      }

      const isSelected = alreadyInCollectionIds.has(ponto.id);

      try {
        if (isSelected) {
          await removeMutation.mutateAsync({ ponto });
        } else {
          await addMutation.mutateAsync({ ponto });
        }
      } catch {
        // erro já tratado no onError
      }
    },
    [
      addMutation,
      alreadyInCollectionIds,
      collectionId,
      goBackToCollection,
      removeMutation,
      router,
      showToast,
      userId,
    ],
  );

  const Header = (
    <View style={[styles.header, { borderColor }]}>
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

      {!queryHasText ? (
        <Text
          style={[styles.searchHint, { color: textSecondary }]}
          numberOfLines={2}
        >
          Sugestões — digite para buscar no acervo
        </Text>
      ) : null}
    </View>
  );

  const renderItem = useCallback(
    ({ item }: { item: ListPonto }) => {
      const isAlready = alreadyInCollectionIds.has(item.id);
      const isAdding = addingIds.includes(item.id);
      const isRemoving = removingIds.includes(item.id);
      const disabled = isAdding || isRemoving;

      const lyrics = String(item.lyrics ?? "").trim();
      const subtitle = getLyricsPreview(
        lyrics || String(item.lyrics_preview_6 ?? ""),
        4,
      );
      const tagsText = joinTags(item.tags ?? [], 3);

      return (
        <View style={[styles.row, { borderBottomColor: borderColor }]}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isAlready, disabled }}
            accessibilityLabel={
              disabled
                ? isAdding
                  ? "Adicionando"
                  : "Removendo"
                : isAlready
                  ? "Desselecionar"
                  : "Selecionar"
            }
            onPress={() => {
              if (disabled) return;
              void onPressToggleSelected(item);
            }}
            hitSlop={10}
            style={({ pressed }) => [
              styles.circleBtn,
              pressed && !disabled ? { opacity: 0.75 } : null,
            ]}
          >
            <View
              style={[
                styles.circleOuter,
                {
                  borderColor: isAlready ? selectedColor : borderColor,
                  backgroundColor: isAlready ? selectedColor : "transparent",
                  opacity: disabled ? 0.6 : 1,
                },
              ]}
            >
              {isAlready ? (
                <Ionicons name="checkmark" size={14} color={baseBgColor} />
              ) : null}
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isAlready ? "Desselecionar ponto" : "Selecionar ponto"
            }
            onPress={() => {
              if (disabled) return;
              void onPressToggleSelected(item);
            }}
            style={({ pressed }) => [
              styles.rowText,
              pressed && !disabled ? { opacity: 0.75 } : null,
            ]}
          >
            <Text
              style={[styles.itemTitle, { color: textPrimary }]}
              numberOfLines={1}
            >
              {(item.title ?? "").trim() || "Ponto"}
            </Text>
            {tagsText ? (
              <Text
                style={[styles.itemSubtitle, { color: textSecondary }]}
                numberOfLines={1}
              >
                {tagsText}
              </Text>
            ) : null}
            {subtitle ? (
              <Text
                style={[styles.itemSubtitle, { color: textSecondary }]}
                numberOfLines={4}
              >
                {subtitle}
              </Text>
            ) : null}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir preview no player"
            onPress={() => {
              router.push({
                pathname: "/player",
                params: {
                  source: "all",
                  q: searchQuery,
                  initialPontoId: item.id,
                  returnTo: "collection-add",
                  returnCollectionId: collectionId,
                  returnQ: searchQuery,
                },
              });
            }}
            hitSlop={10}
            style={styles.rightBtn}
          >
            <Ionicons
              name="play-outline"
              size={20}
              color={
                variant === "light"
                  ? colors.textMutedOnLight
                  : colors.textMutedOnDark
              }
            />
          </Pressable>
        </View>
      );
    },
    [
      addingIds,
      alreadyInCollectionIds,
      baseBgColor,
      borderColor,
      onPressToggleSelected,
      router,
      removingIds,
      searchQuery,
      selectedColor,
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
  searchHint: {
    marginTop: spacing.sm,
    paddingLeft: 30 + spacing.md,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  circleBtn: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  circleOuter: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    minHeight: 48,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  itemSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
  rightBtn: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.md,
  },
});
