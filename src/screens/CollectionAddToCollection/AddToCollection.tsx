import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { TagChip } from "@/src/components/TagChip";
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

import { addPontoToCollection } from "@/src/screens/Home/data/collections_pontos";
import type { PlayerPonto } from "@/src/screens/Player/hooks/useCollectionPlayerData";

type ListPonto = {
  id: string;
  title: string;
  tags: string[];
  lyrics: string;
  lyrics_preview_6?: string | null;
};

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
  const lines = String(lyrics ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const previewLines = lines.slice(0, maxLines);
  const preview = previewLines.join("\n");
  if (lines.length > maxLines) return `${preview}\n…`;
  return preview;
}

function coerceStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (v): v is string => typeof v === "string" && v.trim().length > 0
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
  const collectionId = String(collectionIdParam ?? "").trim();

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
        onHardwareBackPress
      );

      return () => sub.remove();
    }, [goBackToCollection])
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
    [searchQuery]
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
            : "Erro ao carregar a coleção."
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
      items.map((it) => String(it?.ponto?.id ?? "")).filter(Boolean)
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
          "id, title, lyrics, lyrics_preview_6, tags, duration_seconds, cover_url, author_name, is_public_domain"
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
        prev.includes(pontoId) ? prev : [...prev, pontoId]
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
          : "Ponto adicionado à coleção"
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
    ]
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
    </View>
  );

  const renderItem = useCallback(
    ({ item }: { item: ListPonto }) => {
      const isAlready = alreadyInCollectionIds.has(item.id);
      const isAdding = addingIds.includes(item.id);
      const disabled = isAlready || isAdding;

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
                },
              });
            }}
          >
            <SurfaceCard variant={variant} style={styles.cardContainer}>
              <View style={styles.cardHeaderRow}>
                <Text
                  style={[styles.cardTitle, { color: textPrimary, flex: 1 }]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {item.title}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    disabled
                      ? isAlready
                        ? "Já adicionado"
                        : "Adicionando"
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
                  <Ionicons
                    name={isAlready ? "checkmark" : "add"}
                    size={18}
                    color={textPrimary}
                  />
                </Pressable>
              </View>

              <View style={styles.tagsRow}>
                {item.tags.map((tag) => (
                  <TagChip
                    key={`${item.id}-${tag}`}
                    label={tag}
                    variant={variant}
                  />
                ))}
              </View>

              <Text
                style={[styles.cardPreview, { color: textSecondary }]}
                numberOfLines={6}
                ellipsizeMode="tail"
              >
                {item.lyrics_preview_6 ?? getLyricsPreview(item.lyrics, 6)}
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
      onPressAdd,
      router,
      searchQuery,
      textPrimary,
      textSecondary,
      variant,
    ]
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
});
