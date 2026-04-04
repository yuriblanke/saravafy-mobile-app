import type { EntidadeCatalogOption } from "@/src/queries/entidadesCatalog";
import type { CollectionPontoEntidadeInput } from "@/src/screens/Home/data/collections_pontos";
import { colors, getSaravafyBaseColor, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  variant: "light" | "dark";
  onClose: () => void;
  options: EntidadeCatalogOption[];
  optionsLoading: boolean;
  optionsError: string | null;
  onConfirm: (choice: CollectionPontoEntidadeInput) => void;
  /** Sobrescreve o título padrão (ex.: ao editar entrada existente). */
  titleText?: string;
  /** Sobrescreve o subtítulo padrão. */
  subtitleText?: string;
  /** Pré-preenche o modo “Escrever outro nome” ao abrir. */
  initialCustomText?: string | null;
};

export function EntidadePlaceholderSheet({
  visible,
  variant,
  onClose,
  options,
  optionsLoading,
  optionsError,
  onConfirm,
  titleText,
  subtitleText,
  initialCustomText,
}: Props) {
  const insets = useSafeAreaInsets();
  const isLight = variant === "light";
  const textPrimary = isLight
    ? colors.textPrimaryOnLight
    : colors.textPrimaryOnDark;
  const textSecondary = isLight
    ? colors.textSecondaryOnLight
    : colors.textSecondaryOnDark;
  const textMuted = isLight ? colors.textMutedOnLight : colors.textMutedOnDark;
  const borderColor = isLight
    ? colors.surfaceCardBorderLight
    : colors.surfaceCardBorder;
  const inputBg = isLight ? colors.inputBgLight : colors.inputBgDark;
  const inputBorder = isLight ? colors.inputBorderLight : colors.inputBorderDark;
  const baseBg = getSaravafyBaseColor(variant);

  const [mode, setMode] = useState<"pick" | "custom">("pick");
  const [customText, setCustomText] = useState("");
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [filter, options]);

  const handleConfirmCustom = useCallback(() => {
    const t = customText.trim();
    if (!t) return;
    onConfirm({ kind: "custom", texto: t });
  }, [customText, onConfirm]);

  const handlePick = useCallback(
    (o: EntidadeCatalogOption) => {
      onConfirm({
        kind: "registered",
        entidadeId: o.id,
        entidadeOrixaId: o.orixaEntidadeId,
      });
    },
    [onConfirm],
  );

  const handleClose = useCallback(() => {
    setMode("pick");
    setCustomText("");
    setFilter("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!visible) return;
    const t = String(initialCustomText ?? "").trim();
    if (t) {
      setMode("custom");
      setCustomText(t);
    } else {
      setMode("pick");
      setCustomText("");
    }
    setFilter("");
  }, [visible, initialCustomText]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View
        style={[
          styles.root,
          {
            backgroundColor: baseBg,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={handleClose}
            hitSlop={10}
            style={styles.headerBackBtn}
          >
            <Ionicons name="chevron-back" size={22} color={textPrimary} />
          </Pressable>
          <Text
            style={[styles.headerTitle, { color: textPrimary }]}
            numberOfLines={2}
          >
            {titleText ?? "Entidade nesta coleção"}
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          <Text style={[styles.subtitle, { color: textSecondary }]}>
            {subtitleText ??
              "Escolha uma entidade cadastrada ou escreva o nome que deve aparecer só nesta coleção."}
          </Text>

          <View style={styles.modeRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setMode("pick")}
              style={({ pressed }) => [
                styles.modeChip,
                {
                  borderColor,
                  backgroundColor:
                    mode === "pick" ? inputBg : "transparent",
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.modeChipText, { color: textPrimary }]}>
                Cadastradas
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setMode("custom")}
              style={({ pressed }) => [
                styles.modeChip,
                {
                  borderColor,
                  backgroundColor:
                    mode === "custom" ? inputBg : "transparent",
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.modeChipText, { color: textPrimary }]}>
                Escrever outro nome
              </Text>
            </Pressable>
          </View>

          {mode === "pick" ? (
            <>
              <TextInput
                value={filter}
                onChangeText={setFilter}
                placeholder="Filtrar por nome…"
                placeholderTextColor={textMuted}
                style={[
                  styles.filterInput,
                  {
                    color: textPrimary,
                    backgroundColor: inputBg,
                    borderColor: inputBorder,
                  },
                ]}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {optionsLoading ? (
                <ActivityIndicator
                  style={{ marginTop: spacing.md }}
                  color={textPrimary}
                />
              ) : optionsError ? (
                <Text style={[styles.err, { color: textSecondary }]}>
                  {optionsError}
                </Text>
              ) : filtered.length === 0 ? (
                <Text style={{ color: textSecondary, marginTop: spacing.sm }}>
                  Nenhuma entidade encontrada.
                </Text>
              ) : (
                filtered.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Usar entidade ${item.label}`}
                    onPress={() => handlePick(item)}
                    style={({ pressed }) => [
                      styles.optionRow,
                      {
                        borderColor,
                        opacity: pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.optionLabel, { color: textPrimary }]}>
                      {item.label}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={textMuted}
                    />
                  </Pressable>
                ))
              )}
            </>
          ) : (
            <>
              <TextInput
                value={customText}
                onChangeText={setCustomText}
                placeholder="Nome que aparece na letra"
                placeholderTextColor={textMuted}
                style={[
                  styles.filterInput,
                  {
                    color: textPrimary,
                    backgroundColor: inputBg,
                    borderColor: inputBorder,
                    minHeight: 48,
                  },
                ]}
                multiline
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirmar texto"
                disabled={!customText.trim()}
                onPress={handleConfirmCustom}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  {
                    borderColor,
                    opacity: !customText.trim() ? 0.45 : pressed ? 0.88 : 1,
                  },
                ]}
              >
                <Text style={[styles.confirmBtnText, { color: textPrimary }]}>
                  Usar este nome
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    minWidth: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  modeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  modeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  modeChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  filterInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    paddingRight: spacing.sm,
  },
  err: {
    marginTop: spacing.sm,
    fontSize: 13,
  },
  confirmBtn: {
    marginTop: spacing.md,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: "800",
  },
});
