import { useAuth } from "@/contexts/AuthContext";
import { AppHeaderWithPreferences } from "@/src/components/AppHeaderWithPreferences";
import { BottomSheet } from "@/src/components/BottomSheet";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { SubmitPontoModal } from "@/src/components/SubmitPontoModal";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { TagChip } from "@/src/components/TagChip";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  createCollection,
  fetchAccessibleCollections,
  fetchAllowedTerreiros,
  type AccessibleCollection,
  type AllowedTerreiro,
} from "./data/collections";
import { addPontoToCollection } from "./data/collections_pontos";
import type { Ponto } from "./data/ponto";
import { fetchAllPontos } from "./data/ponto";

const ITEMS_PER_PAGE = 10;

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
  const { effectiveTheme } =
    require("@/contexts/PreferencesContext").usePreferences();
  const { user } = useAuth();
  const router = useRouter();

  const [submitModalVisible, setSubmitModalVisible] = useState(false);
  // Estado para modal de adicionar à coleção
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedPonto, setSelectedPonto] = useState<Ponto | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [allowedTerreiros, setAllowedTerreiros] = useState<AllowedTerreiro[]>(
    []
  );
  const [collections, setCollections] = useState<AccessibleCollection[]>([]);
  const [isSheetLoading, setIsSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [collectionFilter, setCollectionFilter] = useState<
    "ALL" | "ME" | string
  >("ALL");
  const [newCollectionTitle, setNewCollectionTitle] = useState("");
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
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

  const loadSheetData = async () => {
    if (!user?.id) return;

    setIsSheetLoading(true);
    setSheetError(null);

    try {
      const terreirosRes = await fetchAllowedTerreiros(user.id);
      if (terreirosRes.error) throw new Error(terreirosRes.error);

      setAllowedTerreiros(terreirosRes.data);

      const allowedIds = terreirosRes.data.map((t) => t.terreiro_id);
      const collectionsRes = await fetchAccessibleCollections({
        userId: user.id,
        allowedTerreiroIds: allowedIds,
      });
      if (collectionsRes.error) throw new Error(collectionsRes.error);

      setCollections(collectionsRes.data);
    } catch (e) {
      setAllowedTerreiros([]);
      setCollections([]);
      setSheetError(getErrorMessage(e));
    } finally {
      setIsSheetLoading(false);
    }
  };

  useEffect(() => {
    if (!addModalVisible) return;
    if (!user?.id) return;
    void loadSheetData();
  }, [addModalVisible, user?.id]);

  const filteredCollections = useMemo(() => {
    if (!user?.id) return [] as AccessibleCollection[];

    if (collectionFilter === "ME") {
      return collections.filter((c) => c.owner_user_id === user.id);
    }

    if (collectionFilter === "ALL") return collections;

    // Terreiro específico
    return collections.filter((c) => c.owner_terreiro_id === collectionFilter);
  }, [collections, collectionFilter, user?.id]);

  const getCollectionOwnerLabel = (c: AccessibleCollection) => {
    if (!user?.id) return "";
    if (c.owner_user_id === user.id) return "Você";
    if (c.owner_terreiro_id) {
      return `Terreiro: ${c.terreiro_title ?? "Terreiro"}`;
    }
    return "";
  };

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

          <View style={styles.submitRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enviar ponto"
              onPress={() => {
                if (!user) {
                  router.push("/login");
                  return;
                }
                setSubmitModalVisible(true);
              }}
              style={({ pressed }) => [
                styles.submitButton,
                pressed ? styles.submitButtonPressed : null,
              ]}
            >
              <Text style={styles.submitButtonText}>+ Enviar ponto</Text>
            </Pressable>
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
                            accessibilityLabel="Adicionar à coleção"
                            style={styles.addToCollectionBtn}
                            hitSlop={10}
                            onPress={(e) => {
                              // Evita abrir o player quando a intenção é adicionar
                              // à coleção.
                              e.stopPropagation();

                              setSelectedPonto(item);
                              setAddModalVisible(true);
                              setAddSuccess(false);
                              setAddError(null);
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
      </View>
      {/* Modal de adicionar à coleção */}
      <BottomSheet
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        variant={variant}
      >
        <View style={{ paddingBottom: 16 }}>
          <View style={styles.sheetHeaderRow}>
            <Text style={[styles.sheetTitle, { color: textPrimary }]}>
              Adicionar à coleção
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setAddModalVisible(false)}
              hitSlop={10}
              style={styles.sheetCloseBtn}
            >
              <Text style={[styles.sheetCloseText, { color: textPrimary }]}>
                ×
              </Text>
            </Pressable>
          </View>

          {isSheetLoading ? (
            <Text style={[styles.bodyText, { color: textSecondary }]}>
              Carregando coleções…
            </Text>
          ) : sheetError ? (
            <View style={{ gap: spacing.sm }}>
              <Text style={[styles.bodyText, { color: colors.brass600 }]}>
                {sheetError}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void loadSheetData()}
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
              <View style={styles.sheetFilterRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setCollectionFilter("ALL")}
                  style={({ pressed }) => [
                    styles.filterChip,
                    collectionFilter === "ALL" && styles.filterChipActive,
                    pressed && styles.filterChipPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color:
                          collectionFilter === "ALL"
                            ? colors.brass600
                            : textSecondary,
                      },
                    ]}
                  >
                    Todos
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setCollectionFilter("ME")}
                  style={({ pressed }) => [
                    styles.filterChip,
                    collectionFilter === "ME" && styles.filterChipActive,
                    pressed && styles.filterChipPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color:
                          collectionFilter === "ME"
                            ? colors.brass600
                            : textSecondary,
                      },
                    ]}
                  >
                    Você
                  </Text>
                </Pressable>

                {allowedTerreiros.map((t) => (
                  <Pressable
                    key={t.terreiro_id}
                    accessibilityRole="button"
                    onPress={() => setCollectionFilter(t.terreiro_id)}
                    style={({ pressed }) => [
                      styles.filterChip,
                      collectionFilter === t.terreiro_id &&
                        styles.filterChipActive,
                      pressed && styles.filterChipPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        {
                          color:
                            collectionFilter === t.terreiro_id
                              ? colors.brass600
                              : textSecondary,
                        },
                      ]}
                    >
                      {t.terreiro_title}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.createRow}>
                <TextInput
                  value={newCollectionTitle}
                  onChangeText={(v) => setNewCollectionTitle(v.slice(0, 40))}
                  placeholder="Nova coleção (até 40)"
                  placeholderTextColor={textSecondary}
                  style={[
                    styles.createInput,
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
                <Pressable
                  accessibilityRole="button"
                  disabled={isCreatingCollection || isAdding}
                  onPress={async () => {
                    if (!user?.id || !selectedPonto) return;

                    const title = newCollectionTitle.trim().slice(0, 40);
                    if (!title) {
                      setAddError("Informe um título (até 40 caracteres). ");
                      return;
                    }

                    setIsCreatingCollection(true);
                    setAddError(null);

                    const ownerTerreiroId =
                      collectionFilter !== "ALL" && collectionFilter !== "ME"
                        ? collectionFilter
                        : null;
                    const ownerUserId = ownerTerreiroId ? null : user.id;

                    const created = await createCollection({
                      title,
                      ownerUserId,
                      ownerTerreiroId,
                    });

                    if (created.error || !created.data?.id) {
                      setIsCreatingCollection(false);
                      setAddError(created.error || "Erro ao criar coleção.");
                      return;
                    }

                    const added = await addPontoToCollection({
                      collectionId: created.data.id,
                      pontoId: selectedPonto.id,
                      addedBy: user.id,
                    });

                    setIsCreatingCollection(false);
                    if (!added.ok) {
                      setAddError("Erro ao adicionar ponto à coleção.");
                      return;
                    }

                    setAddSuccess(true);
                    setNewCollectionTitle("");
                    await loadSheetData();

                    Alert.alert("Ponto adicionado à coleção");
                    setAddModalVisible(false);
                  }}
                  style={({ pressed }) => [
                    styles.createBtn,
                    pressed && styles.createBtnPressed,
                  ]}
                >
                  <Text style={styles.createBtnText}>Criar</Text>
                </Pressable>
              </View>

              {isAdding ? (
                <Text style={[styles.bodyText, { color: textSecondary }]}>
                  Adicionando…
                </Text>
              ) : addSuccess ? (
                <Text style={[styles.bodyText, { color: colors.forest500 }]}>
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
                {filteredCollections.map((c) => {
                  const title = (c.title ?? "").trim() || "Coleção";
                  const ownerLabel = getCollectionOwnerLabel(c);

                  return (
                    <Pressable
                      key={c.id}
                      accessibilityRole="button"
                      disabled={isAdding || isCreatingCollection}
                      onPress={async () => {
                        if (!user?.id || !selectedPonto) return;

                        setIsAdding(true);
                        setAddError(null);
                        setAddSuccess(false);

                        const res = await addPontoToCollection({
                          collectionId: c.id,
                          pontoId: selectedPonto.id,
                          addedBy: user.id,
                        });

                        setIsAdding(false);
                        if (!res.ok) {
                          setAddError("Erro ao adicionar ponto à coleção.");
                          return;
                        }

                        setAddSuccess(true);
                        Alert.alert("Ponto adicionado à coleção");
                        setAddModalVisible(false);
                      }}
                      style={({ pressed }) => [
                        styles.collectionRow,
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
    </SaravafyScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    // Não definir backgroundColor aqui para deixar o SaravafyScreen controlar o fundo
  },
  container: {
    flex: 1,
    paddingTop: spacing.md,
  },
  submitRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.sm,
  },
  submitButton: {
    alignSelf: "flex-end",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.brass600,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "transparent",
  },
  submitButtonPressed: {
    opacity: 0.9,
  },
  submitButtonText: {
    color: colors.brass600,
    fontSize: 12,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.brass600,
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
  sheetFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceCardBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "transparent",
  },
  filterChipActive: {
    borderColor: colors.brass600,
  },
  filterChipPressed: {
    opacity: 0.85,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "800",
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
    borderColor: colors.surfaceCardBorder,
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
