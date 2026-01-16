import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { useInviteGates } from "@/contexts/InviteGatesContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/src/components/Badge";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import {
  getTerreiroInviteBodyCopy,
  getTerreiroInviteRoleBadgeLabel,
  TERREIRO_INVITE_DECIDE_LATER_TOAST,
} from "@/src/domain/terreiroInviteCopy";
import { queryKeys } from "@/src/queries/queryKeys";
import { colors, radii, spacing } from "@/src/theme";
import {
  bumpTerreiroInviteSnooze,
  getTerreiroInviteSnoozeInfo,
  loadTerreiroInviteSnoozeMap,
  type TerreiroInviteSnoozeMap,
} from "@/src/utils/terreiroInviteSnooze";
import { useQueryClient } from "@tanstack/react-query";
import { useRootNavigationState, useSegments } from "expo-router";

type InviteRole = "admin" | "curimba" | "member";

type TerreiroInvite = {
  id: string;
  terreiro_id: string;
  email: string;
  role: InviteRole;
  status: string;
  created_at: string;
  terreiro_title?: string | null;
};

function normalizeInviteRole(role: unknown): InviteRole | null {
  const r = typeof role === "string" ? role.trim().toLowerCase() : "";
  if (r === "admin" || r === "curimba" || r === "member") return r;
  return null;
}

function isColumnMissingError(message: string, columnName: string) {
  const m = String(message ?? "");
  return (
    m.includes(columnName) &&
    (m.includes("does not exist") || m.includes("column"))
  );
}

function isRpcFunctionParamMismatch(error: unknown, paramName: string) {
  const anyErr = error as any;
  const code = typeof anyErr?.code === "string" ? anyErr.code : "";
  const message = typeof anyErr?.message === "string" ? anyErr.message : "";
  const hint = typeof anyErr?.hint === "string" ? anyErr.hint : "";
  if (code !== "PGRST202") return false;
  return (
    message.includes(`(${paramName})`) ||
    message.includes(`parameter ${paramName}`) ||
    hint.includes("invite_id")
  );
}

async function rpcTerreiroInvite(
  fnName: "accept_terreiro_invite" | "reject_terreiro_invite",
  inviteId: string
) {
  // Prefer `invite_id` (new signature) but fall back to `p_invite_id`.
  // PostgREST requires the argument names to match the function signature.
  let rpc: any = await supabase.rpc(fnName, { invite_id: inviteId });

  if (rpc?.error && isRpcFunctionParamMismatch(rpc.error, "invite_id")) {
    rpc = await supabase.rpc(fnName, { p_invite_id: inviteId });
  }

  return rpc as any;
}

