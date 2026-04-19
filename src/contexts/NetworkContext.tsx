import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type NetworkContextValue = {
  isConnected: boolean;
  isInternetReachable: boolean | null;
};

const NetworkContext = createContext<NetworkContextValue>({
  isConnected: true,
  isInternetReachable: null,
});

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<NetInfoState | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((s) => {
      setState(s);
    });
    return () => unsubscribe();
  }, []);

  const value = useMemo<NetworkContextValue>(
    () => ({
      isConnected: state?.isConnected ?? true,
      isInternetReachable: state?.isInternetReachable ?? null,
    }),
    [state?.isConnected, state?.isInternetReachable]
  );

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
