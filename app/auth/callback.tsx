import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const didNavigateRef = useRef(false);

  useEffect(() => {
    if (didNavigateRef.current) return;
    if (isLoading) return;

    let cancelled = false;

    const goHome = () => {
      if (cancelled || didNavigateRef.current) return;
      didNavigateRef.current = true;
      router.replace("/(app)");
    };

    const goLogin = () => {
      if (cancelled || didNavigateRef.current) return;
      didNavigateRef.current = true;
      router.replace("/login");
    };

    if (user?.id) {
      goHome();
      return () => {
        cancelled = true;
      };
    }

    const run = async () => {
      // Evita redirecionar cedo demais: após OAuth o AuthContext pode estar
      // processando o deep link e trocando o code por sessão.
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user?.id) {
          goHome();
          return;
        }
      } catch {
        // ignore (fallback abaixo)
      }

      // Pequeno atraso para dar tempo do `processDeepLink` finalizar.
      setTimeout(() => {
        if (cancelled) return;
        goLogin();
      }, 1500);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [isLoading, router, user?.id]);

  // Tela transitória: não renderiza UI para evitar flicker.
  return null;
}
