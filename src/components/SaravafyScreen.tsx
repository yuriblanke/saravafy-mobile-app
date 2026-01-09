import React from "react";
import {
  Platform,
  StatusBar,
  StyleSheet,
  View,
  type ViewProps,
} from "react-native";

import { SaravafyBackgroundLayers } from "@/src/components/SaravafyBackgroundLayers";
import { useGlobalSafeAreaInsets } from "@/src/contexts/GlobalSafeAreaInsetsContext";
import { colors, getSaravafyBaseColor } from "@/src/theme";

type Props = ViewProps & {
  children: React.ReactNode;
  theme?: "dark" | "light";
  variant?: "tabs" | "stack" | "focus";
  edges?: Array<"top" | "bottom" | "left" | "right">;
};

export function SaravafyScreen({
  style,
  children,
  theme = "dark",
  variant = "tabs",
  edges: _edges = ["top", "bottom"],
  ...rest
}: Props) {
  const isLight = theme === "light";
  const baseColor = getSaravafyBaseColor(theme);
  const insets = useGlobalSafeAreaInsets();

  const edges = _edges;
  const padTop = edges.includes("top") ? insets.top : 0;
  const padBottom = edges.includes("bottom") ? insets.bottom : 0;
  const padLeft = edges.includes("left") ? insets.left : 0;
  const padRight = edges.includes("right") ? insets.right : 0;

  return (
    <View
      style={[styles.root, { backgroundColor: baseColor }, style]}
      {...rest}
    >
      <StatusBar
        barStyle={isLight ? "dark-content" : "light-content"}
        translucent={Platform.OS === "android"}
        backgroundColor={Platform.OS === "android" ? "transparent" : undefined}
      />

      <SaravafyBackgroundLayers theme={theme} variant={variant} />

      {/* Scrim somente nas faixas de safe-area */}
      {insets.top ? (
        <View
          pointerEvents="none"
          style={[
            styles.safeAreaScrim,
            { top: 0, left: 0, right: 0, height: insets.top },
          ]}
        />
      ) : null}
      {insets.bottom ? (
        <View
          pointerEvents="none"
          style={[
            styles.safeAreaScrim,
            { left: 0, right: 0, bottom: 0, height: insets.bottom },
          ]}
        />
      ) : null}
      {insets.left ? (
        <View
          pointerEvents="none"
          style={[
            styles.safeAreaScrim,
            { top: 0, bottom: 0, left: 0, width: insets.left },
          ]}
        />
      ) : null}
      {insets.right ? (
        <View
          pointerEvents="none"
          style={[
            styles.safeAreaScrim,
            { top: 0, bottom: 0, right: 0, width: insets.right },
          ]}
        />
      ) : null}

      {/* Conteúdo */}
      <View
        style={[
          styles.content,
          padTop ? { paddingTop: padTop } : null,
          padBottom ? { paddingBottom: padBottom } : null,
          padLeft ? { paddingLeft: padLeft } : null,
          padRight ? { paddingRight: padRight } : null,
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
  safeAreaScrim: {
    position: "absolute",
    backgroundColor: colors.safeAreaScrim,
  },
});
