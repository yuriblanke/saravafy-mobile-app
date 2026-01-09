import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

import { useSaravafyLayoutMetrics } from "@/src/contexts/SaravafyLayoutMetricsContext";
import { getSaravafyBaseColor } from "@/src/theme";
import { SaravafyBackgroundLayers } from "@/src/components/SaravafyBackgroundLayers";

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
    <View style={[styles.root, style]} {...rest}>
      {/* Base opaca idiot-proof: sempre existe */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: baseColor }]}
      />

      {/*
        Camadas Saravafy: renderiza em um container que “sobe” por trás do header
        global (sem depender de cenas transparentes).
      */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          headerHeight ? { top: -headerHeight } : null,
        ]}
      >
        <SaravafyBackgroundLayers theme={theme} variant={variant} />
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
