import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// Garante que o fluxo de OAuth seja completado corretamente ao retornar do navegador
WebBrowser.maybeCompleteAuthSession();

// Guard global (module-scope) para garantir que a initialURL seja processada
// no minimo uma vez por boot do runtime JS.
// Em cenarios de loop/reload (Dev Client), isso evita reprocessar a URL do
// expo-development-client indefinidamente.
let didCheckInitialURLThisBoot = false;

// Tipos
interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

// Criar o contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastProcessedUrlRef = useRef<string | null>(null);

  // Função para processar deep links
  const processDeepLink = useCallback(async (url: string) => {
    if (!url) return;

    // Evita reprocessar a mesma URL (initialURL + evento, ou re-emissão do Dev Client)
    if (lastProcessedUrlRef.current === url) {
      if (__DEV__) {
        console.info("[AuthLink] ignorado: URL repetida", { url });
      }
      return;
    }

    // 1) Ignore URLs do Expo Dev Client
    // Exemplo: exp+saravafy://expo-development-client/?url=http%3A%2F%2F192.168.1.73%3A8081
    if (url.includes("expo-development-client")) {
      if (__DEV__) {
        console.info("[AuthLink] ignorado: URL do Expo Dev Client", { url });
      }
      return;
    }

    console.log("Processando deep link:", url);

    try {
      const parseParams = (raw: string): Record<string, string> => {
        const params = new URLSearchParams(raw);
        const out: Record<string, string> = {};
        for (const [key, value] of params.entries()) {
          out[key] = value;
        }
        return out;
      };

      // 1) Query params via expo-linking
      const parsedUrl = Linking.parse(url);
      const queryParams = (parsedUrl.queryParams ?? {}) as Record<string, any>;

      // Também pode vir a query param `url` (metro) em alguns cenários; ignore.
      if (typeof queryParams.url === "string" && queryParams.url.length > 0) {
        if (__DEV__) {
          console.info(
            "[AuthLink] ignorado: deep link com query param 'url' (provável Metro)",
            {
              url,
              metroUrl: queryParams.url,
            }
          );
        }
        return;
      }

      // 2) Fragment params (muito comum no OAuth: #access_token=...)
      const fragmentIndex = url.indexOf("#");
      const fragmentRaw =
        fragmentIndex >= 0 ? url.slice(fragmentIndex + 1) : "";
      const fragmentParams = fragmentRaw ? parseParams(fragmentRaw) : {};

      // Merge: fragment pode sobrescrever query
      const mergedParams: Record<string, string> = {
        ...Object.fromEntries(
          Object.entries(queryParams)
            .filter(([, v]) => typeof v === "string")
            .map(([k, v]) => [k, v as string])
        ),
        ...fragmentParams,
      };

      console.log("Deep link recebido:", url);
      console.log("mergedParams keys:", Object.keys(mergedParams));

      const oauthError = mergedParams.error;
      const oauthErrorDescription = mergedParams.error_description;
      if (oauthError || oauthErrorDescription) {
        console.error("OAuth callback retornou erro:", {
          error: oauthError ?? "",
          error_description: oauthErrorDescription ?? "",
        });
        return;
      }

      const code = mergedParams.code;
      const access_token = mergedParams.access_token;
      const refresh_token = mergedParams.refresh_token;
      const hasAccessToken = Boolean(access_token);
      const hasRefreshToken = Boolean(refresh_token);

      // 2) Processar callback APENAS quando houver code ou tokens reais.
      if (!code && !(access_token && refresh_token)) {
        if (__DEV__) {
          console.info("[AuthLink] ignorado: callback sem code/tokens", {
            url,
            mergedParamsKeys: Object.keys(mergedParams),
            hasAccessToken,
            hasRefreshToken,
          });
        }
        return;
      }

      // Dedupe: daqui em diante consideramos que é um callback real.
      lastProcessedUrlRef.current = url;

      if (code) {
        console.log(
          "Code encontrado no callback, trocando por sessão (PKCE)..."
        );
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          code
        );
        if (error) {
          console.error("Erro ao trocar code por sessão:", error.message);
          return;
        }
        console.log("Sessão estabelecida via exchangeCodeForSession!");
        setSession(data.session);
        setUser(data.session?.user ?? null);
        return;
      }

      if (access_token && refresh_token) {
        console.log("Tokens encontrados no callback, estabelecendo sessão...", {
          hasAccessToken,
          hasRefreshToken,
        });
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) {
          console.error("Erro ao estabelecer sessão:", error.message);
          return;
        }
        console.log("Sessão estabelecida via setSession!");
        setSession(data.session);
        setUser(data.session?.user ?? null);
        return;
      }

      // Não deveria cair aqui, mas mantém log defensivo.
      console.log("Callback recebido, mas sem code/tokens:", {
        url,
        mergedParamsKeys: Object.keys(mergedParams),
        hasAccessToken,
        hasRefreshToken,
      });
    } catch (error) {
      // Qualquer erro não tratado aqui pode derrubar o app no Dev Client.
      console.error("[AuthLink] Erro ao processar deep link:", error);
    }
  }, []);

  // Verificar sessão inicial e configurar listener
  useEffect(() => {
    console.log("=== AuthContext montado ===");

    // Obter sessão inicial (defensivo: evita promise rejection derrubar o runtime)
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        console.log(
          "[Auth] Sessão inicial:",
          session ? "existe" : "não existe"
        );
        console.log("[Auth] setSession + setUser", {
          hasSession: !!session,
          userId: session?.user?.id,
        });
        setSession(session);
        setUser(session?.user ?? null);
        console.log("[Auth] setIsLoading(false) [getSession]");
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("[Auth] Erro ao obter sessão inicial:", error);
        console.log("[Auth] setIsLoading(false) [getSession error]");
        setIsLoading(false);
      });

    // Verificar se o app foi aberto com uma URL (deep link inicial).
    // No Expo Dev Client isso normalmente e a URL interna
    // exp+saravafy://expo-development-client/?url=http://...:8081
    // e deve ser ignorada pelo handler.
    if (!didCheckInitialURLThisBoot) {
      didCheckInitialURLThisBoot = true;
      console.log("Verificando URL inicial...");
      Linking.getInitialURL()
        .then((url) => {
          console.log("getInitialURL retornou:", url);
          if (url) {
            console.log("App aberto com URL inicial:", url);
            void processDeepLink(url);
          } else {
            console.log("Nenhuma URL inicial encontrada");
          }
        })
        .catch((error) => {
          console.error("[AuthLink] Erro ao obter initialURL:", error);
        });
    } else if (__DEV__) {
      console.info("[AuthLink] skip: initialURL ja verificada neste boot");
    }

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(
        "[Auth] state change:",
        event,
        session ? "sessão existe" : "sem sessão"
      );
      console.log("[Auth] setSession + setUser", {
        hasSession: !!session,
        userId: session?.user?.id,
      });
      setSession(session);
      setUser(session?.user ?? null);
      console.log("[Auth] setIsLoading(false) [onAuthStateChange]");
      setIsLoading(false);
    });

    // Listener para capturar deep links enquanto o app está aberto
    console.log("Registrando listener de deep links...");
    const urlSubscription = Linking.addEventListener("url", ({ url }) => {
      console.log("🔗 DEEP LINK CAPTURADO:", url);
      processDeepLink(url);
    });
    console.log("Listener de deep links registrado!");

    return () => {
      console.log("=== AuthContext desmontado ===");
      subscription.unsubscribe();
      urlSubscription.remove();
    };
  }, [processDeepLink]);

  // Fazer login com Google
  const signInWithGoogle = async () => {
    try {
      console.log("signInWithGoogle chamado");

      // Gera o redirect dinamicamente a partir do scheme/config do app
      const redirectUri = Linking.createURL("auth/callback");

      console.log("Redirect URI:", redirectUri);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
          scopes: "email profile",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      console.log("Resposta Supabase:", { data, error });

      if (error) {
        console.error("Erro ao fazer login:", error.message);
        return;
      }

      if (!data?.url) {
        console.error("URL de OAuth não retornada pelo Supabase");
        return;
      }

      console.log("Abrindo navegador com URL:", data.url);

      // Abre o navegador e aguarda retorno para o redirectUri
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri
      );
      console.log("Resultado do navegador:", result);

      // Processar o callback retornado pelo browser (pode vir com `code` ou tokens)
      if (
        result.type === "success" &&
        "url" in result &&
        typeof result.url === "string"
      ) {
        await processDeepLink(result.url);
      }

      // Não aguarda o resultado - deixa o listener onAuthStateChange processar
      console.log("Navegador aberto, aguardando callback...");
    } catch (error) {
      console.error("Erro ao fazer login:", error);
    }
  };

  // Fazer logout
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Erro ao fazer logout:", error.message);
      }
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isLoading,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// -----------------------------------------------------------------------------
// IMPORTANTE: Configuração de Redirect URLs no Supabase Dashboard
// Vá em Auth → URL Configuration → Redirect URLs e adicione:
//   saravafy://auth/callback
//   (Opcional, se suportado) saravafy://**
// Não altere o redirect URI do Google Cloud, apenas o allowlist do Supabase.
// -----------------------------------------------------------------------------
// Hook para usar o contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
