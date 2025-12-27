import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { createPontoSubmission, parseTagsInput } from "@/lib/pontosSubmissions";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { colors, spacing } from "@/src/theme";

type Props = {
  visible: boolean;
  variant: "light" | "dark";
  onClose: () => void;
  onSubmitted?: () => void;
};

function toUserFriendlyErrorMessage(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as any).message)
      : "";

  const lower = message.toLowerCase();
  if (
    lower.includes("permission") ||
    lower.includes("not allowed") ||
    lower.includes("rls") ||
    lower.includes("jwt") ||
    lower.includes("unauthorized")
  ) {
    return "Você precisa estar logada para enviar um ponto.";
  }

  return "Não foi possível enviar agora. Tente novamente.";
}

export function SubmitPontoModal({
  visible,
  variant,
  onClose,
  onSubmitted,
}: Props) {
  const [title, setTitle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [tagsText, setTagsText] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  const inputBg =
    variant === "light" ? colors.inputBgLight : colors.inputBgDark;
  const inputBorder =
    variant === "light" ? colors.inputBorderLight : colors.inputBorderDark;

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && lyrics.trim().length > 0;
  }, [title, lyrics]);

  useEffect(() => {
    if (!visible) return;
    setErrorMessage(null);
  }, [visible]);

  const resetForm = () => {
    setTitle("");
    setLyrics("");
    setTagsText("");
    setErrorMessage(null);
  };

  const submit = async () => {
    setErrorMessage(null);

    if (!title.trim() || !lyrics.trim()) {
      setErrorMessage("Preencha Título e Letra.");
      return;
    }

    setIsSubmitting(true);
    try {
      const tags = tagsText.trim() ? parseTagsInput(tagsText) : [];
      const created = await createPontoSubmission({
        title: title.trim(),
        lyrics: lyrics.trim(),
        tags,
      });

      // Debug opcional: visualizar tags retornadas (inclui auto-tags do trigger, se o SELECT permitir)
      console.log("SUBMISSION CRIADA:", created);

      resetForm();
      onClose();
      onSubmitted?.();
    } catch (e) {
      setErrorMessage(toUserFriendlyErrorMessage(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SaravafyScreen variant={variant}>
        <View style={styles.screen}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (isSubmitting) return;
                onClose();
              }}
              hitSlop={10}
              style={styles.headerBtn}
            >
              <Text style={[styles.headerBtnText, { color: textPrimary }]}>
                Cancelar
              </Text>
            </Pressable>

            <Text style={[styles.headerTitle, { color: textPrimary }]}>
              Enviar ponto
            </Text>

            <View style={styles.headerRight} />
          </View>

          <View style={styles.form}>
            <Text style={[styles.label, { color: textSecondary }]}>
              Título *
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: Ponto de Ogum"
              placeholderTextColor={textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: textPrimary,
                },
              ]}
              autoCapitalize="sentences"
              autoCorrect
              editable={!isSubmitting}
              returnKeyType="next"
            />

            <Text style={[styles.label, { color: textSecondary }]}>
              Letra *
            </Text>
            <TextInput
              value={lyrics}
              onChangeText={setLyrics}
              placeholder="Digite a letra do ponto…"
              placeholderTextColor={textSecondary}
              style={[
                styles.input,
                styles.inputMultiline,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: textPrimary,
                },
              ]}
              autoCapitalize="sentences"
              autoCorrect
              editable={!isSubmitting}
              multiline
              textAlignVertical="top"
            />

            <Text style={[styles.label, { color: textSecondary }]}>
              Tags (opcional) — separadas por vírgula
            </Text>
            <TextInput
              value={tagsText}
              onChangeText={setTagsText}
              placeholder="Ex: Ogum, Exu"
              placeholderTextColor={textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: textPrimary,
                },
              ]}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
            />

            {errorMessage ? (
              <Text style={[styles.errorText, { color: colors.brass600 }]}>
                {errorMessage}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={submit}
                disabled={!canSubmit || isSubmitting}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.forest400,
                    opacity: pressed ? 0.9 : 1,
                  },
                  !canSubmit || isSubmitting ? styles.primaryBtnDisabled : null,
                ]}
              >
                {isSubmitting ? (
                  <View style={styles.primaryBtnRow}>
                    <ActivityIndicator color={"#fff"} />
                    <Text style={styles.primaryBtnText}>Enviando…</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryBtnText}>Enviar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </SaravafyScreen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  headerBtnText: {
    fontSize: 14,
    fontWeight: "800",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  headerRight: {
    width: 80,
  },
  form: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  inputMultiline: {
    minHeight: 180,
  },
  errorText: {
    marginTop: spacing.sm,
    fontSize: 13,
    fontWeight: "700",
  },
  actions: {
    marginTop: spacing.lg,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  primaryBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
