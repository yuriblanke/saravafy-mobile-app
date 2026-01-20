import { getPontoAudioPlaybackUrlPublic } from "@/src/api/pontoAudio";
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

  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackExpiresAtMs, setPlaybackExpiresAtMs] = useState<number | null>(
    null,
  );
  const [isResolvingUrl, setIsResolvingUrl] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const renewalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactiveRefreshRef = useRef(0);

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  // Botão principal dourado (sem implementar áudio)
  const accent = variant === "light" ? colors.brass500 : colors.brass600;
  const borderColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;
  const bg = variant === "light" ? colors.paper200 : colors.surfaceCardBg;

  const canPlay = audioState === "AUDIO_APPROVED" && !!approvedPontoAudioId;

  const ensurePlaybackUrl = useCallback(
    async (options?: { force?: boolean; source?: "auto" | "user" }) => {
      if (audioState !== "AUDIO_APPROVED") return;
      if (!approvedPontoAudioId) return;
      if (curimbaEnabled) return;

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
        playbackUrl &&
        typeof playbackExpiresAtMs === "number" &&
        Date.now() < playbackExpiresAtMs - 20_000
      ) {
        return;
      }

      setIsResolvingUrl(true);
      try {
        const res = await getPontoAudioPlaybackUrlPublic(approvedPontoAudioId);
        setPlaybackUrl(res.url);
        setPlaybackExpiresAtMs(Date.now() + res.expiresIn * 1000);
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
    [
      audioState,
      approvedPontoAudioId,
      curimbaEnabled,
      playbackExpiresAtMs,
      playbackUrl,
    ],
  );

  // Reset when changing track / audio row
  useEffect(() => {
    setPlaybackUrl(null);
    setPlaybackExpiresAtMs(null);
    reactiveRefreshRef.current = 0;
    if (renewalTimerRef.current) {
      clearTimeout(renewalTimerRef.current);
      renewalTimerRef.current = null;
    }

    if (
      audioState === "AUDIO_APPROVED" &&
      approvedPontoAudioId &&
      !curimbaEnabled
    ) {
      void ensurePlaybackUrl({ force: true, source: "auto" }).catch(() => null);
    }
  }, [approvedPontoAudioId, audioState, curimbaEnabled, ensurePlaybackUrl]);

  const player = usePlayerAudio({
    audioUrl: playbackUrl,
    blocked: curimbaEnabled,
  });

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
            { borderColor: accent },
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

      <View
        style={[styles.progressTrack, { borderColor }]}
        accessibilityLabel="Progresso"
      >
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor:
                canPlay && !curimbaEnabled && player.hasAudio
                  ? accent
                  : "transparent",
              width: `${Math.round(player.progress * 100)}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const FOOTER_HEIGHT = 104;
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
  progressTrack: {
    marginTop: spacing.sm,
    height: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
});
