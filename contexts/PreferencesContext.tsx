import AsyncStorage from "@react-native-async-storage/async-storage";
import { activateKeepAwake, deactivateKeepAwake } from "expo-keep-awake";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, Platform, type ColorSchemeName } from "react-native";

import { supabase } from "@/lib/supabase";

export type ThemeMode = "system" | "light" | "dark";
export type ThemeVariant = "light" | "dark";

export type TerreiroRole = "admin" | "editor" | "follower";

export type ManagedTerreiro = {
  id: string;
  name: string;
  avatarUrl?: string;
  role: TerreiroRole;
};

export type ActiveContextKind = "USER_PROFILE" | "TERREIRO_PAGE";

export type ActiveContext =
  | { kind: "USER_PROFILE" }
  | {
      kind: "TERREIRO_PAGE";
      terreiroId: string;
      terreiroName?: string;
      terreiroAvatarUrl?: string;
      role?: TerreiroRole;
    };

function isMissingRelationshipError(error: unknown) {
  const message =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";

  return (
    message.includes("Could not find a relationship") ||
    message.includes("relationship") ||
    message.includes("foreign key")
  );
}

function safeLocaleCompare(a: string, b: string) {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
}

type TerreiroRow = {
  id: string;
  name: string;
  avatar_url?: string | null;
  image_url?: string | null;
};

type TerreiroMemberWithJoinRow = {
  terreiro_id: string;
  role: TerreiroRole;
  terreiros?: TerreiroRow | TerreiroRow[] | null;
};

type TerreiroMemberRow = {
  terreiro_id: string;
  role: TerreiroRole;
};

