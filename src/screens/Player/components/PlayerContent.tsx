import { TagChip } from "@/src/components/TagChip";
import { colors, spacing } from "@/src/theme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { PlayerPonto } from "../hooks/useCollectionPlayerData";
import { LyricsScroll } from "./LyricsScroll";

export function PlayerContent(props: {
  ponto: PlayerPonto;
  variant: "light" | "dark";
  lyricsFontSize: number;
}) {
  const { ponto, variant, lyricsFontSize } = props;

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  return (
    <View style={styles.page}>
      <Text style={[styles.title, { color: textPrimary }]} numberOfLines={2}>
        {ponto.title}
      </Text>

      {Array.isArray(ponto.tags) && ponto.tags.length > 0 ? (
        <View style={styles.tagsWrap}>
          {ponto.tags.map((t) => (
            <TagChip key={t} label={t} variant={variant} />
          ))}
        </View>
      ) : (
        <Text style={[styles.noTags, { color: textSecondary }]}>Sem tags</Text>
      )}

      <LyricsScroll
        lyrics={ponto.lyrics}
        fontSize={lyricsFontSize}
        variant={variant}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  noTags: {
    paddingTop: spacing.sm,
    fontSize: 12,
  },
});
