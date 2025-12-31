import React, { memo } from "react";
import { View as RNView, StyleSheet } from "react-native";

import { Text, useThemeColor } from "@/components/Themed";
import { usePreferences } from "@/contexts/PreferencesContext";
import { TagChip } from "@/src/components/TagChip";
import { isMediumTag } from "@/src/utils/mergeTags";

type Props = {
  title: string;
  tags: string[];
  lyricsPreview: string;
};

function PointCardImpl({ title, tags, lyricsPreview }: Props) {
  const { effectiveTheme } = usePreferences();
  const variant: "light" | "dark" = effectiveTheme;

  const surface = useThemeColor({}, "surface");
  const border = useThemeColor({}, "border");
  const text = useThemeColor({}, "text");
  const mutedText = useThemeColor({}, "mutedText");

  return (
    <RNView
      style={[styles.card, { backgroundColor: surface, borderColor: border }]}
    >
      <Text style={[styles.title, { color: text }]}>{title}</Text>

      <RNView style={styles.tagsRow}>
        {tags.map((tag) => (
          <TagChip
            key={tag}
            label={tag}
            variant={variant}
            tone={isMediumTag(tag) ? "medium" : "default"}
            kind="ponto"
          />
        ))}
      </RNView>

      <Text
        style={[styles.lyricsPreview, { color: mutedText }]}
        numberOfLines={8}
      >
        {lyricsPreview}
      </Text>
    </RNView>
  );
}

export const PointCard = memo(PointCardImpl);

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: "hidden",
    padding: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  lyricsPreview: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
  },
});
