import { useTabControllerOptional } from "@/contexts/TabControllerContext";
import type { TabKey } from "@/contexts/TabControllerContext";
import { useRouter } from "expo-router";
import { useCallback, useRef, useEffect } from "react";

type ScreenBackOpts = {
  alignTab?: TabKey;
};

/**
 * Idioma único de "voltar": canGoBack() ? back() : replace(fallback).
 * Generaliza o padrão já adotado pelo PlayerScreen.
 *
 * @param fallback  Rota para replace() quando não há histórico (deep link, boot).
 * @param opts.alignTab  Se fornecido, alinha a aba antes de navegar.
 */
export function useScreenBack(
  fallback: string | { pathname: string; params?: Record<string, string> },
  opts?: ScreenBackOpts
): () => void {
  const router = useRouter();
  const tabController = useTabControllerOptional();

  // Refs para evitar que objetos inline recriados a cada render
  // invalidem o callback desnecessariamente.
  const fallbackRef = useRef(fallback);
  const alignTabRef = useRef(opts?.alignTab);

  useEffect(() => {
    fallbackRef.current = fallback;
  });
  useEffect(() => {
    alignTabRef.current = opts?.alignTab;
  });

  return useCallback(() => {
    const tab = alignTabRef.current;
    if (tab) {
      tabController?.goToTab(tab);
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRef.current as any);
    }
  }, [router, tabController]);
}
