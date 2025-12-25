import { useAuth } from "@/contexts/AuthContext";
import { AppHeaderWithPreferences } from "@/src/components/AppHeaderWithPreferences";
import { BottomSheet } from "@/src/components/BottomSheet";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { TagChip } from "@/src/components/TagChip";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { addPontoToCollection } from "./data/collections_pontos";
import type { Ponto } from "./data/ponto";
import { fetchAllPontos } from "./data/ponto";

const ITEMS_PER_PAGE = 10;

function normalize(value: string) {
  return value.trim().toLowerCase();
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
  const { effectiveTheme } =
    require("@/contexts/PreferencesContext").usePreferences();
  const { user } = useAuth();
  // Estado para modal de adicionar à coleção
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedPonto, setSelectedPonto] = useState<Ponto | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
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

  useEffect(() => {
    fetchAllPontos()
      .then(setPontos)
      .catch(() => setLoadError("Erro ao carregar pontos."))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredPontos = useMemo(
    () => pontos.filter((p) => matchesQuery(p, searchQuery)),
    [pontos, searchQuery]
  );

  if (isLoading) {
    return (
      <SaravafyScreen>
        <AppHeaderWithPreferences />
        <View style={styles.loadingWrap}>
          <Text>Carregando pontos…</Text>
        </View>
      </SaravafyScreen>
    );
  }

  if (loadError) {
    return (
      <SaravafyScreen>
        <AppHeaderWithPreferences />
        <View style={styles.loadingWrap}>
          <Text style={{ color: colors.brass600 }}>{loadError}</Text>
        </View>
      </SaravafyScreen>
    );
  }

  return (
    <SaravafyScreen variant={variant}>
      <View style={styles.screen}>
        <AppHeaderWithPreferences />
        <View style={styles.container}>
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
          {isLoading ? (
            <Text style={[styles.bodyText, { color: textSecondary }]}>
              Carregando…
            </Text>
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
                    .catch(() => setLoadError("Erro ao carregar pontos."))
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
          ) : filteredPontos.length === 0 ? (
            <View style={{ paddingHorizontal: spacing.lg }}>
              <Text style={[styles.bodyText, { color: textSecondary }]}>
                Nenhum ponto encontrado.
              </Text>
            </View>
          ) : (
            <FlatList
              key={variant}
              data={filteredPontos}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              extraData={variant}
              renderItem={({ item }) => (
                <View style={styles.cardGap}>
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
                      {user ? (
                        <Pressable
                          accessibilityRole="button"
                          style={styles.iconCircle}
                          hitSlop={10}
                          onPress={() => {
                            setSelectedPonto(item);
                            setAddModalVisible(true);
                            setAddSuccess(false);
                            setAddError(null);
                          }}
                        >
                          <Ionicons
                            name="add-circle-outline"
                            size={22}
                            color={textPrimary}
                          />
                        </Pressable>
                      ) : null}
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
                </View>
              )}
            />
          )}
        </View>
      </View>
      {/* Modal de adicionar à coleção */}
      <BottomSheet
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        variant={variant}
      >
        <View style={{ paddingBottom: 16 }}>
          <Text style={{ fontWeight: "bold", fontSize: 18, marginBottom: 12 }}>
            Adicionar à coleção
          </Text>
          {/* TODO: Listar coleções do usuário/terreiro, alternar perfil, respeitar permissões */}
          {/* Exemplo de feedback visual e loading */}
          {isAdding ? (
            <Text style={{ color: colors.forest400 }}>Adicionando…</Text>
          ) : addSuccess ? (
            <Text style={{ color: colors.forest500 }}>
              Adicionado com sucesso!
            </Text>
          ) : addError ? (
            <Text style={{ color: colors.brass600 }}>{addError}</Text>
          ) : (
            <Text
              style={{ color: colors.textSecondaryOnLight, marginBottom: 8 }}
            >
              Selecione uma coleção para adicionar o ponto.
            </Text>
          )}
          {/* Exemplo de botão de ação (substituir por lista real de coleções) */}
          <Pressable
            style={{
              marginTop: 12,
              backgroundColor: colors.forest400,
              borderRadius: 8,
              padding: 10,
              alignItems: "center",
            }}
            onPress={async () => {
              if (!selectedPonto) return;
              setIsAdding(true);
              setAddError(null);
              // Exemplo: adicionar à coleção fictícia "colecao1"
              const ok = await addPontoToCollection(
                "colecao1",
                selectedPonto.id
              );
              setIsAdding(false);
              if (ok) {
                setAddSuccess(true);
                setTimeout(() => {
                  setAddModalVisible(false);
                }, 1200);
              } else {
                setAddError("Erro ao adicionar ponto à coleção.");
              }
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              Adicionar à coleção (exemplo)
            </Text>
          </Pressable>
        </View>
      </BottomSheet>
    </SaravafyScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    paddingTop: spacing.md,
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
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
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
  iconCircle: {
    borderRadius: 999,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
  },
});
