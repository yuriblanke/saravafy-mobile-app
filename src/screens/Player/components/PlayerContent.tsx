import { TagChip } from "@/src/components/TagChip";
import { colors, spacing } from "@/src/theme";
import { isMediumTag, mergeCustomAndPointTags } from "@/src/utils/mergeTags";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { PlayerPonto } from "../hooks/useCollectionPlayerData";
import { LyricsScroll } from "./LyricsScroll";

export function PlayerContent(props: {
  ponto: PlayerPonto;
  variant: "light" | "dark";
  lyricsFontSize: number;
  customTags?: readonly string[];
}) {
  const { ponto, variant, lyricsFontSize, customTags } = props;

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  const mergedTags = mergeCustomAndPointTags(customTags ?? [], ponto.tags);
  const hasAnyTags =
    mergedTags.custom.length > 0 || mergedTags.point.length > 0;

  return (
    <View style={styles.page}>
      <Text style={[styles.title, { color: textPrimary }]} numberOfLines={2}>
        {ponto.title}
      </Text>

      {ponto.artist ? (
        <Text style={[styles.author, { color: textSecondary }]} numberOfLines={1}>
          {ponto.artist}
        </Text>
      ) : null}

      {hasAnyTags ? (
        <View style={styles.tagsWrap}>
          {mergedTags.custom.map((t) => (
            <TagChip
              key={`custom-${ponto.id}-${t}`}
              label={t}
              variant={variant}
              kind="custom"
              tone={isMediumTag(t) ? "medium" : "default"}
            />
          ))}
          {mergedTags.point.map((t) => (
            <TagChip
              key={`ponto-${ponto.id}-${t}`}
              label={t}
              variant={variant}
            />
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
  author: {
    paddingTop: spacing.xs,
    fontSize: 12,
    fontWeight: "600",
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
