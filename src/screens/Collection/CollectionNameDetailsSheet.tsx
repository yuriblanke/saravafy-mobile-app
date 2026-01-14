import { BottomSheet } from "@/src/components/BottomSheet";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

function normalizeTitle(value: string) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

type Props = {
  visible: boolean;
  variant: "light" | "dark";
  initialTitle: string;
  initialDescription?: string | null;
  canEdit: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
  onClose: () => void;
  onSave: (next: { title: string; description: string }) => void;
  onDelete: () => void;
};

export function CollectionNameDetailsSheet({
  visible,
  variant,
  initialTitle,
  initialDescription,
  canEdit,
  isSaving = false,
  isDeleting = false,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const nameRef = useRef<TextInput | null>(null);

  const isLight = variant === "light";
  const textPrimary = isLight
    ? colors.textPrimaryOnLight
    : colors.textPrimaryOnDark;
  const textSecondary = isLight
    ? colors.textSecondaryOnLight
    : colors.textSecondaryOnDark;

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(
    typeof initialDescription === "string" ? initialDescription : ""
  );

  useEffect(() => {
    if (!visible) return;
    setTitle(initialTitle);
    setDescription(
      typeof initialDescription === "string" ? initialDescription : ""
    );
    requestAnimationFrame(() => {
      nameRef.current?.focus();
    });
  }, [initialDescription, initialTitle, visible]);

  const canSubmit = useMemo(() => {
    const t = normalizeTitle(title);
    return t.length >= 2 && t.length <= 80;
  }, [title]);

  const requestDelete = useCallback(() => {
    if (!canEdit) return;
    if (isSaving || isDeleting) return;

    Alert.alert("Apagar coleção?", "Esta coleção será excluída.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "default",
        onPress: () => onDelete(),
      },
    ]);
  }, [canEdit, isDeleting, isSaving, onDelete]);

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        if (isSaving || isDeleting) return;
        onClose();
      }}
      variant={variant}
      bounces={false}
      snapPoints={["75%"]}
    >
      <View style={{ paddingBottom: spacing.lg }}>
        <View style={styles.sheetHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancelar"
            hitSlop={10}
            onPress={() => {
              if (isSaving || isDeleting) return;
              onClose();
            }}
            style={({ pressed }) => [
              styles.sheetHeaderBtn,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={[styles.sheetHeaderCancel, { color: textSecondary }]}>
              Cancelar
            </Text>
          </Pressable>

          <Text style={[styles.sheetHeaderTitle, { color: textPrimary }]}>
            Nome e detalhes
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Salvar"
            hitSlop={10}
            disabled={!canEdit || !canSubmit || isSaving || isDeleting}
            onPress={() => {
              if (!canEdit) return;
              const nextTitle = normalizeTitle(title);
              const nextDescription = String(description ?? "");
              onSave({ title: nextTitle, description: nextDescription });
            }}
            style={({ pressed }) => [
              styles.sheetHeaderBtn,
              pressed ? styles.pressed : null,
              !canEdit || !canSubmit || isSaving || isDeleting
                ? styles.disabled
                : null,
            ]}
          >
            <Text
              style={[
                styles.sheetHeaderSave,
                { color: isLight ? colors.brass500 : colors.brass600 },
              ]}
            >
              {isSaving ? "Salvando…" : "Salvar"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: textSecondary }]}>Nome</Text>
          <TextInput
            ref={(node) => {
              nameRef.current = node;
            }}
            value={title}
            onChangeText={setTitle}
            placeholder="Nome da coleção"
            placeholderTextColor={textSecondary}
            style={[
              styles.input,
              {
                color: textPrimary,
                borderColor: isLight
                  ? colors.inputBorderLight
                  : colors.inputBorderDark,
                backgroundColor: isLight
                  ? colors.inputBgLight
                  : colors.inputBgDark,
              },
            ]}
            autoCapitalize="sentences"
            autoCorrect={false}
            maxLength={80}
            editable={canEdit && !isSaving && !isDeleting}
            returnKeyType="next"
          />

          <Text style={[styles.label, { color: textSecondary }]}>
            Descrição
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Adicione uma descrição"
            placeholderTextColor={textSecondary}
            style={[
              styles.input,
              styles.multiline,
              {
                color: textPrimary,
                borderColor: isLight
                  ? colors.inputBorderLight
                  : colors.inputBorderDark,
                backgroundColor: isLight
                  ? colors.inputBgLight
                  : colors.inputBgDark,
              },
            ]}
            multiline
            autoCapitalize="sentences"
            autoCorrect
            editable={canEdit && !isSaving && !isDeleting}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Apagar coleção"
            disabled={!canEdit || isSaving || isDeleting}
            onPress={requestDelete}
            style={({ pressed }) => [
              styles.deleteRow,
              pressed ? styles.pressed : null,
              !canEdit || isSaving || isDeleting ? styles.disabled : null,
            ]}
          >
            <Ionicons name="trash-outline" size={18} color={textSecondary} />
            <Text style={[styles.deleteText, { color: textSecondary }]}>
              Apagar coleção
            </Text>
            {isDeleting ? (
              <View style={{ marginLeft: "auto" }}>
                <ActivityIndicator />
              </View>
            ) : null}
          </Pressable>

          {!canEdit ? (
            <Text style={[styles.noEditHint, { color: textSecondary }]}>
              Você não tem permissão para editar esta coleção.
            </Text>
          ) : null}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetHeaderBtn: {
    minWidth: 76,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetHeaderCancel: {
    fontSize: 13,
    fontWeight: "800",
  },
  sheetHeaderTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  sheetHeaderSave: {
    fontSize: 13,
    fontWeight: "900",
  },
  form: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: "900",
    marginTop: spacing.sm,
  },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "800",
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  deleteRow: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceCardBorder,
    backgroundColor: "transparent",
  },
  deleteText: {
    fontSize: 13,
    fontWeight: "900",
  },
  noEditHint: {
    marginTop: spacing.sm,
    fontSize: 12,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.55,
  },
});
