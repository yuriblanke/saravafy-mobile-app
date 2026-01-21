import {
  getPontoAudioDurationMs,
  tryPersistPontoAudioDurationMs,
} from "@/src/api/pontoAudio";
import {
  getCurrentPontoId,
  loadAndPlay,
  pause as rntpPause,
  seekToSeconds,
  togglePlayPause,
  useRntpPlayback,
} from "@/src/audio/rntpService";
import { AudioProgressSlider } from "@/src/components/AudioProgressSlider";
import {
  markDurationAutoHealTried,
  shouldTryDurationAutoHeal,
} from "@/src/lib/audioDurationAutoHeal";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { PlayerPonto } from "../hooks/useCollectionPlayerData";

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

  const approvedPontoAudioIdRef = useRef<string | null>(null);
  const lastAutoplayForIdRef = useRef<string | null>(null);

  const [backendDurationMs, setBackendDurationMs] = useState(0);
  const lastLoggedLoadedForIdRef = useRef<string | null>(null);

  const rntp = useRntpPlayback(250);

  const isBusy = rntp.isLoading;
  const isPlaying = rntp.isPlaying;

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

  // If Modo Curimba is enabled while audio is playing, pause it.
  useEffect(() => {
    if (!curimbaEnabled) return;
    void rntpPause().catch(() => null);
  }, [curimbaEnabled]);

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

  // Reset some UI refs when changing track.
  useEffect(() => {
    lastLoggedLoadedForIdRef.current = null;
    lastAutoplayForIdRef.current = null;
  }, [approvedPontoAudioId]);

  const positionMillis = rntp.positionMillis;
  const loadedDurationMillis = rntp.durationMillis;

  // Autoplay once per approvedPontoAudioId.
  useEffect(() => {
    if (curimbaEnabled) return;
    if (audioState !== "AUDIO_APPROVED") return;
    if (!approvedPontoAudioId) return;
    if (!ponto?.id) return;

    // If the requested ponto is already the current track, do not reload it.
    // This prevents restarting audio when navigating to the player from the
    // system notification.
    if (getCurrentPontoId() === ponto.id) {
      lastAutoplayForIdRef.current = approvedPontoAudioId;
      return;
    }

    if (lastAutoplayForIdRef.current === approvedPontoAudioId) return;
    lastAutoplayForIdRef.current = approvedPontoAudioId;

    void loadAndPlay({
      kind: "approved",
      pontoId: ponto.id,
      title:
        typeof ponto?.title === "string" && ponto.title.trim()
          ? ponto.title
          : "Ponto",
    });
  }, [
    approvedPontoAudioId,
    audioState,
    curimbaEnabled,
    ponto?.id,
    ponto?.title,
  ]);

  const uiDurationMs = useMemo(() => {
    if (loadedDurationMillis > 0) return loadedDurationMillis;
    return backendDurationMs > 0 ? backendDurationMs : 0;
  }, [backendDurationMs, loadedDurationMillis]);

  const canSeek =
    !curimbaEnabled &&
    audioState === "AUDIO_APPROVED" &&
    !!approvedPontoAudioId &&
    loadedDurationMillis > 0;

  // Log once when loaded duration becomes available (per track).
  useEffect(() => {
    if (audioState !== "AUDIO_APPROVED") return;
    if (!approvedPontoAudioId) return;
    if (!(loadedDurationMillis > 0)) return;

    if (lastLoggedLoadedForIdRef.current === approvedPontoAudioId) return;
    lastLoggedLoadedForIdRef.current = approvedPontoAudioId;

    if (__DEV__) {
      console.log("[PLAYER][PUBLIC][AUDIO_LOADED]", {
        ponto_audio_id: approvedPontoAudioId,
        duration_ms: loadedDurationMillis,
      });
    }
  }, [approvedPontoAudioId, audioState, loadedDurationMillis]);

  // Auto-heal (best effort): if DB duration_ms is missing/invalid for approved audio,
  // persist durationMillis once per ponto_audio_id per app session.
  useEffect(() => {
    if (curimbaEnabled) return;
    if (audioState !== "AUDIO_APPROVED") return;
    if (!approvedPontoAudioId) return;

    // Only heal if backend duration looks missing/invalid.
    if (backendDurationMs > 0) return;

    if (!(loadedDurationMillis > 0)) return;

    const requestedId = approvedPontoAudioId;
    if (!shouldTryDurationAutoHeal(requestedId)) return;
    markDurationAutoHealTried(requestedId);

    let cancelled = false;
    void (async () => {
      try {
        const durationMs = loadedDurationMillis;

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
    loadedDurationMillis,
  ]);

  const subtitle = useMemo(() => {
    if (curimbaEnabled) return "Modo Curimba: apenas letra";
    if (audioState === "AUDIO_IN_REVIEW")
      return "Áudio em revisão. Disponível em breve.";
    if (audioState === "NO_AUDIO") return "Sem áudio";
    if (rntp.error) return "Erro no áudio. Tente novamente.";
    if (isBusy) return "Carregando áudio…";
    return "Áudio";
  }, [audioState, curimbaEnabled, isBusy, rntp.error]);

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
          accessibilityLabel={isPlaying ? "Pausar" : "Tocar"}
          disabled={isBusy}
          onPress={async () => {
            // Prevent multiple simultaneous clicks
            if (isBusy) return;

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

            if (!ponto?.id) {
              props.onOpenNoAudioModal();
              return;
            }

            try {
              // If already playing, just pause.
              if (isPlaying) {
                await togglePlayPause();
                return;
              }

              // If the current track is the same, resume; otherwise load+play.
              if (getCurrentPontoId() === ponto.id) {
                await togglePlayPause();
                return;
              }

              await loadAndPlay({
                kind: "approved",
                pontoId: ponto.id,
                title:
                  typeof ponto?.title === "string" && ponto.title.trim()
                    ? ponto.title
                    : "Ponto",
              });
            } catch (e) {
              const msg =
                e instanceof Error && e.message
                  ? e.message
                  : "Não foi possível tocar o áudio.";
              Alert.alert("Erro no áudio", msg);
            } finally {
            }
          }}
          style={({ pressed }) => [
            styles.playBtn,
            { borderColor: accent, borderWidth: tagOutlineWidth },
            (curimbaEnabled || !canPlay || isBusy) && styles.playBtnDisabled,
            pressed && styles.playBtnPressed,
          ]}
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={20}
            color={accent}
          />
        </Pressable>
      </View>

      {rntp.error ? (
        <Text style={[styles.metaLine, { color: colors.brass600 }]}>
          {rntp.error}
        </Text>
      ) : null}

      {showProgress ? (
        <AudioProgressSlider
          variant={variant}
          positionMillis={positionMillis}
          durationMillis={uiDurationMs}
          disabled={!canSeek}
          accentColor={accent}
          trackBorderColor={borderColor}
          onSeek={(ms) => {
            const sec = Math.max(0, ms / 1000);
            return seekToSeconds(sec);
          }}
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
