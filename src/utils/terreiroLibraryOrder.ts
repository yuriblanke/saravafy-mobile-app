import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_PREFIX = "saravafy:terreiro-library-order:";

function storageKey(terreiroId: string) {
  return `${STORAGE_PREFIX}${terreiroId}`;
}

export async function loadTerreiroLibraryOrder(
  terreiroId: string
): Promise<string[]> {
  if (!terreiroId) return [];

  const raw = await AsyncStorage.getItem(storageKey(terreiroId));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v) => (typeof v === "string" ? v : "")).filter(Boolean);
  } catch {
    return [];
  }
}

export async function saveTerreiroLibraryOrder(
  terreiroId: string,
  orderedIds: string[]
): Promise<void> {
  if (!terreiroId) return;
  const clean = orderedIds
    .map((v) => (typeof v === "string" ? v : ""))
    .filter(Boolean);
  await AsyncStorage.setItem(storageKey(terreiroId), JSON.stringify(clean));
}

export function applyTerreiroLibraryOrder<T extends { id: string }>(
  items: readonly T[],
  orderedIds: readonly string[]
): T[] {
  const order = (orderedIds ?? []).filter(Boolean);
  if (order.length === 0) return [...items];

  const byId = new Map<string, T>();
  for (const it of items) {
    const id = typeof it?.id === "string" ? it.id : "";
    if (!id) continue;
    byId.set(id, it);
  }

  const result: T[] = [];
  const used = new Set<string>();

  for (const id of order) {
    const item = byId.get(id);
    if (!item) continue;
    used.add(id);
    result.push(item);
  }

  for (const it of items) {
    const id = typeof it?.id === "string" ? it.id : "";
    if (!id) continue;
    if (used.has(id)) continue;
    result.push(it);
  }

  return result;
}
