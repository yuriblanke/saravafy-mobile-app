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
import TerreirosRealtimeSync from "@/src/components/TerreirosRealtimeSync";
import { warmRemoteConfig } from "@/src/config/remoteConfig";
import {
  prefetchEditableCollections,
  prefetchEditableTerreiroIds,
} from "@/src/queries/collections";
import {
  prefetchMyEditableTerreiros,
  prefetchMyTerreiroAccessIds,
} from "@/src/queries/me";
import { prefetchHomeFeedPontos } from "@/src/queries/pontosFeed";
import { prefetchCollectionsByTerreiro } from "@/src/queries/terreirosCollections";
import { prefetchExploreTerreiros } from "@/src/queries/terreirosExplore";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";

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

  // Warm remote config in background once per app boot.
  useEffect(() => {
    warmRemoteConfig();
  }, []);

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
              <TerreirosRealtimeSync />
            </ToastProvider>
          </RootPagerProvider>
        </PreferencesProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const systemColorScheme = useColorScheme();
  const {
    themeMode,
    isReady,
    bootstrapStartPage,
    setActiveContext,
    clearStartPageSnapshotOnly,
  } = usePreferences();
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const queryClient = useQueryClient();

  const bootstrapStartPageRef = useRef(bootstrapStartPage);
  const setActiveContextRef = useRef(setActiveContext);
  const didRunPrefetchPlanRef = useRef<Set<string>>(new Set());
  const prevUserIdRef = useRef<string | null>(null);

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

  // Logout cleanup: remove caches user-scoped + reset prefs memory
  useEffect(() => {
    const prevUserId = prevUserIdRef.current;
    const nextUserId = user?.id ?? null;
    prevUserIdRef.current = nextUserId;

    // logout: had user, now no user
    if (prevUserId && !nextUserId) {
      if (__DEV__) {
        console.info("[Auth] logout detected -> clearing user cache", {
          prevUserId,
        });
      }

      // Cancel any in-flight requests first
      queryClient.cancelQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) && q.queryKey.includes(prevUserId),
      });

      // Remove only user-scoped queries (keys that include previous userId)
      queryClient.removeQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) && q.queryKey.includes(prevUserId),
      });

      // Reset memory-only preferences that can leak between users
      setActiveContextRef.current({ kind: "USER_PROFILE" });
      clearStartPageSnapshotOnly().catch(() => undefined);

      // Allow prefetch plan to run for a future login
      didRunPrefetchPlanRef.current.delete(prevUserId);
    }
  }, [clearStartPageSnapshotOnly, queryClient, user?.id]);

  // Boot effect: decide tela inicial APENAS 1x quando auth e prefs estiverem prontos
  useEffect(() => {
    // Guard: Boot só roda no root neutro (segments vazio)
    // Se já estamos em um grupo, não executar boot
    if (segments.length > 0) {
      // Já estamos em (app) ou (auth), não é necessário boot
      setBootComplete(true);
      SplashScreen.hideAsync().catch(() => undefined);
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

  // Boot prefetch plan: run after bootComplete + user available
  useEffect(() => {
    const userId = user?.id ?? null;
    if (!bootComplete) return;
    if (!userId) return;
    if (isLoading) return;
    if (!isReady) return;
    if (didRunPrefetchPlanRef.current.has(userId)) return;

    didRunPrefetchPlanRef.current.add(userId);

    const run = async () => {
      const startedAt = Date.now();
      if (__DEV__) {
        console.info("[BootPrefetch] start", { userId });
      }

      // 1) Pontos (feed inicial) - 10
      // 2) Terreiros (explore inicial) - 10
      const independent = await Promise.allSettled([
        prefetchHomeFeedPontos(queryClient, { userId, limit: 10 }),
        prefetchExploreTerreiros(queryClient, { limit: 10 }),
      ]);

      if (__DEV__) {
        console.info("[BootPrefetch] step independent done", {
          userId,
          ok: independent.filter((r) => r.status === "fulfilled").length,
          fail: independent.filter((r) => r.status === "rejected").length,
        });
      }

      // 3) Terreiros editáveis do usuário (admin/editor active)
      let editableTerreiroIds: string[] = [];
      try {
        editableTerreiroIds = await prefetchEditableTerreiroIds(
          queryClient,
          userId
        );
      } catch (e) {
        console.error("[BootPrefetch] erro ao prefetch memberships:", e);
      }

      // 3b) Terreiros com acesso do usuário (admin/editor/member active)
      let accessTerreiroIds: string[] = [];
      try {
        accessTerreiroIds = await prefetchMyTerreiroAccessIds(
          queryClient,
          userId
        );
      } catch (e) {
        console.error(
          "[BootPrefetch] erro ao prefetch terreiro access ids:",
          e
        );
        accessTerreiroIds = [];
      }

      // 3c) Coleções por terreiro (apenas owner_terreiro_id) para a aba Terreiros
      const collectionsQueries = await Promise.allSettled(
        accessTerreiroIds.map((terreiroId) =>
          prefetchCollectionsByTerreiro(queryClient, { terreiroId })
        )
      );

      const collectionsPrefetchedCount = collectionsQueries.reduce((acc, r) => {
        if (r.status !== "fulfilled") return acc;
        const value = r.value;
        return acc + (Array.isArray(value) ? value.length : 0);
      }, 0);

      // 4) Terreiros do perfil (admin/editor) para o sheet de Preferências
      try {
        await prefetchMyEditableTerreiros(queryClient, {
          userId,
          editableTerreiroIds,
        });
      } catch (e) {
        console.error(
          "[BootPrefetch] erro ao prefetch terreiros do perfil (prefs):",
          e
        );
      }

      // 5) Coleções editáveis do usuário (depende do passo 3)
      try {
        await prefetchEditableCollections(queryClient, {
          userId,
          editableTerreiroIds,
        });
      } catch (e) {
        console.error("[BootPrefetch] erro ao prefetch colecoes editaveis:", e);
      }

      if (__DEV__) {
        const editableCollections = queryClient.getQueryCache().findAll({
          queryKey: ["collections", "editableByUser", userId],
        });
        console.info("[BootPrefetch] done", {
          userId,
          ms: Date.now() - startedAt,
          editableTerreiroCount: editableTerreiroIds.length,
          editableCollectionsCached: editableCollections.length,
          accessTerreiroCount: accessTerreiroIds.length,
          collectionsPrefetchedCount,
        });
      }
    };

    run().catch((e) => {
      console.error("[BootPrefetch] erro inesperado:", e);
    });
  }, [bootComplete, isLoading, isReady, queryClient, user?.id]);

  // Global auth guard: se o usuário não estiver autenticado por qualquer motivo,
  // redireciona para /login (exceto dentro do grupo (auth) e callback /auth/*).
  useEffect(() => {
    if (isLoading) return;
    if (!isReady) return;
    if (user?.id) return;

    const first = segments[0];
    if (first === "(auth)" || first === "auth") return;

    router.replace("/login");
  }, [isLoading, isReady, router, segments, user?.id]);

  const effectiveScheme =
    themeMode === "system" ? systemColorScheme : themeMode;

  return (
    <ThemeProvider
      value={effectiveScheme === "dark" ? DarkTheme : DefaultTheme}
    >
      {bootComplete ? <Slot /> : null}
      {bootComplete ? <InviteGate /> : null}
    </ThemeProvider>
  );
}