export async function fetchTerreirosQueAdministro(userId: string) {
  if (!userId) return [] as ManagedTerreiro[];

  const allowedRoles = ["admin", "editor"] as const;

  const selectWithAllTerreiroFields =
    "terreiro_id, role, terreiros(id, name, avatar_url, image_url)";
  const selectWithImageOnly =
    "terreiro_id, role, terreiros(id, name, image_url)";
  const selectWithoutImages = "terreiro_id, role, terreiros(id, name)";

  const selectTerreirosAll = "id, name, avatar_url, image_url";
  const selectTerreirosImageOnly = "id, name, image_url";
  const selectTerreirosWithoutImages = "id, name";

  let joined: any = await supabase
    .from("terreiro_members")
    .select(selectWithAllTerreiroFields)
    .eq("user_id", userId)
    .in("role", [...allowedRoles]);

  if (
    joined.error &&
    typeof joined.error.message === "string" &&
    joined.error.message.includes("avatar_url") &&
    joined.error.message.includes("does not exist")
  ) {
    joined = await supabase
      .from("terreiro_members")
      .select(selectWithImageOnly)
      .eq("user_id", userId)
      .in("role", [...allowedRoles]);
  }

  if (
    joined.error &&
    typeof joined.error.message === "string" &&
    joined.error.message.includes("image_url") &&
    joined.error.message.includes("does not exist")
  ) {
    joined = await supabase
      .from("terreiro_members")
      .select(selectWithoutImages)
      .eq("user_id", userId)
      .in("role", [...allowedRoles]);
  }

  if (__DEV__) {
    const err = joined.error
      ? typeof joined.error.message === "string"
        ? joined.error.message
        : String(joined.error)
      : null;
    console.info("[TerreirosAdmin] joined query", {
      userId,
      ok: !joined.error,
      rows: Array.isArray(joined.data) ? joined.data.length : 0,
      error: err,
    });
  }

  if (!joined.error) {
    const rows = (joined.data ?? []) as unknown as TerreiroMemberWithJoinRow[];
    const byId = new Map<string, ManagedTerreiro>();

    for (const row of rows) {
      const role = row.role;
      if (role !== "admin" && role !== "editor") continue;

      const rawTerreiro = row.terreiros;
      const terreiro = Array.isArray(rawTerreiro)
        ? rawTerreiro[0]
        : rawTerreiro;
      if (!terreiro?.id || !terreiro?.name) continue;

      const avatarUrl =
        (typeof terreiro.avatar_url === "string" && terreiro.avatar_url) ||
        (typeof terreiro.image_url === "string" && terreiro.image_url) ||
        undefined;

      const existing = byId.get(terreiro.id);
      if (!existing) {
        byId.set(terreiro.id, {
          id: terreiro.id,
          name: terreiro.name,
          avatarUrl,
          role,
        });
      } else if (existing.role !== "admin" && role === "admin") {
        byId.set(terreiro.id, { ...existing, role });
      }
    }

    return Array.from(byId.values()).sort((a, b) =>
      safeLocaleCompare(a.name, b.name)
    );
  }

  if (!isMissingRelationshipError(joined.error)) {
    throw new Error(
      typeof joined.error.message === "string"
        ? joined.error.message
        : "Erro ao buscar terreiros"
    );
  }

  const members = await supabase
    .from("terreiro_members")
    .select("terreiro_id, role")
    .eq("user_id", userId)
    .in("role", [...allowedRoles]);

  if (__DEV__) {
    const err = members.error
      ? typeof members.error.message === "string"
        ? members.error.message
        : String(members.error)
      : null;
    console.info("[TerreirosAdmin] members fallback", {
      userId,
      ok: !members.error,
      rows: Array.isArray(members.data) ? members.data.length : 0,
      error: err,
    });
  }

  if (members.error) {
    throw new Error(
      typeof members.error.message === "string"
        ? members.error.message
        : "Erro ao buscar permissões de terreiros"
    );
  }

  const memberRows = (members.data ?? []) as TerreiroMemberRow[];
  const ids = Array.from(
    new Set(memberRows.map((m) => m.terreiro_id).filter(Boolean))
  );

  if (ids.length === 0) return [] as ManagedTerreiro[];

  let terreiros: any = await supabase
    .from("terreiros")
    .select(selectTerreirosAll)
    .in("id", ids);

  if (
    terreiros.error &&
    typeof terreiros.error.message === "string" &&
    terreiros.error.message.includes("avatar_url") &&
    terreiros.error.message.includes("does not exist")
  ) {
    terreiros = await supabase
      .from("terreiros")
      .select(selectTerreirosImageOnly)
      .in("id", ids);
  }

  if (
    terreiros.error &&
    typeof terreiros.error.message === "string" &&
    terreiros.error.message.includes("image_url") &&
    terreiros.error.message.includes("does not exist")
  ) {
    terreiros = await supabase
      .from("terreiros")
      .select(selectTerreirosWithoutImages)
      .in("id", ids);
  }

  if (__DEV__) {
    const err = terreiros.error
      ? typeof terreiros.error.message === "string"
        ? terreiros.error.message
        : String(terreiros.error)
      : null;
    console.info("[TerreirosAdmin] terreiros fallback", {
      idsCount: ids.length,
      ok: !terreiros.error,
      rows: Array.isArray(terreiros.data) ? terreiros.data.length : 0,
      error: err,
    });
  }

  if (terreiros.error) {
    throw new Error(
      typeof terreiros.error.message === "string"
        ? terreiros.error.message
        : "Erro ao buscar terreiros"
    );
  }

  const roleByTerreiroId = new Map<string, "admin" | "editor">();
  for (const row of memberRows) {
    const role = row.role;
    if (role !== "admin" && role !== "editor") continue;
    const prev = roleByTerreiroId.get(row.terreiro_id);
    if (!prev || prev !== "admin") {
      roleByTerreiroId.set(row.terreiro_id, role);
    }
  }

  const terreiroRows = (terreiros.data ?? []) as TerreiroRow[];
  const result: ManagedTerreiro[] = terreiroRows
    .map((t) => {
      const role = roleByTerreiroId.get(t.id);
      if (!role) return null;

      const avatarUrl =
        (typeof t.avatar_url === "string" && t.avatar_url) ||
        (typeof t.image_url === "string" && t.image_url) ||
        undefined;

      return { id: t.id, name: t.name, avatarUrl, role };
    })
    .filter(Boolean) as ManagedTerreiro[];

  return result.sort((a, b) => safeLocaleCompare(a.name, b.name));
}

