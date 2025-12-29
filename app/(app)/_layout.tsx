import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="terreiro" />
      <Stack.Screen name="terreiros" />
      <Stack.Screen
        name="terreiro-editor"
        options={{ presentation: "modal" }}
      />
      <Stack.Screen name="access-manager" options={{ presentation: "modal" }} />
    </Stack>
  );
}
