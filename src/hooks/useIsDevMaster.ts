import { useMemo } from "react";

import { useAuth } from "@/contexts/AuthContext";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

// Configuração mínima e segura.
// - Preferência: EXPO_PUBLIC_DEV_MASTER_EMAILS="a@b.com,c@d.com" (ou separado por espaço)
// - Fallback: lista fixa (mantida pequena e explícita)
const FALLBACK_DEV_MASTER_EMAILS: readonly string[] = ["yuriblanke@gmail.com"];

export function useIsDevMaster(): { isDevMaster: boolean; isLoading: boolean } {
  const { user } = useAuth();

  const userEmail = typeof user?.email === "string" ? user.email : "";
  const normalizedUserEmail = userEmail ? normalizeEmail(userEmail) : "";

  const allowList = useMemo(() => {
    const raw =
      (typeof process !== "undefined" &&
        typeof process.env === "object" &&
        (process.env as any).EXPO_PUBLIC_DEV_MASTER_EMAILS) ||
      "";

    const parsed = String(raw)
      .split(/[\s,;]+/g)
      .map((v) => normalizeEmail(v))
      .filter(Boolean);

    return parsed.length ? parsed : Array.from(FALLBACK_DEV_MASTER_EMAILS);
  }, []);

  const isDevMaster =
    !!normalizedUserEmail && allowList.includes(normalizedUserEmail);

  return { isDevMaster, isLoading: false };
}
