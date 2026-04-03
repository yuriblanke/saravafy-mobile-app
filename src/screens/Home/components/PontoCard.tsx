import React, { memo } from "react";
import { View as RNView, StyleSheet } from "react-native";

import { Text, useThemeColor } from "@/components/Themed";
import { usePreferences } from "@/contexts/PreferencesContext";
import { PontoEntidadeOrixaChips } from "@/src/components/pontos/PontoEntidadeOrixaChips";

type Props = {
  title: string;
  lyricsPreview: string;
  entidadeNome: string | null;
  orixaNome: string | null;
};

function PontoCardImpl({
  title,
  lyricsPreview,
  entidadeNome,
  orixaNome,
}: Props) {
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

      {entidadeNome || orixaNome ? (
        <RNView style={styles.tagsRow}>
          <PontoEntidadeOrixaChips
            variant={variant}
            entidadeNome={entidadeNome}
            orixaNome={orixaNome}
          />
        </RNView>
      ) : null}

      <Text
        style={[styles.lyricsPreview, { color: mutedText }]}
        numberOfLines={8}
      >
        {lyricsPreview}
      </Text>
    </RNView>
  );
}

export const PontoCard = memo(PontoCardImpl);

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
