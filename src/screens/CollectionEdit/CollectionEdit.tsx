import { useAuth } from "@/contexts/AuthContext";
import { useGestureBlock } from "@/contexts/GestureBlockContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/src/queries/queryKeys";
import {
  consumeCollectionEditDraft,
  markCollectionPontosDirty,
} from "@/src/screens/CollectionEdit/draftStore";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import DraggableFlatList, {
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type DraftItem = {
  id: string;
  title: string;
  lyrics: string;
};

function getLyricsPreview(lyrics: string, maxLines = 2) {
  const lines = String(lyrics ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const previewLines = lines.slice(0, maxLines);
  const preview = previewLines.join("\n");
  if (lines.length > maxLines) return `${preview}\n…`;
  return preview;
}

function arraysEqual(a: readonly string[], b: readonly string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

async function saveCollectionPontosDraft(params: {
  collectionId: string;
  orderedPontoIds: string[];
  originalPontoIds: string[];
  userId: string;
}) {
  const { collectionId, orderedPontoIds, originalPontoIds, userId } = params;

  const keepIds = orderedPontoIds.filter(Boolean);
  const originalIds = originalPontoIds.filter(Boolean);

  const removedIds = originalIds.filter((id) => !keepIds.includes(id));

  if (removedIds.length > 0) {
    const delRes = await supabase
      .from("collections_pontos")
      .delete()
      .eq("collection_id", collectionId)
      .in("ponto_id", removedIds);

    if (delRes.error) {
      throw new Error(
        typeof delRes.error.message === "string" && delRes.error.message.trim()
          ? delRes.error.message
          : "Não foi possível remover itens da coleção."
      );
    }
  }

  // Reordenação segura: 2 fases para evitar colisões de UNIQUE(collection_id, position)
  // sem depender de RPC/transaction no backend.
  const phase1 = keepIds.map((pontoId, idx) => ({
    collection_id: collectionId,
    ponto_id: pontoId,
    position: 10_000 + (idx + 1),
    added_by: userId,
  }));

  const phase2 = keepIds.map((pontoId, idx) => ({
    collection_id: collectionId,
    ponto_id: pontoId,
    position: idx + 1,
    added_by: userId,
  }));

  if (phase1.length > 0) {
    const up1 = await supabase
      .from("collections_pontos")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(phase1 as any, { onConflict: "collection_id,ponto_id" } as any);

    if (up1.error) {
      throw new Error(
        typeof up1.error.message === "string" && up1.error.message.trim()
          ? up1.error.message
          : "Não foi possível reordenar a coleção."
      );
    }

    const up2 = await supabase
      .from("collections_pontos")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(phase2 as any, { onConflict: "collection_id,ponto_id" } as any);

    if (up2.error) {
      throw new Error(
        typeof up2.error.message === "string" && up2.error.message.trim()
          ? up2.error.message
          : "Não foi possível reordenar a coleção."
      );
    }
  }
}

export default function CollectionEdit() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { shouldBlockPress } = useGestureBlock();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { effectiveTheme } =
    require("@/contexts/PreferencesContext").usePreferences();
  const variant: "light" | "dark" = effectiveTheme;

  const collectionId = String(params.id ?? "");
  const draftKey = typeof params.draftKey === "string" ? params.draftKey : "";

  const snapshotRef = useRef(
    draftKey ? consumeCollectionEditDraft(draftKey) : null
  );

  const collectionTitle =
    snapshotRef.current?.collectionTitle?.trim() || "Coleção";

  const initialOrderedPontoIds = useMemo(() => {
    const items = snapshotRef.current?.orderedItems ?? [];
    return items
      .map((it) => String(it?.ponto?.id ?? ""))
      .filter(Boolean);
  }, []);

  const pontosById = useMemo(() => {
    const map = new Map<string, DraftItem>();
    const items = snapshotRef.current?.orderedItems ?? [];
    for (const it of items) {
      const id = String(it?.ponto?.id ?? "");
      if (!id) continue;
      map.set(id, {
        id,
        title: String(it?.ponto?.title ?? "Ponto"),
        lyrics: String(it?.ponto?.lyrics ?? ""),
      });
    }
    return map;
  }, []);

  const [draftOrderedPontoIds, setDraftOrderedPontoIds] = useState<string[]>(
    initialOrderedPontoIds
  );
  const [saving, setSaving] = useState(false);

  const draftItems = useMemo(() => {
    return draftOrderedPontoIds
      .map((id) => pontosById.get(id) ?? null)
      .filter(Boolean) as DraftItem[];
  }, [draftOrderedPontoIds, pontosById]);

  const dirty = useMemo(() => {
    return !arraysEqual(initialOrderedPontoIds, draftOrderedPontoIds);
  }, [draftOrderedPontoIds, initialOrderedPontoIds]);

  const handleBack = useCallback(() => {
    if (saving) return;

    if (!dirty) {
      router.back();
      return;
    }

    Alert.alert("Descartar alterações?", "Suas alterações não foram salvas.", [
      { text: "Continuar", style: "cancel" },
      { text: "Descartar", style: "destructive", onPress: () => router.back() },
    ]);
  }, [dirty, router, saving]);

  useEffect(() => {
    if (snapshotRef.current) return;

    showToast("Abra a coleção antes de editar.");
    router.back();
  }, [router, showToast]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleBack();
      return true;
    });

    return () => sub.remove();
  }, [handleBack]);

  const removeItem = useCallback(
    (pontoId: string) => {
      if (saving) return;

      Alert.alert("Remover da coleção?", "Este item será removido ao salvar.", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => {
            setDraftOrderedPontoIds((prev) => prev.filter((id) => id !== pontoId));
          },
        },
      ]);
    },
    [saving]
  );

  const save = useCallback(async () => {
    if (!user?.id) {
      showToast("Entre para editar a coleção.");
      return;
    }
    if (!collectionId) {
      showToast("Coleção inválida.");
      return;
    }

    if (!dirty) {
      router.back();
      return;
    }

    if (shouldBlockPress()) return;

    setSaving(true);
    try {
      await saveCollectionPontosDraft({
        collectionId,
        orderedPontoIds: draftOrderedPontoIds,
        originalPontoIds: initialOrderedPontoIds,
        userId: user.id,
      });

      markCollectionPontosDirty(collectionId);
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.byId(collectionId),
      });

      showToast("Coleção atualizada.");
      router.back();
    } catch (e) {
      showToast(
        e instanceof Error
          ? e.message
          : "Não foi possível salvar a coleção."
      );
    } finally {
      setSaving(false);
    }
  }, [
    collectionId,
    dirty,
    draftOrderedPontoIds,
    initialOrderedPontoIds,
    queryClient,
    router,
    shouldBlockPress,
    showToast,
    user?.id,
  ]);

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light" ? colors.textSecondaryOnLight : colors.textSecondaryOnDark;

  const borderColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<DraftItem>) => {
      const title = (item.title ?? "").trim() || "Ponto";
      const preview = getLyricsPreview(item.lyrics, 2);

      return (
        <View
          style={[
            styles.row,
            { borderColor, opacity: isActive ? 0.9 : 1 },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remover"
            onPress={() => removeItem(item.id)}
            hitSlop={8}
            style={styles.leftBtn}
          >
            <Ionicons name="remove-circle" size={22} color={colors.danger} />
          </Pressable>

          <View style={styles.rowText}>
            <Text style={[styles.title, { color: textPrimary }]} numberOfLines={1}>
              {title}
            </Text>
            <Text
              style={[styles.lyrics, { color: textSecondary }]}
              numberOfLines={2}
            >
              {preview}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Arrastar"
            onPressIn={drag}
            hitSlop={10}
            style={styles.dragBtn}
          >
            <Ionicons
              name="reorder-three"
              size={22}
              color={variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark}
            />
          </Pressable>
        </View>
      );
    },
    [borderColor, removeItem, textPrimary, textSecondary, variant]
  );

  if (!snapshotRef.current) {
    return <View style={styles.screen} />;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={handleBack}
          hitSlop={10}
          style={styles.headerIconBtn}
        >
          <Ionicons name="chevron-back" size={22} color={textPrimary} />
        </Pressable>

        <Text style={[styles.headerTitle, { color: textPrimary }]} numberOfLines={1}>
          Editar coleção
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Salvar"
          onPress={save}
          hitSlop={10}
          style={styles.saveBtn}
          disabled={saving}
        >
          <Text
            style={[
              styles.saveText,
              { color: textPrimary, opacity: saving ? 0.5 : 1 },
            ]}
          >
            Salvar
          </Text>
        </Pressable>
      </View>

      <DraggableFlatList
        data={draftItems}
        keyExtractor={(it) => it.id}
        onDragEnd={({ data }) => {
          setDraftOrderedPontoIds(data.map((it) => it.id));
        }}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerIconBtn: {
    padding: 6,
    marginRight: spacing.md,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  saveBtn: {
    padding: 6,
    marginLeft: spacing.md,
  },
  saveText: {
    fontSize: 14,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  leftBtn: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  rowText: {
    flex: 1,
    minHeight: 48,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  lyrics: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
  dragBtn: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.md,
  },
});
