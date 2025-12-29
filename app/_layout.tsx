import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  PreferencesProvider,
  usePreferences,
} from "@/contexts/PreferencesContext";
import { RootPagerProvider } from "@/contexts/RootPagerContext";
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

  useEffect(() => {
    console.log("[RootLayout] MONTADO");
    return () => {
      console.log("[RootLayout] DESMONTADO");
    };
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PreferencesProvider>
          <RootPagerProvider>
            <ToastProvider>
              <RootLayoutNav />
            </ToastProvider>
          </RootPagerProvider>
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
  const router = useRouter();

  useEffect(() => {
    console.log("[RootLayoutNav] MONTADO");
    return () => {
      console.log("[RootLayoutNav] DESMONTADO");
    };
  }, []);

  const bootstrapStartPageRef = useRef(bootstrapStartPage);
  const setActiveContextRef = useRef(setActiveContext);

  useEffect(() => {
    bootstrapStartPageRef.current = bootstrapStartPage;
  }, [bootstrapStartPage]);

  useEffect(() => {
    setActiveContextRef.current = setActiveContext;
  }, [setActiveContext]);

  // LATCHES: Boot e navegação devem acontecer apenas 1x por cold start
  const didCompleteBootRef = useRef(false);
  const didNavigateRef = useRef(false);

  const [bootComplete, setBootComplete] = useState(false);

  // Boot effect: decide tela inicial APENAS 1x quando auth e prefs estiverem prontos
  useEffect(() => {
    // Se boot já foi completado, nunca mais rodar
    if (didCompleteBootRef.current) {
      console.log("[Boot] SKIP: boot já completado anteriormente");
      return;
    }

    // Aguardar auth e preferências estarem prontos
    if (isLoading) {
      console.log("[Boot] aguardando isLoading=false", { segments: segments.join("/") });
      return;
    }
    if (!isReady) {
      console.log("[Boot] aguardando isReady=true", { segments: segments.join("/") });
      return;
    }

    console.log("[Boot] EXECUTANDO boot inicial", {
      hasUser: !!user?.id,
      segments: segments.join("/"),
    });

    const run = async () => {
      try {
        let preferredHref: "/(app)" | "/login" | "/terreiro" = "/(app)";
        let terreiroParams:
          | {
              bootStart?: string;
              bootOffline?: string;
              terreiroId?: string;
              terreiroTitle?: string;
            }
          | undefined;

        if (!user?.id) {
          // Sem sessão: sempre login.
          console.log("[Boot] sem user, preferredHref=/login");
          preferredHref = "/login";
          setActiveContextRef.current({ kind: "USER_PROFILE" });
        } else {
          console.log("[Boot] chamando bootstrapStartPage", {
            userId: user.id,
          });

          const decision = await bootstrapStartPageRef.current(user.id);

          console.log("[Boot] decisão:", {
            preferredHref: decision.preferredHref,
            hasContext: !!decision.terreiroContext,
          });

          if (
            decision.preferredHref === "/terreiro" &&
            decision.terreiroContext
          ) {
            preferredHref = "/terreiro";
            terreiroParams = {
              bootStart: "1",
              bootOffline: decision.terreiroContext.usedOfflineSnapshot
                ? "1"
                : "0",
              terreiroId: decision.terreiroContext.terreiroId,
              terreiroTitle: decision.terreiroContext.terreiroName,
            };
            setActiveContextRef.current({
              kind: "TERREIRO_PAGE",
              terreiroId: decision.terreiroContext.terreiroId,
              terreiroName: decision.terreiroContext.terreiroName,
              terreiroAvatarUrl: decision.terreiroContext.terreiroAvatarUrl,
              role: decision.terreiroContext.role,
            });
          } else {
            preferredHref = "/(app)";
            setActiveContextRef.current({ kind: "USER_PROFILE" });
          }
        }

        // Marcar boot como completo ANTES de navegar
        didCompleteBootRef.current = true;
        console.log("[Boot] didCompleteBootRef travado em true");

        // Checar se já estamos no target usando SEGMENTS (não pathname)
        const firstSegment = segments[0] as string | undefined;
        const isAlreadyAtTarget =
          (preferredHref === "/login" && firstSegment === "(auth)") ||
          (preferredHref === "/(app)" && firstSegment === "(app)") ||
          (preferredHref === "/terreiro" && firstSegment === "(app)");

        if (isAlreadyAtTarget) {
          console.log("[Boot] já no grupo correto, sem navegação", {
            segments: segments.join("/"),
            preferredHref,
          });
          didNavigateRef.current = true;
          setBootComplete(true);
          SplashScreen.hideAsync().catch(() => undefined);
          return;
        }

        // Guard: se já navegamos, não navegar de novo
        if (didNavigateRef.current) {
          console.log("[Boot] navegação já realizada, skip", { segments: segments.join("/") });
          setBootComplete(true);
          SplashScreen.hideAsync().catch(() => undefined);
          return;
        }

        // Navegar para target
        console.log("[Boot] navegando para preferredHref:", preferredHref);
        didNavigateRef.current = true;

        if (preferredHref === "/terreiro" && terreiroParams) {
          router.replace({ pathname: "/terreiro", params: terreiroParams });
        } else {
          router.replace(preferredHref);
        }

        // Após navegar, marcar como completo
        setBootComplete(true);
        SplashScreen.hideAsync().catch(() => undefined);
      } catch (error) {
        console.error("[Boot] erro ao decidir tela inicial", error);
        // Em caso de erro, marcar como completo mesmo assim para não ficar em loop
        didCompleteBootRef.current = true;
        setBootComplete(true);
        SplashScreen.hideAsync().catch(() => undefined);
      }
    };

    void run();
  }, [isLoading, isReady, user?.id, segments, router]);

  const effectiveScheme =
    themeMode === "system" ? systemColorScheme : themeMode;

  return (
    <ThemeProvider
      value={effectiveScheme === "dark" ? DarkTheme : DefaultTheme}
    >
      <InviteGate />
      {bootComplete ? <Slot /> : null}
    </ThemeProvider>
  );
}
