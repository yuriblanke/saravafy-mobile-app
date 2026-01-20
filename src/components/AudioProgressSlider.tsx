import { colors, spacing } from "@/src/theme";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function formatMmSsFromMs(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function AudioProgressSlider(props: {
  variant: "light" | "dark";
  positionMillis: number;
  durationMillis: number;
  onSeek: (positionMillis: number) => void | Promise<void>;
  disabled?: boolean;
  accentColor?: string;
  trackBorderColor?: string;
}) {
  const variant = props.variant;
  const disabled = props.disabled === true;

  const durationMillis =
    typeof props.durationMillis === "number" &&
    Number.isFinite(props.durationMillis)
      ? Math.max(0, props.durationMillis)
      : 0;

  const positionMillis =
    typeof props.positionMillis === "number" &&
    Number.isFinite(props.positionMillis)
      ? Math.max(0, props.positionMillis)
      : 0;

  const isReady = durationMillis > 0 && !disabled;

  const accent =
    typeof props.accentColor === "string" && props.accentColor
      ? props.accentColor
      : colors.brass600;

  const trackBorderColor =
    typeof props.trackBorderColor === "string" && props.trackBorderColor
      ? props.trackBorderColor
      : variant === "light"
        ? colors.surfaceCardBorderLight
        : colors.surfaceCardBorder;

  const textMuted =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;

  const [trackWidth, setTrackWidth] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const scrubProgressRef = useRef<number | null>(null);

  const progress = useMemo(() => {
    if (!durationMillis) return 0;
    return clamp01(positionMillis / durationMillis);
  }, [durationMillis, positionMillis]);

  const effectiveProgress =
    isScrubbing && typeof scrubProgressRef.current === "number"
      ? clamp01(scrubProgressRef.current)
      : progress;

  const effectivePositionMillis = useMemo(() => {
    if (!durationMillis) return positionMillis;
    if (isScrubbing && typeof scrubProgressRef.current === "number") {
      return Math.round(clamp01(scrubProgressRef.current) * durationMillis);
    }
    return positionMillis;
  }, [durationMillis, isScrubbing, positionMillis]);

  const handleTrackLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackWidth(Math.max(0, Math.floor(e.nativeEvent.layout.width)));
  }, []);

  const seekToProgress = useCallback(
    async (nextProgress: number) => {
      if (!isReady) return;
      const p = clamp01(nextProgress);
      const nextMs = Math.round(p * durationMillis);
      await props.onSeek(nextMs);
    },
    [durationMillis, isReady, props],
  );

  const handleTap = useCallback(
    (x: number) => {
      if (!isReady) return;
      if (!trackWidth) return;
      void seekToProgress(x / trackWidth);
    },
    [isReady, seekToProgress, trackWidth],
  );

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => isReady,
      onMoveShouldSetPanResponder: () => isReady,
      onPanResponderGrant: () => {
        if (!isReady) return;
        setIsScrubbing(true);
        scrubProgressRef.current = progress;
      },
      onPanResponderMove: (_, gesture) => {
        if (!isReady) return;
        if (!trackWidth) return;

        // Translate movement into progress delta.
        const delta = gesture.dx / trackWidth;
        const base =
          typeof scrubProgressRef.current === "number"
            ? scrubProgressRef.current
            : progress;
        scrubProgressRef.current = clamp01(base + delta);
      },
      onPanResponderRelease: () => {
        if (!isReady) return;
        const p =
          typeof scrubProgressRef.current === "number"
            ? scrubProgressRef.current
            : progress;
        scrubProgressRef.current = null;
        setIsScrubbing(false);
        void seekToProgress(p);
      },
      onPanResponderTerminate: () => {
        scrubProgressRef.current = null;
        setIsScrubbing(false);
      },
    });
  }, [isReady, progress, seekToProgress, trackWidth]);

  const currentLabel = useMemo(() => {
    if (!durationMillis) return "0:00";
    return formatMmSsFromMs(effectivePositionMillis);
  }, [durationMillis, effectivePositionMillis]);

  const durationLabel = useMemo(() => {
    if (!durationMillis) return "--:--";
    return formatMmSsFromMs(durationMillis);
  }, [durationMillis]);

  return (
    <View style={styles.wrap}>
      <View style={styles.timeRow}>
        <Text style={[styles.timeText, { color: textMuted }]}>
          {currentLabel}
        </Text>
        <Text style={[styles.timeText, { color: textMuted }]}>
          {durationLabel}
        </Text>
      </View>

      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="Progresso do áudio"
        disabled={!isReady}
        onPressIn={(e) => handleTap(e.nativeEvent.locationX)}
        style={({ pressed }) => [
          styles.track,
          { borderColor: trackBorderColor, opacity: isReady ? 1 : 0.45 },
          pressed && isReady ? { opacity: 0.8 } : null,
        ]}
        onLayout={handleTrackLayout}
      >
        <View
          style={[
            styles.fill,
            {
              backgroundColor: isReady ? accent : "transparent",
              width: `${Math.round(effectiveProgress * 100)}%`,
            },
          ]}
        />

        {isReady ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.thumb,
              {
                left: trackWidth
                  ? Math.round(effectiveProgress * trackWidth) - THUMB_SIZE / 2
                  : -9999,
                backgroundColor: accent,
                opacity: 1,
              },
            ]}
            {...panResponder.panHandlers}
          />
        ) : null}
      </Pressable>
    </View>
  );
}

const THUMB_SIZE = 14;

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.sm,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  track: {
    height: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    justifyContent: "center",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
  },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    top: (8 - THUMB_SIZE) / 2,
  },
});
