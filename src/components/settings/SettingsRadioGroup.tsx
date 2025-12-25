import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type SettingsRadioOption<T extends string> = {
  key: T;
  label: string;
  description?: string;
};

type Props<T extends string> = {
  value: T;
  onChange: (next: T) => void;
  options: ReadonlyArray<SettingsRadioOption<T>>;
  textColor: string;
  descriptionColor: string;
  borderColor: string;
  cardBg: string;
  selectedColor: string;
};

export function SettingsRadioGroup<T extends string>({
  value,
  onChange,
  options,
  textColor,
  descriptionColor,
  borderColor,
  cardBg,
  selectedColor,
}: Props<T>) {
  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.group, { borderColor, backgroundColor: cardBg }]}
    >
      {options.map((opt, idx) => {
        const selected = opt.key === value;
        return (
          <View key={opt.key}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={opt.label}
              onPress={() => onChange(opt.key)}
              style={({ pressed }) => [
                styles.row,
                pressed ? styles.pressed : null,
              ]}
              hitSlop={10}
            >
              <View
                style={[
                  styles.radioOuter,
                  { borderColor: selected ? selectedColor : borderColor },
                ]}
              >
                {selected ? (
                  <View
                    style={[
                      styles.radioInner,
                      { backgroundColor: selectedColor },
                    ]}
                  />
                ) : null}
              </View>

              <View style={styles.textCol}>
                <Text style={[styles.label, { color: textColor }]}>
                  {opt.label}
                </Text>
                {opt.description ? (
                  <Text
                    style={[styles.description, { color: descriptionColor }]}
                  >
                    {opt.description}
                  </Text>
                ) : null}
              </View>
            </Pressable>

            {idx < options.length - 1 ? (
              <View
                style={[styles.divider, { backgroundColor: borderColor }]}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pressed: {
    opacity: 0.75,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  textCol: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
  },
  description: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.5,
  },
});
