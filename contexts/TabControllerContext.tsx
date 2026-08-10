import { type RootPagerTabKey } from "@/contexts/RootPagerContext";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";

export type TabKey = RootPagerTabKey;

type GoToTabFn = (tab: TabKey) => void;

type TabControllerContextValue = {
  /**
   * Solicita troca de aba (Pontos ↔ Terreiros).
   * Implementação real é registrada pelo layout de tabs (navigator).
   */
  goToTab: (tab: TabKey) => void;

  /**
   * Permite ao layout de Tabs registrar o handler real de troca de aba.
   *
   * Retorna a função de desregistro. Ela só limpa o slot se o handler
   * registrado ainda for o mesmo `fn` — pode haver mais de uma instância de
   * `(tabs)` montada ao mesmo tempo, e uma não pode apagar o registro da
   * outra. Ver `D15` no BACKLOG.
   */
  registerGoToTab: (fn: GoToTabFn) => () => void;
};

const TabControllerContext = createContext<TabControllerContextValue | null>(
  null
);

export function TabControllerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const goToTabRef = useRef<GoToTabFn | null>(null);

  const registerGoToTab = useCallback((fn: GoToTabFn) => {
    goToTabRef.current = fn;

    return () => {
      // Só limpa se ainda formos o dono. Sem essa checagem, uma instância de
      // `(tabs)` sendo desmontada apaga o handler de outra que continua na
      // tela, e o toque na aba vira no-op silencioso (o swipe continua
      // funcionando, porque vai por outro caminho). Ver `D15` no BACKLOG.
      if (goToTabRef.current === fn) {
        goToTabRef.current = null;
      }
    };
  }, []);

  const goToTab = useCallback((tab: TabKey) => {
    if (goToTabRef.current) {
      goToTabRef.current(tab);
      return;
    }

    // Sem handler registrado, não tentamos "hack" por router push/restore.
    // O objetivo é manter preservação de stack por aba via navigator.
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        "[TabController] goToTab called without registered handler",
        {
          tab,
        }
      );
    }
  }, []);

  const value = useMemo<TabControllerContextValue>(
    () => ({
      goToTab,
      registerGoToTab,
    }),
    [goToTab, registerGoToTab]
  );

  return (
    <TabControllerContext.Provider value={value}>
      {children}
    </TabControllerContext.Provider>
  );
}

export function useTabController(): TabControllerContextValue {
  const ctx = useContext(TabControllerContext);
  if (!ctx) {
    throw new Error(
      "useTabController must be used within TabControllerProvider"
    );
  }
  return ctx;
}

export function useTabControllerOptional(): TabControllerContextValue | null {
  return useContext(TabControllerContext);
}
