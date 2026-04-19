import { useAuth } from "@/contexts/AuthContext";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type PendingAction = (() => void) | null;

type OpenOptions = {
  /**
   * Mensagem contextual exibida no sheet explicando por que o login é
   * necessário (ex.: "Precisamos saber quem é você para enviar um ponto.").
   */
  reason?: string;
};

type LoginPromptContextValue = {
  isOpen: boolean;
  reason: string | null;
  /**
   * Se há sessão, executa a action imediatamente. Caso contrário, abre o
   * sheet e executa a action automaticamente após o login bem-sucedido.
   */
  requireAuth: (action: () => void, options?: OpenOptions) => void;
  /**
   * Abre o sheet de login sem ação pendente (usado pelo botão "Entrar" do
   * header).
   */
  openLoginSheet: (options?: OpenOptions) => void;
  closeLoginSheet: () => void;
};

const LoginPromptContext = createContext<LoginPromptContextValue | undefined>(
  undefined
);

export function LoginPromptProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const pendingActionRef = useRef<PendingAction>(null);
  const previousUserIdRef = useRef<string | null>(user?.id ?? null);

  const closeLoginSheet = useCallback(() => {
    setIsOpen(false);
    setReason(null);
    pendingActionRef.current = null;
  }, []);

  const openLoginSheet = useCallback((options?: OpenOptions) => {
    pendingActionRef.current = null;
    setReason(options?.reason ?? null);
    setIsOpen(true);
  }, []);

  const requireAuth = useCallback(
    (action: () => void, options?: OpenOptions) => {
      if (user?.id) {
        action();
        return;
      }
      pendingActionRef.current = action;
      setReason(options?.reason ?? null);
      setIsOpen(true);
    },
    [user?.id]
  );

  // Quando usuário passa de anônimo → logado, executa a action pendente.
  useEffect(() => {
    const previousUserId = previousUserIdRef.current;
    const currentUserId = user?.id ?? null;

    if (!previousUserId && currentUserId) {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      setIsOpen(false);
      setReason(null);

      if (action) {
        // Executa no próximo tick para garantir que overlays tenham tempo de
        // desmontar antes de disparar navegação/modais.
        setTimeout(action, 0);
      }
    }

    previousUserIdRef.current = currentUserId;
  }, [user?.id]);

  const value = useMemo<LoginPromptContextValue>(
    () => ({
      isOpen,
      reason,
      requireAuth,
      openLoginSheet,
      closeLoginSheet,
    }),
    [isOpen, reason, requireAuth, openLoginSheet, closeLoginSheet]
  );

  return (
    <LoginPromptContext.Provider value={value}>
      {children}
    </LoginPromptContext.Provider>
  );
}

export function useLoginPrompt() {
  const ctx = useContext(LoginPromptContext);
  if (!ctx) {
    throw new Error(
      "useLoginPrompt deve ser usado dentro de um LoginPromptProvider"
    );
  }
  return ctx;
}
