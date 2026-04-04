import { PontoEntidadeOrixaChips } from "@/src/components/pontos/PontoEntidadeOrixaChips";
import { TagChip } from "@/src/components/TagChip";
import { TagPlusChip } from "@/src/components/TagPlusChip";
import {
    lyricsHasEntidadePlaceholder,
    resolveLyricsWithCollectionEntidade,
} from "@/src/domain/entidadePlaceholder";
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
  /** Player a partir de uma coleção: mostra chip da entidade escolhida para a entrada. */
  inCollection?: boolean;
  onPressCollectionEntidadeMarker?: () => void;
  /** Fora da coleção, quando a letra tem o marcador: só informação. */
  onPressEntidadeMarkerInfo?: () => void;
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
    inCollection = false,
    onPressCollectionEntidadeMarker,
    onPressEntidadeMarkerInfo,
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

  const rawLyrics =
    (versaoAtual && typeof versaoAtual.lyrics === "string"
      ? versaoAtual.lyrics
      : null) ?? ponto.lyrics;
  const hasEntidadeMarkerInLyrics = lyricsHasEntidadePlaceholder(
    rawLyrics ?? "",
  );
  const cr = ponto.collectionEntidadeResolve;

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

  /** Texto simples quando não há `[entidade]` na versão atual (substituição já feita ou letra sem marcador). */
  const lyricsBodyPlain =
    cr != null
      ? resolveLyricsWithCollectionEntidade({
          rawLyrics: rawLyrics ?? "",
          entidadeTexto: cr.entidadeTexto,
          entidadeLabelFromId: cr.entidadeLabelFromId,
        })
      : (rawLyrics ?? ponto.lyrics);

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
          <Text
            style={[styles.title, styles.titleCentered, { color: textPrimary }]}
            numberOfLines={2}
          >
            {displayTitle}
          </Text>
          <View
            style={styles.versionMetaRow}
            accessibilityRole="text"
            accessibilityLabel={`Versão ${versaoAtual!.versao_num} de ${versoes.length}. Use os botões para alterar a versão deste ponto.`}
          >
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
                  { color: textSecondary, opacity: atFirst ? 0.3 : 1 },
                ]}
              >
                ‹
              </Text>
            </Pressable>
            <Text
              style={[styles.versionSubtitle, { color: textSecondary }]}
              numberOfLines={1}
            >
              Versão {versaoAtual!.versao_num} de {versoes.length}
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
                  { color: textSecondary, opacity: atLast ? 0.3 : 1 },
                ]}
              >
                ›
              </Text>
            </Pressable>
          </View>
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
        lyrics={hasEntidadeMarkerInLyrics ? "" : lyricsBodyPlain}
        fontSize={lyricsFontSize}
        variant={variant}
        entidadeInline={
          hasEntidadeMarkerInLyrics
            ? {
                rawLyrics: rawLyrics ?? "",
                collectionEntidadeResolve: cr ?? null,
                inCollection,
                onPressCollection: onPressCollectionEntidadeMarker,
                onPressInfo: onPressEntidadeMarkerInfo,
              }
            : null
        }
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
  titleCentered: {
    textAlign: "center",
  },
  /** ‹ › ao lado de “Versão n de N” (não do título), para ler como troca de versão do mesmo ponto. */
  versionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
    gap: spacing.xs,
    flexWrap: "wrap",
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
    fontSize: 12,
    fontWeight: "700",
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
});
