import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AppState,
  BackHandler,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { upsertTerreiroMemberActive } from "@/src/hooks/terreiroMembership";
import { colors, radii, spacing } from "@/src/theme";

type InviteRole = "admin" | "editor" | "member";

type TerreiroInvite = {
  id: string;
  terreiro_id: string;
  email: string;
  role: InviteRole;
  created_at: string;
};

function isRlsRecursionError(message: string) {
  const m = String(message ?? "");
  return (
    m.includes("infinite recursion detected in policy") &&
    m.includes('relation "terreiro_members"')
  );
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function InviteGate() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { effectiveTheme } = usePreferences();

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

  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const realtimeInviteIdRef = useRef<string | null>(null);

  const pendingInvitesRef = useRef<TerreiroInvite[]>([]);

  const appStateRef = useRef(AppState.currentState);
  const lastFetchAtRef = useRef<number>(0);
  const inFlightRef = useRef<Promise<TerreiroInvite[]> | null>(null);

  const rlsRecursionDetectedRef = useRef(false);
  const rlsRecursionNotifiedRef = useRef(false);

  const priorityInviteIdRef = useRef<string | null>(null);

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

  const refreshPendingInvites = useCallback(
    async (options?: { skipCache?: boolean }) => {
      if (!userId) return [] as TerreiroInvite[];
      if (!normalizedUserEmail) return [] as TerreiroInvite[];

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
        const res = await supabase
          .from("terreiro_invites")
          .select("id, terreiro_id, email, role, created_at")
          .eq("status", "pending")
          .eq("email", normalizedUserEmail)
          .order("created_at", { ascending: true });

        if (res.error) {
          if (isRlsRecursionError(res.error.message)) {
            rlsRecursionDetectedRef.current = true;

            // Keep app usable: don't block user, just disable invite gate until policies are fixed.
            setPendingInvites([]);
            setCurrentInvite(null);
            setIsModalVisible(false);
            setIsBannerVisible(false);
            lastFetchAtRef.current = Date.now();

            if (__DEV__ && !rlsRecursionNotifiedRef.current) {
              rlsRecursionNotifiedRef.current = true;
              showToast(
                "Convites indisponíveis (RLS em 'terreiro_members' com recursão). Ajuste as policies no Supabase."
              );
            }

            return [] as TerreiroInvite[];
          }

          if (__DEV__) {
            console.info("[InviteGate] refresh error", {
              message: res.error.message,
            });
          }
          throw new Error(res.error.message);
        }

        const list = (res.data ?? []) as TerreiroInvite[];

        const priorityId = priorityInviteIdRef.current;
        const next = !priorityId
          ? list
          : (() => {
              const idx = list.findIndex((i) => i.id === priorityId);
              if (idx < 0) return list;
              const head = list[idx];
              const rest = list.filter((i) => i.id !== priorityId);
              return [head, ...rest];
            })();

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
    [normalizedUserEmail, showToast, userId]
  );

  const ensureModalForQueue = useCallback((queue: TerreiroInvite[]) => {
    if (!queue.length) {
      setCurrentInvite(null);
      setIsModalVisible(false);
      setIsProcessing(false);
      setActionError(null);
      priorityInviteIdRef.current = null;
      return;
    }

    const first = queue[0];
    setCurrentInvite(first);
    setIsModalVisible(true);
    setActionError(null);
    setIsProcessing(false);

    // If we opened due to a priority invite, clear it after it becomes current.
    if (priorityInviteIdRef.current === first.id) {
      priorityInviteIdRef.current = null;
    }
  }, []);

  const openGateNow = useCallback(async () => {
    try {
      const list = await refreshPendingInvites({ skipCache: true });
      ensureModalForQueue(list);
      setIsBannerVisible(false);
    } catch {
      // If refresh fails here, we still keep the app usable.
    }
  }, [ensureModalForQueue, refreshPendingInvites]);

  // Startup refresh (immediate gate if pending).
  useEffect(() => {
    if (!userId || !normalizedUserEmail) {
      setPendingInvites([]);
      setCurrentInvite(null);
      setIsModalVisible(false);
      setIsBannerVisible(false);
      realtimeInviteIdRef.current = null;
      return;
    }

    (async () => {
      try {
        const list = await refreshPendingInvites({ skipCache: true });
        ensureModalForQueue(list);
      } catch {
        // ignore
      }
    })();
  }, [ensureModalForQueue, normalizedUserEmail, refreshPendingInvites, userId]);

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
            ensureModalForQueue(list);
          } catch {
            // ignore
          }
        })();
      }
    });

    return () => sub.remove();
  }, [ensureModalForQueue, normalizedUserEmail, refreshPendingInvites, userId]);

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

          if (appStateRef.current === "active") {
            setIsBannerVisible(true);
          }

          // Keep local queue updated (best-effort). We don't open the modal
          // automatically here to avoid interrupting mid-action.
          const nextInvite: TerreiroInvite | null =
            typeof row?.id === "string" &&
            typeof row?.terreiro_id === "string" &&
            typeof row?.created_at === "string" &&
            (row?.role === "admin" ||
              row?.role === "editor" ||
              row?.role === "member")
              ? {
                  id: row.id,
                  terreiro_id: row.terreiro_id,
                  created_at: row.created_at,
                  role: row.role,
                  email: email,
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

    try {
      await upsertTerreiroMemberActive({
        terreiroId: currentInvite.terreiro_id,
        userId,
        role: currentInvite.role,
      });

      const upd = await supabase
        .from("terreiro_invites")
        .update({ status: "accepted" })
        .eq("id", currentInvite.id);

      if (upd.error) {
        throw new Error(upd.error.message);
      }

      showToast("Convite aceito. Você já pode colaborar.");

      const list = await refreshPendingInvites({ skipCache: true });
      ensureModalForQueue(list);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (__DEV__ && isRlsRecursionError(message)) {
        showToast(
          "Não foi possível aceitar o convite: policy RLS em 'terreiro_members' está em recursão."
        );
      }
      setActionError(
        "Não foi possível concluir agora. Verifique sua conexão e tente novamente."
      );
      setIsProcessing(false);
      return;
    }
  }, [
    currentInvite,
    ensureModalForQueue,
    refreshPendingInvites,
    showToast,
    userId,
  ]);

  const rejectInvite = useCallback(async () => {
    if (!currentInvite) return;

    setIsProcessing(true);
    setActionError(null);

    try {
      const upd = await supabase
        .from("terreiro_invites")
        .update({ status: "rejected" })
        .eq("id", currentInvite.id);

      if (upd.error) {
        throw new Error(upd.error.message);
      }

      showToast("Convite recusado.");

      const list = await refreshPendingInvites({ skipCache: true });
      ensureModalForQueue(list);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (__DEV__ && isRlsRecursionError(message)) {
        showToast(
          "Não foi possível recusar o convite: policy RLS em 'terreiro_members' está em recursão."
        );
      }
      setActionError(
        "Não foi possível concluir agora. Verifique sua conexão e tente novamente."
      );
      setIsProcessing(false);
      return;
    }
  }, [currentInvite, ensureModalForQueue, refreshPendingInvites, showToast]);

  const bannerText = useMemo(
    () => "Você recebeu um convite para colaborar em um terreiro",
    []
  );

  const modalTitle = useMemo(
    () => "Você foi convidada para colaborar em um terreiro",
    []
  );

  const modalBody = useMemo(
    () =>
      "Você recebeu um convite para ajudar a cuidar dos pontos de um terreiro no Saravafy.\nEscolha agora se deseja participar.",
    []
  );

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

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          // Block close via Android back; BackHandler already intercepts.
        }}
      >
        <View style={styles.modalBackdrop}>
          <SurfaceCard variant={variant} style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: textPrimary }]}>
              {modalTitle}
            </Text>

            <Text style={[styles.modalBody, { color: textSecondary }]}>
              {modalBody}
            </Text>

            {actionError ? (
              <Text style={[styles.modalError, { color: textSecondary }]}>
                {actionError}
              </Text>
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
                <Text style={[styles.secondaryBtnText, { color: textPrimary }]}>
                  Recusar convite
                </Text>
              </Pressable>
            </View>
          </SurfaceCard>
        </View>
      </Modal>
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

  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlayBackdrop,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
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
  modalError: {
    marginTop: spacing.md,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    textAlign: "center",
    opacity: 0.95,
  },
  modalButtons: {
    marginTop: spacing.lg,
    gap: spacing.md,
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
