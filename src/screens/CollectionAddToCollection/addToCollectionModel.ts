import { getErrorMessage } from "@/src/utils/errors";
import { getLyricsPreview } from "@/src/utils/format";
import type { PontoVersaoPlayerRow } from "@/src/queries/pontoVersoes";
import type { PlayerPonto } from "@/src/screens/Player/hooks/useCollectionPlayerData";

export { getErrorMessage, getLyricsPreview };

export type ListPonto = {
  id: string;
  title: string;
  tags: string[];
  lyrics: string;
  lyrics_preview_6?: string | null;
  entidadeNome: string | null;
  orixaNome: string | null;
  versoes: PontoVersaoPlayerRow[];
};

export function resolveDefaultPontoVersaoId(
  versoes: PontoVersaoPlayerRow[],
): string | null {
  if (!Array.isArray(versoes) || versoes.length === 0) return null;
  const canonical = versoes.find((v) => v.is_canonical);
  return canonical?.id ?? versoes[0]?.id ?? null;
}

export function defaultVersaoIndex(versoes: PontoVersaoPlayerRow[]): number {
  if (!Array.isArray(versoes) || versoes.length === 0) return 0;
  const i = versoes.findIndex((v) => v.is_canonical);
  return i >= 0 ? i : 0;
}

export function clampVersaoIndex(
  versoes: PontoVersaoPlayerRow[],
  stored: number | undefined,
): number {
  if (!Array.isArray(versoes) || versoes.length === 0) return 0;
  const def = defaultVersaoIndex(versoes);
  const raw =
    typeof stored === "number" && Number.isFinite(stored) ? stored : def;
  return Math.max(0, Math.min(raw, versoes.length - 1));
}

export function versaoCardTitle(
  versao: PontoVersaoPlayerRow,
  pontoTitle: string,
): string {
  const t =
    typeof versao.title === "string" && versao.title.trim()
      ? versao.title.trim()
      : null;
  return t ?? pontoTitle;
}

export function coerceStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (v): v is string => typeof v === "string" && v.trim().length > 0,
    );
  }
  if (typeof value === "string") {
    return value
      .split(/[,|]/g)
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

export function toPlayerPonto(p: ListPonto): PlayerPonto {
  return {
    id: p.id,
    title: p.title,
    artist: null,
    duration_seconds: null,
    cover_url: null,
    lyrics: p.lyrics,
    tags: Array.isArray(p.tags) ? p.tags : [],
    entidade_id: null,
    entidadeNome: p.entidadeNome ?? null,
    orixaNome: p.orixaNome ?? null,
    versoes: Array.isArray(p.versoes) ? p.versoes : [],
  };
}

export function toListPonto(p: PlayerPonto): ListPonto {
  return {
    id: p.id,
    title: p.title,
    lyrics: p.lyrics,
    tags: Array.isArray(p.tags) ? p.tags : [],
    lyrics_preview_6: p.lyrics_preview_6 ?? null,
    entidadeNome: p.entidadeNome ?? null,
    orixaNome: p.orixaNome ?? null,
    versoes: Array.isArray(p.versoes) ? p.versoes : [],
  };
}

