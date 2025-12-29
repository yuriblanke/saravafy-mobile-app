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
  variant?: "dark" | "light";
};

const noise = require("@/assets/textures/noise_128.png");

export function SaravafyScreen({
  style,
  children,
  variant = "dark",
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

  return (
    <View
      style={[
        styles.root,
        variant === "light" ? styles.rootLight : styles.rootDark,
        style,
      ]}
      {...rest}
    >
      <StatusBar
        barStyle={variant === "light" ? "dark-content" : "light-content"}
      />

      {/* Base (gradiente quando disponível; fallback é a cor sólida do root) */}
      {LinearGradient ? (
        <LinearGradient
          pointerEvents="none"
          colors={
            variant === "light"
              ? [colors.paper50, colors.paper100]
              : [colors.forest800, colors.forest900]
          }
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View pointerEvents="none" style={StyleSheet.absoluteFill} />
      )}

      {/* Luz difusa (top-right) */}
      <View
        pointerEvents="none"
        style={variant === "light" ? styles.lightBrassLight : styles.lightBrass}
      />

      {/* Segunda luz (top-left) */}
      <View
        pointerEvents="none"
        style={variant === "light" ? styles.lightPaperLight : styles.lightPaper}
      />

      {/* Lavagens (tema claro): verde + terra */}
      {variant === "light" ? (
        <>
          <View pointerEvents="none" style={styles.lightTintLight} />
          <View pointerEvents="none" style={styles.lightForestLight} />
          <View pointerEvents="none" style={styles.lightEarthLight} />
        </>
      ) : null}

      {/* Vinheta */}
      <View
        pointerEvents="none"
        style={variant === "light" ? styles.vignetteLight : styles.vignette}
      />

      {/* Grão */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <ImageBackground
          source={noise}
          resizeMode="repeat"
          style={StyleSheet.absoluteFill}
          imageStyle={
            variant === "light" ? styles.noiseImageLight : styles.noiseImage
          }
        />
      </View>

      {/* Conteúdo */}
      <SafeAreaView style={styles.content} edges={["top", "bottom"]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rootDark: {
    backgroundColor: colors.forest900,
  },
  rootLight: {
    backgroundColor: colors.paper50,
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
  lightForestLight: {
    position: "absolute",
    top: -260,
    left: -260,
    width: 720,
    height: 720,
    borderRadius: 9999,
    backgroundColor: colors.forest600,
    opacity: 0.3,
  },
  lightTintLight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.forest700,
    opacity: 0.16,
  },
  lightEarthLight: {
    position: "absolute",
    bottom: -300,
    right: -260,
    width: 760,
    height: 760,
    borderRadius: 9999,
    backgroundColor: colors.earth600,
    opacity: 0.05,
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
