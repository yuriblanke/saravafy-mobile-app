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

type OAuthOutcome =
  | "cancel"
  | "dismiss"
  | "deeplink_success"
  | "session_established"
  | "other";

export interface AuthContextV2Type {
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

const AuthContextV2 = createContext<AuthContextV2Type | undefined>(undefined);

interface AuthProviderV2Props {
  children: ReactNode;
}

const AUTH_PARAM_KEYS = new Set([
  "code",
  "error",
  "error_description",
  "access_token",
  "refresh_token",
  "expires_in",
  "expires_at",
  "provider_token",
  "provider_refresh_token",
  "token_type",
]);

export function stripAuthParamsFromUrl(url: string): string {
  try {
    const parsed = new URL(url);

    for (const key of AUTH_PARAM_KEYS) {
      parsed.searchParams.delete(key);
    }

    const rawHash = parsed.hash.startsWith("#")
      ? parsed.hash.slice(1)
      : parsed.hash;

    if (rawHash) {
      const hashParams = new URLSearchParams(rawHash);
      for (const key of AUTH_PARAM_KEYS) {
        hashParams.delete(key);
      }
      const nextHash = hashParams.toString();
      parsed.hash = nextHash ? `#${nextHash}` : "";
    }

    return parsed.toString();
  } catch (e) {
    console.warn("[AuthV2] stripAuthParamsFromUrl parse failed", {
      error: String(e),
    });
    return url;
  }
}

export function AuthProviderV2({ children }: AuthProviderV2Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authInProgress, setAuthInProgress] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const lastHandledOAuthCallbackKeyRef = useRef<string | null>(null);
  const currentAttemptRef = useRef<AuthAttempt | null>(null);
  const watchdogTimerRef = useRef<any>(null);
  const loginCompletedRef = useRef(false);

  const oauthBrowserOpenStartedAtMsRef = useRef<number | null>(null);
  const oauthFlowStateRef = useRef<"IDLE" | "BROWSER_OPENED" | "COMPLETED">(
    "IDLE",
  );
  const oauthCompletedRef = useRef(false);

