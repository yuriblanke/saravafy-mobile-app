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
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { prefetchAccountableCollections } from "@/src/queries/collections";

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
  const queryClient = useQueryClient();

  const bootstrapStartPageRef = useRef(bootstrapStartPage);
  const setActiveContextRef = useRef(setActiveContext);
  const didPrefetchCollectionsRef = useRef(false);

  useEffect(() => {
    bootstrapStartPageRef.current = bootstrapStartPage;
  }, [bootstrapStartPage]);

  useEffect(() => {
    setActiveContextRef.current = setActiveContext;
  }, [setActiveContext]);

  // Prefetch de coleções assim que houver sessão válida
  useEffect(() => {
    if (didPrefetchCollectionsRef.current) return;
    if (!user?.id) return;
    if (isLoading) return;

    didPrefetchCollectionsRef.current = true;
    prefetchAccountableCollections(queryClient, user.id).catch((e) => {
      console.error("[Boot] erro ao prefetch collections:", e);
    });
  }, [user?.id, isLoading, queryClient]);

  // LATCHES: Boot e navegação devem acontecer apenas 1x por cold start
  const didCompleteBootRef = useRef(false);
  const didNavigateRef = useRef(false);

  const [bootComplete, setBootComplete] = useState(false);

  // Boot effect: decide tela inicial APENAS 1x quando auth e prefs estiverem prontos
  useEffect(() => {
    // Guard: Boot só roda no root neutro (segments vazio)
    // Se já estamos em um grupo, não executar boot
    if (segments.length > 0) {
      // Já estamos em (app) ou (auth), não é necessário boot
      setBootComplete(true);
      return;
    }

    // Se boot já foi completado, nunca mais rodar
    if (didCompleteBootRef.current) return;

    // Aguardar auth e preferências estarem prontos
    if (isLoading) return;
    if (!isReady) return;

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
          preferredHref = "/login";
          setActiveContextRef.current({ kind: "USER_PROFILE" });
        } else {
          const decision = await bootstrapStartPageRef.current(user.id);

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
        didNavigateRef.current = true;

        // Navegar para target
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
