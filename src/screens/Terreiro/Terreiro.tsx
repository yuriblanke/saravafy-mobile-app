import { usePreferences } from "@/contexts/PreferencesContext";
import { supabase } from "@/lib/supabase";
import { AppHeaderWithPreferences } from "@/src/components/AppHeaderWithPreferences";
import { BottomSheet } from "@/src/components/BottomSheet";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { Separator } from "@/src/components/Separator";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  fetchCollectionsDoTerreiro,
  type TerreiroCollection,
} from "./data/collections";

type ViewMode = "edit" | "read_only_preview";

export default function Terreiro() {
  // --- Estados para modal explicativo do modo visitante ---
  const [isViewAsVisitorInfoOpen, setIsViewAsVisitorInfoOpen] = useState(false);
  const [viewAsVisitorDontShowAgain, setViewAsVisitorDontShowAgain] =
    useState(false);
  const [
    viewAsVisitorOnboardingDismissed,
    setViewAsVisitorOnboardingDismissed,
  ] = useState(false);

  // Chave de storage para o onboarding do modo visitante
  const VIEW_AS_VISITOR_ONBOARDING_KEY = "viewAsVisitorOnboardingDismissed";

  // Carrega preferência do storage
  useEffect(() => {
    AsyncStorage.getItem(VIEW_AS_VISITOR_ONBOARDING_KEY).then((v) => {
      setViewAsVisitorOnboardingDismissed(v === "1");
    });
  }, []);

  // Salva preferência no storage
  const persistViewAsVisitorOnboarding = (dismissed: boolean) => {
    setViewAsVisitorOnboardingDismissed(dismissed);
    AsyncStorage.setItem(VIEW_AS_VISITOR_ONBOARDING_KEY, dismissed ? "1" : "0");
  };
  const router = useRouter();
  const { effectiveTheme, activeContext, setActiveContext, terreirosAdmin } =
    usePreferences();

  const variant = effectiveTheme;

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;
  const textMuted =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;

  const terreiroName =
    activeContext.kind === "TERREIRO_PAGE"
      ? activeContext.terreiroName ?? "Terreiro"
      : "Terreiro";

  const terreiroId =
    activeContext.kind === "TERREIRO_PAGE" ? activeContext.terreiroId : "";

  const activeTerreiroRole =
    activeContext.kind === "TERREIRO_PAGE" ? activeContext.role : null;
  const isAdminOrEditor =
    activeTerreiroRole === "admin" || activeTerreiroRole === "editor";

  const [viewMode, setViewMode] = useState<ViewMode>("read_only_preview");
  const [didInitializeViewMode, setDidInitializeViewMode] = useState(false);

  useEffect(() => {
    if (!isAdminOrEditor) {
      setViewMode("read_only_preview");
      setDidInitializeViewMode(true);
      return;
    }

    // Admin/editor: default é modo de edição, mas só inicializa 1x (não sobrescreve o toggle do usuário).
    if (!didInitializeViewMode) {
      setViewMode("edit");
      setDidInitializeViewMode(true);
    }
  }, [didInitializeViewMode, isAdminOrEditor]);

  const canEdit = isAdminOrEditor && viewMode === "edit";

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(terreiroName);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const titleInputRef = useRef<TextInput | null>(null);
  const [titleSelection, setTitleSelection] = useState<
    { start: number; end: number } | undefined
  >(undefined);

  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(
    null
  );
  const [draftCollectionTitle, setDraftCollectionTitle] = useState("");
  const [isSavingCollectionTitle, setIsSavingCollectionTitle] = useState(false);
  const collectionTitleInputRef = useRef<TextInput | null>(null);
  const [collectionTitleSelection, setCollectionTitleSelection] = useState<
    { start: number; end: number } | undefined
  >(undefined);

  const [isCollectionActionsOpen, setIsCollectionActionsOpen] = useState(false);
  const [collectionActionsTarget, setCollectionActionsTarget] =
    useState<TerreiroCollection | null>(null);

  const [isConfirmDeleteCollectionOpen, setIsConfirmDeleteCollectionOpen] =
    useState(false);
  const [collectionPendingDelete, setCollectionPendingDelete] =
    useState<TerreiroCollection | null>(null);
  const [isDeletingCollection, setIsDeletingCollection] = useState(false);

  useEffect(() => {
    // Mantém o draft em sincronia quando não estamos editando.
    if (!isEditingTitle) {
      setDraftTitle(terreiroName);
    }
  }, [isEditingTitle, terreiroName]);

  useEffect(() => {
    // Se trocar para modo somente leitura, encerra edição local.
    if (!canEdit && isEditingTitle) {
      setIsEditingTitle(false);
    }
  }, [canEdit, isEditingTitle]);

  useEffect(() => {
    if (!canEdit && editingCollectionId) {
      setEditingCollectionId(null);
    }
  }, [canEdit, editingCollectionId]);

  const [collections, setCollections] = useState<TerreiroCollection[]>([]);
  const [creatingCollection, setCreatingCollection] = useState<null | {
    id: string; // id temporário
    name: string;
    isNew: true;
  }>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeContext.kind !== "TERREIRO_PAGE") {
      router.replace("/home");
    }
  }, [activeContext.kind, router]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!terreiroId) return;
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchCollectionsDoTerreiro(terreiroId);
        if (cancelled) return;
        setCollections(data);
      } catch (e) {
        if (cancelled) return;
        if (__DEV__) {
          console.info("[Terreiro] erro ao carregar coleções", {
            error: e instanceof Error ? e.message : String(e),
          });
        }
        setError("Erro ao carregar as coleções.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [terreiroId]);

  const headerSubtitle = useMemo(() => {
    return "Página do terreiro";
  }, []);

  const accentColor = colors.brass600;
  const dangerColor = colors.danger;
  const warningColor = colors.warning;
  const titleInputBg =
    variant === "light" ? colors.inputBgLight : colors.inputBgDark;
  const titleInputBorder =
    variant === "light" ? colors.inputBorderLight : colors.inputBorderDark;

  const openCollectionActions = (collection: TerreiroCollection) => {
    if (!canEdit) return;
    setCollectionActionsTarget(collection);
    setIsCollectionActionsOpen(true);
  };

  const closeCollectionActions = () => {
    setIsCollectionActionsOpen(false);
    setCollectionActionsTarget(null);
  };

  const closeConfirmDeleteCollection = () => {
    setIsConfirmDeleteCollectionOpen(false);
    setCollectionPendingDelete(null);
  };

  const deleteCollection = async (collection: TerreiroCollection) => {
    if (!canEdit) return;

    setIsDeletingCollection(true);
    try {
      const res = await supabase
        .from("collections")
        .delete()
        .eq("id", collection.id)
        .select("id")
        .single();

      if (res.error) {
        throw new Error(
          typeof res.error.message === "string"
            ? res.error.message
            : "Não foi possível excluir a coleção."
        );
      }

      setCollections((prev) => prev.filter((c) => c.id !== collection.id));
      if (editingCollectionId === collection.id) {
        cancelEditCollectionTitle();
      }

      closeConfirmDeleteCollection();
    } catch (e) {
      if (__DEV__) {
        console.info("[Terreiro] erro ao excluir coleção", {
          collectionId: collection.id,
          error: e instanceof Error ? e.message : String(e),
        });
      }

      Alert.alert(
        "Erro",
        e instanceof Error ? e.message : "Não foi possível excluir a coleção."
      );
    } finally {
      setIsDeletingCollection(false);
    }
  };

  const startEditTitle = () => {
    if (!canEdit) return;
    if (!terreiroId) return;
    setDraftTitle(terreiroName);
    setIsEditingTitle(true);
    const end = (terreiroName ?? "").length;
    setTitleSelection({ start: end, end });
  };

  const cancelEditTitle = () => {
    setDraftTitle(terreiroName);
    setIsEditingTitle(false);
  };

  useEffect(() => {
    if (!isEditingTitle) return;

    // Foca o campo automaticamente e posiciona o cursor (caret) no fim do texto.
    const end = (draftTitle ?? "").length;
    setTitleSelection({ start: end, end });

    const id = setTimeout(() => {
      titleInputRef.current?.focus();
    }, 50);

    return () => {
      clearTimeout(id);
    };
  }, [isEditingTitle]);

  useEffect(() => {
    if (!editingCollectionId) return;

    const end = (draftCollectionTitle ?? "").length;
    setCollectionTitleSelection({ start: end, end });

    const id = setTimeout(() => {
      collectionTitleInputRef.current?.focus();
    }, 50);

    return () => {
      clearTimeout(id);
    };
  }, [editingCollectionId]);

  const startEditCollectionTitle = (collection: TerreiroCollection) => {
    if (!canEdit) return;
    const current =
      (typeof collection.name === "string" && collection.name.trim()) || "";

    setEditingCollectionId(collection.id);
    setDraftCollectionTitle(current);
    const end = current.length;
    setCollectionTitleSelection({ start: end, end });
  };

  const cancelEditCollectionTitle = () => {
    setEditingCollectionId(null);
    setDraftCollectionTitle("");
    setCollectionTitleSelection(undefined);
    setIsSavingCollectionTitle(false);
  };

  // Criação de nova coleção (Supabase)
  const saveNewCollection = async () => {
    if (!canEdit) return;
    if (!creatingCollection) return;
    const name = (draftCollectionTitle ?? "").trim();
    if (!name) {
      setNewCollectionError("O nome não pode ficar vazio.");
      return;
    }
    setIsSavingCollectionTitle(true);
    setNewCollectionError("");
    try {
      const res = await supabase
        .from("collections")
        .insert({
          name,
          owner_terreiro_id: terreiroId,
          owner_user_id: null,
        })
        .select()
        .single();
      if (res.error || !res.data) {
        throw new Error(res.error?.message || "Erro ao criar coleção");
      }
      setCollections((prev) => [res.data, ...prev]);
      setCreatingCollection(null);
      setEditingCollectionId(null);
      setDraftCollectionTitle("");
      setCollectionTitleSelection(undefined);
    } catch (e) {
      setNewCollectionError(
        e instanceof Error ? e.message : "Erro ao criar coleção"
      );
    } finally {
      setIsSavingCollectionTitle(false);
    }
  };

  // Estado de erro para nova coleção
  const [newCollectionError, setNewCollectionError] = useState("");

  const saveCollectionTitle = async (collectionId: string) => {
    if (!canEdit) return;
    const nextName = (draftCollectionTitle ?? "").trim();
    if (!nextName) {
      Alert.alert("Nome inválido", "O título da coleção não pode ficar vazio.");
      return;
    }

    setIsSavingCollectionTitle(true);
    try {
      const res = await supabase
        .from("collections")
        .update({ name: nextName })
        .eq("id", collectionId)
        .select("id, name")
        .single();

      if (res.error) {
        throw new Error(
          typeof res.error.message === "string"
            ? res.error.message
            : "Erro ao atualizar título da coleção"
        );
      }

      const savedName =
        (typeof res.data?.name === "string" && res.data.name.trim()) ||
        nextName;

      setCollections((prev) =>
        prev.map((c) => {
          if (c.id !== collectionId) return c;
          return { ...c, name: savedName };
        })
      );

      setEditingCollectionId(null);
      setDraftCollectionTitle("");
      setCollectionTitleSelection(undefined);
    } catch (e) {
      if (__DEV__) {
        console.info("[Terreiro] erro ao salvar título da coleção", {
          collectionId,
          error: e instanceof Error ? e.message : String(e),
        });
      }

      Alert.alert(
        "Erro",
        e instanceof Error
          ? e.message
          : "Não foi possível atualizar o título da coleção."
      );
    } finally {
      setIsSavingCollectionTitle(false);
    }
  };

  const saveTitle = async () => {
    if (!canEdit) return;
    if (!terreiroId) return;

    const nextName = (draftTitle ?? "").trim();
    if (!nextName) {
      Alert.alert("Nome inválido", "O nome do terreiro não pode ficar vazio.");
      return;
    }

    setIsSavingTitle(true);
    try {
      const res = await supabase
        .from("terreiros")
        .update({ name: nextName })
        .eq("id", terreiroId)
        .select("id, name")
        .single();

      if (res.error) {
        throw new Error(
          typeof res.error.message === "string"
            ? res.error.message
            : "Erro ao atualizar nome do terreiro"
        );
      }

      const savedName =
        (typeof res.data?.name === "string" && res.data.name.trim()) ||
        nextName;

      if (
        activeContext.kind === "TERREIRO_PAGE" &&
        activeContext.terreiroId === terreiroId
      ) {
        setActiveContext({
          kind: "TERREIRO_PAGE",
          terreiroId,
          terreiroName: savedName,
          terreiroAvatarUrl: activeContext.terreiroAvatarUrl,
        });
      }

      setIsEditingTitle(false);
    } catch (e) {
      if (__DEV__) {
        console.info("[Terreiro] erro ao salvar título", {
          terreiroId,
          error: e instanceof Error ? e.message : String(e),
        });
      }

      Alert.alert(
        "Erro",
        e instanceof Error
          ? e.message
          : "Não foi possível atualizar o nome do terreiro."
      );
    } finally {
      setIsSavingTitle(false);
    }
  };

  return (
    <SaravafyScreen variant={variant}>
      <View style={styles.screen}>
        <AppHeaderWithPreferences />

        <View style={styles.container}>
          <View style={styles.contextHeader}>
            <View style={styles.titleRow}>
              <View style={styles.titleLeft}>
                {isEditingTitle ? (
                  <View
                    style={[
                      styles.titleEditWrap,
                      {
                        backgroundColor: titleInputBg,
                        borderColor: titleInputBorder,
                      },
                    ]}
                  >
                    <TextInput
                      ref={(node) => {
                        titleInputRef.current = node;
                      }}
                      value={draftTitle}
                      onChangeText={setDraftTitle}
                      style={[styles.titleInput, { color: textPrimary }]}
                      placeholder="Nome do terreiro"
                      placeholderTextColor={textSecondary}
                      selectionColor={accentColor}
                      multiline={false}
                      numberOfLines={1}
                      autoCorrect={false}
                      autoCapitalize="sentences"
                      editable={!isSavingTitle}
                      autoFocus
                      selection={titleSelection}
                      onSelectionChange={(e) => {
                        setTitleSelection(e.nativeEvent.selection);
                      }}
                      onSubmitEditing={() => {
                        saveTitle();
                      }}
                    />
                  </View>
                ) : (
                  <Text
                    style={[styles.title, { color: textPrimary }]}
                    numberOfLines={2}
                  >
                    {terreiroName}
                  </Text>
                )}

                {canEdit && !isEditingTitle ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Editar título do terreiro"
                    hitSlop={10}
                    onPress={startEditTitle}
                    style={({ pressed }) => [
                      styles.brushButton,
                      pressed ? styles.iconButtonPressed : null,
                    ]}
                  >
                    <Ionicons name="brush" size={18} color={accentColor} />
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.headerActions}>
                {isEditingTitle ? (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Cancelar edição"
                      hitSlop={10}
                      onPress={cancelEditTitle}
                      disabled={isSavingTitle}
                      style={({ pressed }) => [
                        styles.iconButton,
                        pressed ? styles.iconButtonPressed : null,
                        isSavingTitle ? styles.iconButtonDisabled : null,
                      ]}
                    >
                      <Ionicons name="close" size={20} color={textMuted} />
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Salvar título"
                      hitSlop={10}
                      onPress={() => {
                        saveTitle();
                      }}
                      disabled={isSavingTitle}
                      style={({ pressed }) => [
                        styles.iconButton,
                        pressed ? styles.iconButtonPressed : null,
                        isSavingTitle ? styles.iconButtonDisabled : null,
                      ]}
                    >
                      <Ionicons
                        name="checkmark"
                        size={22}
                        color={accentColor}
                      />
                    </Pressable>
                  </>
                ) : isAdminOrEditor ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      viewMode === "read_only_preview"
                        ? "Desativar visualização como visitante"
                        : "Ativar visualização como visitante"
                    }
                    accessibilityHint="Alterna entre editar e visualizar como visitante"
                    hitSlop={10}
                    onPress={() => {
                      if (
                        !viewAsVisitorOnboardingDismissed &&
                        viewMode === "edit"
                      ) {
                        setIsViewAsVisitorInfoOpen(true);
                        setViewAsVisitorDontShowAgain(false);
                        return;
                      }
                      setViewMode((prev) =>
                        prev === "edit" ? "read_only_preview" : "edit"
                      );
                    }}
                    style={({ pressed }) => [
                      styles.iconButton,
                      pressed ? styles.iconButtonPressed : null,
                    ]}
                  >
                    <Ionicons
                      name={
                        viewMode === "read_only_preview" ? "eye" : "eye-outline"
                      }
                      size={20}
                      color={accentColor}
                      style={{
                        opacity: viewMode === "read_only_preview" ? 1 : 0.85,
                      }}
                    />
                  </Pressable>
                ) : null}
                {/* Modal explicativo do modo visitante */}
                <BottomSheet
                  visible={isViewAsVisitorInfoOpen}
                  variant={variant}
                  onClose={() => setIsViewAsVisitorInfoOpen(false)}
                >
                  <View>
                    <Text style={[styles.sheetTitle, { color: textPrimary }]}>
                      Visualizar como visitante
                    </Text>
                    <Text style={[styles.infoText, { color: textSecondary }]}>
                      Ao ativar esse modo, a página será exibida exatamente como
                      uma pessoa que não é dona do terreiro veria. Todas as
                      opções de edição ficarão ocultas temporariamente. Nenhuma
                      permissão real será alterada.
                    </Text>
                    <View style={styles.infoButtons}>
                      <Pressable
                        accessibilityRole="checkbox"
                        onPress={() => setViewAsVisitorDontShowAgain((v) => !v)}
                        style={[
                          styles.infoCheckboxRow,
                          viewAsVisitorDontShowAgain &&
                            styles.infoCheckboxRowChecked,
                        ]}
                      >
                        <View
                          style={[
                            styles.infoCheckbox,
                            viewAsVisitorDontShowAgain &&
                              styles.infoCheckboxChecked,
                          ]}
                        >
                          {viewAsVisitorDontShowAgain ? (
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color={colors.paper50}
                            />
                          ) : null}
                        </View>
                        <Text
                          style={[
                            styles.infoCheckboxLabel,
                            { color: textPrimary },
                          ]}
                        >
                          Não exibir essa mensagem novamente
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          if (viewAsVisitorDontShowAgain) {
                            persistViewAsVisitorOnboarding(true);
                          }
                          setIsViewAsVisitorInfoOpen(false);
                          setTimeout(() => {
                            setViewMode("read_only_preview");
                          }, 150);
                        }}
                        style={[styles.infoBtn, styles.infoBtnPrimary]}
                      >
                        <Text
                          style={{
                            color: colors.paper50,
                            fontWeight: "bold",
                            fontSize: 16,
                          }}
                        >
                          Entendi
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </BottomSheet>
              </View>
            </View>
            <Text
              style={[styles.subtitle, { color: textSecondary }]}
              numberOfLines={1}
            >
              {headerSubtitle}
            </Text>
          </View>

          <View style={styles.sectionGap} />

          <View style={[styles.sectionTitleRow]}>
            <Text style={[styles.sectionTitle, { color: textMuted }]}>
              Coleções
            </Text>
            {canEdit && !creatingCollection && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Nova coleção"
                hitSlop={10}
                onPress={() => {
                  // Cria um id temporário único
                  const tempId = `new-${Date.now()}`;
                  setCreatingCollection({ id: tempId, name: "", isNew: true });
                  setEditingCollectionId(tempId);
                  setDraftCollectionTitle("");
                  setCollectionTitleSelection({ start: 0, end: 0 });
                }}
                style={({ pressed }) => [
                  styles.newCollectionButton,
                  pressed ? styles.iconButtonPressed : null,
                ]}
              >
                <Ionicons
                  name="add"
                  size={18}
                  color={accentColor}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.newCollectionButtonText,
                    { color: accentColor },
                  ]}
                >
                  Nova coleção
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.sectionGapSmall} />

          {isLoading ? (
            <Text style={[styles.bodyText, { color: textSecondary }]}>
              Carregando…
            </Text>
          ) : error ? (
            <Text style={[styles.bodyText, { color: textSecondary }]}>
              {error}
            </Text>
          ) : collections.length === 0 && !creatingCollection ? (
            <Text style={[styles.bodyText, { color: textSecondary }]}>
              Nenhuma coleção ainda.
            </Text>
          ) : (
            <FlatList
              data={
                creatingCollection
                  ? [creatingCollection, ...collections]
                  : collections
              }
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isEditingThisCollection = editingCollectionId === item.id;
                const isNew = (item as any).isNew;
                const name =
                  (typeof item.name === "string" && item.name.trim()) ||
                  ("title" in item &&
                    typeof item.title === "string" &&
                    item.title.trim()) ||
                  "Coleção";
                const pontosCount =
                  "pontosCount" in item && typeof item.pontosCount === "number"
                    ? item.pontosCount
                    : 0;

                // Navega para a tela de Collection se a coleção estiver vazia
                const handlePress = () => {
                  if (!isEditingThisCollection && !isNew && pontosCount === 0) {
                    router.push({
                      pathname: "/collection/[id]",
                      params: { id: item.id, name },
                    });
                  }
                };

                return (
                  <View style={styles.cardGap}>
                    <SurfaceCard variant={variant}>
                      <Pressable
                        onPress={handlePress}
                        disabled={
                          isEditingThisCollection || isNew || pontosCount !== 0
                        }
                        style={{ flex: 1 }}
                      >
                        <View style={styles.cardHeaderRow}>
                          {isEditingThisCollection ? (
                            <View
                              style={[
                                styles.collectionEditWrap,
                                {
                                  backgroundColor: titleInputBg,
                                  borderColor: titleInputBorder,
                                },
                              ]}
                            >
                              <TextInput
                                ref={(node) => {
                                  collectionTitleInputRef.current = node;
                                }}
                                value={draftCollectionTitle}
                                onChangeText={setDraftCollectionTitle}
                                style={[
                                  styles.collectionTitleInput,
                                  { color: textPrimary },
                                ]}
                                placeholder="Nome da coleção"
                                placeholderTextColor={textSecondary}
                                selectionColor={accentColor}
                                multiline={false}
                                numberOfLines={1}
                                autoCorrect={false}
                                autoCapitalize="sentences"
                                editable={!isSavingCollectionTitle}
                                autoFocus
                                selection={collectionTitleSelection}
                                onSelectionChange={(e) => {
                                  setCollectionTitleSelection(
                                    e.nativeEvent.selection
                                  );
                                }}
                                onSubmitEditing={() => {
                                  if (isNew) {
                                    saveNewCollection();
                                  } else {
                                    saveCollectionTitle(item.id);
                                  }
                                }}
                              />
                            </View>
                          ) : (
                            <Text
                              style={[styles.cardTitle, { color: textPrimary }]}
                              numberOfLines={2}
                            >
                              {name}
                            </Text>
                          )}

                          {canEdit && !isEditingThisCollection && !isNew ? (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="Abrir menu da coleção"
                              accessibilityHint="Opções: editar ou excluir"
                              hitSlop={10}
                              onPress={() => {
                                openCollectionActions(item);
                              }}
                              style={({ pressed }) => [
                                styles.menuButton,
                                pressed ? styles.iconButtonPressed : null,
                              ]}
                            >
                              <Ionicons
                                name="ellipsis-vertical"
                                size={18}
                                color={accentColor}
                              />
                            </Pressable>
                          ) : canEdit && isEditingThisCollection ? (
                            <View style={styles.collectionEditActions}>
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Cancelar edição"
                                hitSlop={10}
                                onPress={() => {
                                  if (isNew) {
                                    setCreatingCollection(null);
                                    setEditingCollectionId(null);
                                    setDraftCollectionTitle("");
                                    setCollectionTitleSelection(undefined);
                                  } else {
                                    cancelEditCollectionTitle();
                                  }
                                }}
                                disabled={isSavingCollectionTitle}
                                style={({ pressed }) => [
                                  styles.collectionActionButton,
                                  pressed ? styles.iconButtonPressed : null,
                                  isSavingCollectionTitle
                                    ? styles.iconButtonDisabled
                                    : null,
                                ]}
                              >
                                <Ionicons
                                  name="close"
                                  size={18}
                                  color={textMuted}
                                />
                              </Pressable>

                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Salvar título"
                                hitSlop={10}
                                onPress={() => {
                                  if (isNew) {
                                    saveNewCollection();
                                  } else {
                                    saveCollectionTitle(item.id);
                                  }
                                }}
                                disabled={isSavingCollectionTitle}
                                style={({ pressed }) => [
                                  styles.collectionActionButton,
                                  pressed ? styles.iconButtonPressed : null,
                                  isSavingCollectionTitle
                                    ? styles.iconButtonDisabled
                                    : null,
                                ]}
                              >
                                <Ionicons
                                  name="checkmark"
                                  size={20}
                                  color={accentColor}
                                />
                              </Pressable>
                              {isNew && newCollectionError ? (
                                <Text
                                  style={{
                                    color: dangerColor,
                                    marginTop: 4,
                                    fontSize: 13,
                                  }}
                                >
                                  {newCollectionError}
                                </Text>
                              ) : null}
                            </View>
                          ) : null}
                        </View>
                        <Text
                          style={[
                            styles.cardDescription,
                            { color: textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {pontosCount} pontos
                        </Text>
                      </Pressable>
                    </SurfaceCard>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>

      <BottomSheet
        visible={isCollectionActionsOpen}
        variant={variant}
        onClose={closeCollectionActions}
      >
        <View>
          <Text style={[styles.sheetTitle, { color: textPrimary }]}>
            Coleção
          </Text>
          {collectionActionsTarget?.name ? (
            <Text style={[styles.sheetSubtitle, { color: textSecondary }]}>
              {collectionActionsTarget.name}
            </Text>
          ) : null}

          <View style={styles.sheetActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Editar coleção"
              hitSlop={10}
              onPress={() => {
                const target = collectionActionsTarget;
                closeCollectionActions();
                if (!target) return;
                setTimeout(() => {
                  startEditCollectionTitle(target);
                }, 80);
              }}
              style={({ pressed }) => [
                styles.sheetActionRow,
                pressed ? styles.sheetActionPressed : null,
              ]}
            >
              <Ionicons name="brush" size={18} color={accentColor} />
              <Text style={[styles.sheetActionText, { color: textPrimary }]}>
                Editar
              </Text>
            </Pressable>

            <Separator variant={variant} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Excluir coleção"
              hitSlop={10}
              onPress={() => {
                const target = collectionActionsTarget;
                closeCollectionActions();
                if (!target) return;
                setCollectionPendingDelete(target);
                setTimeout(() => {
                  setIsConfirmDeleteCollectionOpen(true);
                }, 80);
              }}
              style={({ pressed }) => [
                styles.sheetActionRow,
                pressed ? styles.sheetActionPressed : null,
              ]}
            >
              <Ionicons name="trash" size={18} color={dangerColor} />
              <Text style={[styles.sheetActionText, { color: dangerColor }]}>
                Excluir
              </Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={isConfirmDeleteCollectionOpen}
        variant={variant}
        onClose={closeConfirmDeleteCollection}
      >
        <View>
          <Text style={[styles.sheetTitle, { color: warningColor }]}>
            Excluir coleção?
          </Text>
          {collectionPendingDelete?.name ? (
            <Text style={[styles.sheetSubtitle, { color: textSecondary }]}>
              {collectionPendingDelete.name}
            </Text>
          ) : null}

          <Text style={[styles.confirmText, { color: textSecondary }]}>
            Esta ação é permanente. Dseja prosseguir?
          </Text>

          <View style={styles.sheetActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
              hitSlop={10}
              onPress={closeConfirmDeleteCollection}
              disabled={isDeletingCollection}
              style={({ pressed }) => [
                styles.sheetActionRow,
                pressed ? styles.sheetActionPressed : null,
                isDeletingCollection ? styles.sheetActionDisabled : null,
              ]}
            >
              <Ionicons name="close" size={18} color={textMuted} />
              <Text style={[styles.sheetActionText, { color: textPrimary }]}>
                Cancelar
              </Text>
            </Pressable>

            <Separator variant={variant} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirmar exclusão"
              hitSlop={10}
              disabled={isDeletingCollection}
              onPress={() => {
                if (!collectionPendingDelete) return;
                deleteCollection(collectionPendingDelete);
              }}
              style={({ pressed }) => [
                styles.sheetActionRow,
                pressed ? styles.sheetActionPressed : null,
                isDeletingCollection ? styles.sheetActionDisabled : null,
              ]}
            >
              <Ionicons name="trash" size={18} color={dangerColor} />
              <Text style={[styles.sheetActionText, { color: dangerColor }]}>
                Excluir
              </Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>
      {/* Modal explicativo do modo visitante */}
      <BottomSheet
        visible={isViewAsVisitorInfoOpen}
        variant={variant}
        onClose={() => setIsViewAsVisitorInfoOpen(false)}
      >
        <View>
          <Text style={[styles.sheetTitle, { color: textPrimary }]}>
            Visualizar como visitante
          </Text>
          <Text style={[styles.infoText, { color: textSecondary }]}>
            Ao ativar esse modo, a página será exibida exatamente como uma
            pessoa que não é dona do terreiro veria. Todas as opções de edição
            ficarão ocultas temporariamente. Nenhuma permissão real será
            alterada.
          </Text>
          <View style={styles.infoButtons}>
            <Pressable
              accessibilityRole="checkbox"
              onPress={() => setViewAsVisitorDontShowAgain((v) => !v)}
              style={[
                styles.infoCheckboxRow,
                viewAsVisitorDontShowAgain && {
                  backgroundColor: accentColor + "22",
                },
              ]}
            >
              <View
                style={[
                  styles.infoCheckbox,
                  { borderColor: accentColor },
                  viewAsVisitorDontShowAgain && {
                    backgroundColor: accentColor,
                    borderColor: accentColor,
                  },
                ]}
              >
                {viewAsVisitorDontShowAgain ? (
                  <Ionicons name="checkmark" size={16} color={colors.paper50} />
                ) : null}
              </View>
              <Text style={[styles.infoCheckboxLabel, { color: textPrimary }]}>
                Não exibir essa mensagem novamente
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (viewAsVisitorDontShowAgain) {
                  persistViewAsVisitorOnboarding(true);
                }
                setIsViewAsVisitorInfoOpen(false);
                setTimeout(() => {
                  setViewMode("read_only_preview");
                }, 150);
              }}
              style={[
                styles.infoBtn,
                styles.infoBtnPrimary,
                { backgroundColor: accentColor },
              ]}
            >
              <Text
                style={{
                  color: colors.paper50,
                  fontWeight: "bold",
                  fontSize: 16,
                }}
              >
                Entendi
              </Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>
    </SaravafyScreen>
  );
}

const styles = StyleSheet.create({
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  newCollectionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "transparent",
  },
  newCollectionButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  // --- Estilos para o modal explicativo do modo visitante ---
  // sheetTitle já existe acima, não duplicar
  infoText: {
    fontSize: 15,
    marginBottom: 20,
    textAlign: "center",
  },
  infoButtons: {
    marginTop: 8,
    gap: 12,
    alignItems: "center",
  },
  infoBtn: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBtnPrimary: {
    // backgroundColor definido inline
  },
  infoCheckboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRadius: 6,
  },
  infoCheckboxRowChecked: {
    // backgroundColor definido inline
  },
  infoCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    // borderColor definido inline
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2,
    backgroundColor: colors.paper50,
  },
  infoCheckboxChecked: {
    // backgroundColor e borderColor definidos inline
  },
  // --- JSX do modal explicativo do modo visitante (deve estar dentro do componente, não do objeto de estilos) ---
  infoCheckboxLabel: {
    fontSize: 15,
  },
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBrand: {
    height: 24,
    width: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  headerLogo: {
    height: 18,
    width: 18,
  },
  headerIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: 220,
  },
  headerIdentityText: {
    fontSize: 13,
    fontWeight: "700",
    maxWidth: 160,
    opacity: 0.95,
  },
  avatarWrap: {
    borderRadius: 999,
    overflow: "hidden",
  },
  avatarImage: {
    width: 32,
    height: 32,
    resizeMode: "cover",
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPlaceholderDark: {
    backgroundColor: colors.inputBgDark,
  },
  avatarPlaceholderLight: {
    borderColor: colors.surfaceCardBorderLight,
    backgroundColor: colors.paper100,
  },
  avatarInitials: {
    fontSize: 12,
    fontWeight: "700",
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  contextHeader: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  titleLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: 2,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonDisabled: {
    opacity: 0.55,
  },
  brushButton: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  iconButtonPressed: {
    opacity: 0.7,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.2,
    flex: 1,
    minWidth: 0,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.2,
    flex: 1,
    minWidth: 0,
    lineHeight: 26,
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  titleEditWrap: {
    flex: 1,
    minWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 44,
    paddingVertical: 0,
    justifyContent: "center",
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: 13,
    fontWeight: "500",
  },
  sectionGap: {
    height: spacing.xl,
  },
  sectionGapSmall: {
    height: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  cardGap: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    minWidth: 0,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  collectionEditWrap: {
    flex: 1,
    minWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
    paddingVertical: 0,
    justifyContent: "center",
  },
  collectionTitleInput: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.1,
    lineHeight: 20,
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  collectionEditActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -2,
    marginRight: -6,
  },
  collectionActionButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -4,
    marginRight: -6,
  },
  cardDescription: {
    marginTop: spacing.xs,
    fontSize: 13,
    lineHeight: 18,
  },

  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  sheetSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.9,
    marginBottom: spacing.md,
  },
  sheetActions: {
    gap: 2,
  },
  sheetActionRow: {
    minHeight: 48,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  sheetActionText: {
    fontSize: 14,
    fontWeight: "800",
  },
  sheetActionPressed: {
    opacity: 0.75,
  },
  sheetActionDisabled: {
    opacity: 0.5,
  },

  confirmText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
});
