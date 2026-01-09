import { useAuth } from "@/contexts/AuthContext";
import { useGestureBlock } from "@/contexts/GestureBlockContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { BottomSheet } from "@/src/components/BottomSheet";
import { Separator } from "@/src/components/Separator";
import { ShareBottomSheet } from "@/src/components/ShareBottomSheet";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { useTerreiroMembershipStatus } from "@/src/hooks/terreiroMembership";
import {
  cancelQueries,
  patchById,
  removeById,
  replaceId,
  rollbackQueries,
  setQueriesDataSafe,
  snapshotQueries,
} from "@/src/queries/mutationUtils";
import { queryKeys } from "@/src/queries/queryKeys";
import {
  useCollectionsByTerreiroQuery,
  type TerreiroCollectionCard,
} from "@/src/queries/terreirosCollections";
import { colors, spacing } from "@/src/theme";
import { buildShareMessageForTerreiro } from "@/src/utils/shareContent";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function Terreiro() {
  type NewCollectionRow = {
    id: string;
    title: string;
    isNew: true;
  };

  const router = useRouter();
  const { shouldBlockPress } = useGestureBlock();
  const params = useLocalSearchParams<{
    bootStart?: string;
    bootOffline?: string;
    terreiroId?: string;
    terreiroTitle?: string;
  }>();
  const { showToast } = useToast();
  const { effectiveTheme, clearStartPageSnapshotOnly } = usePreferences();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const variant = effectiveTheme;

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;
  const textMuted =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;

  const resolvedTerreiroId =
    typeof params.terreiroId === "string" ? params.terreiroId : "";

  const resolvedTerreiroName =
    typeof params.terreiroTitle === "string" ? params.terreiroTitle : undefined;

  const terreiroName = resolvedTerreiroName ?? "Terreiro";

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  const openShare = useCallback(async () => {
    setIsTerreiroMenuOpen(false);

    try {
      const message = await buildShareMessageForTerreiro({
        terreiroId: resolvedTerreiroId,
        terreiroName,
      });
      setShareMessage(message);
    } catch (e) {
      if (__DEV__) {
        console.info("[Terreiro] erro ao gerar mensagem de share", {
          error: e instanceof Error ? e.message : String(e),
        });
      }

      setShareMessage(`Olha o terreiro “${terreiroName}” no Saravafy.`);
    }

    setIsShareOpen(true);
  }, [resolvedTerreiroId, terreiroName]);

  const terreiroId = resolvedTerreiroId;
  const membershipQuery = useTerreiroMembershipStatus(terreiroId);
  const membership = membershipQuery.data;
  const myRole = membership.role;
  const isAdminOrEditor =
    membership.isActiveMember && (myRole === "admin" || myRole === "editor");
  const isAdmin = membership.isActiveMember && myRole === "admin";

  const wasActiveMemberRef = useRef(false);

  useEffect(() => {
    if (!terreiroId) return;
    if (!userId) return;
    if (membershipQuery.isLoading) return;

    const wasActive = wasActiveMemberRef.current;
    const isActive = membership.isActiveMember;

    if (wasActive && !isActive) {
      showToast("Seu acesso a este terreiro foi removido.");
      router.replace("/(app)/(tabs)/(pontos)" as any);
    }

    wasActiveMemberRef.current = isActive;
  }, [
    membership.isActiveMember,
    membershipQuery.isLoading,
    router,
    terreiroId,
    userId,
    showToast,
  ]);

  const [isTerreiroMenuOpen, setIsTerreiroMenuOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setIsTerreiroMenuOpen(false);
      };
    }, [])
  );

  const canEdit = isAdminOrEditor;

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
    useState<TerreiroCollectionCard | null>(null);

  const [isConfirmDeleteCollectionOpen, setIsConfirmDeleteCollectionOpen] =
    useState(false);
  const [collectionPendingDelete, setCollectionPendingDelete] =
    useState<TerreiroCollectionCard | null>(null);
  const [isDeletingCollection, setIsDeletingCollection] = useState(false);

  const [creatingCollection, setCreatingCollection] =
    useState<NewCollectionRow | null>(null);

  const queryClient = useQueryClient();
  const collectionsQuery = useCollectionsByTerreiroQuery(terreiroId || null);
  const collections = collectionsQuery.data ?? [];

  const mergedCollections: Array<TerreiroCollectionCard | NewCollectionRow> =
    creatingCollection &&
    !collections.some((c) => c.id === creatingCollection.id)
      ? [creatingCollection, ...collections]
      : collections;

  useEffect(() => {
    if (!canEdit) {
      if (editingCollectionId) {
        setEditingCollectionId(null);
      }

      if (creatingCollection) {
        setCreatingCollection(null);
        setDraftCollectionTitle("");
        setCollectionTitleSelection(undefined);
      }
    }
  }, [canEdit, editingCollectionId, creatingCollection]);

  useEffect(() => {
    if (terreiroId) return;
    if (params.bootStart === "1") return;

    router.replace("/(app)/(tabs)/(pontos)" as any);
  }, [params.bootStart, router, terreiroId]);

  // Boot offline: se abrimos via snapshot e o fetch falhar, volta para Pontos.
  useEffect(() => {
    if (!resolvedTerreiroId) return;
    if (params.bootOffline !== "1") return;
    if (!collectionsQuery.isError) return;

    clearStartPageSnapshotOnly().catch(() => undefined);
    router.replace("/(app)/(tabs)/(pontos)" as any);
  }, [
    clearStartPageSnapshotOnly,
    collectionsQuery.isError,
    params.bootOffline,
    resolvedTerreiroId,
    router,
  ]);

  const accentColor = colors.brass600;
  const dangerColor = colors.danger;
  const warningColor = colors.warning;
  const titleInputBg =
    variant === "light" ? colors.inputBgLight : colors.inputBgDark;
  const titleInputBorder =
    variant === "light" ? colors.inputBorderLight : colors.inputBorderDark;

  const openCollectionActions = (collection: TerreiroCollectionCard) => {
    if (!canEdit) return;
    setCollectionActionsTarget(collection);
    setIsCollectionActionsOpen(true);
  };

  const canDeleteCollection = useCallback(
    (collection: TerreiroCollectionCard | null) => {
      if (!isAdminOrEditor) return false;
      const ownerTerreiroId =
        typeof collection?.owner_terreiro_id === "string"
          ? collection.owner_terreiro_id
          : "";
      if (!ownerTerreiroId) return false;
      if (!terreiroId) return false;
      return ownerTerreiroId === terreiroId;
    },
    [isAdminOrEditor, terreiroId]
  );

  const closeCollectionActions = () => {
    setIsCollectionActionsOpen(false);
    setCollectionActionsTarget(null);
  };

  const closeConfirmDeleteCollection = () => {
    setIsConfirmDeleteCollectionOpen(false);
    setCollectionPendingDelete(null);
  };

  const deleteCollectionMutation = useMutation({
    mutationFn: async (collection: TerreiroCollectionCard) => {
      const res = await supabase.rpc("delete_collection", {
        p_collection_id: collection.id,
      });

      if (res.error) {
        throw new Error(
          typeof res.error.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Não foi possível excluir a coleção."
        );
      }

      const data: any = res.data;
      const ok =
        data === true ||
        (data && typeof data === "object" && "ok" in data && data.ok === true);

      if (!ok) {
        const message =
          data &&
          typeof data === "object" &&
          typeof data.error === "string" &&
          data.error.trim()
            ? data.error
            : "Não foi possível excluir a coleção.";
        throw new Error(message);
      }

      return { id: collection.id };
    },
    onMutate: async (collection) => {
      if (!terreiroId) return null;

      const filters = [
        { queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId) },
      ];

      await cancelQueries(queryClient, filters);
      const snapshot = snapshotQueries(queryClient, filters);

      setQueriesDataSafe<TerreiroCollectionCard[]>(
        queryClient,
        { queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId) },
        (old) => removeById(old ?? [], collection.id)
      );

      return { snapshot };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.snapshot) rollbackQueries(queryClient, ctx.snapshot);

      if (__DEV__) {
        console.info("[Terreiro] erro ao excluir coleção", {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      showToast(
        err instanceof Error
          ? err.message
          : "Não foi possível excluir a coleção."
      );
    },
    onSuccess: (_data, vars) => {
      if (editingCollectionId === vars.id) {
        cancelEditCollectionTitle();
      }

      showToast("Coleção excluída.");
      closeConfirmDeleteCollection();
    },
    onSettled: (_data, _error, vars) => {
      if (!terreiroId) return;
      queryClient.invalidateQueries({
        queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId),
      });

      if (vars?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.collections.byId(vars.id),
        });
      }

      if (userId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.collections.accountable(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.collections.editableByUserPrefix(userId),
        });
      }
    },
  });

  const deleteCollection = async (collection: TerreiroCollectionCard) => {
    if (!canDeleteCollection(collection)) {
      showToast("Você não tem permissão para excluir esta coleção.");
      return;
    }
    setIsDeletingCollection(true);
    try {
      await deleteCollectionMutation.mutateAsync(collection);
    } finally {
      setIsDeletingCollection(false);
    }
  };

  useEffect(() => {
    if (!editingCollectionId) return;

    const id = setTimeout(() => {
      collectionTitleInputRef.current?.focus();
    }, 50);

    return () => {
      clearTimeout(id);
    };
  }, [editingCollectionId]);

  const startEditCollectionTitle = (collection: TerreiroCollectionCard) => {
    if (!canEdit) return;
    const current =
      (typeof collection.title === "string" && collection.title.trim()) || "";

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

  const createCollectionMutation = useMutation({
    mutationFn: async (vars: { title: string; tempId: string }) => {
      const res = await supabase
        .from("collections")
        .insert({
          title: vars.title,
          owner_terreiro_id: terreiroId,
          owner_user_id: null,
        })
        .select("id, title, description, visibility, owner_terreiro_id")
        .single();

      if (res.error || !res.data?.id) {
        throw new Error(res.error?.message || "Erro ao criar coleção");
      }

      return {
        id: res.data.id as string,
        title: typeof res.data.title === "string" ? res.data.title : vars.title,
        description:
          typeof (res.data as any).description === "string"
            ? ((res.data as any).description as string)
            : null,
        visibility:
          typeof (res.data as any).visibility === "string"
            ? ((res.data as any).visibility as string)
            : null,
        owner_terreiro_id:
          typeof (res.data as any).owner_terreiro_id === "string"
            ? ((res.data as any).owner_terreiro_id as string)
            : terreiroId,
      };
    },
    onMutate: async (vars) => {
      if (!terreiroId) return null;

      const optimistic: TerreiroCollectionCard = {
        id: vars.tempId,
        title: vars.title,
        description: null,
        visibility: null,
        owner_terreiro_id: terreiroId,
        pontosCount: 0,
      };

      const filters = [
        { queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId) },
      ];

      await cancelQueries(queryClient, filters);
      const snapshot = snapshotQueries(queryClient, filters);

      setQueriesDataSafe<TerreiroCollectionCard[]>(
        queryClient,
        { queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId) },
        (old) => [optimistic, ...(old ?? [])]
      );

      return { snapshot, tempId: vars.tempId };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.snapshot) rollbackQueries(queryClient, ctx.snapshot);
      setNewCollectionError(
        err instanceof Error ? err.message : "Erro ao criar coleção"
      );
    },
    onSuccess: (data, _vars, ctx) => {
      if (!terreiroId) return;
      const tempId = ctx?.tempId;
      if (!tempId) return;

      setQueriesDataSafe<TerreiroCollectionCard[]>(
        queryClient,
        { queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId) },
        (old) => {
          const replaced = replaceId(old ?? [], tempId, data.id);
          return patchById(replaced, data.id, {
            title: data.title,
            description: data.description,
            visibility: data.visibility,
            owner_terreiro_id: data.owner_terreiro_id,
          });
        }
      );

      // Se estávamos editando a coleção recém-criada, encerra edição.
      if (editingCollectionId === tempId) {
        setEditingCollectionId(null);
        setDraftCollectionTitle("");
        setCollectionTitleSelection(undefined);
      }
      setCreatingCollection(null);
      setNewCollectionError("");
    },
    onSettled: (_data, _err, _vars, ctx) => {
      if (!terreiroId) return;

      // Se o optimistic ficou órfão, limpa.
      if (ctx?.tempId) {
        setQueriesDataSafe<TerreiroCollectionCard[]>(
          queryClient,
          { queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId) },
          (old) => removeById(old ?? [], ctx.tempId)
        );
      }

      queryClient.invalidateQueries({
        queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId),
      });
    },
  });

  const updateCollectionTitleMutation = useMutation({
    mutationFn: async (vars: { collectionId: string; title: string }) => {
      const res = await supabase
        .from("collections")
        .update({ title: vars.title })
        .eq("id", vars.collectionId)
        .select("id, title")
        .single();

      if (res.error) {
        throw new Error(
          typeof res.error.message === "string"
            ? res.error.message
            : "Erro ao atualizar título da coleção"
        );
      }

      const savedTitle =
        (typeof res.data?.title === "string" && res.data.title.trim()) ||
        vars.title;

      return { id: vars.collectionId, title: savedTitle };
    },
    onMutate: async (vars) => {
      if (!terreiroId) return null;
      const filters = [
        { queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId) },
      ];

      await cancelQueries(queryClient, filters);
      const snapshot = snapshotQueries(queryClient, filters);

      setQueriesDataSafe<TerreiroCollectionCard[]>(
        queryClient,
        { queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId) },
        (old) => patchById(old ?? [], vars.collectionId, { title: vars.title })
      );

      return { snapshot };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.snapshot) rollbackQueries(queryClient, ctx.snapshot);

      if (__DEV__) {
        console.info("[Terreiro] erro ao salvar título da coleção", {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      Alert.alert(
        "Erro",
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar o título da coleção."
      );
    },
    onSuccess: (data) => {
      if (!terreiroId) return;
      setQueriesDataSafe<TerreiroCollectionCard[]>(
        queryClient,
        { queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId) },
        (old) => patchById(old ?? [], data.id, { title: data.title })
      );

      setEditingCollectionId(null);
      setDraftCollectionTitle("");
      setCollectionTitleSelection(undefined);
    },
    onSettled: () => {
      if (!terreiroId) return;
      queryClient.invalidateQueries({
        queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId),
      });
    },
  });

  // Criação de nova coleção (Supabase)
  const saveNewCollection = async () => {
    if (!canEdit) return;
    if (!creatingCollection) return;
    const title = (draftCollectionTitle ?? "").trim();
    if (!title) {
      setNewCollectionError("O título não pode ficar vazio.");
      return;
    }
    setIsSavingCollectionTitle(true);
    setNewCollectionError("");
    try {
      await createCollectionMutation.mutateAsync({
        title,
        tempId: creatingCollection.id,
      });
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
      await updateCollectionTitleMutation.mutateAsync({
        collectionId,
        title: nextName,
      });
    } catch (e) {
      // onError do mutation já cuida de rollback + alert
    } finally {
      setIsSavingCollectionTitle(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.contextHeader}>
          <View style={styles.titleRow}>
            <View style={styles.titleLeft}>
              <Text
                style={[styles.title, { color: textPrimary }]}
                numberOfLines={2}
              >
                {terreiroName}
              </Text>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Abrir menu do terreiro"
                hitSlop={10}
                onPress={() => setIsTerreiroMenuOpen(true)}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed ? styles.iconButtonPressed : null,
                ]}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={20}
                  color={textMuted}
                />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.sectionGap} />

        <View style={[styles.sectionTitleRow]}>
          <Text style={[styles.sectionTitle, { color: textMuted }]}>
            Coleções
          </Text>
          {canEdit && collections.length > 0 && !creatingCollection && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Editar ordem das coleções"
              hitSlop={10}
              onPress={() => {
                if (shouldBlockPress()) return;
                if (!terreiroId) return;

                router.push({
                  pathname:
                    "/terreiro-collections/[terreiroId]/edit" as any,
                  params: { terreiroId },
                });
              }}
              style={({ pressed }) => [
                styles.newCollectionButton,
                pressed ? styles.iconButtonPressed : null,
              ]}
            >
              <Ionicons
                name="swap-vertical"
                size={18}
                color={accentColor}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[styles.newCollectionButtonText, { color: accentColor }]}
              >
                Editar
              </Text>
            </Pressable>
          )}
          {canEdit && !creatingCollection && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nova coleção"
              hitSlop={10}
              onPress={() => {
                // Cria um id temporário único
                const tempId = `new-${Date.now()}`;
                setCreatingCollection({ id: tempId, title: "", isNew: true });
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
                style={[styles.newCollectionButtonText, { color: accentColor }]}
              >
                Nova coleção
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.sectionGapSmall} />

        <ShareBottomSheet
          visible={isShareOpen}
          variant={variant}
          message={shareMessage}
          onClose={() => setIsShareOpen(false)}
          showToast={showToast}
        />

        {collectionsQuery.isLoading ? (
          <View style={styles.paddedBlock}>
            <Text style={[styles.bodyText, { color: textSecondary }]}>
              Carregando…
            </Text>
          </View>
        ) : collectionsQuery.isError ? (
          <View style={styles.paddedBlock}>
            <Text style={[styles.bodyText, { color: textSecondary }]}>
              Erro ao carregar as coleções.
            </Text>
          </View>
        ) : collections.length === 0 && !creatingCollection ? (
          <View style={styles.paddedBlock}>
            <Text style={[styles.bodyText, { color: textSecondary }]}>
              Nenhuma coleção ainda.
            </Text>
          </View>
        ) : (
          <FlatList
            data={mergedCollections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isEditingThisCollection = editingCollectionId === item.id;
              const isNew = (item as any).isNew;
              const name =
                ("title" in item &&
                  typeof item.title === "string" &&
                  item.title.trim()) ||
                "Coleção";
              const pontosCount =
                "pontosCount" in item &&
                typeof (item as any).pontosCount === "number"
                  ? ((item as any).pontosCount as number)
                  : 0;

              // Navega para a tela de Collection
              const handlePress = () => {
                const now = Date.now();
                if (shouldBlockPress()) {
                  if (__DEV__) {
                    console.log("[PressGuard] blocked", {
                      screen: "Terreiro",
                      now,
                    });
                  }
                  return;
                }

                if (__DEV__) {
                  console.log("[PressGuard] allowed", {
                    screen: "Terreiro",
                    now,
                  });
                }

                if (!isEditingThisCollection && !isNew) {
                  if (__DEV__) {
                    console.log("[Navigation] click -> /collection/[id]", {
                      screen: "Terreiro",
                      now,
                      collectionId: item.id,
                    });
                  }
                  router.push({
                    pathname: "/collection/[id]",
                    params: {
                      id: item.id,
                      collectionId: item.id,
                      collectionTitle: name,
                      terreiroId: terreiroId || undefined,
                    },
                  });
                }
              };

              return (
                <View style={styles.cardGap}>
                  <SurfaceCard variant={variant}>
                    <Pressable
                      onPress={handlePress}
                      disabled={isEditingThisCollection || isNew}
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
                              openCollectionActions(
                                item as TerreiroCollectionCard
                              );
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

      <BottomSheet
        visible={isCollectionActionsOpen}
        variant={variant}
        onClose={closeCollectionActions}
      >
        <View>
          <Text style={[styles.sheetTitle, { color: textPrimary }]}>Ações</Text>
          {collectionActionsTarget?.title ? (
            <Text style={[styles.sheetSubtitle, { color: textSecondary }]}>
              {collectionActionsTarget.title}
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
              <Text style={[styles.sheetActionText, { color: textPrimary }]}>
                Editar
              </Text>
            </Pressable>

            <Separator variant={variant} />

            {canDeleteCollection(collectionActionsTarget) ? (
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
            ) : null}
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
          {collectionPendingDelete?.title ? (
            <Text style={[styles.sheetSubtitle, { color: textSecondary }]}>
              {collectionPendingDelete.title}
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
              disabled={
                isDeletingCollection ||
                !canDeleteCollection(collectionPendingDelete)
              }
              onPress={() => {
                if (!collectionPendingDelete) return;
                deleteCollection(collectionPendingDelete);
              }}
              style={({ pressed }) => [
                styles.sheetActionRow,
                pressed ? styles.sheetActionPressed : null,
                isDeletingCollection ||
                !canDeleteCollection(collectionPendingDelete)
                  ? styles.sheetActionDisabled
                  : null,
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
        visible={isTerreiroMenuOpen}
        variant={variant}
        onClose={() => setIsTerreiroMenuOpen(false)}
      >
        <View>
          <View style={styles.sheetActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Compartilhar terreiro"
              hitSlop={10}
              onPress={openShare}
              style={({ pressed }) => [
                styles.sheetActionRow,
                pressed ? styles.sheetActionPressed : null,
              ]}
            >
              <Ionicons name="share-outline" size={18} color={accentColor} />
              <Text style={[styles.sheetActionText, { color: textPrimary }]}>
                Compartilhar terreiro
              </Text>
            </Pressable>

            {isAdmin ? (
              <>
                <Separator variant={variant} />

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Editar terreiro"
                  hitSlop={10}
                  onPress={() => {
                    setIsTerreiroMenuOpen(false);
                    if (!resolvedTerreiroId) return;
                    router.push({
                      pathname: "/terreiro-editor" as any,
                      params: {
                        mode: "edit",
                        terreiroId: resolvedTerreiroId,
                      },
                    });
                  }}
                  style={({ pressed }) => [
                    styles.sheetActionRow,
                    pressed ? styles.sheetActionPressed : null,
                  ]}
                >
                  <Ionicons name="pencil" size={18} color={accentColor} />
                  <Text
                    style={[styles.sheetActionText, { color: textPrimary }]}
                  >
                    Editar terreiro
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: spacing.lg,
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
    paddingTop: spacing.md,
  },
  paddedBlock: {
    paddingHorizontal: spacing.lg,
  },
  contextHeader: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
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
    paddingHorizontal: spacing.lg,
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
