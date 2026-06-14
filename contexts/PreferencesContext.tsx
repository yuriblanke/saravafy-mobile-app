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

export type StartPagePreference = {
  type: "TERREIRO";
  terreiroId: string;
  terreiroTitle?: string;
  updatedAt: string;
} | null;

type PreferencesContextValue = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  effectiveTheme: ThemeVariant;

  // Filtro opcional para telas globais (ex.: Home) sem depender de "perfil ativo".
  selectedTerreiroFilterId: string | null;
  setSelectedTerreiroFilterId: (terreiroId: string | null) => void;

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
    preferredHref: "/(app)" | "/terreiro";
    terreiroContext?: {
      terreiroId: string;
      terreiroName?: string;
      terreiroAvatarUrl?: string;
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
  curimbaEnabled: "preferences.curimba_mode_enabled",
  curimbaOnboardingDismissed: "preferences.curimba_explainer_dont_show_again",
  startPageSnapshot: "@saravafy:startPageSnapshot",
} as const;

const LEGACY_STORAGE_KEYS = {
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
  // Default de primeira execução: começar em dark mode.
  // A pessoa ainda pode escolher "light" ou "system" manualmente nas preferências.
  const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");
  const [curimbaEnabled, setCurimbaEnabledState] = useState(false);
  const [curimbaOnboardingDismissed, setCurimbaOnboardingDismissedState] =
    useState(false);
  const [isReady, setIsReady] = useState(false);
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  const [selectedTerreiroFilterId, setSelectedTerreiroFilterId] = useState<
    string | null
  >(null);

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
          (async () => {
            const v = await AsyncStorage.getItem(STORAGE_KEYS.curimbaEnabled);
            if (v != null) return v;
            const legacy = await AsyncStorage.getItem(
              LEGACY_STORAGE_KEYS.curimbaEnabled
            );
            if (legacy != null) {
              AsyncStorage.setItem(STORAGE_KEYS.curimbaEnabled, legacy).catch(
                () => undefined
              );
            }
            return legacy;
          })(),
          (async () => {
            const v = await AsyncStorage.getItem(
              STORAGE_KEYS.curimbaOnboardingDismissed
            );
            if (v != null) return v;
            const legacy = await AsyncStorage.getItem(
              LEGACY_STORAGE_KEYS.curimbaOnboardingDismissed
            );
            if (legacy != null) {
              AsyncStorage.setItem(
                STORAGE_KEYS.curimbaOnboardingDismissed,
                legacy
              ).catch(() => undefined);
            }
            return legacy;
          })(),
        ]);

        if (cancelled) return;

        // Primeira execução: começar no tema escuro (default do app).
        if (rawThemeMode == null) {
          setThemeModeState("dark");
          AsyncStorage.setItem(STORAGE_KEYS.themeMode, "dark").catch(
            () => undefined
          );
        } else {
          const parsedThemeMode = coerceThemeMode(rawThemeMode) ?? "dark";
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
      if (__DEV__) {
        console.info("[Curimba] keep-awake on");
      }
      void activateKeepAwakeAsync("saravafy-curimba");
      return () => {
        deactivateKeepAwake("saravafy-curimba");
      };
    }

    if (__DEV__) {
      console.info("[Curimba] keep-awake off");
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
    if (__DEV__) {
      console.info("[Curimba] toggle", { enabled });
    }
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
            usedOfflineSnapshot: true,
          },
        };
      }

      return { preferredHref: "/(app)" as const };
    }

    // Online: atualizar estado local da preferência (backend) e snapshot válido.
    setStartPagePreference(pref);

    if (!pref || pref.type !== "TERREIRO") {
      persistStartPageSnapshot(null).catch(() => undefined);
      return { preferredHref: "/(app)" as const };
    }

    const terreiroInfo = await validateTerreiroAccess(pref.terreiroId);
    if (!terreiroInfo) {
      // Preferência inválida: tratar como vazia (Home) e limpar backend.
      setStartPagePreference(null);
      persistStartPageSnapshot(null).catch(() => undefined);
      persistStartPageToBackend(userId, null).catch(() => undefined);
      return { preferredHref: "/(app)" as const };
    }

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

  const applyTerreiroPatch = (patch: {
    terreiroId: string;
    terreiroName?: string;
    terreiroAvatarUrl?: string;
  }) => {
    if (!patch.terreiroId) return;

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
    selectedTerreiroFilterId,
    setSelectedTerreiroFilterId,
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
