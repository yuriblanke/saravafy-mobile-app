import { TagChip } from "@/src/components/TagChip";
import type { TerreiroPontoMediumTag } from "@/src/queries/terreiroPontoCustomTags";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PlayerPonto } from "../hooks/useCollectionPlayerData";
import { LyricsScroll } from "./LyricsScroll";

export function PlayerContent(props: {
  ponto: PlayerPonto;
  variant: "light" | "dark";
  lyricsFontSize: number;
  mediumTags?: readonly TerreiroPontoMediumTag[];
  canAddMediumTag?: boolean;
  onPressAddMediumTag?: () => void;
  canDeleteMediumTag?: boolean;
  onLongPressMediumTag?: (tag: TerreiroPontoMediumTag) => void;
}) {
  const {
    ponto,
    variant,
    lyricsFontSize,
    mediumTags,
    canAddMediumTag,
    onPressAddMediumTag,
    canDeleteMediumTag,
    onLongPressMediumTag,
  } = props;

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  const resolvedMediumTags = Array.isArray(mediumTags) ? mediumTags : [];
  const pointTags = Array.isArray(ponto.tags) ? ponto.tags : [];
  const hasAnyTags = resolvedMediumTags.length > 0 || pointTags.length > 0;

  return (
    <View style={styles.page}>
      <Text style={[styles.title, { color: textPrimary }]} numberOfLines={2}>
        {ponto.title}
      </Text>

      {hasAnyTags ? (
        <View style={styles.tagsWrap}>
          {canAddMediumTag ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Adicionar médium"
              hitSlop={10}
              onPress={onPressAddMediumTag}
              style={({ pressed }) => [
                styles.addTagBtn,
                {
                  borderColor:
                    variant === "light" ? colors.brass500 : colors.brass600,
                },
                pressed ? styles.addTagBtnPressed : null,
              ]}
            >
              <Ionicons
                name="add"
                size={14}
                color={variant === "light" ? colors.brass500 : colors.brass600}
              />
            </Pressable>
          ) : null}
          {resolvedMediumTags.map((t) => (
            <Pressable
              key={`medium-${ponto.id}-${t.id}`}
              accessibilityRole={
                canDeleteMediumTag ? "button" : undefined
              }
              accessibilityLabel={
                canDeleteMediumTag ? `Remover médium ${t.tagText}` : undefined
              }
              onLongPress={() => onLongPressMediumTag?.(t)}
              delayLongPress={350}
              disabled={!canDeleteMediumTag || !onLongPressMediumTag}
              style={({ pressed }) => [
                pressed && canDeleteMediumTag ? { opacity: 0.75 } : null,
              ]}
            >
              <TagChip
                label={t.tagText}
                variant={variant}
                kind="custom"
                tone="medium"
              />
            </Pressable>
          ))}
          {pointTags.map((t) => (
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
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  addTagBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  addTagBtnPressed: {
    opacity: 0.85,
  },
  noTags: {
    paddingTop: spacing.sm,
    fontSize: 12,
  },
});
