import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type PreferencesOverlayContextValue = {
  isOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
};

const PreferencesOverlayContext =
  createContext<PreferencesOverlayContextValue | null>(null);

type PreferencesOverlayProviderProps = {
  children: React.ReactNode;
};

export function PreferencesOverlayProvider({
  children,
}: PreferencesOverlayProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openPreferences = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closePreferences = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo<PreferencesOverlayContextValue>(() => {
    return { isOpen, openPreferences, closePreferences };
  }, [closePreferences, isOpen, openPreferences]);

  return (
    <PreferencesOverlayContext.Provider value={value}>
      {children}
    </PreferencesOverlayContext.Provider>
  );
}

export function usePreferencesOverlay() {
  const ctx = useContext(PreferencesOverlayContext);
  if (!ctx) {
    throw new Error(
      "usePreferencesOverlay must be used within PreferencesOverlayProvider"
    );
  }
  return ctx;
}
