import React, { useEffect } from "react";
import { BackHandler, Modal, StyleSheet, View } from "react-native";

import { PreferencesOverlaySheets } from "@/src/components/AppHeaderWithPreferences";
import { usePreferencesOverlay } from "@/src/contexts/PreferencesOverlayContext";

export function PreferencesModal() {
  const { isOpen, closePreferences } = usePreferencesOverlay();

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
      visible={isOpen}
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
