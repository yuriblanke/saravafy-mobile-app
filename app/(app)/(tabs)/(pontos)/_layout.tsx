import { Stack } from "expo-router";
import React from "react";

export default function PontosStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Transparente: cada scene desenha seu próprio fundo full-screen.
        contentStyle: { backgroundColor: "transparent" },
        animation: "none",
      }}
    />
  );
}
