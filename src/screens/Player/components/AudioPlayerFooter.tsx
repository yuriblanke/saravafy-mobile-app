import { fetchPontoApprovedPlaybackUrl } from "@/src/api/pontoAudio";
import {
  playTrack,
  resume,
  pause as rntpPause,
  seekToSeconds,
  setResolvingPlayback,
  togglePlayPause,
  useRntpPlayback,
} from "@/src/audio/rntpService";
import { AudioProgressSlider } from "@/src/components/AudioProgressSlider";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { PlayerPonto } from "../hooks/useCollectionPlayerData";

export type PlayerAudioState = "NO_AUDIO" | "AUDIO_APPROVED";

export function AudioPlayerFooter(props: {
  ponto: PlayerPonto | null;
  variant: "light" | "dark";
  curimbaEnabled?: boolean;
  audioState: PlayerAudioState;
  onOpenNoAudioModal: (ponto: PlayerPonto) => void;
}) {
  const { ponto, variant } = props;
  const curimbaEnabled = props.curimbaEnabled === true;
  const audioState = props.audioState;
  const [trackDurationMs, setTrackDurationMs] = useState(0);
  const lastLoggedLoadedForIdRef = useRef<string | null>(null);

  const rntp = useRntpPlayback(250);

  const isBusy = rntp.isResolvingPlayback;
  const isPlaying = rntp.isPlaying;

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

  const canPlay = audioState === "AUDIO_APPROVED" && !!ponto?.audio;
  const showProgress = canPlay && !curimbaEnabled;

  // If Modo Curimba is enabled while audio is playing, pause it.
  useEffect(() => {
    if (!curimbaEnabled) return;
    void rntpPause().catch(() => null);
  }, [curimbaEnabled]);

  useEffect(() => {
    lastLoggedLoadedForIdRef.current = null;
    setTrackDurationMs(0);
  }, [ponto?.id]);

  const positionMillis = rntp.positionMillis;
  const loadedDurationMillis = rntp.durationMillis;

  const uiDurationMs = useMemo(() => {
    if (loadedDurationMillis > 0) return loadedDurationMillis;
    if (trackDurationMs > 0) return trackDurationMs;
    const audioDuration =
      typeof ponto?.audio?.duration === "number" &&
      Number.isFinite(ponto.audio.duration)
        ? Math.max(0, Math.round(ponto.audio.duration))
        : 0;
    return audioDuration;
  }, [loadedDurationMillis, ponto?.audio?.duration, trackDurationMs]);

  const canSeek =
    !curimbaEnabled &&
    audioState === "AUDIO_APPROVED" &&
    !!ponto?.audio &&
    loadedDurationMillis > 0;

  // Log once when loaded duration becomes available (per track).
  useEffect(() => {
    if (audioState !== "AUDIO_APPROVED") return;
    if (!ponto?.id) return;
    if (!(loadedDurationMillis > 0)) return;

    if (lastLoggedLoadedForIdRef.current === ponto.id) return;
    lastLoggedLoadedForIdRef.current = ponto.id;
    setTrackDurationMs(loadedDurationMillis);

    if (__DEV__) {
      console.log("[PLAYER][PUBLIC][AUDIO_LOADED]", {
        ponto_id: ponto.id,
        duration_ms: loadedDurationMillis,
      });
    }
  }, [audioState, loadedDurationMillis, ponto?.id]);

  const subtitle = useMemo(() => {
    if (curimbaEnabled) return "Modo Curimba: apenas letra";
    if (audioState === "NO_AUDIO") return "Sem áudio";
    if (rntp.error) return "Erro no áudio. Tente novamente.";
    if (isBusy) return "Preparando áudio…";
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

            if (audioState === "NO_AUDIO") {
              if (ponto) props.onOpenNoAudioModal(ponto);
              return;
            }

            if (!ponto?.audio) {
              if (ponto) props.onOpenNoAudioModal(ponto);
              return;
            }

            if (!ponto?.id) {
              if (ponto) props.onOpenNoAudioModal(ponto);
              return;
            }

            try {
              // If already playing, just pause.
              if (isPlaying) {
                await togglePlayPause();
                return;
              }

              if (rntp.currentTrack && rntp.currentTrack.pontoId === ponto.id) {
                await resume();
                return;
              }

              setResolvingPlayback(true);
              const playbackUrl = await fetchPontoApprovedPlaybackUrl(ponto.id);
              const subtitle = Array.isArray(ponto.tags)
                ? ponto.tags
                    .filter((t) => typeof t === "string" && t.trim())
                    .slice(0, 2)
                    .join(" • ")
                : "";

              await playTrack({
                pontoId: ponto.id,
                title:
                  typeof ponto?.title === "string" && ponto.title.trim()
                    ? ponto.title
                    : "Ponto",
                subtitle: subtitle || undefined,
                audioUrl: playbackUrl,
                duration:
                  typeof ponto.audio.duration === "number" &&
                  Number.isFinite(ponto.audio.duration)
                    ? ponto.audio.duration
                    : null,
              });
            } catch (e) {
              const msg =
                e instanceof Error && e.message
                  ? e.message
                  : "Não foi possível tocar o áudio.";
              Alert.alert("Erro no áudio", msg);
            } finally {
              setResolvingPlayback(false);
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
