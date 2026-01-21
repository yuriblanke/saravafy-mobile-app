import React from "react";
import { StyleSheet, Text } from "react-native";

import { usePreferences, type ThemeMode } from "@/contexts/PreferencesContext";
import {
  PreferencesRadioGroup,
  PreferencesSection,
  type PreferencesRadioOption,
} from "@/src/components/preferences";
import { colors } from "@/src/theme";

type Props = {
  variant: "light" | "dark";
};

export function ThemeSection({ variant }: Props) {
  const { themeMode, setThemeMode } = usePreferences();

  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  const options: PreferencesRadioOption<ThemeMode>[] = [
    {
      key: "system",
      label: "Sistema",
      description: "Seguir o dispositivo",
    },
    { key: "light", label: "Claro" },
    { key: "dark", label: "Escuro" },
  ];

  return (
    <PreferencesSection title="Aparência" variant={variant}>
      <Text style={[styles.desc, { color: textSecondary }]}>
        Escolha como o app deve se comportar visualmente
      </Text>

      <PreferencesRadioGroup
        variant={variant}
        value={themeMode}
        onChange={(next) => setThemeMode(next)}
        options={options}
      />
    </PreferencesSection>
  );
}

const styles = StyleSheet.create({
  desc: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
});
