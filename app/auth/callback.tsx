import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef } from "react";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, isLoading } = useAuth();

  const didNavigateRef = useRef(false);

  const parsed = useMemo(() => {
    const asFirstString = (v: unknown): string | null => {
      if (typeof v === "string") return v;
      if (Array.isArray(v) && typeof v[0] === "string") return v[0];
      return null;
    };

    return {
      code: asFirstString(params.code),
      access_token: asFirstString(params.access_token),
      refresh_token: asFirstString(params.refresh_token),
      error: asFirstString(params.error),
      error_description: asFirstString(params.error_description),
    };
  }, [params.access_token, params.code, params.error, params.error_description, params.refresh_token]);

  useEffect(() => {
    if (didNavigateRef.current) return;

    let cancelled = false;

    const goHome = () => {
      if (cancelled || didNavigateRef.current) return;
      didNavigateRef.current = true;
      router.replace("/(app)/(tabs)/(pontos)" as any);
    };

    const goLogin = () => {
      if (cancelled || didNavigateRef.current) return;
      didNavigateRef.current = true;
      router.replace("/login");
    };

    // Se já tem usuário, só sai desta tela.
    if (!isLoading && user?.id) {
      goHome();
      return () => {
        cancelled = true;
      };
    }

    const run = async () => {
      // 1) OAuth pode retornar erro no callback
      if (parsed.error || parsed.error_description) {
        console.error("[AuthCallback] OAuth error", {
          error: parsed.error ?? "",
          error_description: (parsed.error_description ?? "").slice(0, 200),
        });
        goLogin();
        return;
      }

      // 2) PKCE: trocar code por sessão
      if (parsed.code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(
            parsed.code
          );
          if (error) {
            console.error("[AuthCallback] exchangeCodeForSession error", {
              message: error.message,
            });
            goLogin();
            return;
          }

          if (data.session?.user?.id) {
            goHome();
            return;
          }
        } catch (e) {
          console.error("[AuthCallback] exchangeCodeForSession exception", e);
          goLogin();
          return;
        }
      }

      // 3) Fallback (fluxo antigo com tokens no callback)
      if (parsed.access_token && parsed.refresh_token) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: parsed.access_token,
            refresh_token: parsed.refresh_token,
          });
          if (error) {
            console.error("[AuthCallback] setSession error", {
              message: error.message,
            });
            goLogin();
            return;
          }

          if (data.session?.user?.id) {
            goHome();
            return;
          }
        } catch (e) {
          console.error("[AuthCallback] setSession exception", e);
          goLogin();
          return;
        }
      }

      // 4) Último fallback: se já existe sessão, vá pra home; senão login
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user?.id) {
          goHome();
          return;
        }
      } catch {
        // ignore
      }

      goLogin();
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [isLoading, parsed, router, user?.id]);

  // Tela transitória: não renderiza UI para evitar flicker.
  return null;
}
