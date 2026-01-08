import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { BottomSheet } from "@/src/components/BottomSheet";
import { normalizeTag, isMediumTag } from "@/src/utils/mergeTags";
import { colors, spacing } from "@/src/theme";
import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

function normalizeInput(value: string) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
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
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [value, setValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isLight = variant === "light";
  const textPrimary = isLight ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    isLight ? colors.textSecondaryOnLight : colors.textSecondaryOnDark;

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
      showToast("Nome muito longo (máx. 60)." );
      return;
    }

    const label = isMediumTag(raw) ? raw : `Médium: ${raw}`;
    const tag_text = label;
    const tag_text_normalized = normalizeTag(label);

    setIsSaving(true);

    try {
      const res = await supabase.from("terreiro_ponto_custom_tags").insert({
        terreiro_id: terreiroId,
        ponto_id: pontoId,
        tag_text,
        tag_text_normalized,
        source: "manual",
        template_key: "medium_tag",
        created_by: user?.id ?? null,
      });

      if (res.error) {
        const msg =
          typeof res.error.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Erro ao salvar médium.";

        // Mensagem amigável para RLS (quando a pessoa não é admin/editor)
        const lower = msg.toLowerCase();
        if (
          lower.includes("row-level security") ||
          lower.includes("rls") ||
          lower.includes("permission")
        ) {
          throw new Error("Sem permissão para editar tags deste terreiro.");
        }

        throw new Error(msg);
      }

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
          const prev = (old ?? {}) as Record<string, string[]>;
          const existing = Array.isArray(prev[pontoId]) ? prev[pontoId] : [];
          if (existing.includes(tag_text)) return prev;
          return {
            ...prev,
            [pontoId]: [...existing, tag_text],
          };
        }
      );

      onSuccess?.(tag_text);
      closeAndReset();
    } catch (e) {
      showToast(getErrorMessage(e));
      setIsSaving(false);
    }
  }, [closeAndReset, onSuccess, pontoId, queryClient, showToast, terreiroId, user?.id, value]);

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
        <Text style={[styles.title, { color: textPrimary }]}>Adicionar médium</Text>
        <Text style={[styles.subtitle, { color: textSecondary }]}>Quem trouxe a entidade nesse terreiro</Text>

        <View
          style={[
            styles.inputWrap,
            isLight ? styles.inputWrapLight : styles.inputWrapDark,
          ]}
        >
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Nome do médium"
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
          accessibilityLabel="Confirmar médium"
          onPress={() => void submit()}
          disabled={!canSubmit || isSaving}
          style={({ pressed }) => [
            styles.confirmBtn,
            isLight ? styles.confirmBtnLight : styles.confirmBtnDark,
            (!canSubmit || isSaving) ? styles.confirmBtnDisabled : null,
            pressed ? styles.confirmBtnPressed : null,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color={isLight ? colors.brass500 : colors.brass600} />
          ) : (
            <Text
              style={[
                styles.confirmText,
                { color: isLight ? colors.brass500 : colors.brass600 },
              ]}
            >
              Confirmar
            </Text>
          )}
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
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
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 2,
  },
  confirmBtnLight: {
    borderColor: colors.brass500,
    backgroundColor: "transparent",
  },
  confirmBtnDark: {
    borderColor: colors.brass600,
    backgroundColor: "transparent",
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
  },
});
