import { Audio, type AVPlaybackStatus } from "expo-av";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function usePlayerAudio(params: {
  audioUrl?: string | null;
  blocked?: boolean;
}) {
  const { audioUrl } = params;
  const blocked = params.blocked === true;

  const soundRef = useRef<Audio.Sound | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const hasAudio = useMemo(
    () => typeof audioUrl === "string" && audioUrl.trim().length > 0,
    [audioUrl]
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

    setIsLoaded(true);
    setIsPlaying(Boolean(status.isPlaying));
    setPositionMillis(
      typeof status.positionMillis === "number" ? status.positionMillis : 0
    );
    setDurationMillis(
      typeof status.durationMillis === "number" ? status.durationMillis : 0
    );

    if (status.didJustFinish) {
      setIsPlaying(false);
    }
  }, []);

  const load = useCallback(async () => {
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
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl as string },
        { shouldPlay: false, progressUpdateIntervalMillis: 250 },
        onStatus
      );

      soundRef.current = sound;
      setIsLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar áudio.");
      await cleanup();
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
    const sound = soundRef.current;
    if (!sound) return;

    try {
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) return;

      if (status.isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro no player.");
    }
  }, []);

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
  };
}
