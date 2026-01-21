import { TAG_CHIP_HEIGHT, TAG_CHIP_RADIUS } from "@/src/components/TagChip";
import { colors } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

export function TagPlusChip(props: {
  variant?: "dark" | "light";
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const {
    variant = "dark",
    onPress,
    disabled,
    accessibilityLabel = "Adicionar",
  } = props;

  void variant;

  const borderColor = colors.brass600;
  const iconColor = colors.brass600;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      style={({ pressed }) => [
        styles.wrap,
        {
          borderColor,
          backgroundColor: "transparent",
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.center}>
        <Ionicons name="add" size={14} color={iconColor} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: TAG_CHIP_HEIGHT,
    height: TAG_CHIP_HEIGHT,
    borderRadius: TAG_CHIP_RADIUS,
    borderWidth: 2,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
