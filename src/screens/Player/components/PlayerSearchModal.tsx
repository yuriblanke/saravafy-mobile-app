import { supabase } from "@/lib/supabase";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { TagChip } from "@/src/components/TagChip";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export type PlayerSearchResult = {
  id: string;
  title: string;
  tags: string[];
  lyrics: string;
  lyrics_preview_6: string | null;
  score: number | null;
};

function normalizeForGate(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

export function PlayerSearchModal(props: {
  visible: boolean;
  onClose: () => void;
  variant: "light" | "dark";
}) {
  const { visible, onClose, variant } = props;

  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastSearched, setLastSearched] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const bg =
    variant === "light" ? colors.surfaceCardBgLight : colors.surfaceCardBg;

  const queryNorm = useMemo(() => normalizeForGate(query), [query]);
  const canSearch = queryNorm.length >= 4;

  useEffect(() => {
    if (!visible) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    setError(null);

    if (!canSearch) {
      setResults([]);
      setIsLoading(false);
      setLastSearched(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const currentQuery = query;
      setIsLoading(true);
      setLastSearched(currentQuery);

      (async () => {
        try {
          const { data, error } = await supabase.rpc("search_pontos", {
            p_query: currentQuery,
            p_limit: 20,
            p_offset: 0,
          });

          if (error) {
            throw new Error(
              typeof error.message === "string" && error.message.trim()
                ? error.message
                : "Erro ao buscar pontos."
            );
          }

          const rows = Array.isArray(data) ? (data as any[]) : [];
          const mapped: PlayerSearchResult[] = rows
            .map((r) => {
              const tags = Array.isArray(r.tags)
                ? r.tags.filter((t: unknown) => typeof t === "string")
                : [];
              return {
                id: String(r.id ?? ""),
                title: String(r.title ?? ""),
                tags,
                lyrics: String(r.lyrics ?? ""),
                lyrics_preview_6:
                  r.lyrics_preview_6 == null
                    ? null
                    : String(r.lyrics_preview_6),
                score: typeof r.score === "number" ? r.score : null,
              };
            })
            .filter((r) => Boolean(r.id));

          // Evita aplicar resultado se a query mudou entre o debounce e a resposta
          if (currentQuery !== query) return;

          setResults(mapped);
          setError(null);
        } catch (e) {
          if (currentQuery !== query) return;

          const message = e instanceof Error ? e.message : String(e);
          setResults([]);
          setError(message);
        } finally {
          if (currentQuery !== query) return;
          setIsLoading(false);
        }
      })();
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [query, canSearch, visible]);

  // Ao fechar, não mexe no estado do player. Aqui mantemos a query/resultados
  // (o requisito não pede reset).

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: bg, borderColor }]}>
          <View style={[styles.sheetHeader, { borderColor }]}>
            <Text style={[styles.sheetTitle, { color: textPrimary }]}>
              Buscar ponto
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={onClose}
              hitSlop={10}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={20} color={textPrimary} />
            </Pressable>
          </View>

          <View style={styles.inputWrap}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar por título, trecho, tag…"
              placeholderTextColor={textSecondary}
              style={[
                styles.input,
                {
                  color: textPrimary,
                  borderColor,
                  backgroundColor:
                    variant === "light" ? colors.paper50 : colors.surfaceCardBg,
                },
              ]}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>

          <View style={styles.resultsArea}>
            {!canSearch ? (
              <View style={styles.stateWrap}>
                <Text style={[styles.stateText, { color: textSecondary }]}>
                  Digite pelo menos 4 caracteres
                </Text>
              </View>
            ) : isLoading ? (
              <View style={styles.stateWrap}>
                <ActivityIndicator />
              </View>
            ) : error ? (
              <View style={styles.stateWrap}>
                <Text style={[styles.stateText, { color: textSecondary }]}>
                  {error}
                </Text>
              </View>
            ) : results.length === 0 && lastSearched ? (
              <View style={styles.stateWrap}>
                <Text style={[styles.stateText, { color: textSecondary }]}>
                  Nenhum ponto encontrado
                </Text>
              </View>
            ) : (
              <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  return (
                    <View style={styles.cardGap}>
                      <SurfaceCard variant={variant}>
                        <Text
                          style={[styles.resultTitle, { color: textPrimary }]}
                        >
                          {item.title}
                        </Text>

                        {item.tags.length > 0 ? (
                          <View style={styles.tagsWrap}>
                            {item.tags.map((t) => (
                              <TagChip
                                key={`${item.id}-${t}`}
                                label={t}
                                variant={variant}
                              />
                            ))}
                          </View>
                        ) : null}

                        <Text
                          style={[
                            styles.resultLyrics,
                            { color: textSecondary },
                          ]}
                        >
                          {item.lyrics}
                        </Text>
                      </SurfaceCard>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    height: "90%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  sheetHeader: {
    height: 52,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "700",
  },
  resultsArea: {
    flex: 1,
  },
  stateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  stateText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  cardGap: {
    marginBottom: spacing.md,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 6,
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  resultLyrics: {
    fontSize: 13,
    lineHeight: 18,
  },
});
