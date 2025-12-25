import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  PreferencesProvider,
  usePreferences,
} from "@/contexts/PreferencesContext";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <PreferencesProvider>
        <RootLayoutNav />
      </PreferencesProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = usePreferences();
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const firstSegment = segments[0];
    const inAuthGroup = firstSegment === "(auth)";
    const inAppGroup = firstSegment === "(app)";

    if (!user && !inAuthGroup) {
      // Redirecionar para login se não autenticado
      router.replace("/login");
    } else if (user && !inAppGroup) {
      // Redirecionar para home se autenticado
      router.replace("/home");
    }
  }, [user, segments, isLoading]);

  const effectiveScheme =
    themeMode === "system" ? systemColorScheme : themeMode;

  return (
    <ThemeProvider
      value={effectiveScheme === "dark" ? DarkTheme : DefaultTheme}
    >
      <Slot />
    </ThemeProvider>
  );
}