type PreferencesContextValue = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  effectiveTheme: ThemeVariant;

  activeContext: ActiveContext;
  setActiveContext: (next: ActiveContext) => void;
  managedTerreiros: ManagedTerreiro[];

  loadingTerreirosAdmin: boolean;
  terreirosAdmin: ManagedTerreiro[];
  erroTerreirosAdmin: string | null;
  hasLoadedTerreirosAdmin: boolean;
  hasAttemptedTerreirosAdmin: boolean;
  fetchTerreirosQueAdministro: (userId: string) => Promise<void>;

  curimbaEnabled: boolean;
  setCurimbaEnabled: (enabled: boolean) => void;

  curimbaOnboardingDismissed: boolean;
  setCurimbaOnboardingDismissed: (dismissed: boolean) => void;

  isReady: boolean;
};

const STORAGE_KEYS = {
  themeMode: "@saravafy:themeMode",
  curimbaEnabled: "@saravafy:curimbaEnabled",
  curimbaOnboardingDismissed: "@saravafy:curimbaOnboardingDismissed",
} as const;

const PreferencesContext = createContext<PreferencesContextValue | undefined>(
  undefined
);

function coerceThemeMode(value: unknown): ThemeMode | null {
  if (value === "system" || value === "light" || value === "dark") return value;
  return null;
}

