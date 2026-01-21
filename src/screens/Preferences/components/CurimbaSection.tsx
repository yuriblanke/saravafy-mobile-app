import React, { useCallback } from "react";

import { usePreferences } from "@/contexts/PreferencesContext";
import {
  PreferencesSection,
  PreferencesSwitchItem,
} from "@/src/components/preferences";

type Props = {
  variant: "light" | "dark";
  onEnabledCurimba: () => void;
};

export function CurimbaSection({ variant, onEnabledCurimba }: Props) {
  const { curimbaEnabled, setCurimbaEnabled } = usePreferences();

  const onValueChange = useCallback(
    (next: boolean) => {
      setCurimbaEnabled(next);
      if (next) onEnabledCurimba();
    },
    [onEnabledCurimba, setCurimbaEnabled]
  );

  return (
    <PreferencesSection title="Curimba" variant={variant}>
      <PreferencesSwitchItem
        variant={variant}
        title="Modo Curimba"
        description="Mostra apenas as letras e mantém a tela ligada"
        value={curimbaEnabled}
        onValueChange={onValueChange}
      />
    </PreferencesSection>
  );
}
