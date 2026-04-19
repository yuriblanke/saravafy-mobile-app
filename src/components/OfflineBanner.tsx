import { useNetwork } from "@/src/contexts/NetworkContext";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function OfflineBanner() {
  const { isConnected } = useNetwork();
  const insets = useSafeAreaInsets();

  if (isConnected) return null;

  return (
    <View style={[styles.banner, { paddingTop: insets.top + 4 }]}>
      <Ionicons name="cloud-offline-outline" size={14} color={colors.paper50} />
      <Text style={styles.text}>Sem conexão — modo offline</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: "rgba(0,0,0,0.82)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingBottom: 6,
    paddingHorizontal: spacing.md,
  },
  text: {
    color: colors.paper50,
    fontSize: 12,
    fontWeight: "700",
  },
});
