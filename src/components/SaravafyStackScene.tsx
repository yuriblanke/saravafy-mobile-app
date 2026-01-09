import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

import { SaravafyBackgroundLayers } from "@/src/components/SaravafyBackgroundLayers";
import { useSaravafyLayoutMetrics } from "@/src/contexts/SaravafyLayoutMetricsContext";
import { getSaravafyBaseColor } from "@/src/theme";

type Props = ViewProps & {
  children: React.ReactNode;
  theme: "dark" | "light";
  variant?: "tabs" | "stack" | "focus";
};

export function SaravafyStackScene({
  children,
  theme,
  variant = "stack",
  style,
  ...rest
}: Props) {
  const { headerHeight } = useSaravafyLayoutMetrics();
  const baseColor = getSaravafyBaseColor(theme);

  return (
    <View
      style={[styles.root, { backgroundColor: baseColor }, style]}
      {...rest}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {/*
          Camadas Saravafy alinhadas ao viewport do header global.
          OBS: não dependemos de overflow/negative top (que pode ser clippado pelo navigator).
        */}
        <SaravafyBackgroundLayers
          theme={theme}
          variant={variant}
          offsetY={headerHeight}
        />
      </View>

      <View style={styles.content}>{children}</View>
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
});
