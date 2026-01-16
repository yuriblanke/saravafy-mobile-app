import { getPontoAudioPlaybackUrl } from "@/src/api/pontoAudio";
import { usePontoAudios } from "@/src/hooks/pontoAudio";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export function AudioPlayerFooter(props: {
  ponto: PlayerPonto | null;
  variant: "light" | "dark";
  curimbaEnabled?: boolean;
}) {
  const { ponto, variant } = props;
  const curimbaEnabled = props.curimbaEnabled === true;

  const pontoId = ponto?.id ?? null;
  const audiosQuery = usePontoAudios(pontoId);
  const activeAudio = audiosQuery.data?.[0] ?? null;

  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackExpiresAtMs, setPlaybackExpiresAtMs] = useState<number | null>(
    null
  );
  const [isResolvingUrl, setIsResolvingUrl] = useState(false);
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
  const bg =
    variant === "light" ? colors.paper200 : colors.surfaceCardBg;

  const canPlay = !!activeAudio?.id;

  const ensurePlaybackUrl = useCallback(
    async (options?: { force?: boolean }) => {
      if (!activeAudio?.id) return;
      if (curimbaEnabled) return;

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
        const res = await getPontoAudioPlaybackUrl(activeAudio.id);
        setPlaybackUrl(res.url);
        setPlaybackExpiresAtMs(Date.now() + res.expiresIn * 1000);
      } finally {
        setIsResolvingUrl(false);
      }
    },
    [activeAudio?.id, curimbaEnabled, playbackExpiresAtMs, playbackUrl]
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

    if (activeAudio?.id && !curimbaEnabled) {
      void ensurePlaybackUrl({ force: true });
    }
  }, [activeAudio?.id, curimbaEnabled, ensurePlaybackUrl]);

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

    if (!activeAudio?.id) return;
    if (curimbaEnabled) return;
    if (!playbackExpiresAtMs) return;

    const delay = Math.max(0, playbackExpiresAtMs - Date.now() - 20_000);
    renewalTimerRef.current = setTimeout(() => {
      if (player.isPlaying) return;
      void ensurePlaybackUrl({ force: true });
    }, delay);

    return () => {
      if (renewalTimerRef.current) {
        clearTimeout(renewalTimerRef.current);
        renewalTimerRef.current = null;
      }
    };
  }, [
    activeAudio?.id,
    curimbaEnabled,
    ensurePlaybackUrl,
    playbackExpiresAtMs,
    player.isPlaying,
  ]);

  // Reactive refresh: if playback errors, refresh URL once
  useEffect(() => {
    if (!player.error) return;
    if (!activeAudio?.id) return;
    if (curimbaEnabled) return;

    if (reactiveRefreshRef.current >= 1) return;
    reactiveRefreshRef.current += 1;
    void ensurePlaybackUrl({ force: true });
  }, [activeAudio?.id, curimbaEnabled, ensurePlaybackUrl, player.error]);

  const subtitle = useMemo(() => {
    if (curimbaEnabled) return "Modo Curimba: apenas letra";
    if (!canPlay) return "Sem áudio";
    if (audiosQuery.isLoading) return "Carregando áudio…";
    return "Áudio";
  }, [audiosQuery.isLoading, canPlay, curimbaEnabled]);

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
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={player.isPlaying ? "Pausar" : "Tocar"}
          onPress={async () => {
            if (curimbaEnabled) {
              Alert.alert(
                "Modo Curimba ativo",
                "O áudio fica desativado enquanto o Modo Curimba estiver ativo."
              );
              return;
            }

            if (!activeAudio?.id) {
              Alert.alert("Sem áudio", "Esse ponto ainda não tem áudio.");
              return;
            }

            try {
              await ensurePlaybackUrl({ force: true });
              await player.togglePlayPause();
            } catch (e) {
              const msg =
                e instanceof Error && e.message
                  ? e.message
                  : "Não foi possível tocar o áudio.";
              Alert.alert("Erro no áudio", msg);
            }
          }}
          style={({ pressed }) => [
            styles.playBtn,
            { borderColor: accent },
            curimbaEnabled && styles.playBtnDisabled,
            pressed && styles.playBtnPressed,
          ]}
        >
          {isResolvingUrl ? (
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
                !curimbaEnabled && player.hasAudio ? accent : "transparent",
              width: `${Math.round(player.progress * 100)}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const FOOTER_HEIGHT = 88;
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
