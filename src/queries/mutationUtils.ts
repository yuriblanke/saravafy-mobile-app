import type {
  QueryClient,
  QueryFilters,
  QueryKey,
  Updater,
} from "@tanstack/react-query";

export type QuerySnapshot = Array<{ queryKey: QueryKey; data: unknown }>;

function stableKeyString(key: QueryKey): string {
  try {
    return JSON.stringify(key);
  } catch {
    return String(key);
  }
}

export async function cancelQueries(
  queryClient: QueryClient,
  filters: QueryFilters[]
): Promise<void> {
  await Promise.all(filters.map((f) => queryClient.cancelQueries(f)));
}

export function snapshotQueries(
  queryClient: QueryClient,
  filters: QueryFilters[]
): QuerySnapshot {
  const seen = new Set<string>();
  const out: QuerySnapshot = [];

  for (const filter of filters) {
    const entries = queryClient.getQueriesData(filter);
    for (const [queryKey, data] of entries) {
      const keyStr = stableKeyString(queryKey);
      if (seen.has(keyStr)) continue;
      seen.add(keyStr);
      out.push({ queryKey, data });
    }
  }

  return out;
}

export function rollbackQueries(
  queryClient: QueryClient,
  snapshot: QuerySnapshot
): void {
  for (const item of snapshot) {
    queryClient.setQueryData(item.queryKey, item.data);
  }
}

export function setQueriesDataSafe<TQueryFnData>(
  queryClient: QueryClient,
  filter: QueryFilters,
  updater: Updater<TQueryFnData | undefined, TQueryFnData | undefined>
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryClient.setQueriesData(filter as any, updater as any);
}

export function makeTempId(prefix = "tmp"): string {
  const rand = Math.random().toString(16).slice(2);
  return `${prefix}_${Date.now().toString(16)}_${rand}`;
}

export function upsertById<T extends { id: string }>(
  list: readonly T[] | undefined,
  item: T,
  opts?: { prepend?: boolean }
): T[] {
  const arr = Array.isArray(list) ? [...list] : [];
  const idx = arr.findIndex((x) => x.id === item.id);
  if (idx >= 0) {
    arr[idx] = item;
    return arr;
  }

  if (opts?.prepend) return [item, ...arr];
  return [...arr, item];
}

export function patchById<T extends { id: string }>(
  list: readonly T[] | undefined,
  id: string,
  patch: Partial<T>
): T[] {
  const arr = Array.isArray(list) ? [...list] : [];
  return arr.map((x) => (x.id === id ? ({ ...x, ...patch } as T) : x));
}

export function removeById<T extends { id: string }>(
  list: readonly T[] | undefined,
  id: string
): T[] {
  const arr = Array.isArray(list) ? list : [];
  return arr.filter((x) => x.id !== id);
}

export function replaceId<T extends { id: string }>(
  list: readonly T[] | undefined,
  fromId: string,
  toId: string
): T[] {
  const arr = Array.isArray(list) ? [...list] : [];
  return arr.map((x) => (x.id === fromId ? ({ ...x, id: toId } as T) : x));
}
