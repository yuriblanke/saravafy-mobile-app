import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "@/lib/supabase";

export type AppConfigRow = {
  key: string;
  value: string | null;
  updated_at: string | null;
};

type CachedStringValue = {
  value: string;
  fetchedAt: number; // epoch ms
};

const STORAGE_KEY_APP_INSTALL_URL = "remoteConfig:app_install_url";
const TTL_MS = 6 * 60 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAppConfigRow(value: unknown): value is AppConfigRow {
  if (!isRecord(value)) return false;

  const keyOk = typeof value.key === "string";
  const valueOk = value.value === null || typeof value.value === "string";
  const updatedOk =
    value.updated_at === null || typeof value.updated_at === "string";

  return keyOk && valueOk && updatedOk;
}

function isCachedStringValue(value: unknown): value is CachedStringValue {
  if (!isRecord(value)) return false;

  return (
    typeof value.value === "string" &&
    typeof value.fetchedAt === "number" &&
    Number.isFinite(value.fetchedAt)
  );
}

function normalizeUrl(value: string) {
  return value.trim();
}

function isValidInstallUrl(url: string, options: { allowHttp: boolean }) {
  const raw = normalizeUrl(url);
  if (!raw) return false;

  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "https:") return true;
    if (options.allowHttp && parsed.protocol === "http:") return true;
    return false;
  } catch {
    return false;
  }
}

async function readCachedString(
  storageKey: string
): Promise<CachedStringValue | null> {
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isCachedStringValue(parsed)) return null;

    const value = normalizeUrl(parsed.value);
    if (!value) return null;

    return { value, fetchedAt: parsed.fetchedAt };
  } catch {
    return null;
  }
}

async function writeCachedString(
  storageKey: string,
  value: string
): Promise<void> {
  const payload: CachedStringValue = {
    value: normalizeUrl(value),
    fetchedAt: Date.now(),
  };

  await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
}

export async function getCachedAppInstallUrl(): Promise<string | null> {
  const cached = await readCachedString(STORAGE_KEY_APP_INSTALL_URL);
  if (!cached) return null;

  // Cached values may be legacy http://. If it already exists locally, keep it.
  const allowHttp = true;
  if (!isValidInstallUrl(cached.value, { allowHttp })) return null;

  return cached.value;
}

export async function getAppInstallUrl(): Promise<string | null> {
  const cached = await readCachedString(STORAGE_KEY_APP_INSTALL_URL);
  const now = Date.now();

  if (cached && now - cached.fetchedAt < TTL_MS) {
    if (__DEV__) {
      console.info("[RemoteConfig] app_install_url: using valid cache", {
        ageMs: now - cached.fetchedAt,
      });
    }

    return cached.value;
  }

  if (__DEV__) {
    console.info("[RemoteConfig] app_install_url: fetching from Supabase");
  }

  try {
    const res = await supabase
      .from("public_app_config")
      .select("key, value, updated_at")
      .eq("key", "app_install_url")
      .maybeSingle();

    if (res.error) {
      throw new Error(
        typeof res.error.message === "string"
          ? res.error.message
          : "Supabase error"
      );
    }

    const rowUnknown: unknown = res.data;
    const row = isAppConfigRow(rowUnknown) ? rowUnknown : null;

    const remoteValue =
      row && typeof row.value === "string" ? normalizeUrl(row.value) : "";

    // From remote config, accept https:// only.
    if (remoteValue && isValidInstallUrl(remoteValue, { allowHttp: false })) {
      await writeCachedString(STORAGE_KEY_APP_INSTALL_URL, remoteValue);
      return remoteValue;
    }

    // If remote is missing/invalid, fall back to old cache if any.
    return cached?.value ?? null;
  } catch (error) {
    if (__DEV__) {
      console.info("[RemoteConfig] app_install_url: fetch failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    }

    return cached?.value ?? null;
  }
}

export function warmRemoteConfig(): void {
  void getAppInstallUrl().catch((error) => {
    if (__DEV__) {
      console.info("[RemoteConfig] warmRemoteConfig failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
