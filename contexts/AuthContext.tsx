import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

// Garante que o fluxo de OAuth seja completado corretamente ao retornar do navegador
WebBrowser.maybeCompleteAuthSession();

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

  // Função para processar deep links
  const processDeepLink = (url: string) => {
    console.log("Processando deep link:", url);

    // Extrair tokens da URL
    const parsedUrl = Linking.parse(url);
    const queryParams = parsedUrl.queryParams;

    if (queryParams) {
      const access_token = queryParams.access_token as string;
      const refresh_token = queryParams.refresh_token as string;

      if (access_token && refresh_token) {
        console.log("Tokens encontrados no deep link, estabelecendo sessão...");
        supabase.auth
          .setSession({
            access_token,
            refresh_token,
          })
          .then(({ error }) => {
            if (error) {
              console.error("Erro ao estabelecer sessão:", error.message);
            } else {
              console.log("Sessão estabelecida via deep link!");
            }
          });
      } else {
        console.log("Tokens não encontrados no deep link");
      }
    }
  };

  // Verificar sessão inicial e configurar listener
  useEffect(() => {
    console.log("=== AuthContext montado ===");

    // Obter sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Sessão inicial:", session ? "existe" : "não existe");
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Verificar se o app foi aberto com uma URL (deep link inicial)
    console.log("Verificando URL inicial...");
    Linking.getInitialURL().then((url) => {
      console.log("getInitialURL retornou:", url);
      if (url) {
        console.log("App aberto com URL inicial:", url);
        processDeepLink(url);
      } else {
        console.log("Nenhuma URL inicial encontrada");
      }
    });

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(
        "Auth state change:",
        event,
        session ? "sessão existe" : "sem sessão"
      );
      setSession(session);
      setUser(session?.user ?? null);
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
  }, []);

  // Fazer login com Google
  const signInWithGoogle = async () => {
    try {
      console.log("signInWithGoogle chamado");

      // Força o uso do deep link fixo, independente do ambiente
      const redirectUri = "saravafy://auth/callback";
      console.log("Redirect URI:", redirectUri); // Deve ser exatamente saravafy://auth/callback

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

      // Após retorno, buscar sessão atualizada
      if (result.type === "success") {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError) {
          console.error(
            "Erro ao obter sessão após OAuth:",
            sessionError.message
          );
        } else {
          console.log("Sessão após OAuth:", sessionData.session);
          setSession(sessionData.session);
          setUser(sessionData.session?.user ?? null);
        }
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
