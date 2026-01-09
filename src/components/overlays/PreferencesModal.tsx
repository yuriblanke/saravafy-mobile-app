import React, { useEffect } from "react";
import { BackHandler, Modal, StyleSheet, View } from "react-native";
import { useSegments } from "expo-router";

import { PreferencesOverlaySheets } from "@/src/components/AppHeaderWithPreferences";
import { usePreferencesOverlay } from "@/src/contexts/PreferencesOverlayContext";

export function PreferencesModal() {
  const { isOpen, closePreferences } = usePreferencesOverlay();
  const segments = useSegments() as string[];

  // If we keep the Preferences overlay visible while presenting a React Navigation
  // modal (like `/terreiro-editor`), the RN <Modal /> will always be on top and
  // the editor will look like it's opening "behind" it.
  // Instead, we keep `isOpen=true` but temporarily hide the modal while the
  // editor/access-manager modal is active. When it closes, preferences appears
  // again automatically.
  const leaf = segments[segments.length - 1];
  const shouldHideForRoute = leaf === "terreiro-editor" || leaf === "access-manager";

  useEffect(() => {
    if (!isOpen) return;

    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      closePreferences();
      return true;
    });

    return () => sub.remove();
  }, [closePreferences, isOpen]);

  return (
    <Modal
      visible={isOpen && !shouldHideForRoute}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={closePreferences}
    >
      <View style={styles.root} pointerEvents="box-none">
        <PreferencesOverlaySheets />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
});
