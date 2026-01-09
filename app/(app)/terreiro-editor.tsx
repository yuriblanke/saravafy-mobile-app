import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { usePreferences } from "@/contexts/PreferencesContext";
import { colors } from "@/src/theme";
import TerreiroEditor from "@/src/screens/TerreiroEditor/TerreiroEditor";

export default function TerreiroEditorRoute() {
	const { effectiveTheme } = usePreferences();
	const modalBg = effectiveTheme === "light" ? colors.paper50 : colors.forest900;

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: modalBg }}>
			<TerreiroEditor />
		</SafeAreaView>
	);
}
