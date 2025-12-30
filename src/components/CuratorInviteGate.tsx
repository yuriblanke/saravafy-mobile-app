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
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { getGlobalRoleBadgeLabel } from "@/src/domain/globalRoles";
import { useIsCurator } from "@/src/hooks/useIsCurator";
import { queryKeys } from "@/src/queries/queryKeys";
import { colors, radii, spacing } from "@/src/theme";
import { useQueryClient } from "@tanstack/react-query";
import { useRootNavigationState, useSegments } from "expo-router";

type CuratorInvite = {
  id: string;
  email: string;
  status: string;
  created_at: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getFriendlyActionError(message: string) {
  const m = String(message ?? "").toLowerCase();
  if (!m) {
    return "Não foi possível concluir agora. Verifique sua conexão e tente novamente.";
  }

  if (
    m.includes("failed to fetch") ||
    m.includes("network") ||
    m.includes("timeout") ||
    m.includes("fetch")
  ) {
    return "Sem conexão no momento. Verifique sua internet e tente novamente.";
  }

  if (
    m.includes("permission") ||
    m.includes("not authorized") ||
    m.includes("row-level") ||
    m.includes("rls")
  ) {
    return "Você não tem permissão para concluir este convite agora.";
  }

  return "Não foi possível concluir agora. Verifique sua conexão e tente novamente.";
}

export function CuratorInviteGate() {
  const { user } = useAuth();
  const { effectiveTheme } = usePreferences();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { terreiroGateActive } = useInviteGates();

  const segments = useSegments();
  const rootNavState = useRootNavigationState();
  const isNavReady = !!rootNavState?.key;
  const isAppReady = isNavReady && segments[0] === "(app)";

  const variant = effectiveTheme;
  const userId = user?.id ?? null;
  const userEmail = typeof user?.email === "string" ? user.email : null;
  const normalizedUserEmail = userEmail ? normalizeEmail(userEmail) : null;

  const { isCurator } = useIsCurator();

  const [currentInvite, setCurrentInvite] = useState<CuratorInvite | null>(
    null
  );
  const currentInviteRef = useRef<CuratorInvite | null>(null);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shouldOpenModalWhenReady, setShouldOpenModalWhenReady] =
    useState(false);

  const lastFetchAtRef = useRef<number>(0);
  const inFlightRef = useRef<Promise<CuratorInvite | null> | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const lastRealtimeKeyRef = useRef<string | null>(null);

  const pendingInviteQueryKey = useMemo(() => {
    return normalizedUserEmail
      ? queryKeys.curatorInvites.pendingForInvitee(normalizedUserEmail)
      : (["curatorInvites", "pendingForInvitee", null] as const);
  }, [normalizedUserEmail]);

  const devMasterPendingPrefixKey = useMemo(() => {
    return queryKeys.curatorInvites.pendingPrefix();
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

  const roleLabel = useMemo(() => getGlobalRoleBadgeLabel("curator"), []);

  useEffect(() => {
    currentInviteRef.current = currentInvite;
  }, [currentInvite]);

  const refreshPendingInvite = useCallback(
    async (options?: { skipCache?: boolean }) => {
      if (!userId) return null;
      if (!normalizedUserEmail) return null;
      if (terreiroGateActive) return null;
      if (isCurator) return null;

      const now = Date.now();
      const cacheWindowMs = 12_000;

      if (!options?.skipCache) {
        if (now - lastFetchAtRef.current < cacheWindowMs) {
          return currentInviteRef.current;
        }
      }

      if (inFlightRef.current) return inFlightRef.current;

      const run = (async () => {
        const res: any = await supabase
          .from("curator_invites")
          .select("id, email, status, created_at")
          .eq("status", "pending")
          .eq("email", normalizedUserEmail)
          .order("created_at", { ascending: true })
          .limit(1);

        if (res.error) {
          if (__DEV__) {
            console.warn("[CuratorInviteGate] refresh error", res.error);
          }
          return null;
        }

        const row =
          Array.isArray(res.data) && res.data.length ? res.data[0] : null;
        if (!row) return null;

        const invite: CuratorInvite = {
          id: String(row.id ?? ""),
          email: String(row.email ?? ""),
          status: String(row.status ?? ""),
          created_at: String(row.created_at ?? ""),
        };

        return invite.id ? invite : null;
      })();

      inFlightRef.current = run;
      try {
        const next = await run;
        lastFetchAtRef.current = Date.now();
        setCurrentInvite(next);
        return next;
      } finally {
        inFlightRef.current = null;
      }
    },
    [isCurator, normalizedUserEmail, terreiroGateActive, userId]
  );

  useEffect(() => {
    if (!shouldOpenModalWhenReady) return;
    if (!isAppReady) return;
    if (!currentInvite) {
      setShouldOpenModalWhenReady(false);
      return;
    }

    const t = setTimeout(() => {
      setIsModalVisible(true);
      setShouldOpenModalWhenReady(false);
    }, 0);

    return () => clearTimeout(t);
  }, [currentInvite, isAppReady, shouldOpenModalWhenReady]);

  const openGateNow = useCallback(async () => {
    try {
      const invite = await refreshPendingInvite({ skipCache: true });
      if (!invite) {
        setIsBannerVisible(false);
        setIsModalVisible(false);
        return;
      }

      setIsBannerVisible(false);

      if (!isAppReady) {
        setIsModalVisible(false);
        setShouldOpenModalWhenReady(true);
        return;
      }

      setIsModalVisible(true);
    } catch {
      // fail-open
    }
  }, [isAppReady, refreshPendingInvite]);

  useEffect(() => {
    if (!userId || !normalizedUserEmail) {
      setCurrentInvite(null);
      setIsBannerVisible(false);
      setIsModalVisible(false);
      setShouldOpenModalWhenReady(false);
      return;
    }

    if (terreiroGateActive) {
      setIsBannerVisible(false);
      setIsModalVisible(false);
      setShouldOpenModalWhenReady(false);
      return;
    }

    (async () => {
      try {
        const invite = await refreshPendingInvite({ skipCache: true });
        if (invite) {
          if (!isAppReady) {
            setShouldOpenModalWhenReady(true);
          } else {
            setIsModalVisible(true);
          }
        } else {
          setIsBannerVisible(false);
          setIsModalVisible(false);
        }
      } catch {
        // ignore
      }
    })();
  }, [
    isAppReady,
    normalizedUserEmail,
    refreshPendingInvite,
    terreiroGateActive,
    userId,
  ]);

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
          if (terreiroGateActive) return;
          try {
            const invite = await refreshPendingInvite({ skipCache: true });
            if (invite) {
              setIsBannerVisible(true);
            }
          } catch {
            // ignore
          }
        })();
      }
    });

    return () => sub.remove();
  }, [normalizedUserEmail, refreshPendingInvite, terreiroGateActive, userId]);

  useEffect(() => {
    if (!normalizedUserEmail) return;

    const handleRow = (row: any) => {
      if (terreiroGateActive) return;

      const emailRaw = typeof row?.email === "string" ? row.email : "";
      const statusRaw = typeof row?.status === "string" ? row.status : "";
      const inviteId = typeof row?.id === "string" ? row.id : null;
      const createdAt =
        typeof row?.created_at === "string" ? row.created_at : null;

      if (!emailRaw) return;

      const email = normalizeEmail(emailRaw);
      if (email !== normalizedUserEmail) return;

      const realtimeKey = inviteId ? `${inviteId}:${statusRaw}` : null;
      if (realtimeKey && lastRealtimeKeyRef.current === realtimeKey) return;
      if (realtimeKey) lastRealtimeKeyRef.current = realtimeKey;

      // Status changed away from pending -> close immediately.
      if (statusRaw && statusRaw !== "pending") {
        setIsBannerVisible(false);
        setIsModalVisible(false);
        setShouldOpenModalWhenReady(false);

        if (inviteId && currentInviteRef.current?.id === inviteId) {
          setCurrentInvite(null);
        }

        return;
      }

      // Status became pending -> show banner (no auto-open).
      if (inviteId && createdAt) {
        const prev = currentInviteRef.current;
        const shouldSet =
          !prev || prev.id !== inviteId || prev.status !== (statusRaw || "pending");

        if (shouldSet) {
          setCurrentInvite({
            id: inviteId,
            email,
            status: statusRaw || "pending",
            created_at: createdAt,
          });
        }
      }

      if (appStateRef.current === "active") {
        setIsBannerVisible(true);
      }
    };

    const channel = supabase
      .channel("invite-gate:curator_invites")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "curator_invites" },
        (payload) => {
          handleRow(payload.new as any);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "curator_invites" },
        (payload) => {
          handleRow(payload.new as any);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [normalizedUserEmail, terreiroGateActive]);

  const acceptInvite = useCallback(async () => {
    if (!currentInvite) return;

    setIsProcessing(true);
    try {
      const res: any = await supabase.rpc("accept_curator_invite", {
        invite_id: currentInvite.id,
      });

      if (res.error) {
        throw new Error(res.error.message);
      }

      setIsModalVisible(false);
      setIsBannerVisible(false);
      setCurrentInvite(null);
      setShouldOpenModalWhenReady(false);

      // Explicit invalidations (avoid waiting for realtime)
      queryClient.invalidateQueries({ queryKey: pendingInviteQueryKey, exact: true });
      queryClient.invalidateQueries({
        queryKey: devMasterPendingPrefixKey,
        exact: false,
      });

      if (userId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.globalRoles.isCurator(userId),
        });
      }

      showToast(`Agora você é ${roleLabel}.`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      const friendly = getFriendlyActionError(message);
      showToast(friendly);
    } finally {
      setIsProcessing(false);
    }
  }, [
    currentInvite,
    devMasterPendingPrefixKey,
    pendingInviteQueryKey,
    queryClient,
    roleLabel,
    showToast,
    userId,
  ]);

  const rejectInvite = useCallback(async () => {
    if (!currentInvite) return;

    setIsProcessing(true);
    try {
      const res: any = await supabase.rpc("reject_curator_invite", {
        invite_id: currentInvite.id,
      });

      if (res.error) {
        throw new Error(res.error.message);
      }

      setIsModalVisible(false);
      setIsBannerVisible(false);
      setCurrentInvite(null);
      setShouldOpenModalWhenReady(false);

      // Explicit invalidations
      queryClient.invalidateQueries({ queryKey: pendingInviteQueryKey, exact: true });
      queryClient.invalidateQueries({
        queryKey: devMasterPendingPrefixKey,
        exact: false,
      });

      if (userId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.globalRoles.isCurator(userId),
        });
      }

      showToast("Convite recusado.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      const friendly = getFriendlyActionError(message);
      showToast(friendly);
    } finally {
      setIsProcessing(false);
    }
  }, [
    currentInvite,
    devMasterPendingPrefixKey,
    pendingInviteQueryKey,
    queryClient,
    showToast,
    userId,
  ]);

  const onPressBannerCta = useCallback(() => {
    void openGateNow();
  }, [openGateNow]);

  const bannerText = useMemo(() => {
    return `Convite para: ${roleLabel}`;
  }, [roleLabel]);

  const modalLead = useMemo(() => {
    return "Você recebeu um convite para ajudar a manter a qualidade do acervo:";
  }, []);

  if (!userId || !normalizedUserEmail) return null;
  if (terreiroGateActive) return null;
  if (isCurator) return null;

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

      {isModalVisible && currentInvite ? (
        <View style={styles.overlayHost} pointerEvents="box-none">
          <View style={styles.modalBackdrop} pointerEvents="box-none">
            <Pressable
              accessibilityRole="none"
              onPress={() => undefined}
              style={styles.backdropBlocker}
            />

            <SurfaceCard variant={variant} style={styles.modalCard}>
              <Text style={[styles.modalBody, { color: textSecondary }]}>
                {modalLead}
              </Text>

              <Text style={[styles.modalTitle, { color: textPrimary }]}>
                {roleLabel}
              </Text>

              {isProcessing ? (
                <View style={styles.processingRow}>
                  <ActivityIndicator />
                </View>
              ) : null}

              <View style={styles.modalButtons}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Aceitar convite"
                  disabled={isProcessing}
                  onPress={acceptInvite}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed ? styles.btnPressed : null,
                    isProcessing ? styles.btnDisabled : null,
                  ]}
                >
                  <Text style={styles.primaryBtnText}>Aceitar convite</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Recusar convite"
                  disabled={isProcessing}
                  onPress={rejectInvite}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    { borderColor: inputBorder, backgroundColor: inputBg },
                    pressed ? styles.btnPressed : null,
                    isProcessing ? styles.btnDisabled : null,
                  ]}
                >
                  <Text
                    style={[styles.secondaryBtnText, { color: textPrimary }]}
                  >
                    Recusar convite
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
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  modalBody: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.92,
    lineHeight: 18,
    textAlign: "center",
  },
  modalButtons: {
    marginTop: spacing.lg,
    gap: spacing.md,
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
  btnPressed: {
    opacity: 0.92,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
