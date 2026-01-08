import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { radii, shadows, spacing } from "@/src/theme";

type ToastOptions = {
  durationMs?: number;
};

type ToastModel = {
  id: string;
  message: string;
  durationMs: number;
  createdAt: number;
  phase: "active" | "exiting";
};

type ToastContextValue = {
  showToast: (message: string, opts?: ToastOptions) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DEFAULT_DURATION_MS = 2200;
const MAX_VISIBLE = 3;

const TOAST_HEIGHT = 72;
const STACK_OVERLAP = 0.85;
const STACK_STEP = Math.round(TOAST_HEIGHT * (1 - STACK_OVERLAP));
const ENTER_FROM_Y = 18;
const ENTER_FROM_X = 6;
const EXIT_TO_Y = 8;

function createToastId() {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getStackOffsetX(index: number) {
  if (index === 1) return 6;
  if (index === 2) return -6;
  return 0;
}

type ToastState = {
  stack: ToastModel[];
  queue: Omit<ToastModel, "phase">[];
};

type ToastAction =
  | { type: "SHOW"; toast: Omit<ToastModel, "phase"> }
  | { type: "DISMISS"; id: string }
  | { type: "REMOVE"; id: string }
  | { type: "CLEAR" };

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "SHOW": {
      const toast = action.toast;

      // Mais recente sempre na frente (index 0)
      if (state.stack.length < MAX_VISIBLE) {
        return {
          ...state,
          stack: [{ ...toast, phase: "active" }, ...state.stack],
        };
      }

      return {
        ...state,
        queue: [...state.queue, toast],
      };
    }

    case "DISMISS": {
      const id = action.id;

      // Se estiver na fila, remove direto.
      const queueIndex = state.queue.findIndex((t) => t.id === id);
      if (queueIndex >= 0) {
        return {
          ...state,
          queue: state.queue.filter((t) => t.id !== id),
        };
      }

      return {
        ...state,
        stack: state.stack.map((t) =>
          t.id === id && t.phase !== "exiting" ? { ...t, phase: "exiting" } : t
        ),
      };
    }

    case "REMOVE": {
      const nextStack = state.stack.filter((t) => t.id !== action.id);
      if (nextStack.length >= MAX_VISIBLE || state.queue.length === 0) {
        return { ...state, stack: nextStack };
      }

      const [next, ...restQueue] = state.queue;
      return {
        stack: [...nextStack, { ...next, phase: "active" }],
        queue: restQueue,
      };
    }

    case "CLEAR": {
      return {
        stack: state.stack.map((t) =>
          t.phase === "exiting" ? t : { ...t, phase: "exiting" }
        ),
        queue: [],
      };
    }

    default:
      return state;
  }
}

type ToastCardProps = {
  toast: ToastModel;
  index: number;
  bottomOffset: number;
  onExited: (id: string) => void;
};

function ToastCard({ toast, index, bottomOffset, onExited }: ToastCardProps) {
  const enter = useSharedValue(0);
  const exit = useSharedValue(0);
  const stackY = useSharedValue(-index * STACK_STEP);
  const stackX = useSharedValue(getStackOffsetX(index));

  useEffect(() => {
    enter.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [enter]);

  useEffect(() => {
    stackY.value = withTiming(-index * STACK_STEP, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
    stackX.value = withTiming(getStackOffsetX(index), {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [index, stackY, stackX]);

  useEffect(() => {
    if (toast.phase !== "exiting") return;
    exit.value = withTiming(
      1,
      { duration: 180, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (!finished) return;
        runOnJS(onExited)(toast.id);
      }
    );
  }, [toast.id, toast.phase, exit, onExited]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY =
      stackY.value + (1 - enter.value) * ENTER_FROM_Y + exit.value * EXIT_TO_Y;
    const translateX = stackX.value + (1 - enter.value) * ENTER_FROM_X;

    return {
      opacity: enter.value * (1 - exit.value),
      transform: [{ translateX }, { translateY }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          bottom: bottomOffset,
          zIndex: 100 - index,
        },
        animatedStyle,
      ]}
    >
      <Text numberOfLines={2} style={styles.toastText}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}

function ToastStack({
  toasts,
  onToastExited,
}: {
  toasts: ToastModel[];
  onToastExited: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  // Slot inferior: 12% por padrão (fica naturalmente entre 5% e 15%)
  const slotHeight = Math.round(height * 0.12);
  const bottomOffset = insets.bottom + spacing.sm;
  const containerHeight = slotHeight + bottomOffset;

  if (toasts.length === 0) return null;

  // Renderiza de trás para frente para manter o topo por cima.
  const stack = toasts.slice(0, MAX_VISIBLE);
  const renderList = [...stack].reverse();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.stackHost, { height: containerHeight }]}
    >
      {renderList.map((toast) => {
        const index = stack.findIndex((t) => t.id === toast.id);
        return (
          <ToastCard
            key={toast.id}
            toast={toast}
            index={index}
            bottomOffset={bottomOffset}
            onExited={onToastExited}
          />
        );
      })}
    </View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(toastReducer, {
    stack: [],
    queue: [],
  });

  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismissToast = useCallback((id: string) => {
    const timers = timersRef.current;
    if (timers[id]) {
      clearTimeout(timers[id]);
      delete timers[id];
    }
    dispatch({ type: "DISMISS", id });
  }, []);

  const clearToasts = useCallback(() => {
    const timers = timersRef.current;
    for (const id of Object.keys(timers)) {
      clearTimeout(timers[id]);
      delete timers[id];
    }
    dispatch({ type: "CLEAR" });
  }, []);

  const showToast = useCallback(
    (message: string, opts?: ToastOptions) => {
      const trimmed = message.trim();
      if (!trimmed) return "";

      const toast = {
        id: createToastId(),
        message: trimmed,
        durationMs: opts?.durationMs ?? DEFAULT_DURATION_MS,
        createdAt: Date.now(),
      };

      dispatch({ type: "SHOW", toast });
      return toast.id;
    },
    []
  );

  // Expiração automática só quando estiver visível.
  useEffect(() => {
    const timers = timersRef.current;
    const stackIds = new Set(state.stack.map((t) => t.id));

    // Limpa timers órfãos.
    for (const id of Object.keys(timers)) {
      if (!stackIds.has(id)) {
        clearTimeout(timers[id]);
        delete timers[id];
      }
    }

    // Inicia timers para toasts ativos (visíveis).
    for (const toast of state.stack) {
      if (toast.phase !== "active") continue;
      if (timers[toast.id]) continue;
      timers[toast.id] = setTimeout(() => {
        dispatch({ type: "DISMISS", id: toast.id });
      }, toast.durationMs);
    }
  }, [state.stack]);

  const onToastExited = useCallback((id: string) => {
    const timers = timersRef.current;
    if (timers[id]) {
      clearTimeout(timers[id]);
      delete timers[id];
    }
    dispatch({ type: "REMOVE", id });
  }, []);

  const value = useMemo(
    () => ({ showToast, dismissToast, clearToasts }),
    [showToast, dismissToast, clearToasts]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <ToastStack toasts={state.stack} onToastExited={onToastExited} />
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
  stackHost: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    pointerEvents: "box-none",
  },
  toast: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    minHeight: TOAST_HEIGHT,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: "center",
    backgroundColor: "#000",

    ...shadows.md,
  },
  toastText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
