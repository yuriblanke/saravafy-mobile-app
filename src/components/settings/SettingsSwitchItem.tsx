import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

type Props = {
  label: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  textColor: string;
};

export function SettingsSwitchItem({
  label,
  value,
  onValueChange,
  textColor,
}: Props) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
  },
});
