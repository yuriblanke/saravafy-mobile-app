import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { BottomSheet } from "@/src/components/BottomSheet";
import { colors, spacing } from "@/src/theme";
import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const fillerPng = require("@/assets/images/filler.png");

function normalizeInput(value: string) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeMediumText(value: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
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

export function AddMediumTagSheet(props: {
  visible: boolean;
  onClose: () => void;
  variant: "light" | "dark";
  terreiroId: string;
  pontoId: string;
  onSuccess?: (tagLabel: string) => void;
}) {
  const { visible, onClose, variant, terreiroId, pontoId, onSuccess } = props;
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [value, setValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isLight = variant === "light";
  const textPrimary = isLight
    ? colors.textPrimaryOnLight
    : colors.textPrimaryOnDark;
  const textSecondary = isLight
    ? colors.textSecondaryOnLight
    : colors.textSecondaryOnDark;

  const canSubmit = useMemo(() => {
    const v = normalizeInput(value);
    return v.length >= 2 && v.length <= 60;
  }, [value]);

  const closeAndReset = useCallback(() => {
    setValue("");
    setIsSaving(false);
    onClose();
  }, [onClose]);

  const submit = useCallback(async () => {
    if (!terreiroId || !pontoId) {
      showToast("Contexto inválido para adicionar médium.");
      return;
    }

    const raw = normalizeInput(value);
    if (raw.length < 2) {
      showToast("Digite pelo menos 2 caracteres.");
      return;
    }

    if (raw.length > 60) {
      showToast("Nome muito longo (máx. 60).");
      return;
    }

    const tag_text = raw;
    const tag_text_normalized = normalizeMediumText(raw);

    setIsSaving(true);

    try {
      const res = await supabase
        .from("terreiro_ponto_custom_tags")
        .insert({
          terreiro_id: terreiroId,
          ponto_id: pontoId,
          source: "medium",
          template_key: "medium",
          tag_text,
          tag_text_normalized,
        })
        .select("id, ponto_id, tag_text, tag_text_normalized, created_at")
        .single();

      if (res.error) {
        const msg =
          typeof res.error.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Erro ao salvar médium.";

        if (String((res.error as any)?.code ?? "") === "23505") {
          throw new Error(
            "Esse médium já está cadastrado para este ponto neste terreiro."
          );
        }

        // Mensagem amigável para RLS (quando a pessoa não é admin/editor)
        const lower = msg.toLowerCase();
        if (
          lower.includes("row-level security") ||
          lower.includes("rls") ||
          lower.includes("permission")
        ) {
          throw new Error(
            "Você não tem permissão para editar os médiums deste terreiro."
          );
        }

        throw new Error(msg);
      }

      const inserted = res.data as any;
      const insertedId = typeof inserted?.id === "string" ? inserted.id : "";
      const insertedCreatedAt =
        typeof inserted?.created_at === "string" ? inserted.created_at : "";

      // Optimistic update: atualiza qualquer query do map desse terreiro.
      queryClient.setQueriesData(
        {
          predicate: (q) => {
            const key = q.queryKey;
            return (
              Array.isArray(key) &&
              key.length >= 3 &&
              key[0] === "pontos" &&
              key[1] === "customTags" &&
              key[2] === terreiroId
            );
          },
        },
        (old) => {
          const prev = (old ?? {}) as Record<
            string,
            {
              id: string;
              tagText: string;
              tagTextNormalized: string;
              createdAt: string;
            }[]
          >;

          const existing = Array.isArray(prev[pontoId]) ? prev[pontoId] : [];
          if (
            existing.some((t) => t.tagTextNormalized === tag_text_normalized)
          ) {
            return prev;
          }

          return {
            ...prev,
            [pontoId]: [
              ...existing,
              {
                id: insertedId || `tmp_${Date.now().toString(36)}`,
                tagText: tag_text,
                tagTextNormalized: tag_text_normalized,
                createdAt: insertedCreatedAt || new Date().toISOString(),
              },
            ],
          };
        }
      );

      onSuccess?.(tag_text);
      closeAndReset();
    } catch (e) {
      showToast(getErrorMessage(e));
      setIsSaving(false);
    }
  }, [
    closeAndReset,
    onSuccess,
    pontoId,
    queryClient,
    showToast,
    terreiroId,
    value,
  ]);

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        if (isSaving) return;
        onClose();
      }}
      variant={variant}
      snapPoints={["55%"]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: textPrimary }]}>
            Médium deste ponto
          </Text>
          <Text style={[styles.subtitle, { color: textSecondary }]}>
            Qual médium dá passagem quando este ponto é cantado neste terreiro?
          </Text>
        </View>

        <View
          style={[
            styles.inputWrap,
            isLight ? styles.inputWrapLight : styles.inputWrapDark,
          ]}
        >
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Ex: Pai Joaquim"
            placeholderTextColor={textSecondary}
            style={[styles.input, { color: textPrimary }]}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={80}
            editable={!isSaving}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (!isSaving && canSubmit) void submit();
            }}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Adicionar médium"
          onPress={() => void submit()}
          disabled={!canSubmit || isSaving}
          style={({ pressed }) => [
            styles.confirmBtn,
            isLight ? styles.confirmBtnLight : styles.confirmBtnDark,
            !canSubmit || isSaving ? styles.confirmBtnDisabled : null,
            pressed ? styles.confirmBtnPressed : null,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.paper50} />
          ) : (
            <Text style={styles.confirmText}>Adicionar médium</Text>
          )}
        </Pressable>

        <Image
          source={fillerPng}
          style={styles.filler}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  inputWrap: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputWrapLight: {
    borderColor: colors.inputBorderLight,
    backgroundColor: colors.paper100,
  },
  inputWrapDark: {
    borderColor: colors.inputBorderDark,
    backgroundColor: colors.earth700,
  },
  input: {
    fontSize: 14,
    fontWeight: "700",
  },
  confirmBtn: {
    borderRadius: 12,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  confirmBtnLight: {
    backgroundColor: colors.brass500,
  },
  confirmBtnDark: {
    backgroundColor: colors.brass600,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnPressed: {
    opacity: 0.85,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.paper50,
  },
  filler: {
    width: "100%",
    height: 200,
    marginTop: spacing.sm,
  },
});
