import { SurfaceCard } from "@/src/components/SurfaceCard";
import { TagChip } from "@/src/components/TagChip";
import { usePontosSearch } from "@/src/hooks/usePontosSearch";
import type { PontosSearchResult } from "@/src/services/pontosSearch";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
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

export type PlayerSearchResult = PontosSearchResult;

export function PlayerSearchModal(props: {
  visible: boolean;
  onClose: () => void;
  variant: "light" | "dark";
}) {
  const { visible, onClose, variant } = props;

  const [query, setQuery] = useState("");
  const { canSearch, isLoading, results, error, lastSearched } =
    usePontosSearch(query, { enabled: visible, limit: 20, offset: 0 });

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
              <View style={styles.stateWrap} />
            ) : isLoading ? (
              <View style={styles.stateWrap}>
                <ActivityIndicator color={colors.brass600} />
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
