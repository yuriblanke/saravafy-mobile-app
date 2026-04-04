import {
  getPontoTagChipChrome,
  TAG_CHIP_RADIUS,
} from "@/src/components/TagChip";
import {
  ENTIDADE_PLACEHOLDER_CHIP_LABEL,
  getCollectionEntidadeDisplayLabel,
  splitLyricsByEntidadeMarker,
} from "@/src/domain/entidadePlaceholder";
import { colors, spacing } from "@/src/theme";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type EntidadeInline = {
  rawLyrics: string;
  collectionEntidadeResolve: {
    entidadeTexto: string | null;
    entidadeLabelFromId: string | null;
  } | null;
  inCollection: boolean;
  onPressCollection?: () => void;
  onPressInfo?: () => void;
};

export function LyricsScroll(props: {
  lyrics: string;
  fontSize: number;
  variant: "light" | "dark";
  /** Quando definido, cada `[entidade]` na letra vira um bloco tocável (estilo chip) no lugar do texto. */
  entidadeInline?: EntidadeInline | null;
}) {
  const { lyrics, fontSize, variant, entidadeInline } = props;

  const lineHeight = Math.round(fontSize * 1.4);

  const textColor =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;

  if (entidadeInline) {
    const {
      rawLyrics,
      collectionEntidadeResolve,
      inCollection,
      onPressCollection,
      onPressInfo,
    } = entidadeInline;
    const parts = splitLyricsByEntidadeMarker(rawLyrics);
    const resolved = collectionEntidadeResolve
      ? getCollectionEntidadeDisplayLabel(collectionEntidadeResolve).trim()
      : "";
    const markerLabel = resolved || ENTIDADE_PLACEHOLDER_CHIP_LABEL;
    const isResolved = !!resolved;
    const tagChrome = getPontoTagChipChrome(
      variant,
      isResolved ? "primary" : "secondary",
    );
    const onPressMarker = () => {
      if (inCollection) {
        onPressCollection?.();
      } else {
        onPressInfo?.();
      }
    };

    const chipFontSize = Math.min(15, Math.max(11, Math.round(fontSize * 0.78)));
    const borderW =
      typeof tagChrome.borderWidth === "number"
        ? tagChrome.borderWidth
        : StyleSheet.hairlineWidth;
    const verticalBorder = borderW * 2;
    const rawPad = Math.floor(
      (lineHeight - chipFontSize - verticalBorder) / 2,
    );
    const chipPadV = Math.max(0, Math.min(2, rawPad));
    /**
     * Padding assimétrico: com `alignSelf: "baseline"`, o texto da linha ancora pela baseline.
     * Um pouco mais de espaço em cima e quase nada em baixo aproxima as baselines.
     */
    const chipPadTop = Math.max(1, chipPadV + 1);
    const chipPadBottom = Math.max(0, chipPadV - 1);
    /** Desce o chip no eixo Y em relação à âncora da baseline (Android/Fabric). */
    const inlineEntidadeOffsetY =
      3 +
      Math.max(2, Math.min(5, Math.round(fontSize * 0.07)));

    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={[styles.lyrics, { color: textColor, fontSize, lineHeight }]}
        >
          {parts.map((seg, index) => {
            if (seg.type === "text") {
              return <Text key={`t-${index}`}>{seg.text}</Text>;
            }
            return (
              <Pressable
                key={`m-${index}`}
                onPress={onPressMarker}
                accessibilityRole="button"
                accessibilityLabel={
                  inCollection
                    ? isResolved
                      ? `Entidade nesta coleção: ${markerLabel}. Toque para alterar.`
                      : "Escolher entidade para esta coleção"
                    : "Sobre o marcador de entidade nas letras"
                }
                style={[
                  styles.inlineEntidadePressableWrap,
                  { transform: [{ translateY: inlineEntidadeOffsetY }] },
                ]}
              >
                {/*
                  Bordo em `Text` aninhado costuma não desenhar no RN; o chip real usa `View`.
                  Mantém o mesmo chrome que `getPontoTagChipChrome` / TagChip.
                */}
                <View
                  style={[
                    styles.inlineEntidadeBox,
                    {
                      paddingTop: chipPadTop,
                      paddingBottom: chipPadBottom,
                    },
                    tagChrome,
                    styles.inlineEntidadeBorder,
                  ]}
                >
                  <Text
                    style={[
                      styles.inlineEntidadeLabel,
                      {
                        fontSize: chipFontSize,
                        lineHeight: chipFontSize,
                        color: tagChrome.color,
                        ...(Platform.OS === "android"
                          ? { includeFontPadding: false }
                          : {}),
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {markerLabel}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </Text>
      </ScrollView>
    );
  }

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
  inlineEntidadePressableWrap: {
    alignSelf: "baseline",
  },
  /** Mesmo “chrome” que o `TagChip` (`wrap`): contorno desenhado em `View`. */
  inlineEntidadeBox: {
    paddingHorizontal: spacing.xs + 2,
    borderRadius: TAG_CHIP_RADIUS,
    marginHorizontal: 2,
    justifyContent: "flex-end",
    alignItems: "center",
    flexShrink: 0,
  },
  inlineEntidadeLabel: {
    fontWeight: "700",
  },
  inlineEntidadeBorder: {
    borderStyle: "solid",
  },
});
