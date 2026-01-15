import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { usePreferences } from "@/contexts/PreferencesContext";
import { CurimbaExplainerBottomSheet } from "@/src/components/CurimbaExplainerBottomSheet";
import { useGlobalSafeAreaInsets } from "@/src/contexts/GlobalSafeAreaInsetsContext";
import type { MyTerreiroWithRole } from "@/src/queries/me";
import { colors, spacing } from "@/src/theme";

import { CurimbaSection } from "./components/CurimbaSection";
import { LogoutSection } from "./components/LogoutSection";
import { PreferencesHeader } from "./components/PreferencesHeader";
import { ProfileSection } from "./components/ProfileSection";
import { TerreiroActionsSheet } from "./components/TerreiroActionsSheet";
import { TerreirosSection } from "./components/TerreirosSection";
import { ThemeSection } from "./components/ThemeSection";

export default function Preferences() {
  const insets = useGlobalSafeAreaInsets();
  const {
    effectiveTheme,
    curimbaOnboardingDismissed,
    setCurimbaOnboardingDismissed,
  } = usePreferences();

  const variant: "light" | "dark" = effectiveTheme;
  const baseBgColor = variant === "light" ? colors.paper50 : colors.forest900;

  const headerVisibleHeight = 52;
  const headerTotalHeight = headerVisibleHeight + (insets.top ?? 0);

  const [terreiroActionsTarget, setTerreiroActionsTarget] =
    useState<MyTerreiroWithRole | null>(null);
  const [isCurimbaExplainerOpen, setIsCurimbaExplainerOpen] = useState(false);

  const openTerreiroActions = useCallback((terreiro: MyTerreiroWithRole) => {
    setTerreiroActionsTarget(terreiro);
  }, []);

  const closeTerreiroActions = useCallback(() => {
    setTerreiroActionsTarget(null);
  }, []);

  const openCurimbaExplainer = useCallback(() => {
    setIsCurimbaExplainerOpen(true);
  }, []);

  const closeCurimbaExplainer = useCallback(() => {
    setIsCurimbaExplainerOpen(false);
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: baseBgColor }]}>
      <PreferencesHeader variant={variant} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerTotalHeight + spacing.lg,
            paddingBottom: (insets.bottom ?? 0) + spacing.xl,
          },
        ]}
      >
        <ProfileSection variant={variant} />
        <TerreirosSection
          variant={variant}
          onOpenActions={openTerreiroActions}
        />
        <ThemeSection variant={variant} />
        <CurimbaSection
          variant={variant}
          onOpenExplainer={openCurimbaExplainer}
        />
        <LogoutSection variant={variant} />
      </ScrollView>

      <TerreiroActionsSheet
        variant={variant}
        target={terreiroActionsTarget}
        onClose={closeTerreiroActions}
      />

      <CurimbaExplainerBottomSheet
        visible={isCurimbaExplainerOpen}
        variant={variant}
        dontShowAgain={curimbaOnboardingDismissed}
        onChangeDontShowAgain={(next) => setCurimbaOnboardingDismissed(next)}
        onClose={closeCurimbaExplainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
});
