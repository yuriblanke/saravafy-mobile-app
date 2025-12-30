import { useAuth } from "@/contexts/AuthContext";
import { useGestureBlock } from "@/contexts/GestureBlockContext";
import { useRootPager } from "@/contexts/RootPagerContext";
import { BottomSheet } from "@/src/components/BottomSheet";
import { SubmitPontoModal } from "@/src/components/SubmitPontoModal";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { TagChip } from "@/src/components/TagChip";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
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
import { queryKeys } from "@/src/queries/queryKeys";

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
  const { effectiveTheme, activeContext } =
    require("@/contexts/PreferencesContext").usePreferences();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const router = useRouter();
  const queryClient = useQueryClient();
  const rootPager = useRootPager();
  const { shouldBlockPress } = useGestureBlock();

  const [submitModalVisible, setSubmitModalVisible] = useState(false);
  // Estado para modal de adicionar à coleção
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedPonto, setSelectedPonto] = useState<Ponto | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [isCreatingCollection, setIsCreatingCollection] = useState(false);

  const [isCreateCollectionModalOpen, setIsCreateCollectionModalOpen] =
    useState(false);
  const [createCollectionTitle, setCreateCollectionTitle] = useState("");
  const [createCollectionError, setCreateCollectionError] = useState<
    string | null
  >(null);

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

  // Fonte ÚNICA do BottomSheet: coleções editáveis (escrita) por regra de produto.
  const editableCollectionsQuery = useEditableCollections(userId);
  const editableCollections = editableCollectionsQuery.data ?? [];
  const collectionsError = editableCollectionsQuery.isError
    ? getErrorMessage(editableCollectionsQuery.error)
    : null;

  const closeAddToCollectionSheet = useCallback(() => {
    setAddModalVisible(false);
    setIsCreateCollectionModalOpen(false);
    setCreateCollectionTitle("");
    setCreateCollectionError(null);
    rootPager.setIsBottomSheetOpen(false);
  }, [
    editableCollections.length,
    editableCollectionsQuery.isFetching,
    rootPager,
    userId,
  ]);

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
    if (!user?.id) return "";
    if (c.owner_user_id === user.id) return "Você";
    if (c.owner_terreiro_id) {
      return `Terreiro: ${c.terreiro_title ?? "Terreiro"}`;
    }
    return "";
  };

  const openCreateCollection = useCallback(() => {
    setCreateCollectionError(null);
    setIsCreateCollectionModalOpen(true);
  }, []);

  const onCreateCollection = useCallback(async () => {
    if (!user?.id) return;

    const title = createCollectionTitle.trim().slice(0, 40);
    if (!title) {
      setCreateCollectionError("Informe um nome (até 40 caracteres).");
      return;
    }

    setIsCreatingCollection(true);
    setCreateCollectionError(null);

    // Owner baseado no perfil ativo (não no filtro manual)
    const ownerTerreiroId =
      activeContext.kind === "TERREIRO_PAGE" ? activeContext.terreiroId : null;
    const ownerUserId = ownerTerreiroId ? null : user.id;

    const created = await createCollection({
      title,
      ownerUserId,
      ownerTerreiroId,
    });

    setIsCreatingCollection(false);

    if (created.error) {
      setCreateCollectionError(created.error || "Erro ao criar coleção.");
      return;
    }

    // Atualizar caches user-scoped de coleções
    queryClient.invalidateQueries({
      queryKey: queryKeys.collections.accountable(user.id),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.collections.editableByUserPrefix(user.id),
    });

    setIsCreateCollectionModalOpen(false);
    setCreateCollectionTitle("");
  }, [queryClient, activeContext, createCollectionTitle, user?.id]);

  const filteredPontos = useMemo(
    () => pontos.filter((p) => matchesQuery(p, searchQuery)),
    [pontos, searchQuery]
  );

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
                router.push("/login");
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
                    coleções. Troque de terreiro no perfil ou peça acesso.
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
                    {editableCollections.map((c) => {
                      const title = (c.title ?? "").trim() || "Coleção";
                      // SEMPRE mostra o label do terreiro quando aplicável
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

                            // Atualizar cache para refletir mudança no updated_at da coleção
                            queryClient.invalidateQueries({
                              queryKey: queryKeys.collections.accountable(
                                user.id
                              ),
                            });
                            queryClient.invalidateQueries({
                              queryKey:
                                queryKeys.collections.editableByUserPrefix(
                                  user.id
                                ),
                            });

                            setAddSuccess(true);
                            Alert.alert("Ponto adicionado à coleção");
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
    justifyContent: "flex-end",
    minHeight: 44,
    marginBottom: spacing.sm,
  },
  filterBtn: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 6,
    paddingRight: spacing.sm,
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
