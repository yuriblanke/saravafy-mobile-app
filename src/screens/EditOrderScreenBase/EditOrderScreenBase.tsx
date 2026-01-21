import { useGestureBlock } from "@/contexts/GestureBlockContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type EditOrderItem = {
  id: string;
  title: string;
  subtitle?: string;
};

type RenderItemParams<T> = {
  item: T;
  getIndex: () => number | undefined;
  drag: () => void;
  isActive: boolean;
};

function tryGetDraggableFlatList(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("react-native-draggable-flatlist");
    return mod?.default ?? mod;
  } catch {
    return null;
  }
}

function arraysEqual(a: readonly string[], b: readonly string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export type EditOrderScreenBaseProps = {
  title: string;
  items: EditOrderItem[];
  onSave: (orderedIds: string[]) => Promise<void>;
  allowRemove: boolean;

  successToast?: string;
  errorToastFallback?: string;

  discardConfirmTitle?: string;
  discardConfirmMessage?: string;
  removeConfirmTitle?: string;
  removeConfirmMessage?: string;
  dragUnavailableMessage?: string;
};

export function EditOrderScreenBase(props: EditOrderScreenBaseProps) {
  const {
    title,
    items,
    onSave,
    allowRemove,
    successToast = "Atualizado.",
    errorToastFallback = "Não foi possível salvar.",
    discardConfirmTitle = "Descartar alterações?",
    discardConfirmMessage = "Suas alterações não foram salvas.",
    removeConfirmTitle = "Remover da coleção?",
    removeConfirmMessage = "Este item será removido ao salvar.",
    dragUnavailableMessage = "Arrastar para reordenar não está disponível neste build.",
  } = props;

  const router = useRouter();
  const { shouldBlockPress } = useGestureBlock();
  const { showToast } = useToast();
  const { effectiveTheme } = usePreferences();

  const DraggableFlatListImpl = useMemo(() => tryGetDraggableFlatList(), []);
  const isDraggableAvailable = Boolean(DraggableFlatListImpl);

  const variant: "light" | "dark" = effectiveTheme;

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

  const itemsById = useMemo(() => {
    const map = new Map<string, EditOrderItem>();
    for (const item of items) {
      const id = String(item?.id ?? "");
      if (!id) continue;
      map.set(id, {
        id,
        title: String(item?.title ?? ""),
        subtitle:
          typeof item?.subtitle === "string"
            ? String(item.subtitle)
            : undefined,
      });
    }
    return map;
  }, [items]);

  const initialOrderedIds = useMemo(() => {
    return items.map((it) => String(it?.id ?? "")).filter(Boolean);
  }, [items]);

  const [draftOrderedIds, setDraftOrderedIds] =
    useState<string[]>(initialOrderedIds);
  const [saving, setSaving] = useState(false);

  const didInitFromPropsRef = useRef(false);
  useEffect(() => {
    // Inicializa quando os dados chegam (ex: query async), sem pisar em edição.
    if (!didInitFromPropsRef.current) {
      setDraftOrderedIds(initialOrderedIds);
      didInitFromPropsRef.current = true;
      return;
    }

    // Se não estamos "dirty", podemos refletir atualizações do upstream.
    setDraftOrderedIds((prev) => {
      const isDirty = !arraysEqual(prev, initialOrderedIds);
      return isDirty ? prev : initialOrderedIds;
    });
  }, [initialOrderedIds]);

  const draftItems = useMemo(() => {
    return draftOrderedIds
      .map((id) => itemsById.get(id) ?? null)
      .filter(Boolean) as EditOrderItem[];
  }, [draftOrderedIds, itemsById]);

  const dirty = useMemo(() => {
    return !arraysEqual(initialOrderedIds, draftOrderedIds);
  }, [draftOrderedIds, initialOrderedIds]);

  const handleBack = useCallback(() => {
    if (saving) return;

    if (!dirty) {
      router.back();
      return;
    }

    Alert.alert(discardConfirmTitle, discardConfirmMessage, [
      { text: "Continuar", style: "cancel" },
      { text: "Descartar", style: "destructive", onPress: () => router.back() },
    ]);
  }, [dirty, discardConfirmMessage, discardConfirmTitle, router, saving]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleBack();
      return true;
    });

    return () => sub.remove();
  }, [handleBack]);

  const removeItem = useCallback(
    (itemId: string) => {
      if (!allowRemove) return;
      if (saving) return;

      Alert.alert(removeConfirmTitle, removeConfirmMessage, [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => {
            setDraftOrderedIds((prev) => prev.filter((id) => id !== itemId));
          },
        },
      ]);
    },
    [allowRemove, removeConfirmMessage, removeConfirmTitle, saving]
  );

  const save = useCallback(async () => {
    if (!dirty) {
      router.back();
      return;
    }

    if (shouldBlockPress()) return;

    setSaving(true);
    try {
      await onSave(draftOrderedIds);
      showToast(successToast);
      router.back();
    } catch (e) {
      showToast(e instanceof Error ? e.message : errorToastFallback);
    } finally {
      setSaving(false);
    }
  }, [
    dirty,
    draftOrderedIds,
    errorToastFallback,
    onSave,
    router,
    shouldBlockPress,
    showToast,
    successToast,
  ]);

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<EditOrderItem>) => {
      const resolvedTitle = (item.title ?? "").trim() || "Item";
      const subtitle = typeof item.subtitle === "string" ? item.subtitle : "";

      return (
        <View
          style={[
            styles.row,
            { borderBottomColor: borderColor, opacity: isActive ? 0.9 : 1 },
          ]}
        >
          {allowRemove ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remover"
              onPress={() => removeItem(item.id)}
              hitSlop={8}
              style={styles.leftBtn}
            >
              <Ionicons name="remove-circle" size={22} color={colors.danger} />
            </Pressable>
          ) : (
            <View style={styles.leftBtn} />
          )}

          <View style={styles.rowText}>
            <Text
              style={[styles.itemTitle, { color: textPrimary }]}
              numberOfLines={1}
            >
              {resolvedTitle}
            </Text>
            {subtitle ? (
              <Text
                style={[styles.itemSubtitle, { color: textSecondary }]}
                numberOfLines={2}
              >
                {subtitle}
              </Text>
            ) : null}
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
    [allowRemove, borderColor, removeItem, textPrimary, textSecondary, variant]
  );

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

        <Text
          style={[styles.headerTitle, { color: textPrimary }]}
          numberOfLines={1}
        >
          {title}
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

      {isDraggableAvailable ? (
        <DraggableFlatListImpl
          data={draftItems}
          keyExtractor={(it: EditOrderItem) => it.id}
          onDragEnd={({ data }: { data: EditOrderItem[] }) => {
            setDraftOrderedIds(data.map((it) => it.id));
          }}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: spacing.md }}
        />
      ) : (
        <View style={styles.fallback}>
          <Text style={[styles.fallbackText, { color: textSecondary }]}>
            {dragUnavailableMessage}
          </Text>

          <View style={{ paddingBottom: spacing.md }}>
            {draftItems.map((item) => (
              <View
                key={item.id}
                style={[styles.row, { borderBottomColor: borderColor }]}
              >
                {allowRemove ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remover"
                    onPress={() => removeItem(item.id)}
                    hitSlop={8}
                    style={styles.leftBtn}
                  >
                    <Ionicons
                      name="remove-circle"
                      size={22}
                      color={colors.danger}
                    />
                  </Pressable>
                ) : (
                  <View style={styles.leftBtn} />
                )}

                <View style={styles.rowText}>
                  <Text
                    style={[styles.itemTitle, { color: textPrimary }]}
                    numberOfLines={1}
                  >
                    {(item.title ?? "").trim() || "Item"}
                  </Text>
                  {item.subtitle ? (
                    <Text
                      style={[styles.itemSubtitle, { color: textSecondary }]}
                      numberOfLines={2}
                    >
                      {item.subtitle}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.dragBtn}>
                  <Ionicons
                    name="reorder-three"
                    size={22}
                    color={
                      variant === "light"
                        ? colors.textMutedOnLight
                        : colors.textMutedOnDark
                    }
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
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
    paddingTop: spacing.md,
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
  itemTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  itemSubtitle: {
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
  fallback: {
    flex: 1,
  },
  fallbackText: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    fontSize: 13,
    lineHeight: 18,
  },
});
