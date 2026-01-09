import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

import { SaravafyBackgroundLayers } from "@/src/components/SaravafyBackgroundLayers";
import { useGlobalSafeAreaInsets } from "@/src/contexts/GlobalSafeAreaInsetsContext";
import { useSaravafyLayoutMetrics } from "@/src/contexts/SaravafyLayoutMetricsContext";

type Props = ViewProps & {
  children: React.ReactNode;
  theme: "dark" | "light";
  variant?: "tabs" | "stack" | "focus";
  /**
   * Modo diagnóstico: força uma cor sólida (opaca) e desliga as camadas Saravafy.
   * Útil para verificar bleed/overlap e cadeia de backgrounds.
   */
  debugSolidColor?: string;
};

export function SaravafyStackScene({
  children,
  theme,
  variant = "stack",
  debugSolidColor,
  style,
  ...rest
}: Props) {
  const { headerHeight } = useSaravafyLayoutMetrics();
  const insets = useGlobalSafeAreaInsets();

  const resolvedTopPadding = headerHeight > 0 ? headerHeight : insets.top;

  return (
    <View style={[styles.root, style]} {...rest}>
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {debugSolidColor ? (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: debugSolidColor },
            ]}
          />
        ) : (
          <SaravafyBackgroundLayers theme={theme} variant={variant} />
        )}
      </View>

      <View
        style={[
          styles.content,
          resolvedTopPadding ? { paddingTop: resolvedTopPadding } : null,
          insets.bottom ? { paddingBottom: insets.bottom } : null,
        ]}
      >
        {children}
      </View>
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
