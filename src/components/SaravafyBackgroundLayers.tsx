import React, { useMemo } from "react";
import { ImageBackground, StyleSheet, View } from "react-native";

import { colors, getSaravafyBaseColor } from "@/src/theme";

type Props = {
  theme: "dark" | "light";
  variant: "tabs" | "stack" | "focus";
  /**
   * Deslocamento vertical para alinhar o fundo ao viewport "global".
   * Use quando o conteúdo começa abaixo de um header global.
   */
  offsetY?: number;
};

const noise = require("@/assets/textures/noise_128.png");

export function SaravafyBackgroundLayers({
  theme,
  variant,
  offsetY = 0,
}: Props) {
  const LinearGradient = useMemo(() => {
    try {
      return require("expo-linear-gradient")
        .LinearGradient as React.ComponentType<any>;
    } catch {
      return null;
    }
  }, []);

  const isLight = theme === "light";
  const baseColor = getSaravafyBaseColor(theme);

  // Container clippado com transform para alinhar ao fundo "global".
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { backgroundColor: baseColor }]}
    >
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          offsetY ? { transform: [{ translateY: -offsetY }] } : null,
        ]}
      >
        {/* Base opaca garantida */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: baseColor },
          ]}
        />

        {variant === "focus" ? null : (
          <>
            {/* Base (gradiente quando disponível; fallback é a cor sólida do root) */}
            {LinearGradient ? (
              <LinearGradient
                pointerEvents="none"
                colors={
                  isLight
                    ? [colors.paper50, colors.paper100]
                    : [colors.forest800, colors.forest900]
                }
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
            ) : null}

            {/* Luz difusa (top-right) */}
            <View
              pointerEvents="none"
              style={isLight ? styles.lightBrassLight : styles.lightBrass}
            />

            {/* Segunda luz (top-left) */}
            <View
              pointerEvents="none"
              style={isLight ? styles.lightSecondaryLight : styles.lightPaper}
            />

            {/* Vinheta */}
            <View
              pointerEvents="none"
              style={isLight ? styles.vignetteLight : styles.vignette}
            />

            {/* Grão */}
            <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
              <ImageBackground
                source={noise}
                resizeMode="repeat"
                style={StyleSheet.absoluteFillObject}
                imageStyle={
                  isLight ? styles.noiseImageLight : styles.noiseImage
                }
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lightBrass: {
    position: "absolute",
    top: -220,
    right: -200,
    width: 520,
    height: 520,
    borderRadius: 9999,
    backgroundColor: colors.brass600,
    opacity: 0.08,
  },
  lightBrassLight: {
    position: "absolute",
    top: -220,
    right: -200,
    width: 520,
    height: 520,
    borderRadius: 9999,
    backgroundColor: colors.brass600,
    opacity: 0.05,
  },
  lightPaper: {
    position: "absolute",
    top: -180,
    left: -220,
    width: 520,
    height: 520,
    borderRadius: 9999,
    backgroundColor: colors.paper50,
    opacity: 0.04,
  },
  lightSecondaryLight: {
    position: "absolute",
    top: -180,
    left: -220,
    width: 520,
    height: 520,
    borderRadius: 9999,
    backgroundColor: colors.forest700,
    opacity: 0.06,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.vignette,
    opacity: 0.24,
  },
  vignetteLight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.vignetteLight,
    opacity: 1,
  },
  noiseImage: {
    opacity: 0.15,
  },
  noiseImageLight: {
    opacity: 0.13,
  },
});