function resolveThemeVariant(
  mode: ThemeMode,
  system: ColorSchemeName
): ThemeVariant {
  if (mode === "light") return "light";
  if (mode === "dark") return "dark";
  return system === "dark" ? "dark" : "light";
}

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("light");
  const [curimbaEnabled, setCurimbaEnabledState] = useState(false);
  const [curimbaOnboardingDismissed, setCurimbaOnboardingDismissedState] =
    useState(false);
  const [isReady, setIsReady] = useState(false);
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  // Contexto ativo (Meu perfil ↔ Página do terreiro) vive apenas em memória.
  // Não persistimos em AsyncStorage e não sincronizamos com backend.
  const [activeContext, setActiveContext] = useState<ActiveContext>({
    kind: "USER_PROFILE",
  });

  // Lista local de terreiros onde o usuário tem permissão (admin/editor/follower).
  // Por enquanto, isso não vem de API (será plugado depois).
  const [managedTerreiros] = useState<ManagedTerreiro[]>([]);

  const [loadingTerreirosAdmin, setLoadingTerreirosAdmin] = useState(false);
  const [terreirosAdmin, setTerreirosAdmin] = useState<ManagedTerreiro[]>([]);
  const [erroTerreirosAdmin, setErroTerreirosAdmin] = useState<string | null>(
    null
  );
  const [didLoadTerreirosAdmin, setDidLoadTerreirosAdmin] = useState(false);
  const [didAttemptTerreirosAdmin, setDidAttemptTerreirosAdmin] =
    useState(false);

  const effectiveTheme = useMemo(
    () => resolveThemeVariant(themeMode, systemScheme),
    [themeMode, systemScheme]
  );

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [rawThemeMode, rawCurimba, rawDismissed] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.themeMode),
          AsyncStorage.getItem(STORAGE_KEYS.curimbaEnabled),
          AsyncStorage.getItem(STORAGE_KEYS.curimbaOnboardingDismissed),
        ]);

        if (cancelled) return;

        // Primeira execução: começar no tema claro (especialmente no login).
        if (rawThemeMode == null) {
          setThemeModeState("light");
          AsyncStorage.setItem(STORAGE_KEYS.themeMode, "light").catch(
            () => undefined
          );
        } else {
          const parsedThemeMode = coerceThemeMode(rawThemeMode) ?? "light";
          setThemeModeState(parsedThemeMode);
        }

        setCurimbaEnabledState(rawCurimba === "true");
        setCurimbaOnboardingDismissedState(rawDismissed === "true");
      } finally {
        if (!cancelled) setIsReady(true);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Modo Curimba: manter tela ligada.
    if (curimbaEnabled) {
      activateKeepAwake("saravafy-curimba");
      return () => {
        deactivateKeepAwake("saravafy-curimba");
      };
    }

    deactivateKeepAwake("saravafy-curimba");
    return;
  }, [curimbaEnabled]);

  useEffect(() => {
    // Android: sincronizar a "barra de baixo" (Navigation Bar) com o tema.
    // Com edge-to-edge enabled, a Navigation Bar é transparente/overlay e mostra
    // o fundo do app (SaravafyScreen) atrás dela. Apenas controlamos o estilo dos ícones.
    if (Platform.OS !== "android") return;

    const buttonStyle = effectiveTheme === "dark" ? "light" : "dark";

    (async () => {
      try {
        const NavigationBar = await import("expo-navigation-bar");
        await NavigationBar.setButtonStyleAsync(buttonStyle);
      } catch {
        // Sem ação: em um dev client antigo, o módulo nativo pode não estar presente.
      }
    })();
  }, [effectiveTheme]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(STORAGE_KEYS.themeMode, mode).catch(() => undefined);
  };

  const setCurimbaEnabled = (enabled: boolean) => {
    setCurimbaEnabledState(enabled);
    AsyncStorage.setItem(STORAGE_KEYS.curimbaEnabled, String(enabled)).catch(
      () => undefined
    );
  };

  const setCurimbaOnboardingDismissed = (dismissed: boolean) => {
    setCurimbaOnboardingDismissedState(dismissed);
    AsyncStorage.setItem(
      STORAGE_KEYS.curimbaOnboardingDismissed,
      String(dismissed)
    ).catch(() => undefined);
  };

  const loadTerreirosQueAdministro = async (userId: string) => {
    if (!userId) {
      setErroTerreirosAdmin("Usuário não autenticado.");
      setTerreirosAdmin([]);
      setDidLoadTerreirosAdmin(false);
      setDidAttemptTerreirosAdmin(false);
      return;
    }

    setLoadingTerreirosAdmin(true);
    setErroTerreirosAdmin(null);
    setDidAttemptTerreirosAdmin(true);

    if (__DEV__) {
      console.info("[TerreirosAdmin] load start", { userId });
    }

    try {
      const list = await fetchTerreirosQueAdministro(userId);
      setTerreirosAdmin(list);
      setDidLoadTerreirosAdmin(true);

      if (__DEV__) {
        console.info("[TerreirosAdmin] load ok", {
          count: list.length,
          ids: list.map((t) => t.id),
        });
      }
    } catch (error) {
      setTerreirosAdmin([]);
      setDidLoadTerreirosAdmin(false);
      setErroTerreirosAdmin(
        error instanceof Error ? error.message : "Erro ao buscar terreiros"
      );

      if (__DEV__) {
        console.warn("[TerreirosAdmin] load error", {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      setLoadingTerreirosAdmin(false);
    }
  };

  const value: PreferencesContextValue = {
    themeMode,
    setThemeMode,
    effectiveTheme,
    activeContext,
    setActiveContext,
    managedTerreiros,
    loadingTerreirosAdmin,
    terreirosAdmin,
    erroTerreirosAdmin,
    hasLoadedTerreirosAdmin: didLoadTerreirosAdmin,
    hasAttemptedTerreirosAdmin: didAttemptTerreirosAdmin,
    fetchTerreirosQueAdministro: loadTerreirosQueAdministro,
    curimbaEnabled,
    setCurimbaEnabled,
    curimbaOnboardingDismissed,
    setCurimbaOnboardingDismissed,
    isReady,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return ctx;
}
