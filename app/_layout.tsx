import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { useRouter, Slot, useSegments } from "expo-router";
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

  const lastBootRunRef = useRef<number>(0);
  const lastIsLoadingRef = useRef(isLoading);
  const lastIsReadyRef = useRef(isReady);
  const bootDebounceMs = 100; // Prevent boot effect from running more than once per 100ms

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
      try {
        const now = Date.now();
        
        // Reset debounce timer when critical states change (isLoading/isReady transitions)
        const criticalStateChanged = 
          lastIsLoadingRef.current !== isLoading || 
          lastIsReadyRef.current !== isReady;
        
        if (criticalStateChanged) {
          console.log("[Boot] critical state changed, reset debounce", {
            isLoading: { prev: lastIsLoadingRef.current, now: isLoading },
            isReady: { prev: lastIsReadyRef.current, now: isReady },
          });
          lastBootRunRef.current = 0; // Reset debounce
          lastIsLoadingRef.current = isLoading;
          lastIsReadyRef.current = isReady;
        }
        
        if (now - lastBootRunRef.current < bootDebounceMs) {
          console.log("[Boot] SKIP: debounce ativo", {
            elapsed: now - lastBootRunRef.current,
          });
          return;
        }
        lastBootRunRef.current = now;

        console.log("[Boot] RODANDO", {
          isLoading,
          isReady,
          hasUser: !!user?.id,
          segments: segments.join("/"),
        });

        if (isLoading) {
          console.log("[Boot] aguardando isLoading=false");
          return;
        }
        if (!isReady) {
          console.log("[Boot] aguardando isReady=true");
          return;
        }

        // Reavaliou as condições de boot (ex.: login/logout/preferências carregadas):
        // volta para o modo de boot até chegar no destino inicial.
        if (!cancelled) {
          console.log("[Boot] setBootComplete(false)");
          setBootComplete(false);
        }

        if (!user?.id) {
          // Sem sessão: sempre login.
          console.log("[Boot] sem user, indo para /login");
          setActiveContextRef.current({ kind: "USER_PROFILE" });
          if (!cancelled) setBootTarget({ href: "/login" });
          return;
        }

        console.log("[Boot] chamando bootstrapStartPage", { userId: user.id });

        const decision = await bootstrapStartPageRef.current(user.id);
        if (cancelled) return;

        console.log("[Boot] decisão:", {
          preferredHref: decision.preferredHref,
          hasContext: !!decision.terreiroContext,
        });

        if (
          decision.preferredHref === "/terreiro" &&
          decision.terreiroContext
        ) {
          console.log("[Boot] setBootTarget -> /terreiro", {
            terreiroId: decision.terreiroContext.terreiroId,
          });
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

        console.log("[Boot] setBootTarget -> /");
        setActiveContextRef.current({ kind: "USER_PROFILE" });
        setBootTarget({ href: "/" });
      } catch (error) {
        // IMPORTANT: unhandled promise rejections here can trigger reload loops in Dev Client.
        console.error("[Boot] erro ao decidir tela inicial", error);
      }
    };

    void run();

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
    console.log("[Boot] isAtTarget mudou:", {
      bootTarget: bootTarget?.href,
      isAtTarget,
      segments: segments.join("/"),
    });

    if (!bootTarget) return;
    if (isAtTarget) {
      // Assim que chegamos no destino inicial, liberamos navegação normal.
      console.log("[Boot] chegou no target! setBootComplete(true)");
      setBootComplete(true);
      SplashScreen.hideAsync().catch(() => undefined);
      return;
    }

    // Não estamos no target: navegar programaticamente em vez de usar <Redirect>
    // para evitar unmount/remount da árvore inteira.
    console.log("[Boot] navegando para target:", bootTarget.href);
    if (bootTarget.href === "/terreiro" && bootTarget.params) {
      router.replace({ pathname: "/terreiro", params: bootTarget.params });
    } else {
      router.replace(bootTarget.href as any);
    }
    // NOTE: NÃO incluir segments/router nas dependências - causaria loop infinito
    // pois router.replace() muda segments, re-executando este effect antes de isAtTarget atualizar.
  }, [bootTarget, isAtTarget]);

  return (
    <ThemeProvider
      value={effectiveScheme === "dark" ? DarkTheme : DefaultTheme}
    >
      <InviteGate />
      {bootTarget && (bootComplete || isAtTarget) ? <Slot /> : null}
    </ThemeProvider>
  );
}
