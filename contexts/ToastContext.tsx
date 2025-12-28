import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { SurfaceCard } from "@/src/components/SurfaceCard";
import { colors, spacing } from "@/src/theme";
import { usePreferences } from "@/contexts/PreferencesContext";

type ToastContextValue = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { effectiveTheme } = usePreferences();
  const variant = effectiveTheme;

  const [message, setMessage] = useState<string | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((nextMessage: string) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    setMessage(nextMessage);

    hideTimerRef.current = setTimeout(() => {
      setMessage(null);
      hideTimerRef.current = null;
    }, 2200);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  const textColor =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;

  return (
    <ToastContext.Provider value={value}>
      {children}

      {message ? (
        <View pointerEvents="none" style={styles.host}>
          <SurfaceCard variant={variant} style={styles.toastCard}>
            <Text style={[styles.toastText, { color: textColor }]}>
              {message}
            </Text>
          </SurfaceCard>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: spacing.xl,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  toastCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    maxWidth: 520,
  },
  toastText: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
});
