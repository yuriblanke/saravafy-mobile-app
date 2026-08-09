import { useNetwork } from "@/src/contexts/NetworkContext";
import {
  listPackages,
  syncTerreiroPackage,
} from "@/src/offline/terreiroPackage";
import { queryKeys } from "@/src/queries/queryKeys";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

const MIN_SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 min entre syncs automáticos

async function syncAllSavedTerreiros(
  invalidate: (terreiroId: string) => Promise<void>
) {
  const packages = await listPackages();
  if (packages.length === 0) return;

  for (const meta of packages) {
    try {
      await syncTerreiroPackage(meta.terreiroId);
      await invalidate(meta.terreiroId);
    } catch {
      /* silent — não interrompe os demais */
    }
  }
}

/**
 * Sincroniza silenciosamente em background as letras de todos os terreiros
 * salvos offline. Disparado:
 *  - na abertura do app (mount)
 *  - quando o app volta do background para foreground
 * Respeita um intervalo mínimo de 30 min entre syncs para não estressar a rede.
 */
export function useOfflineAutoSync() {
  const queryClient = useQueryClient();
  const { isConnected } = useNetwork();
  const lastSyncAtMs = useRef<number>(0);
  const isSyncing = useRef(false);

  const invalidate = async (terreiroId: string) => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.offline.terreiroPackage(terreiroId),
    });
    await queryClient.invalidateQueries({
      queryKey: queryKeys.offline.allPackages(),
    });
  };

  const maybeSync = (connected: boolean) => {
    if (!connected) return;
    if (isSyncing.current) return;
    const now = Date.now();
    if (now - lastSyncAtMs.current < MIN_SYNC_INTERVAL_MS) return;

    isSyncing.current = true;
    lastSyncAtMs.current = now;

    void syncAllSavedTerreiros(invalidate).finally(() => {
      isSyncing.current = false;
    });
  };

  // Sync ao montar (abertura do app)
  useEffect(() => {
    maybeSync(isConnected);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync ao voltar do background
  useEffect(() => {
    const handleChange = (next: AppStateStatus) => {
      if (next === "active") {
        maybeSync(isConnected);
      }
    };

    const sub = AppState.addEventListener("change", handleChange);
    return () => sub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);
}
