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

import { resetAndStop, setupTrackPlayerOnce } from "./trackPlayer";

const fallbackArtworkPng = require("../../assets/images/filler.png");

export type ApprovedPlaybackRequest = {
  kind: "approved";
  pontoId: string;
  title: string;
  artist?: string | null;
  /** Seconds (RNTP expects seconds). */
  durationSeconds?: number | null;
  artwork?: string | number | null;
};

export type SubmissionPlaybackRequest = {
  kind: "submission";
  submissionId: string;
  title: string;
  artist?: string | null;
  /** Seconds (RNTP expects seconds). */
  durationSeconds?: number | null;
  artwork?: string | number | null;
};

export type PlaybackRequest =
  | ApprovedPlaybackRequest
  | SubmissionPlaybackRequest;

export type CurrentPlaybackKey =
  | { kind: "approved"; id: string }
  | { kind: "submission"; id: string }
  | null;

export type PlaybackStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "error";

type Snapshot = {
  current: CurrentPlaybackKey;
  isLoading: boolean;
  error: string | null;
  playbackState?: State;
  playWhenReady?: boolean;
};

let listenersRegistered = false;

let snapshot: Snapshot = {
  current: null,
  isLoading: false,
  error: null,
  playbackState: undefined,
  playWhenReady: undefined,
};

let currentRequest: PlaybackRequest | null = null;
let renewalInFlight: Promise<void> | null = null;
const renewedOnceForKey = new Set<string>();

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
  return req.kind === "approved"
    ? `approved:${String(req.pontoId)}`
    : `submission:${String(req.submissionId)}`;
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
        : fallbackArtworkPng,
  };
}