  const lastAppStateRef = useRef<string>(AppState.currentState ?? "unknown");
  const backgroundLoggedForAttemptIdRef = useRef<string | null>(null);
  const timeoutReportedRef = useRef<
    Record<string, { timer?: boolean; resume?: boolean }>
  >({});
  const lastSanitizedCallbackUrlRef = useRef<string | null>(null);

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
    async (outcome: OAuthOutcome, details?: Record<string, any>) => {
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

      await attempt?.log("oauth_v2_flow_concluded", {
        outcome,
        elapsedMs,
        lastState,
        ...(details ?? {}),
      });

      clearOAuthWatchdogRefs();
    },
    [clearOAuthWatchdogRefs],
  );

  const handleOAuthCallbackUrl = useCallback(
    async (url: string) => {
      if (!url) return;
      if (url.includes("expo-development-client")) return;

      const attempt = currentAttemptRef.current;
      const urlInfo = classifyUrl(url);
      const sanitizedUrl = stripAuthParamsFromUrl(url);
      lastSanitizedCallbackUrlRef.current = sanitizedUrl;

      const parseParams = (raw: string): Record<string, string> => {
        const params = new URLSearchParams(raw);
        const out: Record<string, string> = {};
        for (const [key, value] of params.entries()) out[key] = value;
        return out;
      };

      const parsedUrl = Linking.parse(url);
      const queryParams = (parsedUrl.queryParams ?? {}) as Record<string, any>;

      if (typeof queryParams.url === "string" && queryParams.url.length > 0) {
        return;
      }

      const fragmentIndex = url.indexOf("#");
      const fragmentRaw = fragmentIndex >= 0 ? url.slice(fragmentIndex + 1) : "";
      const fragmentParams = fragmentRaw ? parseParams(fragmentRaw) : {};

      const mergedParams: Record<string, string> = {
        ...Object.fromEntries(
          Object.entries(queryParams)
            .filter(([, v]) => typeof v === "string")
            .map(([k, v]) => [k, v as string]),
        ),
        ...fragmentParams,
      };

      const oauthError = mergedParams.error;
      const oauthErrorDescription = mergedParams.error_description;
      if (oauthError || oauthErrorDescription) {
        await attempt?.log("oauth_v2_deep_link_oauth_error", {
          error: oauthError ?? "",
          error_description: (oauthErrorDescription ?? "").substring(0, 200),
          urlKind: urlInfo.urlKind,
          urlHost: urlInfo.urlHost,
          urlPath: urlInfo.urlPath,
          sanitizedUrl,
        });

        setAuthInProgress(false);
        setAuthError("Login cancelado ou recusado. Tente novamente.");
        clearOAuthWatchdogRefs();
        return;
      }

      const code = mergedParams.code;
      const access_token = mergedParams.access_token;
      const refresh_token = mergedParams.refresh_token;

      if (!code && !(access_token && refresh_token)) {
        return;
      }

      const callbackKey = code
        ? `code:${code}`
        : access_token && refresh_token
          ? `tokens:${access_token.slice(0, 6)}:${refresh_token.slice(0, 6)}`
          : null;

      if (
        callbackKey &&
        lastHandledOAuthCallbackKeyRef.current === callbackKey
      ) {
        return;
      }
      if (callbackKey) lastHandledOAuthCallbackKeyRef.current = callbackKey;

      await attempt?.log("oauth_v2_deep_link_received", {
        urlKind: urlInfo.urlKind,
        urlHost: urlInfo.urlHost,
        urlPath: urlInfo.urlPath,
        hasCode: Boolean(code),
        hasAccessToken: Boolean(access_token),
        hasRefreshToken: Boolean(refresh_token),
        sanitizedUrl,
      });

      try {
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            await attempt?.log("oauth_v2_deep_link_exchange_code_error", {
              error: error.message,
              sanitizedUrl,
            });
            setAuthInProgress(false);
            setAuthError("Não conseguimos concluir o login. Tente novamente.");
            clearOAuthWatchdogRefs();
            return;
          }

          await attempt?.log("oauth_v2_deep_link_exchange_code_success", {
            hasSession: !!data.session,
            userId: data.session?.user?.id,
            sanitizedUrl,
          });

          await concludeOAuthFlow("deeplink_success", {
            method: "exchangeCodeForSession",
          });

          setSession(data.session);
          setUser(data.session?.user ?? null);
          setAuthError(null);
          setAuthInProgress(false);

          if (data.session?.user?.id) {
            attempt?.setUserId(data.session.user.id);
            await attempt?.log("oauth_v2_auth_session_set", {
              method: "exchangeCodeForSession",
            });
          }

          return;
        }

        if (access_token && refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) {
            await attempt?.log("oauth_v2_deep_link_set_session_error", {
              error: error.message,
              sanitizedUrl,
            });
            setAuthInProgress(false);
            setAuthError("Não conseguimos concluir o login. Tente novamente.");
            clearOAuthWatchdogRefs();
            return;
          }

          await attempt?.log("oauth_v2_deep_link_set_session_success", {
            hasSession: !!data.session,
            userId: data.session?.user?.id,
            sanitizedUrl,
          });

          await concludeOAuthFlow("deeplink_success", {
            method: "setSession",
          });

          setSession(data.session);
          setUser(data.session?.user ?? null);
          setAuthError(null);
          setAuthInProgress(false);

          if (data.session?.user?.id) {
            attempt?.setUserId(data.session.user.id);
            await attempt?.log("oauth_v2_auth_session_set", {
              method: "setSession",
            });
          }
        }
      } catch (e) {
        await attempt?.log("oauth_v2_deep_link_error", {
          error: String(e),
          sanitizedUrl,
        });
        setAuthInProgress(false);
        setAuthError("Erro inesperado ao concluir o login. Tente novamente.");
        clearOAuthWatchdogRefs();
      }
    },
    [clearOAuthWatchdogRefs, concludeOAuthFlow],
  );

  useEffect(() => {
    const appStateSub = AppState.addEventListener("change", (next) => {
      const prev = lastAppStateRef.current;
      lastAppStateRef.current = next;

      const attempt = currentAttemptRef.current;
      const attemptId = attempt?.attemptId ?? null;

      if (
        attemptId &&
        oauthFlowStateRef.current === "BROWSER_OPENED" &&
        !oauthCompletedRef.current &&
        (next === "background" || next === "inactive") &&
        backgroundLoggedForAttemptIdRef.current !== attemptId
      ) {
        backgroundLoggedForAttemptIdRef.current = attemptId;
        void attempt?.log("oauth_v2_appstate_backgrounded", {
          appStateTransition: `${prev}->${next}`,
          atMs: Date.now(),
        });
      }

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

            void attempt?.log("oauth_v2_timeout_on_resume", {
              elapsedMs,
              lastState: "BROWSER_OPENED",
              appStateTransition: `${prev}->active`,
            });

            oauthCompletedRef.current = true;
            oauthFlowStateRef.current = "COMPLETED";
            loginCompletedRef.current = true;
            clearOAuthWatchdogRefs();

            setAuthError(
              "Não conseguimos concluir o login voltando do Google para o app. Tente novamente.",
            );
            setAuthInProgress(false);
          }
        }
      }
    });

    const urlSub = Linking.addEventListener("url", (event) => {
      const incoming = typeof event?.url === "string" ? event.url : "";
      if (!incoming) return;
      void handleOAuthCallbackUrl(incoming);
    });

    return () => {
      appStateSub.remove();
      urlSub.remove();
    };
  }, [clearOAuthWatchdogRefs, handleOAuthCallbackUrl]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const bootAttempt = new AuthAttempt();
      currentAttemptRef.current = bootAttempt;
      await bootAttempt.log("oauth_v2_boot_auth_context_mounted", {});

      try {
        const initialUrl = await Linking.getInitialURL();

        if (initialUrl) {
          await bootAttempt.log("oauth_v2_boot_initial_url_found", {
            urlInfo: classifyUrl(initialUrl),
            sanitizedUrl: stripAuthParamsFromUrl(initialUrl),
          });

          await handleOAuthCallbackUrl(initialUrl);
        }

        const { data } = await supabase.auth.getSession();

        if (cancelled) return;

        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
        setIsLoading(false);

        await bootAttempt.log("oauth_v2_boot_get_session_success", {
          hasSession: !!data.session,
          userId: data.session?.user?.id,
        });
      } catch (error) {
        if (cancelled) return;

        console.error("[AuthV2] Erro no boot de autenticação:", error);
        setIsLoading(false);

        await bootAttempt.log("oauth_v2_boot_get_session_error", {
          error: String(error),
        });
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      const attempt = currentAttemptRef.current;

      void attempt?.log("oauth_v2_auth_state_change", {
        event,
        hasSession: !!nextSession,
        userId: nextSession?.user?.id,
      });

      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setIsLoading(false);

      if (nextSession?.user) {
        void concludeOAuthFlow("session_established", {
          authEvent: event,
        });

        setAuthError(null);
        setAuthInProgress(false);

        if (currentAttemptRef.current) {
          currentAttemptRef.current.setUserId(nextSession.user.id);
        }
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearOAuthWatchdogRefs();
    };
  }, [clearOAuthWatchdogRefs, concludeOAuthFlow, handleOAuthCallbackUrl]);

  const signInWithGoogle = useCallback(async () => {
    try {
      const attempt = new AuthAttempt();
      currentAttemptRef.current = attempt;
      loginCompletedRef.current = false;

      clearOAuthWatchdogRefs();

      setAuthInProgress(true);
      setAuthError(null);

      await attempt.log("oauth_v2_start", {});

      const redirectUri = Linking.createURL("auth/callback");
      const redirectInfo = classifyUrl(redirectUri);

      await attempt.log("oauth_v2_redirect_uri_built", {
        redirectHost: redirectInfo.urlHost,
        redirectPath: redirectInfo.urlPath,
      });

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

      if (error) {
        await attempt.log("oauth_v2_signInWithOAuth_error", {
          error: error.message,
        });
        setAuthError(`Erro ao iniciar login: ${error.message}`);
        setAuthInProgress(false);
        return;
      }

      if (!data?.url) {
        await attempt.log("oauth_v2_signInWithOAuth_error", {
          error: "URL de OAuth não retornada",
        });
        setAuthError("Erro ao iniciar login: URL não retornada");
        setAuthInProgress(false);
        return;
      }

      await attempt.log("oauth_v2_signInWithOAuth_success", {
        hasUrl: true,
      });

      const startTime = Date.now();
      watchdogTimerRef.current = setTimeout(async () => {
        const attemptId = attempt.attemptId;
        const appStateNow = AppState.currentState ?? "unknown";
        if (!loginCompletedRef.current && !oauthCompletedRef.current) {
          const elapsedMs = Date.now() - startTime;

          if (appStateNow === "active") {
            const already = timeoutReportedRef.current[attemptId]?.timer;
            if (!already) {
              timeoutReportedRef.current[attemptId] = {
                ...(timeoutReportedRef.current[attemptId] ?? {}),
                timer: true,
              };

              await attempt.log("oauth_v2_timeout_timer", {
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
            "Não conseguimos concluir o login voltando do Google para o app. Tente novamente.",
          );

          oauthCompletedRef.current = true;
          oauthFlowStateRef.current = "COMPLETED";
          loginCompletedRef.current = true;
          clearOAuthWatchdogRefs();
        }
      }, 12000);

      oauthBrowserOpenStartedAtMsRef.current = Date.now();
      oauthFlowStateRef.current = "BROWSER_OPENED";
      oauthCompletedRef.current = false;

      await attempt.log("oauth_v2_browser_open_start", {
        oauth_browser_open_started_at_ms:
          oauthBrowserOpenStartedAtMsRef.current,
      });

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

      await attempt.log("oauth_v2_browser_open_result", {
        type: result.type,
      });

      if (result.type !== "success") {
        const outcome: OAuthOutcome =
          result.type === "cancel"
            ? "cancel"
            : result.type === "dismiss"
              ? "dismiss"
              : "other";

        await concludeOAuthFlow(outcome, {
          browserResultType: result.type,
        });
      }

      if (
        result.type === "success" &&
        "url" in result &&
        typeof result.url === "string"
      ) {
        await handleOAuthCallbackUrl(result.url);
      }
    } catch (error) {
      const attempt = currentAttemptRef.current;
      await attempt?.log("oauth_v2_error", {
        error: String(error),
      });

      clearOAuthWatchdogRefs();
      loginCompletedRef.current = true;
      setAuthInProgress(false);
      setAuthError(`Erro inesperado: ${String(error)}`);
    }
  }, [clearOAuthWatchdogRefs, concludeOAuthFlow, handleOAuthCallbackUrl]);

  const retryGoogleLogin = useCallback(async () => {
    clearOAuthWatchdogRefs();
    loginCompletedRef.current = false;
    setAuthError(null);
    setAuthInProgress(false);
    await signInWithGoogle();
  }, [clearOAuthWatchdogRefs, signInWithGoogle]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[AuthV2] Erro ao fazer logout:", error.message);
      }

      setAuthInProgress(false);
      setAuthError(null);
      loginCompletedRef.current = false;
      currentAttemptRef.current = null;
      clearOAuthWatchdogRefs();
    } catch (error) {
      console.error("[AuthV2] Erro ao fazer logout:", error);
    }
  }, [clearOAuthWatchdogRefs]);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  return (
    <AuthContextV2.Provider
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
    </AuthContextV2.Provider>
  );
}

export function useAuthContextV2() {
  const context = useContext(AuthContextV2);
  if (context === undefined) {
    throw new Error("useAuthV2 must be used within an AuthProviderV2");
  }
  return context;
}
