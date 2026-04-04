import { supabase } from "@/lib/supabase";
import {
    buildEntidadeComOrixaFromEmbed,
    resolveEntidadeLabel,
} from "@/src/domain/entidade";
import { queryKeys } from "@/src/queries/queryKeys";
import { useQuery } from "@tanstack/react-query";

export type EntidadeCatalogOption = {
  id: string;
  /** Label para UI e substituição de `[entidade]`. */
  label: string;
  /** `collections_pontos.entidade_orixa_id` quando a linha tem orixá encadeado. */
  orixaEntidadeId: string | null;
};

function rowToOption(raw: Record<string, unknown>): EntidadeCatalogOption | null {
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : "";
  if (!id) return null;

  const ent = buildEntidadeComOrixaFromEmbed(raw);
  if (!ent) return null;

  let label = resolveEntidadeLabel(ent).trim();
  if (!label) {
    const linha =
      typeof raw.linha === "string" ? raw.linha.trim() : "";
    label = linha || id;
  }
  if (!label) return null;

  const orixaEmbed = raw.orixa ?? raw.orixas;
  const orixaRow = Array.isArray(orixaEmbed) ? orixaEmbed[0] : orixaEmbed;
  let orixaEntidadeId: string | null = null;
  if (orixaRow && typeof orixaRow === "object") {
    const ox = (orixaRow as Record<string, unknown>).id;
    if (typeof ox === "string" && ox.trim()) orixaEntidadeId = ox.trim();
  }

  return { id, label, orixaEntidadeId };
}

const CATALOG_PAGE_SIZE = 1000;

export async function fetchEntidadesCatalogOptions(): Promise<
  EntidadeCatalogOption[]
> {
  const select =
    "id, nome, linha, orixa:entidades ( id, nome, linha )";

  const rows: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const res = await supabase
      .from("entidades")
      .select(select)
      .eq("is_active", true)
      .order("nome", { ascending: true, nullsFirst: false })
      .range(from, from + CATALOG_PAGE_SIZE - 1);

    if (res.error) {
      const anyErr = res.error as any;
      const message =
        typeof anyErr?.message === "string" && anyErr.message.trim()
          ? anyErr.message
          : "Erro ao carregar entidades.";
      throw new Error(message);
    }

    const batch = (res.data ?? []) as Record<string, unknown>[];
    rows.push(...batch);
    if (batch.length < CATALOG_PAGE_SIZE) break;
    from += CATALOG_PAGE_SIZE;
  }

  const out: EntidadeCatalogOption[] = [];
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const opt = rowToOption(raw);
    if (opt) out.push(opt);
  }
  return out;
}

export function useEntidadesCatalogQuery(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: queryKeys.entidades.catalog(),
    queryFn: fetchEntidadesCatalogOptions,
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
