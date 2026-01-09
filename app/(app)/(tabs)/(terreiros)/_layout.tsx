import { Stack } from "expo-router";
import React from "react";

export default function TerreirosStackLayout() {
  return (
    <Stack
      screenOptions={({ route }) => ({
        headerShown: false,
        // Transparente: cada scene desenha seu próprio fundo full-screen.
        contentStyle: { backgroundColor: "transparent" },
        animation: "none",
        // Otimização (não requisito): tenta reduzir telas anteriores ainda montadas.
        detachPreviousScreen:
          route.name === "terreiro" || route.name === "collection/[id]",
      })}
    />
  );
}
