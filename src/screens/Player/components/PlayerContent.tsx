import { PontoEntidadeOrixaChips } from "@/src/components/pontos/PontoEntidadeOrixaChips";
import { TagChip } from "@/src/components/TagChip";
import { TagPlusChip } from "@/src/components/TagPlusChip";
import type { TerreiroPontoMediumTag } from "@/src/queries/terreiroPontoCustomTags";
import { colors, spacing } from "@/src/theme";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PlayerPonto, PlayerPontoVersao } from "../hooks/useCollectionPlayerData";
import { LyricsScroll } from "./LyricsScroll";

export function PlayerContent(props: {
  ponto: PlayerPonto;
  variant: "light" | "dark";
  lyricsFontSize: number;
  versaoAtual: PlayerPontoVersao | null;
  onStepVersao: (delta: -1 | 1) => void;
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
    versaoAtual,
    onStepVersao,
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
  const entidadeNome = ponto.entidadeNome ?? null;
  const orixaNome = ponto.orixaNome ?? null;
  const hasChipRow =
    !!canAddMediumTag ||
    resolvedMediumTags.length > 0 ||
    !!entidadeNome ||
    !!orixaNome;

  const versoes = ponto.versoes ?? [];
  const displayTitle =
    versaoAtual &&
    typeof versaoAtual.title === "string" &&
    versaoAtual.title.trim()
      ? versaoAtual.title.trim()
      : ponto.title;

  const lyricsBody =
    (versaoAtual && typeof versaoAtual.lyrics === "string"
      ? versaoAtual.lyrics
      : null) ?? ponto.lyrics;

  const showVersionSelector = versoes.length > 1 && !!versaoAtual;
  const atFirst = showVersionSelector && versaoAtual!.versao_num <= 1;
  const atLast =
    showVersionSelector &&
    versaoAtual!.versao_num >=
      versoes[versoes.length - 1]?.versao_num;

  return (
    <View style={styles.page}>
      {showVersionSelector ? (
        <>
          <View style={styles.versionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Versão anterior"
              disabled={atFirst}
              onPress={() => onStepVersao(-1)}
              style={styles.versionChevronHit}
            >
              <Text
                style={[
                  styles.versionChevron,
                  { color: textPrimary, opacity: atFirst ? 0.3 : 1 },
                ]}
              >
                ‹
              </Text>
            </Pressable>
            <Text
              style={[styles.title, styles.versionTitleCenter, { color: textPrimary }]}
              numberOfLines={2}
            >
              {displayTitle}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Próxima versão"
              disabled={atLast}
              onPress={() => onStepVersao(1)}
              style={styles.versionChevronHit}
            >
              <Text
                style={[
                  styles.versionChevron,
                  { color: textPrimary, opacity: atLast ? 0.3 : 1 },
                ]}
              >
                ›
              </Text>
            </Pressable>
          </View>
          <Text
            style={[styles.versionSubtitle, { color: textSecondary }]}
            accessibilityRole="text"
          >
            Versão {versaoAtual!.versao_num} de {versoes.length}
          </Text>
        </>
      ) : (
        <Text style={[styles.title, { color: textPrimary }]} numberOfLines={2}>
          {displayTitle}
        </Text>
      )}

      {hasChipRow ? (
        <View style={styles.tagsWrap}>
          {canAddMediumTag ? (
            <TagPlusChip
              variant={variant}
              accessibilityLabel="Adicionar médium"
              onPress={onPressAddMediumTag}
            />
          ) : null}
          {resolvedMediumTags.map((t) => (
            <Pressable
              key={`medium-${ponto.id}-${t.id}`}
              accessibilityRole={canDeleteMediumTag ? "button" : undefined}
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
          <PontoEntidadeOrixaChips
            variant={variant}
            entidadeNome={entidadeNome}
            orixaNome={orixaNome}
          />
        </View>
      ) : null}

      <LyricsScroll
        lyrics={lyricsBody}
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
  versionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  versionTitleCenter: {
    flex: 1,
    textAlign: "center",
  },
  versionChevronHit: {
    minWidth: 36,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  versionChevron: {
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24,
  },
  versionSubtitle: {
    marginTop: spacing.xs,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
});