type InviteGateDebug = {
  step: "refresh" | "accept:rpc" | "reject:rpc" | "reject:update_invite";
  inviteId?: string;
  terreiroId?: string;
  role?: string;
  userId?: string;
  raw?: unknown;
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

function isRlsRecursionError(message: string) {
  const m = String(message ?? "");
  return (
    m.includes("infinite recursion detected in policy") &&
    m.includes('relation "terreiro_members"')
  );
}

function isPermissionOrRlsError(message: string) {
  const m = String(message ?? "").toLowerCase();
  return (
    m.includes("permission") ||
    m.includes("not authorized") ||
    m.includes("row-level") ||
    m.includes("rls")
  );
}

function getFriendlyActionError(message: string) {
  if (!message) {
    return "Não foi possível concluir agora. Verifique sua conexão e tente novamente.";
  }

  if (isRlsRecursionError(message)) {
    return "Convites indisponíveis no momento (policies de acesso inconsistentes). Tente novamente mais tarde.";
  }

  if (isPermissionOrRlsError(message)) {
    return "Você não tem permissão para concluir este convite agora.";
  }

  const m = message.toLowerCase();
  if (
    m.includes("failed to fetch") ||
    m.includes("network") ||
    m.includes("timeout") ||
    m.includes("fetch")
  ) {
    return "Sem conexão no momento. Verifique sua internet e tente novamente.";
  }

  return "Não foi possível concluir agora. Verifique sua conexão e tente novamente.";
}

function toDebugFromUnknown(params: {
  step: InviteGateDebug["step"];
  inviteId?: string;
  terreiroId?: string;
  role?: string;
  userId?: string;
  error: unknown;
}): InviteGateDebug {
  const { step, inviteId, terreiroId, role, userId, error } = params;

  const asAny = error as any;
  const message =
    error instanceof Error
      ? error.message
      : typeof asAny?.message === "string"
      ? asAny.message
      : "";

  const code = typeof asAny?.code === "string" ? asAny.code : undefined;
  const details =
    typeof asAny?.details === "string" ? asAny.details : undefined;
  const hint = typeof asAny?.hint === "string" ? asAny.hint : undefined;

  return {
    step,
    inviteId,
    terreiroId,
    role,
    userId,
    raw: error,
    message: message || undefined,
    code,
    details,
    hint,
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function InviteGate() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { effectiveTheme, fetchTerreirosQueAdministro } = usePreferences();
  const queryClient = useQueryClient();
  const { setTerreiroGateActive, terreiroSnoozeVersion } = useInviteGates();

  const segments = useSegments();
  const rootNavState = useRootNavigationState();
  const segmentsKey = useMemo(() => segments.join("/"), [segments]);
  const isNavReady = !!rootNavState?.key;
  const isAppReady = isNavReady && segments[0] === "(app)";

  const variant = effectiveTheme;

  const userId = user?.id ?? null;
  const userEmail = typeof user?.email === "string" ? user.email : null;
  const normalizedUserEmail = userEmail ? normalizeEmail(userEmail) : null;

  const [pendingInvites, setPendingInvites] = useState<TerreiroInvite[]>([]);
  const [currentInvite, setCurrentInvite] = useState<TerreiroInvite | null>(
    null
  );
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<InviteGateDebug | null>(null);

  // Avoid showing the modal before the (app) navigation stack is mounted.
  // Otherwise we can end up with a black backdrop behind it during boot.
  const [shouldOpenModalWhenReady, setShouldOpenModalWhenReady] =
    useState(false);

  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const realtimeInviteIdRef = useRef<string | null>(null);

  const pendingInvitesRef = useRef<TerreiroInvite[]>([]);

  const appStateRef = useRef(AppState.currentState);
  const lastFetchAtRef = useRef<number>(0);
  const inFlightRef = useRef<Promise<TerreiroInvite[]> | null>(null);

  const rlsRecursionDetectedRef = useRef(false);
  const rlsRecursionNotifiedRef = useRef(false);

  const priorityInviteIdRef = useRef<string | null>(null);

  const sessionStartAtRef = useRef<number>(Date.now());
  const snoozeReadyRef = useRef(false);
  const snoozeMapRef = useRef<TerreiroInviteSnoozeMap>({});

  const reloadSnoozeMap = useCallback(async () => {
    if (!normalizedUserEmail) {
      snoozeMapRef.current = {};
      snoozeReadyRef.current = true;
      return;
    }

    try {
      snoozeMapRef.current = await loadTerreiroInviteSnoozeMap(
        normalizedUserEmail
      );
    } catch {
      snoozeMapRef.current = {};
    } finally {
      snoozeReadyRef.current = true;
    }
  }, [normalizedUserEmail]);

  const shouldHideFromGate = useCallback((inviteId: string) => {
    const info = getTerreiroInviteSnoozeInfo(snoozeMapRef.current, inviteId);

    // After 2nd "Decidir depois": stop insisting completely.
    if (info.count >= 2) return true;

    // After 1st "Decidir depois": stop insisting for the rest of this app session.
    if (
      info.count === 1 &&
      typeof info.lastSnoozedAt === "number" &&
      info.lastSnoozedAt >= sessionStartAtRef.current
    ) {
      return true;
    }

    return false;
  }, []);

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  const inputBg =
    variant === "light" ? colors.inputBgLight : colors.inputBgDark;
  const inputBorder =
    variant === "light" ? colors.inputBorderLight : colors.inputBorderDark;

  useEffect(() => {
    pendingInvitesRef.current = pendingInvites;
  }, [pendingInvites]);

  useEffect(() => {
    void (async () => {
      await reloadSnoozeMap();

      const filtered = pendingInvitesRef.current.filter(
        (i) => !shouldHideFromGate(i.id)
      );

      if (filtered.length !== pendingInvitesRef.current.length) {
        pendingInvitesRef.current = filtered;
        setPendingInvites(filtered);
      }

      setIsBannerVisible(filtered.length > 0);

      if (currentInvite && shouldHideFromGate(currentInvite.id)) {
        setCurrentInvite(null);
        setIsModalVisible(false);
      }
    })();
  }, [
    currentInvite,
    reloadSnoozeMap,
    shouldHideFromGate,
    terreiroSnoozeVersion,
  ]);

  useEffect(() => {
    if (!__DEV__) return;
    console.log("[InviteGate] nav readiness", {
      isNavReady,
      isAppReady,
      segments: segmentsKey,
    });
  }, [isAppReady, isNavReady, segmentsKey]);

  const refreshPendingInvites = useCallback(
    async (options?: { skipCache?: boolean }) => {
      if (!userId) return [] as TerreiroInvite[];
      if (!normalizedUserEmail) return [] as TerreiroInvite[];

      if (!snoozeReadyRef.current) {
        await reloadSnoozeMap();
      }

      if (rlsRecursionDetectedRef.current) {
        // If DB policies are broken, don't keep hammering Supabase.
        return [] as TerreiroInvite[];
      }

      const now = Date.now();
      const cacheWindowMs = 12_000;

      if (!options?.skipCache) {
        if (now - lastFetchAtRef.current < cacheWindowMs) {
          return pendingInvitesRef.current;
        }
      }

      if (inFlightRef.current) return inFlightRef.current;

      const run = (async () => {
        const selectWithTitle =
          "id, terreiro_id, email, role, status, created_at, terreiro:terreiros(title)";
        const selectWithName =
          "id, terreiro_id, email, role, status, created_at, terreiro:terreiros(name)";

        let res: any = await supabase
          .from("terreiro_invites")
          .select(selectWithTitle)
          .eq("status", "pending")
          .eq("email", normalizedUserEmail)
          .order("created_at", { ascending: true });

        if (res.error && isColumnMissingError(res.error.message, "title")) {
          res = await supabase
            .from("terreiro_invites")
            .select(selectWithName)
            .eq("status", "pending")
            .eq("email", normalizedUserEmail)
            .order("created_at", { ascending: true });
        }

        if (res.error) {
          if (isRlsRecursionError(res.error.message)) {
            rlsRecursionDetectedRef.current = true;

            // Keep app usable: don't block user, just disable invite gate until policies are fixed.
            setPendingInvites([]);
            setCurrentInvite(null);
            setIsModalVisible(false);
            setIsBannerVisible(false);
            lastFetchAtRef.current = Date.now();

            if (!rlsRecursionNotifiedRef.current) {
              rlsRecursionNotifiedRef.current = true;
              showToast(
                "Convites indisponíveis no momento. Tente novamente mais tarde."
              );
            }

            return [] as TerreiroInvite[];
          }
          throw new Error(res.error.message);
        }

        const list = ((res.data ?? []) as any[])
          .map((row) => {
            const role = normalizeInviteRole(row?.role);
            if (!role) return null;

            const terreiroRaw = row?.terreiro as any;
            const terreiroObj = Array.isArray(terreiroRaw)
              ? (terreiroRaw[0] as any)
              : (terreiroRaw as any);

            const terreiroTitle =
              typeof terreiroObj?.title === "string" && terreiroObj.title.trim()
                ? terreiroObj.title.trim()
                : typeof terreiroObj?.name === "string" &&
                  terreiroObj.name.trim()
                ? terreiroObj.name.trim()
                : null;

            if (__DEV__ && !terreiroTitle) {
              console.info("[InviteGate] missing terreiro title on invite", {
                inviteId: row?.id,
                terreiroId: row?.terreiro_id,
                terreiroRawType: Array.isArray(terreiroRaw)
                  ? "array"
                  : typeof terreiroRaw,
                terreiroRaw,
              });
            }

            return {
              id: String(row?.id ?? ""),
              terreiro_id: String(row?.terreiro_id ?? ""),
              email: String(row?.email ?? ""),
              role,
              status: String(row?.status ?? ""),
              created_at: String(row?.created_at ?? ""),
              terreiro_title: terreiroTitle,
            } satisfies TerreiroInvite;
          })
          .filter(Boolean) as TerreiroInvite[];

        const priorityId = priorityInviteIdRef.current;
        const ordered = !priorityId
          ? list
          : (() => {
              const idx = list.findIndex((i) => i.id === priorityId);
              if (idx < 0) return list;
              const head = list[idx];
              const rest = list.filter((i) => i.id !== priorityId);
              return [head, ...rest];
            })();

        const next = ordered.filter((i) => !shouldHideFromGate(i.id));

        lastFetchAtRef.current = Date.now();
        setPendingInvites(next);
        return next;
      })();

      inFlightRef.current = run;
      try {
        return await run;
      } finally {
        inFlightRef.current = null;
      }
    },
    [
      normalizedUserEmail,
      reloadSnoozeMap,
      shouldHideFromGate,
      showToast,
      userId,
    ]
  );

  const ensureModalForQueue = useCallback((queue: TerreiroInvite[]) => {
    if (!queue.length) {
      setCurrentInvite(null);
      setIsModalVisible(false);
      setIsProcessing(false);
      setActionError(null);
      priorityInviteIdRef.current = null;
      setShouldOpenModalWhenReady(false);
      return;
    }

    const first = queue[0];
    setCurrentInvite(first);
    setIsModalVisible(true);
    setActionError(null);
    setIsProcessing(false);

    setShouldOpenModalWhenReady(false);

    // If we opened due to a priority invite, clear it after it becomes current.
    if (priorityInviteIdRef.current === first.id) {
      priorityInviteIdRef.current = null;
    }
  }, []);

  const syncQueueToUi = useCallback(
    (queue: TerreiroInvite[], source: string) => {
      if (!queue.length) {
        ensureModalForQueue(queue);
        return;
      }

      if (!isAppReady) {
        setCurrentInvite(queue[0]);
        setIsModalVisible(false);
        setIsProcessing(false);
        setActionError(null);
        setShouldOpenModalWhenReady(true);

        if (__DEV__) {
          console.log("[InviteGate] deferring modal until app ready", {
            source,
            isAppReady,
            isNavReady,
            segments: segmentsKey,
            inviteId: queue[0]?.id,
            queueLen: queue.length,
          });
        }

        return;
      }

      if (__DEV__) {
        console.log("[InviteGate] opening modal", {
          source,
          inviteId: queue[0]?.id,
          queueLen: queue.length,
        });
      }

      ensureModalForQueue(queue);
    },
    [ensureModalForQueue, isAppReady, isNavReady, segmentsKey]
  );

  useEffect(() => {
    if (!shouldOpenModalWhenReady) return;
    if (!isAppReady) return;

    const queue = pendingInvitesRef.current;
    if (!queue.length) {
      setShouldOpenModalWhenReady(false);
      return;
    }

    if (__DEV__) {
      console.log("[InviteGate] app ready -> opening deferred modal", {
        inviteId: queue[0]?.id,
        queueLen: queue.length,
        segments: segmentsKey,
      });
    }

    // Let the app render at least one frame before showing the overlay.
    const t = setTimeout(() => {
      ensureModalForQueue(queue);
    }, 0);

    return () => clearTimeout(t);
  }, [ensureModalForQueue, isAppReady, segmentsKey, shouldOpenModalWhenReady]);

  const resolveInviteLocally = useCallback(
    (inviteId: string) => {
      const next = pendingInvitesRef.current.filter((i) => i.id !== inviteId);
      setPendingInvites(next);
      syncQueueToUi(next, "resolve_local");
    },
    [syncQueueToUi]
  );

  const openGateNow = useCallback(async () => {
    try {
      const list = await refreshPendingInvites({ skipCache: true });
      syncQueueToUi(list, "open_gate_now");
      setIsBannerVisible(false);
    } catch {
      // If refresh fails here, we still keep the app usable.
    }
  }, [refreshPendingInvites, syncQueueToUi]);

  // Startup refresh (immediate gate if pending).
  useEffect(() => {
    if (!userId || !normalizedUserEmail) {
      setPendingInvites([]);
      setCurrentInvite(null);
      setIsModalVisible(false);
      setIsBannerVisible(false);
      realtimeInviteIdRef.current = null;
      setShouldOpenModalWhenReady(false);
      return;
    }

    (async () => {
      try {
        const list = await refreshPendingInvites({ skipCache: true });
        syncQueueToUi(list, "startup_refresh");
      } catch {
        // ignore
      }
    })();
  }, [normalizedUserEmail, refreshPendingInvites, syncQueueToUi, userId]);

  // Foreground refresh.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (
        (prev === "background" || prev === "inactive") &&
        nextState === "active"
      ) {
        (async () => {
          if (!userId || !normalizedUserEmail) return;
          try {
            const list = await refreshPendingInvites({ skipCache: true });
            syncQueueToUi(list, "foreground_refresh");
          } catch {
            // ignore
          }
        })();
      }
    });

    return () => sub.remove();
  }, [normalizedUserEmail, refreshPendingInvites, syncQueueToUi, userId]);

  // Realtime subscription (banner only; gate on CTA or next foreground).
  useEffect(() => {
    if (!normalizedUserEmail) return;

    const channel = supabase
      .channel("invite-gate:terreiro_invites")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "terreiro_invites" },
        (payload) => {
          const row = payload.new as any;
          const emailRaw = typeof row?.email === "string" ? row.email : "";
          const status = typeof row?.status === "string" ? row.status : "";

          if (!emailRaw) return;
          if (status && status !== "pending") return;

          const email = normalizeEmail(emailRaw);
          if (email !== normalizedUserEmail) return;

          const inviteId = typeof row?.id === "string" ? row.id : null;
          if (inviteId) realtimeInviteIdRef.current = inviteId;

          if (inviteId && shouldHideFromGate(inviteId)) {
            return;
          }

          if (appStateRef.current === "active") {
            setIsBannerVisible(true);
          }

          // Keep local queue updated (best-effort). We don't open the modal
          // automatically here to avoid interrupting mid-action.
          const role = normalizeInviteRole(row?.role);
          const nextInvite: TerreiroInvite | null =
            typeof row?.id === "string" &&
            typeof row?.terreiro_id === "string" &&
            typeof row?.created_at === "string" &&
            !!role
              ? {
                  id: row.id,
                  terreiro_id: row.terreiro_id,
                  created_at: row.created_at,
                  role,
                  email: email,
                  status: status || "pending",
                  terreiro_title: null,
                }
              : null;

          if (nextInvite) {
            setPendingInvites((prev) => {
              if (prev.some((i) => i.id === nextInvite.id)) return prev;
              const merged = [...prev, nextInvite].sort((a, b) =>
                a.created_at.localeCompare(b.created_at)
              );
              return merged;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [normalizedUserEmail]);

  // Block Android back while modal is visible.
  useEffect(() => {
    if (!isModalVisible) return;

    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [isModalVisible]);

  const onPressBannerCta = useCallback(async () => {
    if (!userId || !normalizedUserEmail) return;

    const inviteId = realtimeInviteIdRef.current;
    if (inviteId) {
      priorityInviteIdRef.current = inviteId;
    }

    await openGateNow();
  }, [normalizedUserEmail, openGateNow, userId]);

  const acceptInvite = useCallback(async () => {
    if (!currentInvite) return;
    if (!userId) return;

    setIsProcessing(true);
    setActionError(null);
    setDebugInfo(null);

    try {
      // RLS estrito: aceitar precisa ser via RPC SECURITY DEFINER.
      const rpc = await rpcTerreiroInvite(
        "accept_terreiro_invite",
        currentInvite.id
      );

      if (__DEV__) {
        console.info("[InviteGate] accept rpc", {
          inviteId: currentInvite.id,
          terreiroId: currentInvite.terreiro_id,
          data: (rpc as any)?.data,
          dataType: typeof (rpc as any)?.data,
          hasError: !!(rpc as any)?.error,
        });
      }

      if (rpc.error) {
        if (__DEV__) {
          console.error("[InviteGate] accept rpc error", {
            inviteId: currentInvite.id,
            terreiroId: currentInvite.terreiro_id,
            message: rpc.error?.message,
            details: (rpc.error as any)?.details,
            hint: (rpc.error as any)?.hint,
            code: (rpc.error as any)?.code,
          });
        }
        throw rpc.error;
      }

      if ((rpc as any)?.data === false) {
        if (__DEV__) {
          console.warn("[InviteGate] accept rpc returned false", {
            inviteId: currentInvite.id,
            terreiroId: currentInvite.terreiro_id,
            data: (rpc as any)?.data,
          });
        }
        throw new Error("accept_terreiro_invite returned false");
      }

      // 1) Atualiza o estado local imediatamente para fechar o modal/banner.
      resolveInviteLocally(currentInvite.id);

      // 2) Recalcula o warm cache (permissões/terreiros) para refletir o novo role
      // imediatamente, sem precisar reiniciar o app.
      let warmOk = true;
      if (currentInvite.role === "admin" || currentInvite.role === "curimba") {
        try {
          await fetchTerreirosQueAdministro(userId);
        } catch (error) {
          warmOk = false;
          if (__DEV__) {
            console.info("[InviteGate] warm cache failed after accept", {
              userId,
              inviteId: currentInvite.id,
              terreiroId: currentInvite.terreiro_id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }

      // 3) Revalidar caches React Query que dependem de memberships/terreiros.
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.membership(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.terreiros(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.terreiroAccessIds(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.editableTerreiros(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.permissions(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.terreiros.editableByUser(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.accountable(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.editableByUserPrefix(userId),
      });

      if (warmOk) {
        showToast("Convite aceito.");
      } else {
        showToast(
          "Convite aceito, mas não foi possível atualizar permissões agora. Tente novamente em instantes."
        );
      }

      if (__DEV__) {
        console.log("[InviteGate] accept success", {
          inviteId: currentInvite.id,
          terreiroId: currentInvite.terreiro_id,
          userId,
          warmOk,
        });
      }

      // 4) Reconciliar com o servidor (best-effort) para não deixar fila inconsistente.
      try {
        const list = await refreshPendingInvites({ skipCache: true });
        ensureModalForQueue(list);
      } catch {
        // ignore
      }
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : typeof (e as any)?.message === "string"
          ? (e as any).message
          : String(e);

      if (__DEV__) {
        console.error("[InviteGate] accept error details", {
          inviteId: currentInvite?.id,
          terreiroId: currentInvite?.terreiro_id,
          message,
          details: (e as any)?.details,
          hint: (e as any)?.hint,
          code: (e as any)?.code,
          raw: e,
        });
      }

      const info = toDebugFromUnknown({
        step: "accept:rpc",
        inviteId: currentInvite.id,
        terreiroId: currentInvite.terreiro_id,
        role: currentInvite.role,
        userId: userId ?? undefined,
        error: e,
      });

      setDebugInfo(info);

      if (__DEV__) {
        console.log("[InviteGate] accept failed", info);
      }

      const friendly = getFriendlyActionError(message);
      setActionError(friendly);
      showToast(friendly);
    } finally {
      setIsProcessing(false);
    }
  }, [
    currentInvite,
    ensureModalForQueue,
    fetchTerreirosQueAdministro,
    queryClient,
    refreshPendingInvites,
    resolveInviteLocally,
    showToast,
    userId,
  ]);

  const rejectInvite = useCallback(async () => {
    if (!currentInvite) return;

    setIsProcessing(true);
    setActionError(null);
    setDebugInfo(null);

    try {
      // RLS estrito: recusar precisa ser via RPC SECURITY DEFINER.
      // NOTE: Não usar `decline_terreiro_invite` enquanto o banco estiver com
      // CHECK status=('pending'|'accepted'|'rejected') e activated_consistency.
      const rpc = await rpcTerreiroInvite(
        "reject_terreiro_invite",
        currentInvite.id
      );

      if (__DEV__) {
        console.info("[InviteGate] reject rpc", {
          inviteId: currentInvite.id,
          terreiroId: currentInvite.terreiro_id,
          data: (rpc as any)?.data,
          dataType: typeof (rpc as any)?.data,
          hasError: !!(rpc as any)?.error,
        });
      }

      if (rpc.error) {
        if (__DEV__) {
          console.error("[InviteGate] reject rpc error", {
            inviteId: currentInvite.id,
            terreiroId: currentInvite.terreiro_id,
            message: rpc.error?.message,
            details: (rpc.error as any)?.details,
            hint: (rpc.error as any)?.hint,
            code: (rpc.error as any)?.code,
          });
        }
        throw rpc.error;
      }

      if ((rpc as any)?.data === false) {
        if (__DEV__) {
          console.warn("[InviteGate] reject rpc returned false", {
            inviteId: currentInvite.id,
            terreiroId: currentInvite.terreiro_id,
            data: (rpc as any)?.data,
          });
        }
        throw new Error("reject_terreiro_invite returned false");
      }

      showToast("Convite recusado.");

      if (__DEV__) {
        console.log("[InviteGate] reject success", {
          inviteId: currentInvite.id,
          terreiroId: currentInvite.terreiro_id,
          userId: userId ?? undefined,
        });
      }

      resolveInviteLocally(currentInvite.id);

      // Revalidar caches que dependem de memberships/terreiros (por via das dúvidas).
      if (userId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.me.membership(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.me.terreiros(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.me.terreiroAccessIds(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.me.editableTerreiros(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.me.permissions(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.collections.editableByUserPrefix(userId),
        });
      }

      refreshPendingInvites({ skipCache: true })
        .then(ensureModalForQueue)
        .catch(() => undefined);
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : typeof (e as any)?.message === "string"
          ? (e as any).message
          : String(e);

      if (__DEV__) {
        console.error("[InviteGate] reject error details", {
          inviteId: currentInvite?.id,
          terreiroId: currentInvite?.terreiro_id,
          message,
          details: (e as any)?.details,
          hint: (e as any)?.hint,
          code: (e as any)?.code,
          raw: e,
        });
      }

      const info = toDebugFromUnknown({
        step: "reject:rpc",
        inviteId: currentInvite.id,
        terreiroId: currentInvite.terreiro_id,
        role: currentInvite.role,
        userId: userId ?? undefined,
        error: e,
      });
      setDebugInfo(info);

      if (__DEV__) {
        console.log("[InviteGate] reject failed", info);
      }
      const friendly = getFriendlyActionError(message);
      setActionError(friendly);
      showToast(friendly);
    } finally {
      setIsProcessing(false);
    }
  }, [
    currentInvite,
    ensureModalForQueue,
    queryClient,
    refreshPendingInvites,
    resolveInviteLocally,
    showToast,
    userId,
  ]);

  const inviteTerreiroTitle = useMemo(() => {
    const title =
      typeof currentInvite?.terreiro_title === "string" &&
      currentInvite.terreiro_title.trim()
        ? currentInvite.terreiro_title.trim()
        : "Terreiro";
    return title;
  }, [currentInvite?.terreiro_title]);

  const inviteRoleLabel = useMemo(() => {
    const role = currentInvite?.role;
    if (!role) return "";
    return getTerreiroInviteRoleBadgeLabel(role);
  }, [currentInvite?.role]);

  const inviteBodyCopy = useMemo(() => {
    const role = currentInvite?.role;
    if (!role) return "";
    return getTerreiroInviteBodyCopy(role);
  }, [currentInvite?.role]);

  const bannerText = useMemo(() => {
    return "Convite";
  }, []);

  const closeModalNoSideEffects = useCallback(() => {
    setIsModalVisible(false);
    setActionError(null);
    setDebugInfo(null);
    setIsBannerVisible(pendingInvitesRef.current.length > 0);
  }, []);

  const decideLater = useCallback(() => {
    const inviteId = currentInvite?.id;
    if (!inviteId) {
      closeModalNoSideEffects();
      return;
    }

    void (async () => {
      if (normalizedUserEmail) {
        await bumpTerreiroInviteSnooze(normalizedUserEmail, inviteId);
        await reloadSnoozeMap();
      }

      showToast(TERREIRO_INVITE_DECIDE_LATER_TOAST);

      const nextQueue = pendingInvitesRef.current.filter(
        (i) => i.id !== inviteId
      );
      pendingInvitesRef.current = nextQueue;
      setPendingInvites(nextQueue);

      setIsModalVisible(false);
      setCurrentInvite(null);
      setActionError(null);
      setDebugInfo(null);
      setIsBannerVisible(nextQueue.length > 0);
      setShouldOpenModalWhenReady(false);
    })();
  }, [
    closeModalNoSideEffects,
    currentInvite?.id,
    normalizedUserEmail,
    reloadSnoozeMap,
    showToast,
  ]);

  useEffect(() => {
    const active =
      !!userId &&
      !!normalizedUserEmail &&
      (pendingInvites.length > 0 ||
        isBannerVisible ||
        isModalVisible ||
        shouldOpenModalWhenReady);

    setTerreiroGateActive(active);
  }, [
    isBannerVisible,
    isModalVisible,
    normalizedUserEmail,
    pendingInvites.length,
    setTerreiroGateActive,
    shouldOpenModalWhenReady,
    userId,
  ]);

  if (!userId || !normalizedUserEmail) {
    return null;
  }

  return (
    <>
      {isBannerVisible && !isModalVisible ? (
        <View style={styles.bannerHost} pointerEvents="box-none">
          <SurfaceCard variant={variant} style={styles.bannerCard}>
            <View style={styles.bannerRow}>
              <Text style={[styles.bannerText, { color: textPrimary }]}>
                {bannerText}
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver convite"
                onPress={onPressBannerCta}
                style={({ pressed }) => [
                  styles.bannerCta,
                  { borderColor: inputBorder, backgroundColor: inputBg },
                  pressed ? styles.bannerPressed : null,
                ]}
              >
                <Text style={[styles.bannerCtaText, { color: textPrimary }]}>
                  Ver convite
                </Text>
              </Pressable>
            </View>
          </SurfaceCard>
        </View>
      ) : null}

      {isModalVisible ? (
        <View style={styles.overlayHost} pointerEvents="box-none">
          <View style={styles.modalBackdrop} pointerEvents="box-none">
            {/* Backdrop: blocks interactions, but does NOT close on press */}
            <Pressable
              accessibilityRole="none"
              onPress={() => undefined}
              style={styles.backdropBlocker}
            />

            <SurfaceCard variant={variant} style={styles.modalCard}>
              <View style={styles.modalContent}>
                <Text style={[styles.modalTitle, { color: textPrimary }]}>
                  {inviteTerreiroTitle}
                </Text>

                {inviteRoleLabel ? (
                  <View style={styles.modalBadgeWrap}>
                    <Badge
                      label={inviteRoleLabel}
                      variant={variant}
                      appearance={
                        currentInvite?.role === "admin" ? "primary" : "secondary"
                      }
                      style={{ alignSelf: "center" }}
                    />
                  </View>
                ) : null}

                {inviteBodyCopy ? (
                  <View style={styles.modalBodyWrap}>
                    {inviteBodyCopy.split("\n\n").map((p, idx) => (
                      <Text
                        key={`${idx}:${p.slice(0, 16)}`}
                        style={[
                          styles.modalBody,
                          { color: textSecondary },
                          idx > 0 ? styles.modalBodyParagraph : null,
                        ]}
                      >
                        {p}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>

              {isProcessing ? (
                <View style={styles.processingRow}>
                  <ActivityIndicator />
                </View>
              ) : null}

              {actionError ? (
                <>
                  <Text style={[styles.modalError, { color: textSecondary }]}>
                    {actionError}
                  </Text>

                  {__DEV__ && debugInfo ? (
                    <Text
                      style={[
                        styles.modalDevDetails,
                        { color: textSecondary, opacity: 0.9 },
                      ]}
                    >
                      {`DEV details: step=${debugInfo.step}`}
                      {debugInfo.code ? `\ncode=${debugInfo.code}` : ""}
                      {debugInfo.message
                        ? `\nmessage=${debugInfo.message}`
                        : ""}
                      {debugInfo.details
                        ? `\ndetails=${debugInfo.details}`
                        : ""}
                      {debugInfo.hint ? `\nhint=${debugInfo.hint}` : ""}
                    </Text>
                  ) : null}
                </>
              ) : null}

              <View style={styles.modalButtons}>
                <View style={styles.modalPrimaryRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Aceitar convite"
                    disabled={isProcessing}
                    onPress={acceptInvite}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      styles.modalPrimaryBtn,
                      pressed ? styles.btnPressed : null,
                      isProcessing ? styles.btnDisabled : null,
                    ]}
                  >
                    <Text style={styles.primaryBtnText}>Aceitar</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Recusar convite"
                    disabled={isProcessing}
                    onPress={rejectInvite}
                    style={({ pressed }) => [
                      styles.secondaryBtn,
                      styles.modalPrimaryBtn,
                      { borderColor: inputBorder, backgroundColor: inputBg },
                      pressed ? styles.btnPressed : null,
                      isProcessing ? styles.btnDisabled : null,
                    ]}
                  >
                    <Text
                      style={[styles.secondaryBtnText, { color: textPrimary }]}
                    >
                      Recusar
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Decidir depois"
                  disabled={isProcessing}
                  onPress={decideLater}
                  style={({ pressed }) => [
                    styles.tertiaryBtn,
                    pressed ? styles.tertiaryBtnPressed : null,
                    isProcessing ? styles.btnDisabled : null,
                  ]}
                >
                  <Text
                    style={[styles.tertiaryBtnText, { color: textSecondary }]}
                  >
                    Decidir depois
                  </Text>
                </Pressable>
              </View>
            </SurfaceCard>
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  bannerHost: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  bannerCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    maxWidth: 720,
    width: "100%",
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  bannerCta: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerCtaText: {
    fontSize: 13,
    fontWeight: "900",
  },
  bannerPressed: {
    opacity: 0.92,
  },

  overlayHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlayBackdrop,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  backdropBlocker: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
  },
  modalContent: {
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },
  modalBadgeWrap: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBodyWrap: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    alignItems: "center",
  },
  modalLead: {
    fontSize: 13,
    fontWeight: "800",
    opacity: 0.92,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  infoBlock: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 420,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "900",
  },
  infoValue: {
    flex: 1,
    minWidth: 0,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "900",
  },
  modalBody: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.92,
    lineHeight: 17,
    textAlign: "center",
  },
  modalBodyParagraph: {
    marginTop: 6,
  },
  modalError: {
    marginTop: spacing.md,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    textAlign: "center",
    opacity: 0.95,
  },
  modalDevDetails: {
    marginTop: spacing.sm,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
    textAlign: "center",
  },
  modalButtons: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  modalPrimaryRow: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "center",
    gap: spacing.sm,
  },
  modalPrimaryBtn: {
    flex: 1,
  },
  processingRow: {
    marginTop: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.brass600,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.paper50,
  },
  secondaryBtn: {
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "900",
  },
  tertiaryBtn: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: radii.md,
  },
  tertiaryBtnPressed: {
    opacity: 0.82,
  },
  tertiaryBtnText: {
    fontSize: 13,
    fontWeight: "800",
    textDecorationLine: "underline",
    opacity: 0.72,
  },
  btnPressed: {
    opacity: 0.92,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
