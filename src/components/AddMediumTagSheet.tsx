import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { BottomSheet } from "@/src/components/BottomSheet";
import { colors, spacing } from "@/src/theme";
import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  const inputRef = useRef<TextInput | null>(null);

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
    return v.length > 0 && v.length <= 60;
  }, [value]);

  useEffect(() => {
    if (!visible) return;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [visible]);

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
      <View style={{ paddingBottom: 16 }}>
        <View style={styles.sheetHeaderRow}>
          <Text style={[styles.title, { color: textPrimary }]}>
            Médium deste ponto
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (isSaving) return;
              onClose();
            }}
            hitSlop={10}
            style={styles.sheetCloseBtn}
          >
            <Text style={[styles.sheetCloseText, { color: textPrimary }]}>×</Text>
          </Pressable>
        </View>

        <Text style={[styles.subtitle, { color: textSecondary }]}>
          Qual médium dá passagem quando este ponto é cantado neste terreiro?
        </Text>

        <TextInput
          ref={(node) => {
            inputRef.current = node;
          }}
          value={value}
          onChangeText={setValue}
          placeholder="Ex: Pai Joaquim"
          placeholderTextColor={textSecondary}
          style={[
            styles.input,
            {
              color: textPrimary,
              borderColor: isLight ? colors.inputBorderLight : colors.inputBorderDark,
              backgroundColor: isLight ? colors.inputBgLight : colors.inputBgDark,
            },
          ]}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={60}
          editable={!isSaving}
          returnKeyType="done"
          onSubmitEditing={() => {
            if (!isSaving && canSubmit) void submit();
          }}
        />

        <View style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancelar"
            onPress={() => {
              if (isSaving) return;
              onClose();
            }}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.secondaryActionBtn,
              {
                borderColor: isLight ? colors.inputBorderLight : colors.inputBorderDark,
                backgroundColor: isLight ? colors.inputBgLight : colors.inputBgDark,
              },
              pressed ? styles.pressed : null,
              isSaving ? styles.disabled : null,
            ]}
          >
            <Text style={[styles.secondaryActionText, { color: textPrimary }]}>
              Cancelar
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Adicionar médium"
            onPress={() => void submit()}
            disabled={!canSubmit || isSaving}
            style={({ pressed }) => [
              styles.primaryActionBtn,
              pressed ? styles.pressed : null,
              !canSubmit || isSaving ? styles.disabled : null,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.paper50} />
            ) : (
              <Text style={styles.primaryActionText}>Adicionar médium</Text>
            )}
          </Pressable>
        </View>

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
  sheetHeaderRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCloseText: {
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
  },
  subtitle: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "800",
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  secondaryActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: "900",
  },
  primaryActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.brass600,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.paper50,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
  filler: {
    width: "100%",
    height: 265,
    marginTop: spacing.lg,
  },
});
