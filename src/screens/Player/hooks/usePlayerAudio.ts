import { Audio, type AVPlaybackStatus } from "expo-av";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

let audioModePromise: Promise<void> | null = null;

function ensureAudioModeOnce() {
  if (!audioModePromise) {
    audioModePromise = Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  }
  return audioModePromise;
}

async function delayMs(ms: number) {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function usePlayerAudio(params: {
  audioUrl?: string | null;
  blocked?: boolean;
}) {
  const mode = "player" as const;
  const { audioUrl } = params;
  const blocked = params.blocked === true;

  const soundRef = useRef<Audio.Sound | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const inFlightKindRef = useRef<"load" | "toggle" | null>(null);
  const playRequestedAtMsRef = useRef<number | null>(null);
  const playRequestedAttemptRef = useRef<number | null>(null);
  const playLatencyLoggedRef = useRef(false);

  const hasAudio = useMemo(
    () => typeof audioUrl === "string" && audioUrl.trim().length > 0,
    [audioUrl],
  );

  const cleanup = useCallback(async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    setIsLoaded(false);
    setIsPlaying(false);
    setPositionMillis(0);
    setDurationMillis(0);

    if (sound) {
      try {
        await sound.stopAsync();
      } catch {
        // ignore
      }
      try {
        await sound.unloadAsync();
      } catch {
        // ignore
      }
    }
  }, []);

  const onStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      setIsLoaded(false);
      setIsPlaying(false);
      return;
    }

    if (
      status.isPlaying &&
      typeof playRequestedAtMsRef.current === "number" &&
      !playLatencyLoggedRef.current
    ) {
      const elapsedMs = Date.now() - playRequestedAtMsRef.current;
      playLatencyLoggedRef.current = true;
      playRequestedAtMsRef.current = null;

      if (__DEV__) {
        console.log("[AUDIO][PLAY_START_LATENCY]", {
          attempt: playRequestedAttemptRef.current,
          ms: elapsedMs,
        });
      }
    }

    setIsLoaded(true);
    setIsPlaying(Boolean(status.isPlaying));
    setPositionMillis(
      typeof status.positionMillis === "number" ? status.positionMillis : 0,
    );
    setDurationMillis(
      typeof status.durationMillis === "number" ? status.durationMillis : 0,
    );

    if (status.didJustFinish) {
      setIsPlaying(false);
    }
  }, []);

  const load = useCallback(async () => {
    // NOTE: This function is still called by an effect (to keep old behavior),
    // but it must not race with play. A ref-mutex controls concurrency.
    if (inFlightRef.current) return;

    const op = (async () => {
      await cleanup();
      setError(null);

      if (blocked) {
        if (__DEV__) {
          console.info("[Curimba] áudio bloqueado");
        }
        return;
      }

      if (!hasAudio) return;

      try {
        await ensureAudioModeOnce();

        const tLoadStart = performance.now();
        if (__DEV__) {
          console.log("[PERF][AUDIO][LOAD_START]", { mode });
        }
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl as string },
          { shouldPlay: false, progressUpdateIntervalMillis: 250 },
          onStatus,
        );
        const tLoadEnd = performance.now();
        if (__DEV__) {
          console.log("[PERF][AUDIO][LOAD_END]", {
            mode,
            ms: Math.round(tLoadEnd - tLoadStart),
          });
        }
        soundRef.current = sound;
        setIsLoaded(true);
      } catch (e) {
        if (__DEV__) {
          console.log("[AUDIO][LOAD_ERR]", {
            error_string: e instanceof Error ? e.message : String(e),
          });
        }
        setError(e instanceof Error ? e.message : "Erro ao carregar áudio.");
        await cleanup();
      }
    })();

    inFlightRef.current = op;
    inFlightKindRef.current = "load";
    try {
      await op;
    } finally {
      if (inFlightRef.current === op) {
        inFlightRef.current = null;
        inFlightKindRef.current = null;
      }
    }
  }, [audioUrl, blocked, cleanup, hasAudio, onStatus]);

  useEffect(() => {
    if (__DEV__) {
      console.info("[Curimba] áudio", { blocked });
    }
  }, [blocked]);

  useEffect(() => {
    load();
    return () => {
      void cleanup();
    };
  }, [load, cleanup]);

  const togglePlayPause = useCallback(async () => {
    // If we're already loading due to an URL change, wait for it so the first
    // play attempt doesn't get dropped (keep UI in loading state until ready).
    const inflight = inFlightRef.current;
    if (inflight && inFlightKindRef.current === "load") {
      try {
        await inflight;
      } catch {
        // ignore
      }
    } else if (inFlightRef.current) {
      // Another toggle is already running; ignore additional clicks.
      return;
    }

    const op = (async () => {
      setError(null);

      if (blocked) {
        if (__DEV__) {
          console.info("[Curimba] áudio bloqueado");
        }
        return;
      }
      if (!hasAudio) return;

      const attempt = async (attemptNum: number) => {
        const t0 = performance.now();
        if (__DEV__) {
          console.log("[AUDIO][LOAD_START]", { attempt: attemptNum });
        }
        // REQUIRED sequence (await each step):
        await ensureAudioModeOnce();
        await cleanup();

        const tLoadStart = performance.now();
        if (__DEV__) {
          console.log("[PERF][AUDIO][LOAD_START]", { mode });
        }
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl as string },
          { shouldPlay: false, progressUpdateIntervalMillis: 250 },
          onStatus,
        );
        const tLoadEnd = performance.now();
        if (__DEV__) {
          console.log("[PERF][AUDIO][LOAD_END]", {
            mode,
            ms: Math.round(tLoadEnd - tLoadStart),
          });
        }
        soundRef.current = sound;

        const tReady = performance.now();
        if (__DEV__) {
          console.log("[PERF][AUDIO][READY_TO_PLAY]", {
            mode,
            total_ms: Math.round(tReady - t0),
          });
        }

        playRequestedAtMsRef.current = Date.now();
        playRequestedAttemptRef.current = attemptNum;
        playLatencyLoggedRef.current = false;
        await sound.playAsync();

        if (__DEV__) {
          console.log("[AUDIO][LOAD_OK]", { attempt: attemptNum });
        }
      };

      // If we already have a loaded sound, toggle pause/play without recreating.
      const existing = soundRef.current;
      if (existing) {
        try {
          const status = await existing.getStatusAsync();
          if (status.isLoaded) {
            if (status.isPlaying) {
              await existing.pauseAsync();
            } else {
              playRequestedAtMsRef.current = Date.now();
              playRequestedAttemptRef.current = 0;
              playLatencyLoggedRef.current = false;
              await existing.playAsync();
            }
            return;
          }
        } catch {
          // Fall through to recreate sound deterministically.
        }
      }

      try {
        await attempt(1);
      } catch (firstErr) {
        if (__DEV__) {
          console.log("[AUDIO][LOAD_ERR]", {
            attempt: 1,
            error:
              firstErr instanceof Error ? firstErr.message : String(firstErr),
          });

          console.log("[AUDIO][RETRY_ONCE]");
        }

        await delayMs(200);

        try {
          await attempt(2);
          if (__DEV__) {
            console.log("[AUDIO][RETRY_OK]");
          }
        } catch (secondErr) {
          if (__DEV__) {
            console.log("[AUDIO][LOAD_ERR]", {
              attempt: 2,
              error:
                secondErr instanceof Error
                  ? secondErr.message
                  : String(secondErr),
            });
            console.log("[AUDIO][RETRY_FAILED]", {
              error_string:
                secondErr instanceof Error
                  ? secondErr.message
                  : String(secondErr),
            });
          }
          setError(
            secondErr instanceof Error ? secondErr.message : "Erro no player.",
          );
          await cleanup();
        }
      }
    })();

    inFlightRef.current = op;
    inFlightKindRef.current = "toggle";
    try {
      await op;
    } finally {
      if (inFlightRef.current === op) {
        inFlightRef.current = null;
        inFlightKindRef.current = null;
      }
    }
  }, [audioUrl, blocked, cleanup, hasAudio, onStatus]);

  const seekTo = useCallback(
    async (nextPositionMillis: number) => {
      if (blocked) return;

      // If we're currently loading (URL change), wait so we seek the latest sound.
      const inflight = inFlightRef.current;
      if (inflight && inFlightKindRef.current === "load") {
        try {
          await inflight;
        } catch {
          // ignore
        }
      }

      const sound = soundRef.current;
      if (!sound) return;

      try {
        const status = await sound.getStatusAsync();
        if (!status.isLoaded) return;

        const duration =
          typeof status.durationMillis === "number" &&
          Number.isFinite(status.durationMillis)
            ? Math.max(0, status.durationMillis)
            : 0;

        const raw =
          typeof nextPositionMillis === "number" &&
          Number.isFinite(nextPositionMillis)
            ? Math.max(0, nextPositionMillis)
            : 0;

        const clamped = duration > 0 ? Math.min(raw, duration) : raw;
        await sound.setPositionAsync(clamped);
      } catch {
        // best-effort seek only
      }
    },
    [blocked],
  );

  const progress = useMemo(() => {
    if (!durationMillis) return 0;
    return Math.max(0, Math.min(1, positionMillis / durationMillis));
  }, [positionMillis, durationMillis]);

  return {
    hasAudio,
    isLoaded,
    isPlaying,
    progress,
    positionMillis,
    durationMillis,
    error,
    togglePlayPause,
    seekTo,
  };
}