async function resolveUrl(req: PlaybackRequest) {
  if (req.kind === "approved") {
    const id = String(req.pontoId ?? "").trim();
    if (!id) throw new Error("pontoId inválido.");
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

function getCurrentKeyString() {
  if (!snapshot.current) return null;
  return `${snapshot.current.kind}:${snapshot.current.id}`;
}

async function attemptRenewalOnceOnError(evt: unknown): Promise<boolean> {
  if (!snapshot.current) return false;
  if (!currentRequest) return false;
  if (snapshot.isLoading) return false;

  const keyStr = getCurrentKeyString();
  if (!keyStr) return false;
  if (renewedOnceForKey.has(keyStr)) return false;

  renewedOnceForKey.add(keyStr);

  if (renewalInFlight) {
    await renewalInFlight;
    return true;
  }

  renewalInFlight = (async () => {
    setError(null);
    setLoading(true);

    const msgFromEvt =
      typeof (evt as any)?.error?.message === "string" &&
      (evt as any).error.message.trim()
        ? String((evt as any).error.message)
        : null;

    try {
      const position = await TrackPlayer.getPosition().catch(() => 0);
      const url = await resolveUrl(currentRequest);

      await TrackPlayer.reset();
      await TrackPlayer.add([buildTrack(currentRequest, url)]);

      if (
        typeof position === "number" &&
        Number.isFinite(position) &&
        position > 0
      ) {
        await TrackPlayer.seekTo(position).catch(() => null);
      }

      await TrackPlayer.play();

      if (__DEV__) {
        console.log("[RNTP][RENEWAL_RETRY_OK]", {
          current: snapshot.current,
          position,
        });
      }
    } catch (e) {
      const msg =
        e instanceof Error && e.message.trim()
          ? e.message.trim()
          : (msgFromEvt ?? "Erro ao tocar o áudio.");

      setError(msg);
      await resetAndStop().catch(() => null);

      if (__DEV__) {
        console.log("[RNTP][RENEWAL_RETRY_FAIL]", {
          current: snapshot.current,
          error: msg,
        });
      }
    } finally {
      setLoading(false);
      renewalInFlight = null;
    }
  })();

  await renewalInFlight;
  return true;
}

function registerListenersOnce() {
  if (listenersRegistered) return;
  listenersRegistered = true;

  TrackPlayer.addEventListener(Event.PlaybackState, (evt) => {
    const nextState = (evt as any)?.state;
    if (typeof nextState === "string") {
      setSnapshot({ playbackState: nextState as State });
    }
  });

  TrackPlayer.addEventListener(Event.PlaybackPlayWhenReadyChanged, (evt) => {
    const next = (evt as any)?.playWhenReady;
    if (typeof next === "boolean") {
      setSnapshot({ playWhenReady: next });
    }
  });

  TrackPlayer.addEventListener(Event.PlaybackError, (evt) => {
    void (async () => {
      const didRetry = await attemptRenewalOnceOnError(evt).catch(() => false);
      if (didRetry) return;

      const msg =
        typeof (evt as any)?.error?.message === "string" &&
        (evt as any).error.message.trim()
          ? String((evt as any).error.message)
          : "Erro ao tocar o áudio.";

      setLoading(false);
      setError(msg);
      await resetAndStop().catch(() => null);
    })();
  });
}

export async function ensureSetup() {
  await setupTrackPlayerOnce();
  registerListenersOnce();

  // Best-effort: hydrate snapshot with current native state so UI is correct
  // even before events fire (and even if progress isn't updating).
  try {
    const [pb, pwr] = await Promise.all([
      TrackPlayer.getPlaybackState().catch(() => null),
      TrackPlayer.getPlayWhenReady().catch(() => undefined),
    ]);

    const nextState = (pb as any)?.state;
    const patch: Partial<Snapshot> = {};
    if (typeof nextState === "string") patch.playbackState = nextState as State;
    if (typeof pwr === "boolean") patch.playWhenReady = pwr;
    if (Object.keys(patch).length > 0) setSnapshot(patch);
  } catch {
    // ignore
  }
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

  // Keep these hooks for progress/state updates, but treat our snapshot as the
  // source of truth for UI play/pause (it updates even when progress doesn't).
  const playbackStateAny = usePlaybackState();
  const hookPlaybackState =
    typeof playbackStateAny === "number"
      ? playbackStateAny
      : (playbackStateAny as any)?.state;

  const playbackState = snap.playbackState ?? hookPlaybackState;

  const isPlaying = (() => {
    const state = playbackState;
    const pwr = snap.playWhenReady;
    if (typeof pwr !== "boolean" || typeof state !== "string") {
      return state === State.Playing;
    }
    const isErrored = state === State.Error;
    const isEnded = state === State.Ended;
    const isNone = state === State.None;
    return pwr && !(isErrored || isEnded || isNone);
  })();

  const status: PlaybackStatus = (() => {
    if (snap.isLoading) return "loading";
    if (snap.error) return "error";
    if (!snap.current) return "idle";
    if (playbackState === State.Playing) return "playing";
    if (playbackState === State.Paused) return "paused";
    return "idle";
  })();

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
    status,
    isPlaying,
    isLoading: snap.isLoading,
    error: snap.error,
    current: snap.current,
    positionMillis: Math.max(0, Math.round(positionSec * 1000)),
    durationMillis: Math.max(0, Math.round(durationSec * 1000)),
  };
}

export function getCurrentPontoId() {
  return snapshot.current?.kind === "approved" ? snapshot.current.id : null;
}

export function getCurrentSubmissionId() {
  return snapshot.current?.kind === "submission" ? snapshot.current.id : null;
}

export async function ensureLoaded(req: PlaybackRequest) {
  await ensureSetup();
  setError(null);
  setLoading(true);

  const key: CurrentPlaybackKey =
    req.kind === "approved"
      ? { kind: "approved", id: String(req.pontoId ?? "").trim() }
      : { kind: "submission", id: String(req.submissionId ?? "").trim() };

  setSnapshot({ current: key });
  currentRequest = req;

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

export async function stop() {
  await ensureSetup();
  setError(null);
  setLoading(false);
  currentRequest = null;
  setSnapshot({ current: null });
  await resetAndStop();
}
