import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Redirect, Slot, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo, useRef, useState } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  PreferencesProvider,
  usePreferences,
} from "@/contexts/PreferencesContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { InviteGate } from "@/src/components/InviteGate";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Realtime invalidations should refetch silently in background.
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PreferencesProvider>
          <ToastProvider>
            <RootLayoutNav />
          </ToastProvider>
        </PreferencesProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const systemColorScheme = useColorScheme();
  const { themeMode, isReady, bootstrapStartPage, setActiveContext } =
    usePreferences();
  const { user, isLoading } = useAuth();
  const segments = useSegments();

  const bootstrapStartPageRef = useRef(bootstrapStartPage);
  const setActiveContextRef = useRef(setActiveContext);

  useEffect(() => {
    bootstrapStartPageRef.current = bootstrapStartPage;
  }, [bootstrapStartPage]);

  useEffect(() => {
    setActiveContextRef.current = setActiveContext;
  }, [setActiveContext]);

  const [bootTarget, setBootTarget] = useState<
    | { href: "/login"; params?: undefined }
    | { href: "/"; params?: undefined }
    | {
        href: "/terreiro";
        params: {
          bootStart?: string;
          bootOffline?: string;
          terreiroId?: string;
          terreiroTitle?: string;
        };
      }
    | null
  >(null);

  const [bootComplete, setBootComplete] = useState(false);

  // `useSegments()` can get a narrowed union type depending on route typings.
  // We intentionally treat segments as strings because we compare against
  // literal route names (including "index"), and we don't want TS narrowing
  // to create impossible-looking comparisons.
  const firstSegment = segments[0] as string | undefined;
  const inAuthGroup = firstSegment === "(auth)";
  const inAppGroup = firstSegment === "(app)";
  const routeSegment = segments[1] as string | undefined;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (isLoading) return;
      if (!isReady) return;

      // Reavaliou as condições de boot (ex.: login/logout/preferências carregadas):
      // volta para o modo de boot até chegar no destino inicial.
      if (!cancelled) setBootComplete(false);

      if (!user?.id) {
        // Sem sessão: sempre login.
        setActiveContextRef.current({ kind: "USER_PROFILE" });
        if (!cancelled) setBootTarget({ href: "/login" });
        return;
      }

      const decision = await bootstrapStartPageRef.current(user.id);
      if (cancelled) return;

      if (decision.preferredHref === "/terreiro" && decision.terreiroContext) {
        setActiveContextRef.current({
          kind: "TERREIRO_PAGE",
          terreiroId: decision.terreiroContext.terreiroId,
          terreiroName: decision.terreiroContext.terreiroName,
          terreiroAvatarUrl: decision.terreiroContext.terreiroAvatarUrl,
          role: decision.terreiroContext.role,
        });

        setBootTarget({
          href: "/terreiro",
          params: {
            bootStart: "1",
            bootOffline: decision.terreiroContext.usedOfflineSnapshot
              ? "1"
              : "0",
            terreiroId: decision.terreiroContext.terreiroId,
            terreiroTitle: decision.terreiroContext.terreiroName,
          },
        });
        return;
      }

      setActiveContextRef.current({ kind: "USER_PROFILE" });
      setBootTarget({ href: "/" });
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [isLoading, isReady, user?.id]);

  const effectiveScheme =
    themeMode === "system" ? systemColorScheme : themeMode;

  const isAtTarget = useMemo(() => {
    if (!bootTarget) return false;

    if (bootTarget.href === "/login") {
      return inAuthGroup && routeSegment === "login";
    }

    if (bootTarget.href === "/") {
      return (
        inAppGroup && (routeSegment === undefined || routeSegment === "index")
      );
    }

    return inAppGroup && routeSegment === "terreiro";
  }, [bootTarget, inAppGroup, inAuthGroup, routeSegment]);

  useEffect(() => {
    if (!bootTarget) return;
    if (!isAtTarget) return;

    // Assim que chegamos no destino inicial, liberamos navegação normal.
    setBootComplete(true);
    SplashScreen.hideAsync().catch(() => undefined);
  }, [bootTarget, isAtTarget]);

  return (
    <ThemeProvider
      value={effectiveScheme === "dark" ? DarkTheme : DefaultTheme}
    >
      <InviteGate />
      {!bootTarget ? null : bootComplete || isAtTarget ? (
        <Slot />
      ) : bootTarget.href === "/terreiro" ? (
        <Redirect href={{ pathname: "/terreiro", params: bootTarget.params }} />
      ) : (
        <Redirect href={bootTarget.href as any} />
      )}
    </ThemeProvider>
  );
}
