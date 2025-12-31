import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { useIsCurator } from "@/src/hooks/useIsCurator";
import { queryKeys } from "@/src/queries/queryKeys";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type CuratorModeContextValue = {
  curatorModeEnabled: boolean;
  isLoading: boolean;
  isSaving: boolean;
  setCuratorModeEnabled: (next: boolean) => Promise<void>;
};

const CuratorModeContext = createContext<CuratorModeContextValue | undefined>(
  undefined
);

function isColumnMissingError(error: unknown, columnName: string) {
  const msg =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";

  const m = msg.toLowerCase();
  return (
    m.includes(columnName.toLowerCase()) &&
    (m.includes("does not exist") || m.includes("column"))
  );
}

export function CuratorModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [isSaving, setIsSaving] = useState(false);

  const { isCurator } = useIsCurator();

  const profileKey = useMemo(() => {
    return userId ? queryKeys.me.profile(userId) : ([] as any);
  }, [userId]);

  const q = useQuery({
    queryKey: profileKey,
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return false;

      const res = await supabase
        .from("profiles")
        .select("curator_mode_enabled")
        .eq("id", userId)
        .single();

      if (res.error) {
        if (isColumnMissingError(res.error, "curator_mode_enabled")) {
          return false;
        }

        const message =
          typeof res.error.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Erro ao carregar preferências.";
        throw new Error(message);
      }

      return !!(res.data as any)?.curator_mode_enabled;
    },
    placeholderData: (prev) => prev,
  });

  const setCuratorModeEnabled = useCallback(
    async (next: boolean) => {
      if (!userId) return;
      if (!isCurator) return;

      const prev = (queryClient.getQueryData(profileKey) as boolean) ?? false;

      queryClient.setQueryData(profileKey, next);

      setIsSaving(true);
      try {
        const res = await supabase
          .from("profiles")
          .update({ curator_mode_enabled: next })
          .eq("id", userId)
          .select("curator_mode_enabled")
          .single();

        if (res.error) {
          queryClient.setQueryData(profileKey, prev);

          const message =
            typeof res.error.message === "string" && res.error.message.trim()
              ? res.error.message
              : "Não foi possível atualizar agora.";
          showToast(message);
          return;
        }

        const persisted = !!(res.data as any)?.curator_mode_enabled;
        queryClient.setQueryData(profileKey, persisted);
      } finally {
        setIsSaving(false);
      }
    },
    [isCurator, profileKey, queryClient, showToast, userId]
  );

  const value: CuratorModeContextValue = useMemo(
    () => ({
      curatorModeEnabled: isCurator ? !!q.data : false,
      isLoading: q.isLoading,
      isSaving,
      setCuratorModeEnabled,
    }),
    [isCurator, isSaving, q.data, q.isLoading, setCuratorModeEnabled]
  );

  return (
    <CuratorModeContext.Provider value={value}>
      {children}
    </CuratorModeContext.Provider>
  );
}

export function useCuratorMode() {
  const ctx = useContext(CuratorModeContext);
  if (!ctx) {
    throw new Error("useCuratorMode must be used within CuratorModeProvider");
  }
  return ctx;
}
