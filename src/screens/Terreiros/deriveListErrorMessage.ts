import { getErrorMessage, isNetworkError } from "@/src/lib/errors";

export function deriveListErrorMessage(params: {
  isError: boolean;
  error: unknown;
  rowCount: number;
}): string | null {
  if (!params.isError) return null;
  if (params.rowCount > 0) return null; // never hide content we already have
  return isNetworkError(params.error)
    ? getErrorMessage(params.error)
    : "Ops, seu app parece estar desatualizado.";
}
