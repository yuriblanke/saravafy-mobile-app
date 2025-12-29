import AsyncStorage from "@react-native-async-storage/async-storage";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as NavigationBar from "expo-navigation-bar";
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

export type StartPagePreference = {
  type: "TERREIRO";
  terreiroId: string;
  terreiroTitle?: string;
  updatedAt: string;
} | null;

function isTerreiroMembersPolicyRecursionError(error: unknown) {
  const message =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";

  const m = (message ?? "").toLowerCase();
  return (
    m.includes("infinite recursion detected in policy") &&
    m.includes('relation "terreiro_members"')
  );
}

function safeLocaleCompare(a: string, b: string) {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
}

type TerreiroRow = {
  id: string;
  title: string;
  cover_image_url?: string | null;
  avatar_url?: string | null;
  image_url?: string | null;
};

type TerreiroMemberRow = {
  terreiro_id: string;
  role: TerreiroRole;
};

export async function fetchTerreirosQueAdministro(userId: string) {
  if (!userId) return [] as ManagedTerreiro[];

  const allowedRoles = ["admin", "editor"] as const;

  const selectTerreirosAll =
    "id, title, cover_image_url, avatar_url, image_url";
  const selectTerreirosAllWithoutCover = "id, title, avatar_url, image_url";
  const selectTerreirosImageOnly = "id, title, cover_image_url, image_url";
  const selectTerreirosImageOnlyWithoutCover = "id, title, image_url";
  const selectTerreirosWithoutImages = "id, title, cover_image_url";
  const selectTerreirosWithoutImagesWithoutCover = "id, title";

  const startedAt = Date.now();
  let usedStatusFilter = true;
  let members: any = await supabase
    .from("terreiro_members")
    .select("terreiro_id, role")
    .eq("user_id", userId)
    .in("role", [...allowedRoles])
    .eq("status", "active");

  if (
    members.error &&
    typeof members.error.message === "string" &&
    members.error.message.includes("status") &&
    members.error.message.includes("does not exist")
  ) {
    usedStatusFilter = false;
    members = await supabase
      .from("terreiro_members")
      .select("terreiro_id, role")
      .eq("user_id", userId)
      .in("role", [...allowedRoles]);
  }

  if (__DEV__) {
    const err = members.error
      ? typeof members.error.message === "string"
        ? members.error.message
        : String(members.error)
      : null;
    console.info("[TerreirosAdmin] members query", {
      userId,
      ok: !members.error,
      ms: Date.now() - startedAt,
      usedStatusFilter,
      rows: Array.isArray(members.data) ? members.data.length : 0,
      error: err,
    });

    // Compat: we no longer use the join-based strategy because it can trigger
    // recursive RLS policies on `terreiro_members`.
    console.info("[TerreirosAdmin] joined query", {
      userId,
      ok: true,
      skipped: true,
      strategy: "two_step",
    });
  }

  // If membership RLS is broken (recursive policy), fall back to terreiros created
  // by the user. This doesn't cover "editor" access, but keeps the app usable.
  if (members.error && isTerreiroMembersPolicyRecursionError(members.error)) {
    let created: any = await supabase
      .from("terreiros")
      .select(selectTerreirosAll)
      .eq("created_by", userId);

    if (
      created.error &&
      typeof created.error.message === "string" &&
      created.error.message.includes("cover_image_url") &&
      created.error.message.includes("does not exist")
    ) {
      created = await supabase
        .from("terreiros")
        .select(selectTerreirosAllWithoutCover)
        .eq("created_by", userId);
    }

    if (
      created.error &&
      typeof created.error.message === "string" &&
      created.error.message.includes("avatar_url") &&
      created.error.message.includes("does not exist")
    ) {
      created = await supabase
        .from("terreiros")
        .select(
          typeof created.error.message === "string" &&
            created.error.message.includes("cover_image_url")
            ? selectTerreirosImageOnlyWithoutCover
            : selectTerreirosImageOnly
        )
        .eq("created_by", userId);
    }

    if (
      created.error &&
      typeof created.error.message === "string" &&
      created.error.message.includes("image_url") &&
      created.error.message.includes("does not exist")
    ) {
      created = await supabase
        .from("terreiros")
        .select(
          typeof created.error.message === "string" &&
            created.error.message.includes("cover_image_url")
            ? selectTerreirosWithoutImagesWithoutCover
            : selectTerreirosWithoutImages
        )
        .eq("created_by", userId);
    }

    if (created.error) {
      throw new Error(
        "Administração indisponível: policy RLS em 'terreiro_members' está em recursão. Ajuste as policies no Supabase."
      );
    }

    const rows = (created.data ?? []) as unknown as TerreiroRow[];
    return rows
      .filter((t) => !!t?.id && !!t?.title)
      .map((t) => {
        const avatarUrl =
          (typeof t.cover_image_url === "string" && t.cover_image_url) ||
          (typeof t.avatar_url === "string" && t.avatar_url) ||
          (typeof t.image_url === "string" && t.image_url) ||
          undefined;

        return {
          id: t.id,
          name: t.title,
          avatarUrl,
          role: "admin" as const,
        } satisfies ManagedTerreiro;
      })
      .sort((a, b) => safeLocaleCompare(a.name, b.name));
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

  if (ids.length === 0) {
    // Fallback: if the creator isn't in `terreiro_members` yet, include terreiros
    // created by the user (common right after creation).
    let created: any = await supabase
      .from("terreiros")
      .select(selectTerreirosAll)
      .eq("created_by", userId);

    if (
      created.error &&
      typeof created.error.message === "string" &&
      created.error.message.includes("created_by") &&
      created.error.message.includes("does not exist")
    ) {
      return [] as ManagedTerreiro[];
    }

    if (
      created.error &&
      typeof created.error.message === "string" &&
      created.error.message.includes("cover_image_url") &&
      created.error.message.includes("does not exist")
    ) {
      created = await supabase
        .from("terreiros")
        .select(selectTerreirosAllWithoutCover)
        .eq("created_by", userId);
    }

    if (
      created.error &&
      typeof created.error.message === "string" &&
      created.error.message.includes("avatar_url") &&
      created.error.message.includes("does not exist")
    ) {
      created = await supabase
        .from("terreiros")
        .select(
          typeof created.error.message === "string" &&
            created.error.message.includes("cover_image_url")
            ? selectTerreirosImageOnlyWithoutCover
            : selectTerreirosImageOnly
        )
        .eq("created_by", userId);
    }

    if (
      created.error &&
      typeof created.error.message === "string" &&
      created.error.message.includes("image_url") &&
      created.error.message.includes("does not exist")
    ) {
      created = await supabase
        .from("terreiros")
        .select(
          typeof created.error.message === "string" &&
            created.error.message.includes("cover_image_url")
            ? selectTerreirosWithoutImagesWithoutCover
            : selectTerreirosWithoutImages
        )
        .eq("created_by", userId);
    }

    if (created.error) {
      if (__DEV__) {
        console.info("[TerreirosAdmin] created_by fallback error", {
          userId,
          error:
            typeof created.error.message === "string"
              ? created.error.message
              : String(created.error),
        });
      }
      return [] as ManagedTerreiro[];
    }

    const createdRows = (created.data ?? []) as TerreiroRow[];
    const result: ManagedTerreiro[] = createdRows
      .filter((t) => t?.id && t?.title)
      .map((t) => {
        const avatarUrl =
          (typeof t.cover_image_url === "string" && t.cover_image_url) ||
          (typeof t.avatar_url === "string" && t.avatar_url) ||
          (typeof t.image_url === "string" && t.image_url) ||
          undefined;

        return { id: t.id, name: t.title, avatarUrl, role: "admin" };
      });

    return result.sort((a, b) => safeLocaleCompare(a.name, b.name));
  }

  const tTerreiros = Date.now();
  let terreiros: any = await supabase
    .from("terreiros")
    .select(selectTerreirosAll)
    .in("id", ids);

  if (
    terreiros.error &&
    typeof terreiros.error.message === "string" &&
    terreiros.error.message.includes("cover_image_url") &&
    terreiros.error.message.includes("does not exist")
  ) {
    terreiros = await supabase
      .from("terreiros")
      .select(selectTerreirosAllWithoutCover)
      .in("id", ids);
  }

  if (
    terreiros.error &&
    typeof terreiros.error.message === "string" &&
    terreiros.error.message.includes("avatar_url") &&
    terreiros.error.message.includes("does not exist")
  ) {
    terreiros = await supabase
      .from("terreiros")
      .select(
        typeof terreiros.error.message === "string" &&
          terreiros.error.message.includes("cover_image_url")
          ? selectTerreirosImageOnlyWithoutCover
          : selectTerreirosImageOnly
      )
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
      .select(
        typeof terreiros.error.message === "string" &&
          terreiros.error.message.includes("cover_image_url")
          ? selectTerreirosWithoutImagesWithoutCover
          : selectTerreirosWithoutImages
      )
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
      ms: Date.now() - tTerreiros,
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
        (typeof t.cover_image_url === "string" && t.cover_image_url) ||
        (typeof t.avatar_url === "string" && t.avatar_url) ||
        (typeof t.image_url === "string" && t.image_url) ||
        undefined;

      return { id: t.id, name: t.title, avatarUrl, role };
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

  applyTerreiroPatch: (patch: {
    terreiroId: string;
    terreiroName?: string;
    terreiroAvatarUrl?: string;
  }) => void;

  curimbaEnabled: boolean;
  setCurimbaEnabled: (enabled: boolean) => void;

  curimbaOnboardingDismissed: boolean;
  setCurimbaOnboardingDismissed: (dismissed: boolean) => void;

  startPagePreference: StartPagePreference;
  hasStartPagePreference: boolean;
  bootstrapStartPage: (userId: string) => Promise<{
    preferredHref: "/" | "/terreiro";
    terreiroContext?: {
      terreiroId: string;
      terreiroName?: string;
      terreiroAvatarUrl?: string;
      role?: TerreiroRole;
      usedOfflineSnapshot?: boolean;
    };
  }>;
  setStartPageTerreiro: (
    userId: string,
    terreiroId: string,
    terreiroTitle?: string
  ) => Promise<void>;
  clearStartPagePreference: (userId: string) => Promise<void>;
  clearStartPageSnapshotOnly: () => Promise<void>;

  isReady: boolean;
};

const STORAGE_KEYS = {
  themeMode: "@saravafy:themeMode",
  curimbaEnabled: "@saravafy:curimbaEnabled",
  curimbaOnboardingDismissed: "@saravafy:curimbaOnboardingDismissed",
  startPageSnapshot: "@saravafy:startPageSnapshot",
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

  const [startPagePreference, setStartPagePreference] =
    useState<StartPagePreference>(null);

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
      void activateKeepAwakeAsync("saravafy-curimba");
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

    // Guard: avoid setting navigation bar style too frequently (can trigger Metro rebuild loop)
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      NavigationBar.setButtonStyleAsync(buttonStyle).catch(() => {
        // Sem ação: em um dev client antigo, o módulo nativo pode não estar presente.
      });
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
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

  type StartPageSnapshot = {
    start_page_type: "home" | "terreiro";
    start_terreiro_id: string | null;
    start_terreiro_title: string | null;
    updated_at: string;
  };

  const toSnapshot = (pref: StartPagePreference): StartPageSnapshot => {
    const updatedAt = pref?.updatedAt ?? new Date().toISOString();

    if (pref?.type === "TERREIRO") {
      return {
        start_page_type: "terreiro",
        start_terreiro_id: pref.terreiroId,
        start_terreiro_title: pref.terreiroTitle ?? null,
        updated_at: updatedAt,
      };
    }

    return {
      start_page_type: "home",
      start_terreiro_id: null,
      start_terreiro_title: null,
      updated_at: updatedAt,
    };
  };

  const persistStartPageSnapshot = async (
    snapshot: StartPageSnapshot | null
  ): Promise<void> => {
    if (!snapshot) {
      await AsyncStorage.removeItem(STORAGE_KEYS.startPageSnapshot);
      return;
    }

    await AsyncStorage.setItem(
      STORAGE_KEYS.startPageSnapshot,
      JSON.stringify(snapshot)
    );
  };

  const readStartPageSnapshot = async (): Promise<StartPageSnapshot | null> => {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.startPageSnapshot);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as Partial<StartPageSnapshot>;

      const type =
        parsed.start_page_type === "terreiro" ||
        parsed.start_page_type === "home"
          ? parsed.start_page_type
          : null;

      if (!type) return null;

      const updatedAt =
        typeof parsed.updated_at === "string" && parsed.updated_at
          ? parsed.updated_at
          : new Date().toISOString();

      const terreiroId =
        typeof parsed.start_terreiro_id === "string" && parsed.start_terreiro_id
          ? parsed.start_terreiro_id
          : null;

      const terreiroTitle =
        typeof parsed.start_terreiro_title === "string" &&
        parsed.start_terreiro_title
          ? parsed.start_terreiro_title
          : null;

      return {
        start_page_type: type,
        start_terreiro_id: terreiroId,
        start_terreiro_title: terreiroTitle,
        updated_at: updatedAt,
      };
    } catch {
      return null;
    }
  };

  const isNetworkishError = (error: unknown) => {
    const msg =
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : "";
    return (
      msg.includes("Network request failed") ||
      msg.includes("Failed to fetch") ||
      msg.includes("fetch")
    );
  };

  const fetchStartPageFromBackend = async (
    userId: string
  ): Promise<StartPagePreference | null> => {
    if (!userId) return null;

    const res: any = await supabase
      .from("profiles")
      .select("primary_terreiro_id")
      .eq("id", userId)
      .maybeSingle();

    if (res.error) {
      if (isNetworkishError(res.error)) throw res.error;
      return null;
    }

    const row = res.data as
      | {
          primary_terreiro_id?: string | null;
        }
      | null
      | undefined;

    const terreiroId =
      row && typeof row.primary_terreiro_id === "string"
        ? row.primary_terreiro_id
        : null;

    if (terreiroId) {
      return {
        type: "TERREIRO",
        terreiroId,
        updatedAt: new Date().toISOString(),
      };
    }

    return null;
  };

  const persistStartPageToBackend = async (
    userId: string,
    next: StartPagePreference | null
  ) => {
    if (!userId) throw new Error("Usuário não autenticado.");

    const nowIso = new Date().toISOString();
    const payload: Record<string, any> = {
      id: userId,
      primary_terreiro_id: next?.type === "TERREIRO" ? next.terreiroId : null,
      updated_at: nowIso,
    };

    const res: any = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });

    if (res.error) {
      throw new Error(
        typeof res.error.message === "string"
          ? res.error.message
          : "Erro ao salvar preferências"
      );
    }
  };

  const validateTerreiroAccess = async (terreiroId: string) => {
    if (!terreiroId) return null;

    let res: any = await supabase
      .from("terreiros")
      .select("id, title, cover_image_url, avatar_url, image_url")
      .eq("id", terreiroId)
      .maybeSingle();

    if (
      res.error &&
      typeof res.error.message === "string" &&
      res.error.message.includes("cover_image_url") &&
      res.error.message.includes("does not exist")
    ) {
      res = await supabase
        .from("terreiros")
        .select("id, title, avatar_url, image_url")
        .eq("id", terreiroId)
        .maybeSingle();
    }

    if (
      res.error &&
      typeof res.error.message === "string" &&
      res.error.message.includes("avatar_url") &&
      res.error.message.includes("does not exist")
    ) {
      res = await supabase
        .from("terreiros")
        .select("id, title, cover_image_url, image_url")
        .eq("id", terreiroId)
        .maybeSingle();

      if (
        res.error &&
        typeof res.error.message === "string" &&
        res.error.message.includes("cover_image_url") &&
        res.error.message.includes("does not exist")
      ) {
        res = await supabase
          .from("terreiros")
          .select("id, title, image_url")
          .eq("id", terreiroId)
          .maybeSingle();
      }
    }

    if (res.error) return null;
    const row = res.data as
      | {
          id: string;
          title: string;
          cover_image_url?: string | null;
          avatar_url?: string | null;
          image_url?: string | null;
        }
      | null
      | undefined;
    if (!row?.id || !row.title) return null;

    const avatarUrl =
      (typeof row.cover_image_url === "string" && row.cover_image_url) ||
      (typeof row.avatar_url === "string" && row.avatar_url) ||
      (typeof row.image_url === "string" && row.image_url) ||
      undefined;

    return {
      terreiroId: row.id,
      terreiroName: row.title,
      terreiroAvatarUrl: avatarUrl,
    };
  };

  const fetchTerreiroRole = async (
    userId: string,
    terreiroId: string
  ): Promise<TerreiroRole | undefined> => {
    if (!userId || !terreiroId) return undefined;
    const res = await supabase
      .from("terreiro_members")
      .select("role")
      .eq("user_id", userId)
      .eq("terreiro_id", terreiroId)
      .maybeSingle();
    if (res.error) return undefined;
    const role = (res.data as { role?: unknown } | null)?.role;
    if (role === "admin" || role === "editor" || role === "follower")
      return role;
    return undefined;
  };

  const bootstrapStartPage = async (userId: string) => {
    let online = true;

    let pref: StartPagePreference = null;

    try {
      pref = await fetchStartPageFromBackend(userId);
    } catch {
      // Erro de rede: tratar como offline.
      online = false;
    }

    if (!online) {
      const snapshot = await readStartPageSnapshot();
      if (
        snapshot?.start_page_type === "terreiro" &&
        typeof snapshot.start_terreiro_id === "string" &&
        snapshot.start_terreiro_id
      ) {
        return {
          preferredHref: "/terreiro" as const,
          terreiroContext: {
            terreiroId: snapshot.start_terreiro_id,
            terreiroName: snapshot.start_terreiro_title ?? undefined,
            role: undefined,
            usedOfflineSnapshot: true,
          },
        };
      }

      return { preferredHref: "/" as const };
    }

    // Online: atualizar estado local da preferência (backend) e snapshot válido.
    setStartPagePreference(pref);

    if (!pref || pref.type !== "TERREIRO") {
      persistStartPageSnapshot(null).catch(() => undefined);
      return { preferredHref: "/" as const };
    }

    const terreiroInfo = await validateTerreiroAccess(pref.terreiroId);
    if (!terreiroInfo) {
      // Preferência inválida: tratar como vazia (Home) e limpar backend.
      setStartPagePreference(null);
      persistStartPageSnapshot(null).catch(() => undefined);
      persistStartPageToBackend(userId, null).catch(() => undefined);
      return { preferredHref: "/" as const };
    }

    const role = await fetchTerreiroRole(userId, pref.terreiroId);
    const normalizedPref: StartPagePreference = {
      type: "TERREIRO",
      terreiroId: terreiroInfo.terreiroId,
      terreiroTitle: terreiroInfo.terreiroName,
      updatedAt: pref.updatedAt,
    };

    setStartPagePreference(normalizedPref);
    persistStartPageSnapshot(toSnapshot(normalizedPref)).catch(() => undefined);

    return {
      preferredHref: "/terreiro" as const,
      terreiroContext: {
        ...terreiroInfo,
        role,
        usedOfflineSnapshot: false,
      },
    };
  };

  const setStartPageTerreiro = async (
    userId: string,
    terreiroId: string,
    terreiroTitle?: string
  ) => {
    const prev = startPagePreference;
    const next: StartPagePreference = {
      type: "TERREIRO",
      terreiroId,
      terreiroTitle,
      updatedAt: new Date().toISOString(),
    };

    // Optimistic update (não navega / não recria árvore).
    setStartPagePreference(next);
    await persistStartPageSnapshot(toSnapshot(next));

    try {
      await persistStartPageToBackend(userId, next);
    } catch (e) {
      setStartPagePreference(prev);
      await persistStartPageSnapshot(prev ? toSnapshot(prev) : null);
      throw e;
    }

    // Refetch em background.
    (async () => {
      const latest = await fetchStartPageFromBackend(userId);
      const mergedLatest: StartPagePreference | null =
        latest &&
        latest.type === "TERREIRO" &&
        latest.terreiroId === next.terreiroId
          ? { ...latest, terreiroTitle: next.terreiroTitle }
          : latest;

      setStartPagePreference(mergedLatest);
      await persistStartPageSnapshot(toSnapshot(mergedLatest));
    })().catch(() => undefined);
  };

  const clearStartPagePreference = async (userId: string) => {
    const prev = startPagePreference;

    // Optimistic update.
    setStartPagePreference(null);
    await persistStartPageSnapshot(null);

    try {
      await persistStartPageToBackend(userId, null);
    } catch (e) {
      setStartPagePreference(prev);
      await persistStartPageSnapshot(prev ? toSnapshot(prev) : null);
      throw e;
    }

    (async () => {
      const latest = await fetchStartPageFromBackend(userId);
      setStartPagePreference(latest);
      // Ao remover a preferência, o snapshot deve ficar limpo.
      if (!latest) {
        await persistStartPageSnapshot(null);
      } else {
        await persistStartPageSnapshot(toSnapshot(latest));
      }
    })().catch(() => undefined);
  };

  const clearStartPageSnapshotOnly = async () => {
    await persistStartPageSnapshot(null);
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

  const applyTerreiroPatch = (patch: {
    terreiroId: string;
    terreiroName?: string;
    terreiroAvatarUrl?: string;
  }) => {
    if (!patch.terreiroId) return;

    setTerreirosAdmin((prev) => {
      const next = prev.map((t) => {
        if (t.id !== patch.terreiroId) return t;
        return {
          ...t,
          name: patch.terreiroName ?? t.name,
          avatarUrl: patch.terreiroAvatarUrl ?? t.avatarUrl,
        };
      });

      const exists = next.some((t) => t.id === patch.terreiroId);
      if (exists) return next;

      // Se ainda não estava na lista (ex.: acabou de criar), adiciona no fim.
      return [
        ...next,
        {
          id: patch.terreiroId,
          name: patch.terreiroName ?? "Terreiro",
          avatarUrl: patch.terreiroAvatarUrl,
          role: "admin" as TerreiroRole,
        },
      ].sort((a, b) => safeLocaleCompare(a.name, b.name));
    });

    setActiveContext((prev) => {
      if (prev.kind !== "TERREIRO_PAGE") return prev;
      if (prev.terreiroId !== patch.terreiroId) return prev;
      return {
        ...prev,
        terreiroName: patch.terreiroName ?? prev.terreiroName,
        terreiroAvatarUrl: patch.terreiroAvatarUrl ?? prev.terreiroAvatarUrl,
      };
    });

    setStartPagePreference((prev) => {
      if (!prev || prev.type !== "TERREIRO") return prev;
      if (prev.terreiroId !== patch.terreiroId) return prev;
      return {
        ...prev,
        terreiroTitle: patch.terreiroName ?? prev.terreiroTitle,
      };
    });
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
    applyTerreiroPatch,
    curimbaEnabled,
    setCurimbaEnabled,
    curimbaOnboardingDismissed,
    setCurimbaOnboardingDismissed,
    startPagePreference,
    hasStartPagePreference: startPagePreference?.type === "TERREIRO",
    bootstrapStartPage,
    setStartPageTerreiro,
    clearStartPagePreference,
    clearStartPageSnapshotOnly,
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
