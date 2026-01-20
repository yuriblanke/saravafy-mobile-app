import {
  getPontoAudioPlaybackUrlPublic,
  getPontoAudioPlaybackUrlReviewBySubmission,
} from "@/src/api/pontoAudio";
import { useEffect, useSyncExternalStore } from "react";
import TrackPlayer, {
  Event,
  State,
  usePlaybackState,
  useProgress,
  type Track,
} from "react-native-track-player";

import { setupTrackPlayerOnce } from "./trackPlayer";

export type PublicPlaybackRequest = {
  kind: "public";
  pontoAudioId: string;
  title: string;
  artist?: string | null;
  /** Seconds (RNTP expects seconds). */
  durationSeconds?: number | null;
  artwork?: string | number | null;
};

export type ReviewPlaybackRequest = {
  kind: "review";
  submissionId: string;
  title: string;
  artist?: string | null;
  /** Seconds (RNTP expects seconds). */
  durationSeconds?: number | null;
  artwork?: string | number | null;
};

export type PlaybackRequest = PublicPlaybackRequest | ReviewPlaybackRequest;

export type CurrentPlaybackKey =
  | { kind: "public"; id: string }
  | { kind: "review"; id: string }
  | null;

type Snapshot = {
  current: CurrentPlaybackKey;
  isLoading: boolean;
  error: string | null;
};

let listenersRegistered = false;

let snapshot: Snapshot = {
  current: null,
  isLoading: false,
  error: null,
};

const subscribers = new Set<() => void>();

function emit() {
  subscribers.forEach((cb) => cb());
}

function setSnapshot(patch: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...patch };
  emit();
}

function setError(message: string | null) {
  setSnapshot({ error: message });
}

function setLoading(isLoading: boolean) {
  setSnapshot({ isLoading });
}

function coerceTitle(raw: unknown) {
  const t = typeof raw === "string" ? raw.trim() : "";
  return t ? t : "Ponto";
}

function coerceArtist(raw: unknown) {
  const a = typeof raw === "string" ? raw.trim() : "";
  return a ? a : null;
}

function coerceDurationSeconds(raw: unknown) {
  const n = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  return n !== null && n > 0 ? n : null;
}

function getTrackId(req: PlaybackRequest) {
  return req.kind === "public"
    ? String(req.pontoAudioId)
    : `review:${String(req.submissionId)}`;
}

function buildTrack(req: PlaybackRequest, url: string): Track {
  const durationSeconds = coerceDurationSeconds(req.durationSeconds);
  const artist = coerceArtist(req.artist);

  return {
    id: getTrackId(req),
    url,
    title: coerceTitle(req.title),
    artist: artist ?? undefined,
    duration: durationSeconds ?? undefined,
    artwork:
      req.artwork !== null && req.artwork !== undefined
        ? (req.artwork as any)
        : undefined,
  };
}

async function resolveUrl(req: PlaybackRequest) {
  if (req.kind === "public") {
    const id = String(req.pontoAudioId ?? "").trim();
    if (!id) throw new Error("pontoAudioId inválido.");
    const res = await getPontoAudioPlaybackUrlPublic(id);
    if (!res?.url) throw new Error("URL de áudio inválida.");
    return res.url;
  }

  const sid = String(req.submissionId ?? "").trim();
  if (!sid) throw new Error("submissionId inválido.");
  const res = await getPontoAudioPlaybackUrlReviewBySubmission(sid);
  if (!res?.url) throw new Error("URL de áudio inválida.");
  return res.url;
}

function registerListenersOnce() {
  if (listenersRegistered) return;
  listenersRegistered = true;

  TrackPlayer.addEventListener(Event.PlaybackError, (evt) => {
    setLoading(false);

    const msg =
      typeof (evt as any)?.error?.message === "string" &&
      (evt as any).error.message.trim()
        ? String((evt as any).error.message)
        : "Erro ao tocar o áudio.";

    setError(msg);
    void TrackPlayer.stop().catch(() => null);
  });
}

export async function ensureSetup() {
  await setupTrackPlayerOnce();
  registerListenersOnce();
}

export function subscribeSnapshot(cb: () => void) {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

export function getSnapshot() {
  return snapshot;
}

export function useRntpPlayback(updateIntervalMs = 250) {
  useEffect(() => {
    void ensureSetup();
  }, []);

  const snap = useSyncExternalStore(subscribeSnapshot, getSnapshot);

  const playbackStateAny = usePlaybackState();
  const playbackState =
    typeof playbackStateAny === "number"
      ? playbackStateAny
      : (playbackStateAny as any)?.state;
  const isPlaying = playbackState === State.Playing;

  const progressAny = useProgress(updateIntervalMs);
  const positionSec =
    typeof (progressAny as any)?.position === "number" &&
    Number.isFinite((progressAny as any).position)
      ? (progressAny as any).position
      : 0;
  const durationSec =
    typeof (progressAny as any)?.duration === "number" &&
    Number.isFinite((progressAny as any).duration)
      ? (progressAny as any).duration
      : 0;

  return {
    playbackState,
    isPlaying,
    isLoading: snap.isLoading,
    error: snap.error,
    current: snap.current,
    positionMillis: Math.max(0, Math.round(positionSec * 1000)),
    durationMillis: Math.max(0, Math.round(durationSec * 1000)),
  };
}

export function getCurrentPontoAudioId() {
  return snapshot.current?.kind === "public" ? snapshot.current.id : null;
}

export function getCurrentSubmissionId() {
  return snapshot.current?.kind === "review" ? snapshot.current.id : null;
}

export async function ensureLoaded(req: PlaybackRequest) {
  await ensureSetup();
  setError(null);
  setLoading(true);

  const key: CurrentPlaybackKey =
    req.kind === "public"
      ? { kind: "public", id: String(req.pontoAudioId ?? "").trim() }
      : { kind: "review", id: String(req.submissionId ?? "").trim() };

  setSnapshot({ current: key });

  try {
    const url = await resolveUrl(req);
    await TrackPlayer.reset();
    await TrackPlayer.add([buildTrack(req, url)]);
  } catch (e) {
    const msg =
      e instanceof Error && e.message.trim()
        ? e.message.trim()
        : "Erro ao carregar o áudio.";
    setError(msg);
    throw e;
  } finally {
    setLoading(false);
  }
}

export async function loadAndPlay(req: PlaybackRequest) {
  await ensureLoaded(req);
  try {
    await TrackPlayer.play();
  } catch (e) {
    const msg =
      e instanceof Error && e.message.trim()
        ? e.message.trim()
        : "Erro ao iniciar o áudio.";
    setError(msg);
    throw e;
  }
}

export async function togglePlayPause() {
  await ensureSetup();

  try {
    const state = await TrackPlayer.getState();
    if (state === State.Playing) {
      await TrackPlayer.pause();
      return;
    }
    await TrackPlayer.play();
  } catch (e) {
    const msg =
      e instanceof Error && e.message.trim()
        ? e.message.trim()
        : "Erro ao controlar o player.";
    setError(msg);
    throw e;
  }
}

export async function pause() {
  await ensureSetup();
  await TrackPlayer.pause();
}

export async function seekToSeconds(seconds: number) {
  await ensureSetup();
  const s =
    typeof seconds === "number" && Number.isFinite(seconds) ? seconds : 0;
  await TrackPlayer.seekTo(Math.max(0, s));
}
