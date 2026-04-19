import { supabase } from "@/lib/supabase";
import { fetchCollectionPontosItems } from "@/src/queries/collectionPontos";
import {
  fetchCollectionsByTerreiro,
  type TerreiroCollectionCard,
} from "@/src/queries/terreirosCollections";
import type { CollectionPlayerItem } from "@/src/screens/Player/hooks/useCollectionPlayerData";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_PREFIX = "@saravafy:offline:terreiro:";
const PACKAGE_INDEX_KEY = "@saravafy:offline:terreiroIndex";
const CURRENT_VERSION = 1;
const MAX_CONCURRENCY = 4;

export type TerreiroOfflinePackageV1 = {
  version: 1;
  terreiroId: string;
  terreiroName: string;
  terreiroCoverImageUrl: string | null;
  syncedAtMs: number;
  bytesEstimate: number;
  audiosIncluded: boolean;
  collections: TerreiroCollectionCard[];
  collectionPontos: Record<string, CollectionPlayerItem[]>;
};

export type TerreiroPackageMeta = {
  terreiroId: string;
  terreiroName: string;
  syncedAtMs: number;
  bytesEstimate: number;
  audiosIncluded: boolean;
  collectionsCount: number;
  pontosCount: number;
};

function storageKey(terreiroId: string) {
  return `${STORAGE_PREFIX}${terreiroId}`;
}

export async function getPackage(
  terreiroId: string
): Promise<TerreiroOfflinePackageV1 | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(terreiroId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== CURRENT_VERSION) return null;
    return parsed as TerreiroOfflinePackageV1;
  } catch {
    return null;
  }
}

export async function savePackage(
  pkg: TerreiroOfflinePackageV1
): Promise<void> {
  const json = JSON.stringify(pkg);
  pkg.bytesEstimate = json.length;
  const jsonWithSize = JSON.stringify(pkg);
  await AsyncStorage.setItem(storageKey(pkg.terreiroId), jsonWithSize);
  await updateIndex(pkg.terreiroId, "add");
}

export async function removePackage(terreiroId: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(terreiroId));
  await updateIndex(terreiroId, "remove");
}

async function updateIndex(
  terreiroId: string,
  action: "add" | "remove"
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PACKAGE_INDEX_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    const set = new Set(ids);
    if (action === "add") set.add(terreiroId);
    else set.delete(terreiroId);
    await AsyncStorage.setItem(PACKAGE_INDEX_KEY, JSON.stringify([...set]));
  } catch {
    /* best effort */
  }
}

export async function listPackages(): Promise<TerreiroPackageMeta[]> {
  try {
    const raw = await AsyncStorage.getItem(PACKAGE_INDEX_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    const results: TerreiroPackageMeta[] = [];

    for (const id of ids) {
      const pkg = await getPackage(id);
      if (!pkg) continue;
      const totalPontos = Object.values(pkg.collectionPontos).reduce(
        (sum, items) => sum + items.length,
        0
      );
      results.push({
        terreiroId: pkg.terreiroId,
        terreiroName: pkg.terreiroName,
        syncedAtMs: pkg.syncedAtMs,
        bytesEstimate: pkg.bytesEstimate,
        audiosIncluded: pkg.audiosIncluded,
        collectionsCount: pkg.collections.length,
        pontosCount: totalPontos,
      });
    }

    return results;
  } catch {
    return [];
  }
}

export type SyncProgress = {
  phase: "terreiro" | "collections" | "pontos" | "saving";
  current: number;
  total: number;
};

async function fetchTerreiroBasic(
  terreiroId: string
): Promise<{ id: string; title: string; cover_image_url: string | null }> {
  const res = await supabase
    .from("terreiros")
    .select("id, title, cover_image_url")
    .eq("id", terreiroId)
    .single();

  if (res.error) {
    const res2 = await supabase
      .from("terreiros")
      .select("id, title")
      .eq("id", terreiroId)
      .single();
    if (res2.error) throw new Error("Erro ao buscar dados do terreiro.");
    return {
      id: String((res2.data as any)?.id ?? ""),
      title: String((res2.data as any)?.title ?? "Terreiro"),
      cover_image_url: null,
    };
  }

  const d = res.data as any;
  return {
    id: String(d?.id ?? ""),
    title: String(d?.title ?? "Terreiro"),
    cover_image_url:
      typeof d?.cover_image_url === "string" ? d.cover_image_url : null,
  };
}

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const i = nextIndex++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

export async function syncTerreiroPackage(
  terreiroId: string,
  options?: { onProgress?: (progress: SyncProgress) => void }
): Promise<TerreiroOfflinePackageV1> {
  const onProgress = options?.onProgress;

  onProgress?.({ phase: "terreiro", current: 0, total: 1 });
  const terreiroData = await fetchTerreiroBasic(terreiroId);
  onProgress?.({ phase: "terreiro", current: 1, total: 1 });

  onProgress?.({ phase: "collections", current: 0, total: 1 });
  const collections = await fetchCollectionsByTerreiro(terreiroId);
  onProgress?.({ phase: "collections", current: 1, total: 1 });

  const collectionPontos: Record<string, CollectionPlayerItem[]> = {};
  const total = collections.length;

  const tasks = collections.map((col, idx) => async () => {
    const items = await fetchCollectionPontosItems(col.id);
    collectionPontos[col.id] = items;
    onProgress?.({ phase: "pontos", current: idx + 1, total });
  });

  onProgress?.({ phase: "pontos", current: 0, total });
  await runWithConcurrency(tasks, MAX_CONCURRENCY);

  onProgress?.({ phase: "saving", current: 0, total: 1 });

  const pkg: TerreiroOfflinePackageV1 = {
    version: CURRENT_VERSION,
    terreiroId,
    terreiroName: terreiroData.title,
    terreiroCoverImageUrl: terreiroData.cover_image_url,
    syncedAtMs: Date.now(),
    bytesEstimate: 0,
    audiosIncluded: false,
    collections,
    collectionPontos,
  };

  await savePackage(pkg);

  onProgress?.({ phase: "saving", current: 1, total: 1 });
  return pkg;
}
