import AsyncStorage from "@react-native-async-storage/async-storage";

type SnoozeCount = 0 | 1 | 2;

export type TerreiroInviteSnoozeInfo = {
  count: SnoozeCount;
  lastSnoozedAt: number | null;
};

export type TerreiroInviteSnoozeMap = Record<string, TerreiroInviteSnoozeInfo>;

const KEY_PREFIX_V2 = "inviteGate:terreiroInviteSnooze:v2:";
const KEY_PREFIX_V1 = "inviteGate:snoozedInviteIds:v1:";

function keyV2(normalizedEmail: string) {
  return `${KEY_PREFIX_V2}${normalizedEmail}`;
}

function keyV1(normalizedEmail: string) {
  return `${KEY_PREFIX_V1}${normalizedEmail}`;
}

function safeParseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function loadTerreiroInviteSnoozeMap(
  normalizedEmail: string
): Promise<TerreiroInviteSnoozeMap> {
  const rawV2 = await AsyncStorage.getItem(keyV2(normalizedEmail));
  const parsedV2 = safeParseJson(rawV2);
  if (parsedV2 && typeof parsedV2 === "object" && !Array.isArray(parsedV2)) {
    return parsedV2 as TerreiroInviteSnoozeMap;
  }

  // Migration: legacy v1 stored a Set/Array of snoozed invite IDs.
  const rawV1 = await AsyncStorage.getItem(keyV1(normalizedEmail));
  const parsedV1 = safeParseJson(rawV1);

  const ids: string[] = Array.isArray(parsedV1)
    ? parsedV1.map((x) => String(x))
    : [];

  if (!ids.length) return {};

  const now = Date.now();
  const migrated: TerreiroInviteSnoozeMap = {};
  for (const id of ids) {
    migrated[id] = { count: 2, lastSnoozedAt: now };
  }

  await AsyncStorage.setItem(keyV2(normalizedEmail), JSON.stringify(migrated));
  return migrated;
}

export function getTerreiroInviteSnoozeInfo(
  map: TerreiroInviteSnoozeMap,
  inviteId: string
): TerreiroInviteSnoozeInfo {
  const v = map[inviteId];
  if (!v) return { count: 0, lastSnoozedAt: null };

  const count =
    v.count === 0 || v.count === 1 || v.count === 2 ? v.count : 0;
  const lastSnoozedAt =
    typeof v.lastSnoozedAt === "number" ? v.lastSnoozedAt : null;

  return { count, lastSnoozedAt };
}

export async function bumpTerreiroInviteSnooze(
  normalizedEmail: string,
  inviteId: string
): Promise<TerreiroInviteSnoozeInfo> {
  const map = await loadTerreiroInviteSnoozeMap(normalizedEmail);
  const prev = getTerreiroInviteSnoozeInfo(map, inviteId);

  const nextCount = (Math.min(2, prev.count + 1) as SnoozeCount) ?? 2;
  const next: TerreiroInviteSnoozeInfo = {
    count: nextCount,
    lastSnoozedAt: Date.now(),
  };

  map[inviteId] = next;
  await AsyncStorage.setItem(keyV2(normalizedEmail), JSON.stringify(map));
  return next;
}
