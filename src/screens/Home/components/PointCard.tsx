import React, { memo } from "react";
import { View as RNView, StyleSheet } from "react-native";

import { Text, useThemeColor } from "@/components/Themed";

type Props = {
  title: string;
  tags: string[];
  lyricsPreview: string;
};

function PointCardImpl({ title, tags, lyricsPreview }: Props) {
  const surface = useThemeColor({}, "surface");
  const border = useThemeColor({}, "border");
  const chipBg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const mutedText = useThemeColor({}, "mutedText");
  const primary = useThemeColor({}, "primary");

  return (
    <RNView
      style={[styles.card, { backgroundColor: surface, borderColor: border }]}
    >
      <Text style={[styles.title, { color: text }]}>{title}</Text>

      <RNView style={styles.tagsRow}>
        {tags.map((tag) => (
          <RNView
            key={tag}
            style={[
              styles.tagChip,
              { borderColor: primary, backgroundColor: chipBg },
            ]}
          >
            <Text style={[styles.tagText, { color: primary }]}>{tag}</Text>
          </RNView>
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
  tagChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
  },
  lyricsPreview: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
  },
});
