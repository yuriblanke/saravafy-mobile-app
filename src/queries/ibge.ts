import { useQuery } from "@tanstack/react-query";

type IbgeMunicipio = { nome?: string };

export async function fetchIbgeMunicipiosByUf(uf: string): Promise<string[]> {
  const safeUf = (uf ?? "").trim().toUpperCase();
  if (!safeUf) return [];

  const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(
    safeUf
  )}/municipios?orderBy=nome`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`IBGE: não foi possível carregar cidades (${res.status}).`);
  }

  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];

  return (data as IbgeMunicipio[])
    .map((m) => (typeof m?.nome === "string" ? m.nome.trim() : ""))
    .filter(Boolean);
}

export function useIbgeMunicipios(uf: string | null) {
  const safeUf = uf ? uf.trim().toUpperCase() : null;
  return useQuery({
    queryKey: safeUf ? ["ibge", "municipios", safeUf] : [],
    enabled: !!safeUf,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    queryFn: () => fetchIbgeMunicipiosByUf(safeUf!),
  });
}
