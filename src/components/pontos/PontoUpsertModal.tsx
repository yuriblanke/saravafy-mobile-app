import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Switch,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useToast } from "@/contexts/ToastContext";
import { createPontoSubmission, parseTagsInput } from "@/lib/pontosSubmissions";
import { supabase } from "@/lib/supabase";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { colors, spacing } from "@/src/theme";

export type PontoUpsertMode = "create" | "edit";

export type PontoUpsertInitialValues = {
  id: string;
  title: string;
  artist?: string | null;
  lyrics: string;
  tags: readonly string[];
};

type Props = {
  visible: boolean;
  variant: "light" | "dark";
  mode: PontoUpsertMode;
  initialValues?: PontoUpsertInitialValues;
  onCancel: () => void;
  onSuccess?: (result?: {
    id: string;
    title: string;
    artist?: string | null;
    lyrics: string;
    tags: string[];
  }) => void;
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
    return "Você precisa estar logada para concluir.";
  }

  return "Não foi possível salvar agora. Tente novamente.";
}

export function PontoUpsertModal({
  visible,
  variant,
  mode,
  initialValues,
  onCancel,
  onSuccess,
}: Props) {
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [tagsText, setTagsText] = useState("");

  // Submission-only fields (create mode)
  const [isTraditional, setIsTraditional] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [interpreterName, setInterpreterName] = useState("");

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

  const headerTitle = mode === "create" ? "Enviar ponto" : "Salvar alterações";
  const primaryCta = mode === "create" ? "Enviar" : "Salvar alterações";

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && lyrics.trim().length > 0;
  }, [title, lyrics]);

  useEffect(() => {
    if (!visible) return;

    setErrorMessage(null);

    if (mode === "edit" && initialValues) {
      setTitle(initialValues.title ?? "");
      setArtist(
        typeof initialValues.artist === "string" ? initialValues.artist : ""
      );
      setLyrics(initialValues.lyrics ?? "");
      setTagsText((initialValues.tags ?? []).join(", "));
      return;
    }

    if (mode === "create") {
      setTitle("");
      setArtist("");
      setLyrics("");
      setTagsText("");
      setIsTraditional(true);
      setAuthorName("");
      setInterpreterName("");
    }
  }, [initialValues, mode, visible]);

  const submit = async () => {
    setErrorMessage(null);

    if (!title.trim() || !lyrics.trim()) {
      setErrorMessage("Preencha Título e Letra.");
      return;
    }

    if (mode === "edit" && (!initialValues || !initialValues.id)) {
      setErrorMessage("Ponto inválido para edição.");
      return;
    }

    setIsSubmitting(true);
    try {
      const tags = tagsText.trim() ? parseTagsInput(tagsText) : [];
      const artistValue = artist.trim() ? artist.trim() : null;

      const authorValue = authorName.trim();
      const interpreterValue = interpreterName.trim();

      if (mode === "create" && isTraditional === false && !authorValue) {
        setErrorMessage("Informe o autor para ponto livre.");
        return;
      }

      if (mode === "create") {
        await createPontoSubmission({
          title: title.trim(),
          lyrics: lyrics.trim(),
          tags,
          author_name: authorValue ? authorValue : null,
          interpreter_name: interpreterValue ? interpreterValue : null,
        });

        onCancel();
        onSuccess?.();
        return;
      }

      const pontoId = initialValues!.id;

      const res = await supabase
        .from("pontos")
        .update({
          title: title.trim(),
          artist: artistValue,
          lyrics: lyrics.trim(),
          tags,
        })
        .eq("id", pontoId)
        .select("id, title, artist, lyrics, tags")
        .single();

      if (res.error) {
        throw new Error(
          typeof res.error.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Erro ao salvar alterações."
        );
      }

      const row: any = res.data ?? {};
      const updated = {
        id: String(row.id ?? pontoId),
        title: typeof row.title === "string" ? row.title : title.trim(),
        artist: typeof row.artist === "string" ? row.artist : artistValue,
        lyrics: typeof row.lyrics === "string" ? row.lyrics : lyrics.trim(),
        tags: Array.isArray(row.tags)
          ? row.tags.filter((v: any) => typeof v === "string")
          : tags,
      };

      onCancel();
      onSuccess?.(updated);
    } catch (e) {
      const msg = toUserFriendlyErrorMessage(e);
      setErrorMessage(msg);
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onCancel}
    >
      <SaravafyScreen variant={variant}>
        <View style={styles.screen}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (isSubmitting) return;
                onCancel();
              }}
              hitSlop={10}
              style={styles.headerBtn}
            >
              <Text style={[styles.headerBtnText, { color: textPrimary }]}>
                Cancelar
              </Text>
            </Pressable>

            <Text style={[styles.headerTitle, { color: textPrimary }]}>
              {headerTitle}
            </Text>

            <View style={styles.headerRight} />
          </View>

          <View style={styles.form}>
            {mode === "create" ? (
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextCol}>
                  <Text style={[styles.toggleTitle, { color: textPrimary }]}>
                    Ponto tradicional / livre
                  </Text>
                  <Text
                    style={[styles.toggleDesc, { color: textSecondary }]}
                    numberOfLines={1}
                  >
                    Se marcado, autor e intérprete são opcionais.
                  </Text>
                </View>

                <Switch
                  accessibilityLabel="Ponto tradicional / livre"
                  value={isTraditional}
                  onValueChange={setIsTraditional}
                  trackColor={{
                    false: colors.surfaceCardBorder,
                    true: colors.brass600,
                  }}
                  thumbColor={colors.paper50}
                />
              </View>
            ) : null}

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

            {mode === "create" ? (
              <>
                <Text style={[styles.label, { color: textSecondary }]}>
                  Autor{isTraditional ? "" : " *"}
                </Text>
                <TextInput
                  value={authorName}
                  onChangeText={setAuthorName}
                  placeholder=""
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
                  Intérprete
                </Text>
                <TextInput
                  value={interpreterName}
                  onChangeText={setInterpreterName}
                  placeholder=""
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
              </>
            ) : (
              <>
                <Text style={[styles.label, { color: textSecondary }]}>Autor</Text>
                <TextInput
                  value={artist}
                  onChangeText={setArtist}
                  placeholder=""
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
              </>
            )}

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
                    <Text style={styles.primaryBtnText}>
                      {mode === "create" ? "Enviando…" : "Salvando…"}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.primaryBtnText}>{primaryCta}</Text>
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
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  headerBtnText: {
    fontSize: 13,
    fontWeight: "900",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  headerRight: {
    width: 64,
  },
  form: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  toggleRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 8,
    marginTop: spacing.sm,
  },
  toggleTextCol: {
    flex: 1,
    minWidth: 0,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  toggleDesc: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.9,
  },
  label: {
    fontSize: 12,
    fontWeight: "900",
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
  },
  inputMultiline: {
    height: 180,
    paddingTop: 12,
    paddingBottom: 12,
  },
  errorText: {
    marginTop: spacing.sm,
    fontSize: 12,
    fontWeight: "800",
  },
  actions: {
    marginTop: spacing.md,
  },
  primaryBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.55,
  },
  primaryBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
});
