/**
 * Placeholder na letra para o nome de entidade escolhido na entrada da coleção
 * (`collections_pontos.entidade_id` / `entidade_texto`).
 */
const ENTIDADE_PLACEHOLDER_GLOBAL = /\[entidade\]/gi;

/** Texto do chip quando o marcador ainda não foi escolhido (sem `[]` na UI). */
export const ENTIDADE_PLACEHOLDER_CHIP_LABEL = "Entidade";

export function getCollectionEntidadeDisplayLabel(params: {
  entidadeTexto: string | null | undefined;
  entidadeLabelFromId: string | null | undefined;
}): string {
  const t = String(params.entidadeTexto ?? "").trim();
  if (t) return t;
  return String(params.entidadeLabelFromId ?? "").trim();
}

/** Segmentos para renderizar `[entidade]` inline (sem substituir string antes). */
export function splitLyricsByEntidadeMarker(lyrics: string): Array<
  { type: "text"; text: string } | { type: "marker" }
> {
  const s = String(lyrics ?? "");
  const re = /\[entidade\]/gi;
  const out: Array<
    { type: "text"; text: string } | { type: "marker" }
  > = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const r = new RegExp(re.source, re.flags);
  while ((m = r.exec(s)) !== null) {
    if (m.index > last) {
      out.push({ type: "text", text: s.slice(last, m.index) });
    }
    out.push({ type: "marker" });
    last = m.index + m[0].length;
  }
  if (last < s.length) {
    out.push({ type: "text", text: s.slice(last) });
  }
  if (out.length === 0) {
    out.push({ type: "text", text: s });
  }
  return out;
}

export function lyricsHasEntidadePlaceholder(lyrics: string): boolean {
  return /\[entidade\]/i.test(String(lyrics ?? ""));
}

export function applyEntidadePlaceholder(
  lyrics: string,
  replacement: string,
): string {
  const r = String(replacement ?? "").trim() || "[entidade]";
  return String(lyrics ?? "").replace(ENTIDADE_PLACEHOLDER_GLOBAL, r);
}

export function resolveLyricsWithCollectionEntidade(params: {
  rawLyrics: string;
  /** Texto livre salvo em `collections_pontos.entidade_texto`. */
  entidadeTexto: string | null | undefined;
  /** Label resolvido a partir de `entidade_id` + join em `entidades`. */
  entidadeLabelFromId: string | null | undefined;
}): string {
  const raw = String(params.rawLyrics ?? "");
  if (!lyricsHasEntidadePlaceholder(raw)) return raw;

  const custom = String(params.entidadeTexto ?? "").trim();
  if (custom) return applyEntidadePlaceholder(raw, custom);

  const fromId = String(params.entidadeLabelFromId ?? "").trim();
  if (fromId) return applyEntidadePlaceholder(raw, fromId);

  return raw;
}
