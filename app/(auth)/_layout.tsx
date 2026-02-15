import { Stack } from "expo-router";
import { AuthProviderV2 } from "@/src/features/auth-v2";

export default function AuthLayout() {
  return (
    <AuthProviderV2>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
      </Stack>
    </AuthProviderV2>
  );
}
