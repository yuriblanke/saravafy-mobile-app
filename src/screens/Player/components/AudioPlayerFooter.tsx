import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PlayerPonto } from "../hooks/useCollectionPlayerData";
import { usePlayerAudio } from "../hooks/usePlayerAudio";

export function AudioPlayerFooter(props: {
  ponto: PlayerPonto | null;
  variant: "light" | "dark";
}) {
  const { ponto, variant } = props;

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  const accent = variant === "light" ? colors.forest500 : colors.brass600;
  const borderColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;
  const bg =
    variant === "light" ? colors.surfaceCardBgLight : colors.surfaceCardBg;

  const { hasAudio, isPlaying, progress, togglePlayPause } = usePlayerAudio({
    audioUrl: ponto?.audio_url ?? null,
  });

  return (
    <View style={[styles.wrap, { borderColor, backgroundColor: bg }]}>
      <View style={styles.row}>
        <View style={styles.meta}>
          <Text
            style={[styles.nowPlaying, { color: textSecondary }]}
            numberOfLines={1}
          >
            {hasAudio ? "Tocando" : "Sem áudio"}
          </Text>
          <Text
            style={[styles.title, { color: textPrimary }]}
            numberOfLines={1}
          >
            {ponto?.title ?? ""}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? "Pausar" : "Tocar"}
          disabled={!hasAudio}
          onPress={() => {
            void togglePlayPause();
          }}
          style={({ pressed }) => [
            styles.playBtn,
            { borderColor: accent },
            (!hasAudio || pressed) && styles.playBtnPressed,
          ]}
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={20}
            color={hasAudio ? accent : textSecondary}
          />
        </Pressable>
      </View>

      <View
        style={[styles.progressTrack, { borderColor }]}
        accessibilityLabel="Progresso"
      >
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: hasAudio ? accent : "transparent",
              width: `${Math.round(progress * 100)}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const FOOTER_HEIGHT = 88;
export const AUDIO_FOOTER_HEIGHT = FOOTER_HEIGHT;

const styles = StyleSheet.create({
  wrap: {
    height: FOOTER_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  nowPlaying: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: "800",
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtnPressed: {
    opacity: 0.7,
  },
  progressTrack: {
    marginTop: spacing.sm,
    height: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
});
