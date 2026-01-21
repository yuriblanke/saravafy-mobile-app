import React from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  View,
} from "react-native";

import type { ThemeMode } from "@/contexts/PreferencesContext";
import { colors } from "@/src/theme";
import { setNavCoverVisible, useNavCoverState } from "@/src/utils/navCover";

export function LoadingStatePreferences(props: { effectiveTheme: ThemeMode }) {
  const { effectiveTheme } = props;
  const navCover = useNavCoverState();

  React.useEffect(() => {
    if (!navCover.visible) return;

    // Failsafe: evita deixar o app preso no cover se algo falhar.
    const t = setTimeout(() => {
      setNavCoverVisible(false, { reason: "cover-failsafe-timeout" });
    }, 8000);

    return () => clearTimeout(t);
  }, [navCover.visible]);

  return (
    <Modal
      visible={navCover.visible}
      transparent={false}
      animationType="none"
      statusBarTranslucent={Platform.OS === "android"}
      navigationBarTranslucent={Platform.OS === "android"}
      onRequestClose={() => {
        // No-op: o cover é controlado pela navegação.
      }}
    >
      <View style={{ flex: 1 }}>
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor:
                navCover.backgroundColor ??
                (effectiveTheme === "light"
                  ? colors.paper50
                  : colors.forest900),
            },
          ]}
        />

        <View
          style={[
            StyleSheet.absoluteFillObject,
            { alignItems: "center", justifyContent: "center" },
          ]}
        >
          {navCover.ready ? null : (
            <ActivityIndicator
              size="large"
              color={colors.brass600}
              accessibilityLabel="Carregando"
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
