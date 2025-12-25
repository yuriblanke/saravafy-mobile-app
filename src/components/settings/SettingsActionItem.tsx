import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  label: string;
  onPress: () => void;
  textColor: string;
  hintColor: string;
  chevron?: boolean;
  accessibilityLabel?: string;
  disabled?: boolean;
};

export function SettingsActionItem({
  label,
  onPress,
  textColor,
  hintColor,
  chevron = true,
  accessibilityLabel,
  disabled = false,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
      ]}
      hitSlop={10}
    >
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      {chevron ? (
        <View style={styles.trailing}>
          <Text style={[styles.chevron, { color: hintColor }]}>›</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
  },
  trailing: {
    marginLeft: 12,
    minWidth: 16,
    alignItems: "flex-end",
  },
  chevron: {
    fontSize: 18,
    lineHeight: 18,
    fontWeight: "800",
    opacity: 0.7,
  },
});
