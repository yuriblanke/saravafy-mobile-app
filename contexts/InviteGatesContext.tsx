import React, { createContext, useContext, useMemo, useState } from "react";

type InviteGatesContextValue = {
  terreiroGateActive: boolean;
  setTerreiroGateActive: (next: boolean) => void;
};

const InviteGatesContext = createContext<InviteGatesContextValue | undefined>(
  undefined
);

export function InviteGatesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [terreiroGateActive, setTerreiroGateActive] = useState(false);

  const value = useMemo(
    () => ({ terreiroGateActive, setTerreiroGateActive }),
    [terreiroGateActive]
  );

  return (
    <InviteGatesContext.Provider value={value}>
      {children}
    </InviteGatesContext.Provider>
  );
}

export function useInviteGates() {
  const ctx = useContext(InviteGatesContext);
  if (!ctx) {
    throw new Error(
      "useInviteGates deve ser usado dentro de InviteGatesProvider"
    );
  }
  return ctx;
}
