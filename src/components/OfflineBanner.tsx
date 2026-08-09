import { useNetwork } from "@/src/contexts/NetworkContext";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const VISIBLE_DURATION_MS = 4000;

export function OfflineBanner() {
  const { isConnected } = useNetwork();
  const insets = useSafeAreaInsets();

  // Controla se o toast ainda deve ser exibido (descartável)
  const [visible, setVisible] = useState(false);
  const prevConnected = useRef<boolean | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;

  const show = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setVisible(true);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    hideTimer.current = setTimeout(() => dismiss(), VISIBLE_DURATION_MS);
  };

  const dismiss = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.timing(opacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  useEffect(() => {
    // Só dispara quando a conexão cai (transição de true/null → false)
    if (prevConnected.current !== false && isConnected === false) {
      show();
    }
    // Quando volta online, esconde imediatamente
    if (prevConnected.current === false && isConnected !== false) {
      dismiss();
    }
    prevConnected.current = isConnected;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { paddingTop: insets.top + 4, opacity },
      ]}
    >
      <Ionicons name="cloud-offline-outline" size={14} color={colors.paper50} />
      <Text style={styles.text}>Sem conexão — modo offline</Text>
      <Pressable
        onPress={dismiss}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Fechar aviso"
        style={styles.closeBtn}
      >
        <Ionicons name="close" size={14} color={colors.paper50} />
      </Pressable>
    </Animated.View>
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
  closeBtn: {
    marginLeft: spacing.xs,
  },
});
