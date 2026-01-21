import { colors, spacing } from "@/src/theme";
import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

export function LyricsScroll(props: {
  lyrics: string;
  fontSize: number;
  variant: "light" | "dark";
}) {
  const { lyrics, fontSize, variant } = props;

  const lineHeight = Math.round(fontSize * 1.4);

  const textColor =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={true}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.lyrics, { color: textColor, fontSize, lineHeight }]}>
        {lyrics || ""}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    marginTop: spacing.sm,
  },
  content: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  lyrics: {},
});
