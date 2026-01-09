import { usePreferences } from "@/contexts/PreferencesContext";
import { SaravafyStackScene } from "@/src/components/SaravafyStackScene";
import Home from "@/src/screens/Home/Home";
import React from "react";

export default function PontosHomeRoute() {
	const { effectiveTheme } = usePreferences();
	const theme: "light" | "dark" = effectiveTheme;

	return (
		<SaravafyStackScene theme={theme} variant="tabs">
			<Home />
		</SaravafyStackScene>
	);
}
