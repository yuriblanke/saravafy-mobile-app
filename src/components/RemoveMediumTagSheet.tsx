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
  View,
} from "react-native";

const fillerPng = require("@/assets/images/filler.png");

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

export function RemoveMediumTagSheet(props: {
  visible: boolean;
  onClose: () => void;
  variant: "light" | "dark";
  terreiroId: string;
  pontoId: string;
  tagId: string;
  tagLabel: string;
}) {
  const { visible, onClose, variant, terreiroId, pontoId, tagId, tagLabel } =
    props;

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [isDeleting, setIsDeleting] = useState(false);

  const isLight = variant === "light";
  const textPrimary = isLight
    ? colors.textPrimaryOnLight
    : colors.textPrimaryOnDark;
  const textSecondary = isLight
    ? colors.textSecondaryOnLight
    : colors.textSecondaryOnDark;
  const border = isLight ? colors.inputBorderLight : colors.inputBorderDark;
  const inputBg = isLight ? colors.inputBgLight : colors.inputBgDark;

  const message = useMemo(() => {
    return `Remover “${tagLabel}” deste ponto neste terreiro?`;
  }, [tagLabel]);

  const close = useCallback(() => {
    if (isDeleting) return;
    onClose();
  }, [isDeleting, onClose]);

  const remove = useCallback(async () => {
    if (!terreiroId || !pontoId || !tagId) {
      showToast("Contexto inválido para remover médium.");
      return;
    }

    setIsDeleting(true);

    try {
      const res = await supabase
        .from("terreiro_ponto_custom_tags")
        .delete()
        .eq("id", tagId)
        .eq("terreiro_id", terreiroId);

      if (res.error) {
        throw res.error;
      }

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

          return {
            ...prev,
            [pontoId]: existing.filter((t) => t.id !== tagId),
          };
        }
      );

      setIsDeleting(false);
      onClose();
    } catch (e) {
      showToast(getErrorMessage(e));
      setIsDeleting(false);
    }
  }, [onClose, pontoId, queryClient, showToast, tagId, terreiroId]);

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      variant={variant}
      scrollEnabled={false}
      bounces={false}
    >
      <View style={{ paddingBottom: 16 }}>
        <View style={styles.sheetHeaderRow}>
          <Text style={[styles.title, { color: textPrimary }]}>Médium</Text>
          <Pressable
            accessibilityRole="button"
            onPress={close}
            disabled={isDeleting}
            hitSlop={10}
            style={styles.sheetCloseBtn}
          >
            <Text style={[styles.sheetCloseText, { color: textPrimary }]}>
              ×
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.body, { color: textSecondary }]}>{message}</Text>

        <View style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancelar"
            onPress={close}
            disabled={isDeleting}
            style={({ pressed }) => [
              styles.secondaryActionBtn,
              { borderColor: border, backgroundColor: inputBg },
              pressed ? styles.pressed : null,
              isDeleting ? styles.disabled : null,
            ]}
          >
            <Text style={[styles.secondaryActionText, { color: textPrimary }]}>
              Cancelar
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remover"
            onPress={() => void remove()}
            disabled={isDeleting}
            style={({ pressed }) => [
              styles.destructiveActionBtn,
              { borderColor: border, backgroundColor: inputBg },
              pressed ? styles.pressed : null,
              isDeleting ? styles.disabled : null,
            ]}
          >
            {isDeleting ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.destructiveActionText}>Remover</Text>
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
  body: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  secondaryActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: "900",
  },
  destructiveActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  destructiveActionText: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.danger,
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
