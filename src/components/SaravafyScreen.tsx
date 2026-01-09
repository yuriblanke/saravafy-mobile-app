import React from "react";
import {
  Platform,
  StatusBar,
  StyleSheet,
  View,
  type ViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SaravafyBackgroundLayers } from "@/src/components/SaravafyBackgroundLayers";
import { getSaravafyBaseColor } from "@/src/theme";

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
  edges = ["top", "bottom"],
  ...rest
}: Props) {
  const isLight = theme === "light";
  const baseColor = getSaravafyBaseColor(theme);

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
});
