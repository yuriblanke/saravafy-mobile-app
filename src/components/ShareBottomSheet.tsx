import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/src/components/BottomSheet";
import { colors, radii } from "@/src/theme";
import { copyMessage, shareMoreOptions } from "@/src/utils/shareContent";

type Props = {
  visible: boolean;
  variant: "light" | "dark";
  message: string;
  onClose: () => void;
  showToast?: (msg: string) => void;
};

export function ShareBottomSheet({
  visible,
  variant,
  message,
  onClose,
  showToast,
}: Props) {
  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;

  const onCopy = useCallback(async () => {
    try {
      await copyMessage(message, showToast);
    } finally {
      onClose();
    }
  }, [message, onClose, showToast]);

  const onMore = useCallback(async () => {
    try {
      await shareMoreOptions(message);
    } finally {
      onClose();
    }
  }, [message, onClose]);

  return (
    <BottomSheet visible={visible} variant={variant} onClose={onClose}>
      <View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copiar mensagem"
          onPress={onCopy}
          style={({ pressed }) => [
            styles.shareOptionBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={[styles.shareOptionText, { color: textPrimary }]}>
            Copiar mensagem
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mais opções"
          onPress={onMore}
          style={({ pressed }) => [
            styles.shareOptionBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={[styles.shareOptionText, { color: textPrimary }]}>
            Mais opções…
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  shareOptionBtn: {
    minHeight: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  shareOptionText: {
    fontSize: 14,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.8,
    backgroundColor: "transparent",
  },
});
