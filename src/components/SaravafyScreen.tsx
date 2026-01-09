import React, { useMemo } from "react";
import {
  ImageBackground,
  StatusBar,
  StyleSheet,
  View,
  type ViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/src/theme";

type Props = ViewProps & {
  children: React.ReactNode;
  theme?: "dark" | "light";
  variant?: "tabs" | "stack" | "focus";
  edges?: Array<"top" | "bottom" | "left" | "right">;
};

const noise = require("@/assets/textures/noise_128.png");

export function SaravafyScreen({
  style,
  children,
  theme = "dark",
  variant = "tabs",
  edges = ["top", "bottom"],
  ...rest
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
  const baseColor = isLight ? colors.paper50 : colors.forest900;

  return (
    <View
      style={[styles.root, { backgroundColor: baseColor }, style]}
      {...rest}
    >
      <StatusBar barStyle={isLight ? "dark-content" : "light-content"} />

      {/* Base opaca garantida (inclusive no primeiro frame) */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: baseColor }]}
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
              style={StyleSheet.absoluteFill}
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
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <ImageBackground
              source={noise}
              resizeMode="repeat"
              style={StyleSheet.absoluteFill}
              imageStyle={isLight ? styles.noiseImageLight : styles.noiseImage}
            />
          </View>
        </>
      )}

      {/* Conteúdo */}
      <SafeAreaView style={styles.content} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
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
  lightPaperLight: {
    position: "absolute",
    top: -180,
    left: -220,
    width: 520,
    height: 520,
    borderRadius: 9999,
    backgroundColor: colors.paper100,
    opacity: 0.45,
  },
  lightSecondaryLight: {
    position: "absolute",
    top: -180,
    left: -220,
    width: 520,
    height: 520,
    borderRadius: 9999,
    // Mesmo "formato" do dark mode, mas com cor que aparece no tema claro.
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
