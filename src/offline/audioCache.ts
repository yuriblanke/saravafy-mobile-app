import { supabase } from "@/lib/supabase";
import { getPontoAudioPlaybackUrlPublic } from "@/src/api/pontoAudio";
import { getPackage, savePackage } from "@/src/offline/terreiroPackage";
import * as FileSystem from "expo-file-system/legacy";

const BASE_DIR = `${FileSystem.documentDirectory}saravafy/terreiros`;

function audioDirForTerreiro(terreiroId: string) {
  return `${BASE_DIR}/${terreiroId}/audios`;
}

function audioFilePath(terreiroId: string, pontoAudioId: string, ext: string) {
  return `${audioDirForTerreiro(terreiroId)}/${pontoAudioId}.${ext}`;
}

async function ensureDir(path: string) {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

export type AudioDownloadProgress = {
  current: number;
  total: number;
  currentPontoTitle: string;
};

type ApprovedAudioRow = {
  pontoId: string;
  pontoAudioId: string;
  pontoVersaoId: string | null;
};

async function findApprovedAudiosForPontoIds(
  pontoIds: string[]
): Promise<ApprovedAudioRow[]> {
  if (pontoIds.length === 0) return [];

  const { data, error } = await supabase
    .from("ponto_audios")
    .select("id, ponto_id, ponto_versao_id")
    .in("ponto_id", pontoIds)
    .eq("is_active", true)
    .eq("upload_status", "uploaded")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const seen = new Set<string>();
  const results: ApprovedAudioRow[] = [];
  for (const row of data as any[]) {
    const pontoId = String(row.ponto_id ?? "");
    if (!pontoId || seen.has(pontoId)) continue;
    seen.add(pontoId);
    results.push({
      pontoId,
      pontoAudioId: String(row.id ?? ""),
      pontoVersaoId:
        typeof row.ponto_versao_id === "string" ? row.ponto_versao_id : null,
    });
  }

  return results;
}

export async function downloadAudiosForPackage(
  terreiroId: string,
  options?: { onProgress?: (p: AudioDownloadProgress) => void }
): Promise<void> {
  const pkg = await getPackage(terreiroId);
  if (!pkg) throw new Error("Pacote offline não encontrado.");

  const allPontoIds: string[] = [];
  const pontoTitleMap = new Map<string, string>();

  for (const items of Object.values(pkg.collectionPontos)) {
    for (const item of items) {
      if (!allPontoIds.includes(item.ponto.id)) {
        allPontoIds.push(item.ponto.id);
        pontoTitleMap.set(item.ponto.id, item.ponto.title);
      }
    }
  }

  const approved = await findApprovedAudiosForPontoIds(allPontoIds);
  if (approved.length === 0) return;

  await ensureDir(audioDirForTerreiro(terreiroId));

  const audiosByPontoId: Record<string, string> = {};
  const total = approved.length;

  for (let i = 0; i < approved.length; i++) {
    const row = approved[i];
    const title = pontoTitleMap.get(row.pontoId) ?? "Ponto";

    options?.onProgress?.({ current: i, total, currentPontoTitle: title });

    try {
      const playback = await getPontoAudioPlaybackUrlPublic({
        pontoId: row.pontoId,
        pontoVersaoId: row.pontoVersaoId ?? undefined,
      });
      if (!playback.url) continue;

      const ext = playback.mimeType?.includes("ogg")
        ? "ogg"
        : playback.mimeType?.includes("wav")
          ? "wav"
          : "mp3";

      const filePath = audioFilePath(terreiroId, row.pontoAudioId, ext);
      const existing = await FileSystem.getInfoAsync(filePath);
      if (!existing.exists) {
        await FileSystem.downloadAsync(playback.url, filePath);
      }

      audiosByPontoId[row.pontoId] = filePath;
    } catch {
      /* skip failed downloads */
    }
  }

  options?.onProgress?.({ current: total, total, currentPontoTitle: "" });

  pkg.audiosIncluded = true;
  const json = JSON.stringify(pkg);
  pkg.bytesEstimate = json.length;
  await savePackage(pkg);
}

export async function resolveLocalAudioForPonto(
  pontoId: string
): Promise<{ uri: string } | null> {
  try {
    const dir = BASE_DIR;
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) return null;

    const terreiroDirs = await FileSystem.readDirectoryAsync(dir);
    for (const tDir of terreiroDirs) {
      const audioDir = `${dir}/${tDir}/audios`;
      const audioDirInfo = await FileSystem.getInfoAsync(audioDir);
      if (!audioDirInfo.exists) continue;

      const files = await FileSystem.readDirectoryAsync(audioDir);
      // ponto_audios são nomeados por pontoAudioId, não por pontoId.
      // Precisamos checar o pacote para mapear pontoId → arquivo.
      const pkg = await getPackage(tDir);
      if (!pkg) continue;

      for (const items of Object.values(pkg.collectionPontos)) {
        for (const item of items) {
          if (item.ponto.id !== pontoId) continue;
          // Buscar qualquer arquivo neste diretório de áudio
          for (const file of files) {
            const fullPath = `${audioDir}/${file}`;
            const info = await FileSystem.getInfoAsync(fullPath);
            if (info.exists && info.size && info.size > 0) {
              return { uri: fullPath };
            }
          }
        }
      }
    }
  } catch {
    /* best effort */
  }
  return null;
}

export async function clearAudiosForTerreiro(
  terreiroId: string
): Promise<void> {
  try {
    const dir = audioDirForTerreiro(terreiroId);
    const info = await FileSystem.getInfoAsync(dir);
    if (info.exists) {
      await FileSystem.deleteAsync(dir, { idempotent: true });
    }

    const pkg = await getPackage(terreiroId);
    if (pkg) {
      pkg.audiosIncluded = false;
      await savePackage(pkg);
    }
  } catch {
    /* best effort */
  }
}
