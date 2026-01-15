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

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <View
      style={[
        styles.fixedHeader,
        {
          height: headerTotalHeight,
          paddingTop: insets.top ?? 0,
          backgroundColor: baseBgColor,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        onPress={goBack}
        hitSlop={10}
        style={({ pressed }) => [
          styles.headerIconBtn,
          pressed ? styles.headerIconBtnPressed : null,
        ]}
      >
        <Ionicons name="chevron-back" size={22} color={textPrimary} />
      </Pressable>

      <View style={styles.headerTitleWrap}>
        <Text
          style={[styles.headerTitle, { color: textPrimary }]}
          numberOfLines={1}
        >
          Preferências
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconBtnPressed: {
    opacity: 0.75,
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 6,
    marginRight: 6,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
});
