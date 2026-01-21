import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * GestureGateContext - Bloqueio de toque após swipe horizontal
 *
 * PROBLEMA:
 * Quando o usuário faz swipe horizontal para trocar de aba e solta o dedo
 * em cima de um card/item, o onPress é disparado indevidamente.
 *
 * SOLUÇÃO:
 * - Rastreia quando um swipe horizontal foi reconhecido (passou threshold)
 * - Bloqueia qualquer onPress que aconteça logo após o swipe
 * - Usa refs para evitar re-render desnecessário
 *
 * USO:
 * ```tsx
 * const gestureGate = useGestureGate();
 *
 * const handlePress = () => {
 *   if (gestureGate.shouldBlockPress()) return;
 *   // ... código normal de navegação
 * };
 * ```
 */

type GestureGateContextValue = {
  /**
   * Verdadeiro enquanto um swipe de abas está ativo/reconhecido.
   * Atualiza apenas no início/fim do gesto (não por frame).
   */
  isTabSwiping: boolean;

  /**
   * Marca início de um swipe horizontal (translationX passou threshold)
   */
  markSwipeStart: () => void;

  /**
   * Marca fim/cancelamento do swipe
   */
  markSwipeEnd: () => void;

  /**
   * Retorna true se um press deve ser bloqueado
   * (swipe foi reconhecido recentemente)
   */
  shouldBlockPress: () => boolean;
};

const GestureGateContext = createContext<GestureGateContextValue | null>(null);

export function GestureGateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Usa refs para evitar re-render por frame
  const isTabSwipingRef = useRef(false);
  const blockUntilRef = useRef(0);

  // State apenas para expor isTabSwiping de forma reativa (1 update por gesto).
  const [isTabSwiping, setIsTabSwiping] = useState(false);

  const markSwipeStart = useCallback(() => {
    isTabSwipingRef.current = true;
    setIsTabSwiping(true);
    // Bloqueia press enquanto o gesto estiver ativo e por uma pequena janela.
    blockUntilRef.current = Date.now() + 150;
  }, []);

  const markSwipeEnd = useCallback(() => {
    isTabSwipingRef.current = false;
    setIsTabSwiping(false);
    // Mantém bloqueio por mais alguns ms após soltar o dedo
    blockUntilRef.current = Date.now() + 100;
  }, []);

  const shouldBlockPress = useCallback(() => {
    // Bloqueia se ainda estamos dentro da janela de bloqueio
    if (Date.now() < blockUntilRef.current) {
      return true;
    }
    // Bloqueia se swipe está ativo
    if (isTabSwipingRef.current) {
      return true;
    }
    return false;
  }, []);

  const value = useMemo<GestureGateContextValue>(
    () => ({
      isTabSwiping,
      markSwipeStart,
      markSwipeEnd,
      shouldBlockPress,
    }),
    [isTabSwiping, markSwipeStart, markSwipeEnd, shouldBlockPress]
  );

  return (
    <GestureGateContext.Provider value={value}>
      {children}
    </GestureGateContext.Provider>
  );
}

export function useGestureGate(): GestureGateContextValue {
  const ctx = useContext(GestureGateContext);
  if (!ctx) {
    throw new Error("useGestureGate must be used within GestureGateProvider");
  }
  return ctx;
}
