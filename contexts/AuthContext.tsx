import { supabase } from "@/lib/supabase";
import {
  AuthAttempt,
  classifyUrl,
  getRecentAuthLogs,
} from "@/src/utils/authLogger";
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
import { AppState } from "react-native";

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
  authInProgress: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  retryGoogleLogin: () => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
  getRecentAuthLogs: () => any[];
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
  const [authInProgress, setAuthInProgress] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const lastProcessedUrlRef = useRef<string | null>(null);

  // Tentativa de login atual
  const currentAttemptRef = useRef<AuthAttempt | null>(null);

  // Timer do watchdog (12s timeout)
  const watchdogTimerRef = useRef<any>(null);

  // Marca se o login foi concluído (para cancelar watchdog)
  const loginCompletedRef = useRef(false);

  // OAuth watchdog robusto (à prova de background)
  const oauthBrowserOpenStartedAtMsRef = useRef<number | null>(null);
  const oauthFlowStateRef = useRef<
    "IDLE" | "BROWSER_OPENED" | "COMPLETED"
  >("IDLE");
  const oauthCompletedRef = useRef(false);

  const lastAppStateRef = useRef<string>(AppState.currentState ?? "unknown");
  const backgroundLoggedForAttemptIdRef = useRef<string | null>(null);
  const timeoutReportedRef = useRef<
    Record<string, { timer?: boolean; resume?: boolean }>
  >({});

  const clearOAuthWatchdogRefs = useCallback(() => {
    oauthBrowserOpenStartedAtMsRef.current = null;
    oauthFlowStateRef.current = "IDLE";
    oauthCompletedRef.current = false;
    backgroundLoggedForAttemptIdRef.current = null;
    timeoutReportedRef.current = {};

    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  }, []);

  const concludeOAuthFlow = useCallback(
    async (
      outcome:
        | "cancel"
        | "dismiss"
        | "deeplink_success"
        | "session_established"
        | "other",
      details?: Record<string, any>
    ) => {
      const attempt = currentAttemptRef.current;
      if (oauthCompletedRef.current) return;

       const lastState = oauthFlowStateRef.current;
      oauthCompletedRef.current = true;
      oauthFlowStateRef.current = "COMPLETED";
      loginCompletedRef.current = true;

      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }

      setAuthInProgress(false);

      const startedAt = oauthBrowserOpenStartedAtMsRef.current;
      const elapsedMs = startedAt ? Date.now() - startedAt : null;

      // Log de conclusão (sem tokens/codes/URLs)
      await attempt?.log("oauth_flow_concluded", {
        outcome,
        elapsedMs,
        lastState,
        ...(details ?? {}),
      });

      // Limpa refs de watchdog/timestamps para a tentativa atual
      oauthBrowserOpenStartedAtMsRef.current = null;
      oauthFlowStateRef.current = "IDLE";
      backgroundLoggedForAttemptIdRef.current = null;
      timeoutReportedRef.current = {};
    },
    []
  );

  // Função para processar deep links
  const processDeepLink = useCallback(async (url: string) => {
    const attempt = currentAttemptRef.current;

    if (!url) return;

    // Evita reprocessar a mesma URL (initialURL + evento, ou re-emissão do Dev Client)
    if (lastProcessedUrlRef.current === url) {
      if (__DEV__) {
        console.info("[AuthLink] ignorado: URL repetida", classifyUrl(url));
      }
      const urlInfo = classifyUrl(url);
      await attempt?.log("deep_link_ignored", {
        reason: "duplicate",
        urlKind: urlInfo.urlKind,
        urlHost: urlInfo.urlHost,
        urlPath: urlInfo.urlPath,
      });
      return;
    }

    // Classificar URL
    const urlInfo = classifyUrl(url);

    await attempt?.log("deep_link_received", {
      urlKind: urlInfo.urlKind,
      urlHost: urlInfo.urlHost,
      urlPath: urlInfo.urlPath,
    });

    // 1) Ignore URLs do Expo Dev Client
    // Exemplo: exp+saravafy://expo-development-client/?url=http%3A%2F%2F192.168.1.73%3A8081
    if (url.includes("expo-development-client")) {
      if (__DEV__) {
        console.info(
          "[AuthLink] ignorado: URL do Expo Dev Client",
          classifyUrl(url)
        );
      }
      await attempt?.log("deep_link_ignored", {
        reason: "dev_client",
        urlKind: urlInfo.urlKind,
      });
      return;
    }

    if (__DEV__) {
      console.log("Processando deep link:", classifyUrl(url));
    }

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
        await attempt?.log("deep_link_ignored", {
          reason: "metro",
          urlKind: urlInfo.urlKind,
        });
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

      if (__DEV__) {
        console.log("Deep link recebido:", urlInfo);
        console.log("mergedParams keys:", Object.keys(mergedParams));
      }

      const oauthError = mergedParams.error;
      const oauthErrorDescription = mergedParams.error_description;
      if (oauthError || oauthErrorDescription) {
        console.error("OAuth callback retornou erro:", {
          error: oauthError ?? "",
          error_description: oauthErrorDescription ?? "",
        });
        await attempt?.log("deep_link_oauth_error", {
          error: oauthError ?? "",
          error_description: (oauthErrorDescription ?? "").substring(0, 200),
        });
        return;
      }

      const code = mergedParams.code;
      const access_token = mergedParams.access_token;
      const refresh_token = mergedParams.refresh_token;
      const hasAccessToken = Boolean(access_token);
      const hasRefreshToken = Boolean(refresh_token);
      const hasCode = Boolean(code);

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
        await attempt?.log("deep_link_ignored", {
          reason: "not_auth_callback",
          hasCode,
          hasAccessToken,
          hasRefreshToken,
        });
        return;
      }

      // Dedupe: daqui em diante consideramos que é um callback real.
      lastProcessedUrlRef.current = url;

      if (code) {
        console.log(
          "Code encontrado no callback, trocando por sessão (PKCE)..."
        );

        await attempt?.log("deep_link_exchange_code_start", { hasCode: true });

        const { data, error } = await supabase.auth.exchangeCodeForSession(
          code
        );

        if (error) {
          console.error("Erro ao trocar code por sessão:", error.message);
          await attempt?.log("deep_link_exchange_code_error", {
            error: error.message,
          });
          return;
        }

        console.log("Sessão estabelecida via exchangeCodeForSession!");
        await attempt?.log("deep_link_exchange_code_success", {
          hasSession: !!data.session,
          userId: data.session?.user?.id,
        });

        await concludeOAuthFlow("deeplink_success", {
          method: "exchangeCodeForSession",
        });

        setSession(data.session);
        setUser(data.session?.user ?? null);
        setAuthError(null);

        // Atualizar userId na tentativa
        if (data.session?.user?.id) {
          attempt?.setUserId(data.session.user.id);
          await attempt?.log("auth_session_set", {
            method: "exchangeCodeForSession",
          });
        }

        return;
      }

      if (access_token && refresh_token) {
        console.log("Tokens encontrados no callback, estabelecendo sessão...", {
          hasAccessToken,
          hasRefreshToken,
        });

        await attempt?.log("deep_link_set_session_start", {
          hasAccessToken,
          hasRefreshToken,
        });

        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          console.error("Erro ao estabelecer sessão:", error.message);
          await attempt?.log("deep_link_set_session_error", {
            error: error.message,
          });
          return;
        }

        console.log("Sessão estabelecida via setSession!");
        await attempt?.log("deep_link_set_session_success", {
          hasSession: !!data.session,
          userId: data.session?.user?.id,
        });

        await concludeOAuthFlow("deeplink_success", {
          method: "setSession",
        });

        setSession(data.session);
        setUser(data.session?.user ?? null);
        setAuthError(null);

        // Atualizar userId na tentativa
        if (data.session?.user?.id) {
          attempt?.setUserId(data.session.user.id);
          await attempt?.log("auth_session_set", {
            method: "setSession",
          });
        }

        return;
      }

      // Não deveria cair aqui, mas mantém log defensivo.
      if (__DEV__) {
        console.log("Callback recebido, mas sem code/tokens:", {
          urlKind: urlInfo.urlKind,
          urlHost: urlInfo.urlHost,
          urlPath: urlInfo.urlPath,
          mergedParamsKeys: Object.keys(mergedParams),
          hasAccessToken,
          hasRefreshToken,
        });
      }
    } catch (error) {
      // Qualquer erro não tratado aqui pode derrubar o app no Dev Client.
      console.error("[AuthLink] Erro ao processar deep link:", error);
      await attempt?.log("deep_link_error", {
        error: String(error),
      });
    }
  }, [concludeOAuthFlow]);

  // Listener de AppState (robusto para watchdog em background)
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const prev = lastAppStateRef.current;
      lastAppStateRef.current = next;

      const attempt = currentAttemptRef.current;
      const attemptId = attempt?.attemptId ?? null;

      // Logar transição para background uma vez por attempt após abrir o browser
      if (
        attemptId &&
        oauthFlowStateRef.current === "BROWSER_OPENED" &&
        !oauthCompletedRef.current &&
        (next === "background" || next === "inactive") &&
        backgroundLoggedForAttemptIdRef.current !== attemptId
      ) {
        backgroundLoggedForAttemptIdRef.current = attemptId;
        void attempt?.log("oauth_appstate_backgrounded", {
          appStateTransition: `${prev}->${next}`,
          atMs: Date.now(),
        });
      }

      // Ao voltar para active, verificar timeout "on resume"
      if (next === "active") {
        if (
          attemptId &&
          oauthFlowStateRef.current === "BROWSER_OPENED" &&
          !oauthCompletedRef.current
        ) {
          const startedAt = oauthBrowserOpenStartedAtMsRef.current;
          const elapsedMs = startedAt ? Date.now() - startedAt : null;

          const already = timeoutReportedRef.current[attemptId]?.resume;
          if (!already && elapsedMs !== null && elapsedMs >= 15000) {
            timeoutReportedRef.current[attemptId] = {
              ...(timeoutReportedRef.current[attemptId] ?? {}),
              resume: true,
            };

            void attempt?.log("oauth_timeout_on_resume", {
              elapsedMs,
              lastState: "BROWSER_OPENED",
              appStateTransition: `${prev}->active`,
            });

            oauthCompletedRef.current = true;
            oauthFlowStateRef.current = "COMPLETED";
            loginCompletedRef.current = true;
            if (watchdogTimerRef.current) {
              clearTimeout(watchdogTimerRef.current);
              watchdogTimerRef.current = null;
            }

            setAuthError(
              "Não conseguimos voltar do Google para o app. Tente novamente. Se persistir, atualize o Chrome e o Android System WebView."
            );
            setAuthInProgress(false);
          }
        }
      }
    });

    return () => {
      sub.remove();
    };
  }, []);

  // Verificar sessão inicial e configurar listener
  useEffect(() => {
    console.log("=== AuthContext montado ===");

    // Criar tentativa de boot (para logar inicialização)
    const bootAttempt = new AuthAttempt();
    void bootAttempt.log("boot_auth_context_mounted", {});

    // Obter sessão inicial (defensivo: evita promise rejection derrubar o runtime)
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (__DEV__) {
          console.info("[Auth] getSession ok", {
            hasSession: !!session,
            userId: session?.user?.id ?? null,
          });
        }
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        void bootAttempt.log("boot_get_session_success", {
          hasSession: !!session,
          userId: session?.user?.id,
        });
      })
      .catch((error) => {
        console.error("[Auth] Erro ao obter sessão inicial:", error);
        setIsLoading(false);

        void bootAttempt.log("boot_get_session_error", {
          error: String(error),
        });
      });

    // Verificar se o app foi aberto com uma URL (deep link inicial).
    // No Expo Dev Client isso normalmente e a URL interna
    // exp+saravafy://expo-development-client/?url=http://...:8081
    // e deve ser ignorada pelo handler.
    if (!didCheckInitialURLThisBoot) {
      didCheckInitialURLThisBoot = true;
      console.log("Verificando URL inicial...");

      void bootAttempt.log("boot_get_initial_url_start", {});

      Linking.getInitialURL()
        .then((url) => {
          if (__DEV__) {
            console.log("getInitialURL retornou:", url ? classifyUrl(url) : null);
          }

          const urlInfo = url ? classifyUrl(url) : null;
          void bootAttempt.log("boot_get_initial_url_result", {
            hasUrl: !!url,
            urlKind: urlInfo?.urlKind,
          });

          if (url) {
            if (__DEV__) {
              console.log("App aberto com URL inicial:", classifyUrl(url));
            }
            void processDeepLink(url);
          } else {
            console.log("Nenhuma URL inicial encontrada");
          }
        })
        .catch((error) => {
          console.error("[AuthLink] Erro ao obter initialURL:", error);
          void bootAttempt.log("boot_get_initial_url_error", {
            error: String(error),
          });
        });
    } else if (__DEV__) {
      console.info("[AuthLink] skip: initialURL ja verificada neste boot");
    }

    // Escutar mudanças de autenticação
    void bootAttempt.log("boot_supabase_onAuthStateChange_registered", {});

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (__DEV__) {
        console.info("[Auth] onAuthStateChange", {
          event,
          hasSession: !!session,
          userId: session?.user?.id ?? null,
        });
      }

      const attempt = currentAttemptRef.current ?? bootAttempt;
      void attempt.log("auth_state_change", {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
      });

      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      // Se obteve sessão válida, marcar login como concluído
      if (session?.user) {
        // Concluir por SESSION_ESTABLISHED (cancela watchdog e evita loading infinito)
        void concludeOAuthFlow("session_established", {
          authEvent: event,
        });

        setAuthError(null);

        // Atualizar userId se houver tentativa em andamento
        if (currentAttemptRef.current) {
          currentAttemptRef.current.setUserId(session.user.id);
        }
      }
    });

    // Listener para capturar deep links enquanto o app está aberto
    console.log("Registrando listener de deep links...");
    void bootAttempt.log("boot_linking_listener_registered", {});

    const urlSubscription = Linking.addEventListener("url", ({ url }) => {
      if (__DEV__) {
        console.log("🔗 DEEP LINK CAPTURADO:", classifyUrl(url));
      }
      processDeepLink(url);
    });
    console.log("Listener de deep links registrado!");

    return () => {
      console.log("=== AuthContext desmontado ===");
      subscription.unsubscribe();
      urlSubscription.remove();

      // Limpar watchdog se existir
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
    };
  }, [processDeepLink]);

  // Fazer login com Google
  const signInWithGoogle = async () => {
    try {
      console.log("signInWithGoogle chamado");

      // Criar nova tentativa
      const attempt = new AuthAttempt();
      currentAttemptRef.current = attempt;
      loginCompletedRef.current = false;

      // Reset watchdog refs para esta tentativa
      oauthBrowserOpenStartedAtMsRef.current = null;
      oauthFlowStateRef.current = "IDLE";
      oauthCompletedRef.current = false;
      backgroundLoggedForAttemptIdRef.current = null;
      timeoutReportedRef.current = {};

      setAuthInProgress(true);
      setAuthError(null);

      await attempt.log("oauth_start", {});

      // Gera o redirect dinamicamente a partir do scheme/config do app
      const redirectUri = Linking.createURL("auth/callback");

      console.log("Redirect URI:", redirectUri);

      const redirectInfo = classifyUrl(redirectUri);
      await attempt.log("oauth_redirect_uri_built", {
        redirectHost: redirectInfo.urlHost,
        redirectPath: redirectInfo.urlPath,
      });

      await attempt.log("oauth_signInWithOAuth_called", {});

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

      if (__DEV__) {
        console.log("Resposta Supabase (OAuth):", {
          hasUrl: !!data?.url,
          hasError: !!error,
          errorMessage: error?.message ?? null,
        });
      }

      if (error) {
        console.error("Erro ao fazer login:", error.message);
        await attempt.log("oauth_signInWithOAuth_error", {
          error: error.message,
        });
        setAuthError(`Erro ao iniciar login: ${error.message}`);
        setAuthInProgress(false);
        return;
      }

      if (!data?.url) {
        console.error("URL de OAuth não retornada pelo Supabase");
        await attempt.log("oauth_signInWithOAuth_error", {
          error: "URL de OAuth não retornada",
        });
        setAuthError("Erro ao iniciar login: URL não retornada");
        setAuthInProgress(false);
        return;
      }

      await attempt.log("oauth_signInWithOAuth_success", {
        hasUrl: !!data.url,
      });

      if (__DEV__) {
        console.log("Abrindo navegador para OAuth (url omitida)");
      }

      // Iniciar watchdog de 12s
      const startTime = Date.now();
      watchdogTimerRef.current = setTimeout(async () => {
        const attemptId = attempt.attemptId;
        const appStateNow = AppState.currentState ?? "unknown";
        if (!loginCompletedRef.current && !oauthCompletedRef.current) {
          const elapsedMs = Date.now() - startTime;

          // Logar apenas se estiver active (best-effort)
          if (appStateNow === "active") {
            const already = timeoutReportedRef.current[attemptId]?.timer;
            if (!already) {
              timeoutReportedRef.current[attemptId] = {
                ...(timeoutReportedRef.current[attemptId] ?? {}),
                timer: true,
              };

              console.warn(
                "[AuthWatchdog] Timeout (timer): login não concluído em 12s"
              );

              await attempt.log("oauth_timeout_timer", {
                elapsedMs,
                lastState: oauthFlowStateRef.current,
                appState: appStateNow,
                redirectHost: redirectInfo.urlHost,
                redirectPath: redirectInfo.urlPath,
              });
            }
          }

          setAuthInProgress(false);
          setAuthError(
            "Não conseguimos voltar do Google para o app. Tente novamente. Se persistir, atualize o Chrome e o Android System WebView."
          );

          oauthCompletedRef.current = true;
          oauthFlowStateRef.current = "COMPLETED";
          loginCompletedRef.current = true;
        }
      }, 12000);

      // Marcar estado assim que o browser abrir (refs para watchdog on-resume)
      oauthBrowserOpenStartedAtMsRef.current = Date.now();
      oauthFlowStateRef.current = "BROWSER_OPENED";
      oauthCompletedRef.current = false;

      await attempt.log("oauth_browser_open_start", {
        oauth_browser_open_started_at_ms: oauthBrowserOpenStartedAtMsRef.current,
      });

      // Abre o navegador e aguarda retorno para o redirectUri
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri
      );
      console.log("Resultado do navegador:", result);

      const resultUrlInfo =
        result.type === "success" && "url" in result
          ? classifyUrl(result.url as string)
          : null;

      await attempt.log("oauth_browser_open_result", {
        type: result.type,
        urlKind: resultUrlInfo?.urlKind,
      });

      // Se não foi success, consideramos concluído (cancel/dismiss)
      if (result.type !== "success") {
        const outcome =
          result.type === "cancel"
            ? "cancel"
            : result.type === "dismiss"
            ? "dismiss"
            : "other";

        await concludeOAuthFlow(outcome, {
          browserResultType: result.type,
        });
      }

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

      const attempt = currentAttemptRef.current;
      await attempt?.log("oauth_error", {
        error: String(error),
      });

      loginCompletedRef.current = true;
      clearOAuthWatchdogRefs();

      setAuthInProgress(false);
      setAuthError(`Erro inesperado: ${String(error)}`);
    }
  };

  const retryGoogleLogin = async () => {
    // Limpar flags/refs + erro, e tentar de novo
    clearOAuthWatchdogRefs();
    loginCompletedRef.current = false;
    setAuthError(null);
    setAuthInProgress(false);
    await signInWithGoogle();
  };

  // Fazer logout
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Erro ao fazer logout:", error.message);
      }

      // Limpar estados
      setAuthInProgress(false);
      setAuthError(null);
      loginCompletedRef.current = false;
      currentAttemptRef.current = null;

      clearOAuthWatchdogRefs();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  // Limpar erro de autenticação
  const clearAuthError = () => {
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isLoading,
        authInProgress,
        authError,
        signInWithGoogle,
        retryGoogleLogin,
        signOut,
        clearAuthError,
        getRecentAuthLogs,
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
