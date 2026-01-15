import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useGlobalSafeAreaInsets } from "@/src/contexts/GlobalSafeAreaInsetsContext";
import { colors, spacing } from "@/src/theme";

type Props = {
  variant: "light" | "dark";
};

export function PreferencesHeader({ variant }: Props) {
  const router = useRouter();
  const insets = useGlobalSafeAreaInsets();

  const headerVisibleHeight = 52;
  const headerTotalHeight = headerVisibleHeight + (insets.top ?? 0);

  const baseBgColor = variant === "light" ? colors.paper50 : colors.forest900;

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;

  const dividerColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <View
      style={[
        styles.wrap,
        {
          height: headerTotalHeight,
          paddingTop: insets.top ?? 0,
          backgroundColor: baseBgColor,
          borderBottomColor: dividerColor,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        onPress={goBack}
        hitSlop={10}
        style={({ pressed }) => [
          styles.iconBtn,
          pressed ? styles.iconBtnPressed : null,
        ]}
      >
        <Ionicons name="chevron-back" size={22} color={textPrimary} />
      </Pressable>

      <Text style={[styles.title, { color: textPrimary }]} numberOfLines={1}>
        Preferências
      </Text>

      <View style={styles.rightSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnPressed: {
    opacity: 0.75,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  rightSpacer: {
    width: 40,
    height: 40,
  },
});
