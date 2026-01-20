import {
  getPontoAudioDurationMs,
  getPontoAudioPlaybackUrlPublic,
  tryPersistPontoAudioDurationMs,
} from "@/src/api/pontoAudio";
import { AudioProgressSlider } from "@/src/components/AudioProgressSlider";
import {
  markDurationAutoHealTried,
  shouldTryDurationAutoHeal,
} from "@/src/lib/audioDurationAutoHeal";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { PlayerPonto } from "../hooks/useCollectionPlayerData";
import { usePlayerAudio } from "../hooks/usePlayerAudio";

export type PlayerAudioState =
  | "NO_AUDIO"
  | "AUDIO_IN_REVIEW"
  | "AUDIO_APPROVED";

export function AudioPlayerFooter(props: {
  ponto: PlayerPonto | null;
  variant: "light" | "dark";
  curimbaEnabled?: boolean;
  audioState: PlayerAudioState;
  approvedPontoAudioId: string | null;
  onOpenNoAudioModal: () => void;
  onOpenAudioInReviewModal: () => void;
}) {
  const { ponto, variant } = props;
  const curimbaEnabled = props.curimbaEnabled === true;
  const audioState = props.audioState;
  const approvedPontoAudioId = props.approvedPontoAudioId;

  const noAutoRetryStatusRef = useRef<number | null>(null);
  const approvedPontoAudioIdRef = useRef<string | null>(null);

  const [backendDurationMs, setBackendDurationMs] = useState(0);
  const lastLoggedLoadedForIdRef = useRef<string | null>(null);

  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackExpiresAtMs, setPlaybackExpiresAtMs] = useState<number | null>(
    null,
  );
  const playbackUrlRef = useRef<string | null>(null);
  const playbackExpiresAtMsRef = useRef<number | null>(null);
  const [autoplayNonce, setAutoplayNonce] = useState(0);
  const [isResolvingUrl, setIsResolvingUrl] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const renewalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactiveRefreshRef = useRef(0);

  useEffect(() => {
    playbackUrlRef.current = playbackUrl;
    playbackExpiresAtMsRef.current = playbackExpiresAtMs;
  }, [playbackExpiresAtMs, playbackUrl]);

  useEffect(() => {
    approvedPontoAudioIdRef.current = approvedPontoAudioId;
  }, [approvedPontoAudioId]);

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  // Keep play/pause outline thickness consistent across themes.
  const tagOutlineWidth = 2;

  // Botão principal dourado (sem implementar áudio)
  const accent = variant === "light" ? colors.brass500 : colors.brass600;
  const borderColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;
  const bg = variant === "light" ? colors.paper200 : colors.surfaceCardBg;

  const canPlay = audioState === "AUDIO_APPROVED" && !!approvedPontoAudioId;
  const showProgress = canPlay && !curimbaEnabled;

  const ensurePlaybackUrl = useCallback(
    async (options?: { force?: boolean; source?: "auto" | "user" }) => {
      if (audioState !== "AUDIO_APPROVED") return;
      if (!approvedPontoAudioId) return;
      if (curimbaEnabled) return;

      const requestedPontoAudioId = approvedPontoAudioId;

      const source = options?.source ?? "auto";
      if (
        source === "auto" &&
        (noAutoRetryStatusRef.current === 401 ||
          noAutoRetryStatusRef.current === 403 ||
          noAutoRetryStatusRef.current === 404)
      ) {
        return;
      }

      const force = options?.force === true;

      if (
        !force &&
        playbackUrlRef.current &&
        typeof playbackExpiresAtMsRef.current === "number" &&
        Date.now() < playbackExpiresAtMsRef.current - 20_000
      ) {
        return;
      }

      setIsResolvingUrl(true);
      try {
        const res = await getPontoAudioPlaybackUrlPublic(requestedPontoAudioId);

        // Ignore late arrivals after the user changed tracks.
        if (approvedPontoAudioIdRef.current !== requestedPontoAudioId) return;

        const nextUrl = res.url;
        const nextExpiresAt = Date.now() + res.expiresIn * 1000;

        if (__DEV__) {
          let urlHost: string | null = null;
          let pathname: string | null = null;
          let queryLength: number | null = null;
          try {
            const u = new URL(nextUrl);
            urlHost = u.host;
            pathname = u.pathname;
            queryLength = u.search ? u.search.length : 0;
          } catch {
            urlHost = null;
            pathname = null;
            queryLength = null;
          }

          console.log("[PLAYER][PUBLIC][PLAYBACK_URL]", {
            ponto_audio_id: requestedPontoAudioId,
            url_host: urlHost,
            pathname,
            query_length: queryLength,
            expires_in_s: res.expiresIn,
          });
        }

        playbackUrlRef.current = nextUrl;
        playbackExpiresAtMsRef.current = nextExpiresAt;
        setPlaybackUrl(nextUrl);
        setPlaybackExpiresAtMs(nextExpiresAt);
      } catch (e) {
        const status =
          typeof (e as any)?.status === "number" ? (e as any).status : null;
        if (status === 401 || status === 403 || status === 404) {
          noAutoRetryStatusRef.current = status;
        }
        throw e;
      } finally {
        setIsResolvingUrl(false);
      }
    },
    [audioState, approvedPontoAudioId, curimbaEnabled],
  );

  // Best-effort: fetch stored duration_ms so UI can show total time immediately.
  useEffect(() => {
    setBackendDurationMs(0);

    if (curimbaEnabled) return;
    if (audioState !== "AUDIO_APPROVED") return;
    if (!approvedPontoAudioId) return;

    let cancelled = false;
    const requestedId = approvedPontoAudioId;

    void (async () => {
      const duration = await getPontoAudioDurationMs(requestedId);
      if (cancelled) return;
      if (approvedPontoAudioIdRef.current !== requestedId) return;

      const next =
        typeof duration === "number" && Number.isFinite(duration)
          ? Math.max(0, Math.round(duration))
          : 0;

      if (next > 0) {
        setBackendDurationMs(next);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [approvedPontoAudioId, audioState, curimbaEnabled]);

  // Reset when changing track / audio row
  useEffect(() => {
    setPlaybackUrl(null);
    setPlaybackExpiresAtMs(null);
    reactiveRefreshRef.current = 0;
    setIsBusy(false);
    lastLoggedLoadedForIdRef.current = null;
    if (renewalTimerRef.current) {
      clearTimeout(renewalTimerRef.current);
      renewalTimerRef.current = null;
    }

    if (
      audioState === "AUDIO_APPROVED" &&
      approvedPontoAudioId &&
      !curimbaEnabled
    ) {
      setIsBusy(true);
      setAutoplayNonce((n) => n + 1);
      void ensurePlaybackUrl({ force: true, source: "auto" }).catch(() => {
        setIsBusy(false);
      });
    }
  }, [approvedPontoAudioId, audioState, curimbaEnabled, ensurePlaybackUrl]);

  const player = usePlayerAudio({
    audioUrl: playbackUrl,
    blocked: curimbaEnabled,
  });

  const uiDurationMs = useMemo(() => {
    const loadedDuration =
      typeof player.durationMillis === "number" &&
      Number.isFinite(player.durationMillis)
        ? Math.max(0, Math.round(player.durationMillis))
        : 0;

    if (loadedDuration > 0) return loadedDuration;
    return backendDurationMs > 0 ? backendDurationMs : 0;
  }, [backendDurationMs, player.durationMillis]);

  const canSeek =
    !curimbaEnabled &&
    audioState === "AUDIO_APPROVED" &&
    !!approvedPontoAudioId &&
    player.isLoaded &&
    (typeof player.durationMillis === "number"
      ? player.durationMillis > 0
      : false);

  // Log once when loaded duration becomes available (per track).
  useEffect(() => {
    if (audioState !== "AUDIO_APPROVED") return;
    if (!approvedPontoAudioId) return;
    if (!player.isLoaded) return;
    if (!(player.durationMillis > 0)) return;

    if (lastLoggedLoadedForIdRef.current === approvedPontoAudioId) return;
    lastLoggedLoadedForIdRef.current = approvedPontoAudioId;

    if (__DEV__) {
      console.log("[PLAYER][PUBLIC][AUDIO_LOADED]", {
        ponto_audio_id: approvedPontoAudioId,
        duration_ms: Math.round(player.durationMillis),
      });
    }
  }, [
    approvedPontoAudioId,
    audioState,
    player.durationMillis,
    player.isLoaded,
  ]);

  // Auto-heal (best effort): if DB duration_ms is missing/invalid for approved audio,
  // persist durationMillis once per ponto_audio_id per app session.
  useEffect(() => {
    if (curimbaEnabled) return;
    if (audioState !== "AUDIO_APPROVED") return;
    if (!approvedPontoAudioId) return;

    // Only heal if backend duration looks missing/invalid.
    if (backendDurationMs > 0) return;

    if (!player.isLoaded) return;
    if (!(player.durationMillis > 0)) return;

    const requestedId = approvedPontoAudioId;
    if (!shouldTryDurationAutoHeal(requestedId)) return;
    markDurationAutoHealTried(requestedId);

    let cancelled = false;
    void (async () => {
      try {
        const durationMs = Math.round(player.durationMillis);

        if (__DEV__) {
          console.log("[PLAYER][PUBLIC][DURATION_AUTOHEAL_TRY]", {
            ponto_audio_id: requestedId,
            duration_ms: durationMs,
          });
        }

        const res = await tryPersistPontoAudioDurationMs({
          pontoAudioId: requestedId,
          durationMs,
        });

        if (cancelled) return;
        if (approvedPontoAudioIdRef.current !== requestedId) return;

        if (__DEV__) {
          console.log("[PLAYER][PUBLIC][DURATION_AUTOHEAL_RESULT]", {
            ponto_audio_id: requestedId,
            ok: res.ok,
            status: res.status,
          });
        }
      } catch (e) {
        if (__DEV__) {
          console.log("[PLAYER][PUBLIC][DURATION_AUTOHEAL_ERR]", {
            ponto_audio_id: requestedId,
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    approvedPontoAudioId,
    audioState,
    backendDurationMs,
    curimbaEnabled,
    player.durationMillis,
    player.isLoaded,
  ]);

  // Autoplay: keep spinner until loaded, then start playing once.
  useEffect(() => {
    if (autoplayNonce <= 0) return;
    if (curimbaEnabled) {
      setIsBusy(false);
      return;
    }
    if (audioState !== "AUDIO_APPROVED" || !approvedPontoAudioId) {
      setIsBusy(false);
      return;
    }
    if (!playbackUrl) return;
    if (!player.hasAudio) return;
    if (!player.isLoaded) return;
    if (player.isPlaying) {
      setIsBusy(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        await player.togglePlayPause();
      } finally {
        if (!cancelled) setIsBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    approvedPontoAudioId,
    audioState,
    autoplayNonce,
    curimbaEnabled,
    playbackUrl,
    player.hasAudio,
    player.isLoaded,
    player.isPlaying,
    player.togglePlayPause,
  ]);

  // Proactive renewal (avoid touching while playing; renew next chance)
  useEffect(() => {
    if (renewalTimerRef.current) {
      clearTimeout(renewalTimerRef.current);
      renewalTimerRef.current = null;
    }

    if (audioState !== "AUDIO_APPROVED") return;
    if (!approvedPontoAudioId) return;
    if (curimbaEnabled) return;
    if (!playbackExpiresAtMs) return;

    const delay = Math.max(0, playbackExpiresAtMs - Date.now() - 20_000);
    renewalTimerRef.current = setTimeout(() => {
      if (player.isPlaying) return;
      void ensurePlaybackUrl({ force: true, source: "auto" }).catch(() => null);
    }, delay);

    return () => {
      if (renewalTimerRef.current) {
        clearTimeout(renewalTimerRef.current);
        renewalTimerRef.current = null;
      }
    };
  }, [
    audioState,
    approvedPontoAudioId,
    curimbaEnabled,
    ensurePlaybackUrl,
    playbackExpiresAtMs,
    player.isPlaying,
  ]);

  // Reactive refresh: if playback errors, refresh URL once
  useEffect(() => {
    if (!player.error) return;
    if (audioState !== "AUDIO_APPROVED") return;
    if (!approvedPontoAudioId) return;
    if (curimbaEnabled) return;

    if (reactiveRefreshRef.current >= 1) return;
    reactiveRefreshRef.current += 1;
    void ensurePlaybackUrl({ force: true, source: "auto" }).catch(() => null);
  }, [
    audioState,
    approvedPontoAudioId,
    curimbaEnabled,
    ensurePlaybackUrl,
    player.error,
  ]);

  const subtitle = useMemo(() => {
    if (curimbaEnabled) return "Modo Curimba: apenas letra";
    if (audioState === "AUDIO_IN_REVIEW") return "Áudio em revisão. Em breve.";
    if (audioState === "NO_AUDIO") return "Sem áudio";
    if (isResolvingUrl) return "Carregando áudio…";
    return "Áudio";
  }, [audioState, curimbaEnabled, isResolvingUrl]);

  const metaLine = useMemo(() => {
    const authorNameRaw = (ponto as any)?.author_name;
    const authorName =
      typeof authorNameRaw === "string" ? authorNameRaw.trim() : "";

    const parts: string[] = [];
    if (authorName) parts.push(`Autor: ${authorName}`);
    return parts.length > 0 ? parts.join(" • ") : null;
  }, [ponto]);

  return (
    <View style={[styles.wrap, { borderColor, backgroundColor: bg }]}>
      <View style={styles.row}>
        <View style={styles.meta}>
          <Text
            style={[styles.nowPlaying, { color: textSecondary }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
          <Text
            style={[styles.title, { color: textPrimary }]}
            numberOfLines={1}
          >
            {ponto?.title ?? ""}
          </Text>
          {metaLine ? (
            <Text
              style={[styles.metaLine, { color: textSecondary }]}
              numberOfLines={1}
            >
              {metaLine}
            </Text>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={player.isPlaying ? "Pausar" : "Tocar"}
          disabled={isBusy || isResolvingUrl}
          onPress={async () => {
            // Prevent multiple simultaneous clicks
            if (isBusy || isResolvingUrl) return;

            if (curimbaEnabled) {
              Alert.alert(
                "Modo Curimba ativo",
                "O áudio fica desativado enquanto o Modo Curimba estiver ativo.",
              );
              return;
            }

            if (audioState === "AUDIO_IN_REVIEW") {
              props.onOpenAudioInReviewModal();
              return;
            }

            if (audioState === "NO_AUDIO") {
              props.onOpenNoAudioModal();
              return;
            }

            if (!approvedPontoAudioId) {
              props.onOpenNoAudioModal();
              return;
            }

            setIsBusy(true);
            try {
              // If already playing, just pause
              if (player.isPlaying) {
                await player.togglePlayPause();
                return;
              }

              // Ensure we have a valid URL before attempting to play
              await ensurePlaybackUrl({ force: false, source: "user" });

              // Wait a bit for the player to load the new URL
              await new Promise((resolve) => setTimeout(resolve, 100));

              // Now toggle play
              await player.togglePlayPause();
            } catch (e) {
              const msg =
                e instanceof Error && e.message
                  ? e.message
                  : "Não foi possível tocar o áudio.";
              Alert.alert("Erro no áudio", msg);
            } finally {
              setIsBusy(false);
            }
          }}
          style={({ pressed }) => [
            styles.playBtn,
            { borderColor: accent, borderWidth: tagOutlineWidth },
            (curimbaEnabled || !canPlay || isBusy || isResolvingUrl) &&
              styles.playBtnDisabled,
            pressed && styles.playBtnPressed,
          ]}
        >
          {isResolvingUrl || isBusy ? (
            <ActivityIndicator color={accent} />
          ) : (
            <Ionicons
              name={player.isPlaying ? "pause" : "play"}
              size={20}
              color={accent}
            />
          )}
        </Pressable>
      </View>

      {showProgress ? (
        <AudioProgressSlider
          variant={variant}
          positionMillis={player.positionMillis}
          durationMillis={uiDurationMs}
          disabled={!canSeek}
          accentColor={accent}
          trackBorderColor={borderColor}
          onSeek={(ms) => player.seekTo(ms)}
        />
      ) : null}
    </View>
  );
}

const FOOTER_HEIGHT = 132;
export const AUDIO_FOOTER_HEIGHT = FOOTER_HEIGHT;

const styles = StyleSheet.create({
  wrap: {
    height: FOOTER_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  nowPlaying: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: "800",
  },
  metaLine: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.92,
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtnPressed: {
    opacity: 0.7,
  },
  playBtnDisabled: {
    opacity: 0.55,
  },
});
