import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/src/theme";

export type PreferencesRadioOption<T extends string> = {
  key: T;
  label: string;
  description?: string;
};

type Props<T extends string> = {
  variant: "light" | "dark";
  value: T;
  onChange: (next: T) => void;
  options: readonly PreferencesRadioOption<T>[];
};

export function PreferencesRadioGroup<T extends string>({
  variant,
  value,
  onChange,
  options,
}: Props<T>) {
  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  const borderColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;

  const cardBg = variant === "light" ? colors.inputBgLight : colors.inputBgDark;

  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.card, { borderColor, backgroundColor: cardBg }]}
    >
      {options.map((opt, index) => {
        const selected = opt.key === value;
        const showDivider = index < options.length - 1;

        return (
          <View key={opt.key}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(opt.key)}
              style={({ pressed }) => [
                styles.optionRow,
                pressed ? styles.pressed : null,
              ]}
            >
              <View
                style={[
                  styles.radioOuter,
                  { borderColor: selected ? colors.brass600 : borderColor },
                ]}
              >
                {selected ? <View style={styles.radioInner} /> : null}
              </View>

              <View style={styles.textCol}>
                <Text style={[styles.label, { color: textPrimary }]}>
                  {opt.label}
                </Text>
                {opt.description ? (
                  <Text style={[styles.desc, { color: textSecondary }]}>
                    {opt.description}
                  </Text>
                ) : null}
              </View>
            </Pressable>

            {showDivider ? (
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
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  optionRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.82,
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
    backgroundColor: colors.brass600,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
  },
  desc: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.9,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.6,
  },
});
