import { useGestureBlock } from "@/contexts/GestureBlockContext";
import { useGestureGate } from "@/contexts/GestureGateContext";
import { useRootPager } from "@/contexts/RootPagerContext";
import { useTabController, type TabKey } from "@/contexts/TabControllerContext";
import { usePathname } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  DevSettings,
  PanResponder,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

type OverlayPointerEvents = "none" | "auto";

function logSwipeOverlay(payload: Record<string, unknown>) {
  if (!__DEV__) return;
  try {
    console.log("[SwipeOverlay] " + JSON.stringify(payload));
  } catch {
    console.log("[SwipeOverlay] " + String(payload?.phase ?? "log"));
  }
}

function shouldCaptureSwipe(dx: number, dy: number) {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  return absX > 12 && absX > absY * 1.2;
}

function inferTabFromPathname(pathname: string): TabKey {
  if (
    typeof pathname === "string" &&
    (pathname.startsWith("/terreiro") || pathname.startsWith("/collection"))
  ) {
    return "terreiros";
  }
  return "pontos";
}

function getMovementTargetTab(dx: number, activeTab: TabKey): TabKey | null {
  // Pager behavior:
  // - On Pontos: swipe LEFT goes to Terreiros; swipe RIGHT ignored.
  // - On Terreiros: swipe RIGHT goes to Pontos; swipe LEFT ignored.
  if (activeTab === "pontos") {
    return dx < 0 ? "terreiros" : null;
  }
  return dx > 0 ? "pontos" : null;
}

function getReleaseTargetTab(dx: number, activeTab: TabKey): TabKey | null {
  // Requires threshold to actually navigate.
  if (activeTab === "pontos") {
    return dx < -40 ? "terreiros" : null;
  }
  return dx > 40 ? "pontos" : null;
}

function shouldRejectForVertical(dx: number, dy: number) {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  return absY > 18 && absY > absX;
}

/**
 * AppTabSwipeOverlay - Overlay global para swipe horizontal entre abas
 *
 * PROPÓSITO:
 * - Permite swipe horizontal Pontos ↔ Terreiros de QUALQUER tela (exceto /player)
 * - Funciona tanto no RootPager quanto em telas profundas (Terreiro, Collection)
 * - Bloqueia toque acidental em cards quando swipe é reconhecido
 *
 * COMPORTAMENTO:
 * - Swipe direita (translationX > 0): vai para Terreiros
 * - Swipe esquerda (translationX < 0): vai para Pontos
 * - Threshold horizontal: 40px para disparar navegação
 * - Falha se movimento vertical > 15px (não brigar com scroll)
 * - Desabilitado em /player (swipe de música tem prioridade)
 *
 * INTEGRAÇÃO:
 * - Usa RootPagerContext.setActiveKey para trocar aba
 * - Usa GestureGateContext para bloquear press após swipe
 * - Em telas profundas, volta para /(app) antes de trocar aba
 */
export function AppTabSwipeOverlay() {
  const pathname = usePathname();
  const rootPager = useRootPager();
  const tabController = useTabController();
  const gestureBlock = useGestureBlock();
  const gestureGate = useGestureGate();
  const { width } = useWindowDimensions();

  const [forcePointerEventsAuto, setForcePointerEventsAuto] = useState(false);

  const forcePointerEventsAutoRef = useRef(false);

  const [panPointerEvents, setPanPointerEvents] =
    useState<OverlayPointerEvents>("none");
  const panPointerEventsRef = useRef<OverlayPointerEvents>("none");
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    forcePointerEventsAutoRef.current = forcePointerEventsAuto;
  }, [forcePointerEventsAuto]);

  const setPanPE = useCallback(
    (next: OverlayPointerEvents, reason?: string) => {
      if (panPointerEventsRef.current === next) return;
      const prev = panPointerEventsRef.current;
      panPointerEventsRef.current = next;
      setPanPointerEvents(next);
      logSwipeOverlay({
        phase: "pointerEventsChange",
        pathname: pathnameRef.current,
        pointerEventsPrev: prev,
        pointerEventsNext: next,
        reason: reason ?? null,
        now: Date.now(),
      });
    },
    []
  );

  const translateX = useRef(new Animated.Value(0)).current;
  const swipeRecognizedRef = useRef(false);
  const didNavigateRef = useRef(false);
  const rejectedForVerticalRef = useRef(false);
  const lastMoveLogAtRef = useRef(0);

  // DEV-only: helps confirm whether swipe is needed to "wake" taps.
  const didLogCaptureThresholdRef = useRef(false);
  const didLogNavThresholdRef = useRef(false);

  // Desabilita overlay no player (swipe de música tem prioridade)
  // e quando algum bottom sheet está aberto (o TabView já bloqueia swipe nesse estado).
  const isPlayerActive = pathname === "/player";
  const isModalActive =
    pathname === "/terreiro-editor" || pathname === "/access-manager";
  const isOverlayDisabled =
    isPlayerActive || isModalActive || !!rootPager?.isBottomSheetOpen;

  const activeTab: TabKey =
    pathname === "/" ? rootPager.activeKey : inferTabFromPathname(pathname);

  const activeTabRef = useRef<TabKey>(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  const effectivePointerEvents: OverlayPointerEvents = forcePointerEventsAuto
    ? "auto"
    : panPointerEvents;

  if (__DEV__) {
    logSwipeOverlay({
      phase: "render",
      render: renderCountRef.current,
      pathname,
      activeTab,
      isOverlayDisabled,
      isPlayerActive,
      isModalActive,
      isBottomSheetOpen: !!rootPager?.isBottomSheetOpen,
      pointerEventsRaw: panPointerEvents,
      pointerEventsEffective: effectivePointerEvents,
      forcePointerEventsAuto,
    });
  }

  // Segurança extra: quando o overlay estiver habilitado, garantimos que ele
  // comece fora do hit-test (pointerEvents="none") até cruzar o capture threshold.
  useEffect(() => {
    if (isOverlayDisabled) return;
    setPanPE("none", "overlayEnabled");
  }, [isOverlayDisabled, setPanPE]);

  useEffect(() => {
    if (!__DEV__) return;
    logSwipeOverlay({
      phase: "mount",
      pathname,
      activeTab,
      now: Date.now(),
    });
    return () => {
      logSwipeOverlay({
        phase: "unmount",
        pathname: pathnameRef.current,
        activeTab: activeTabRef.current,
        now: Date.now(),
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!__DEV__) return;
    logSwipeOverlay({
      phase: "devMenu",
      action: "addMenuItem",
      item: "SwipeOverlay: Toggle force pointerEvents=auto",
    });
    DevSettings.addMenuItem(
      "SwipeOverlay: Toggle force pointerEvents=auto",
      () => {
        setForcePointerEventsAuto((prev) => {
          const next = !prev;
          logSwipeOverlay({
            phase: "devMenu",
            action: "toggleForcePointerEventsAuto",
            pathname: pathnameRef.current,
            prev,
            next,
            now: Date.now(),
          });
          return next;
        });
      }
    );
  }, []);

  useEffect(() => {
    logSwipeOverlay({
      phase: "state",
      pathname,
      activeTab,
      isPlayerActive,
      isModalActive,
      isOverlayDisabled,
      isBottomSheetOpen: !!rootPager?.isBottomSheetOpen,
      pointerEventsRaw: panPointerEvents,
      pointerEventsEffective: effectivePointerEvents,
      forcePointerEventsAuto,
      now: Date.now(),
    });
  }, [
    activeTab,
    isOverlayDisabled,
    isPlayerActive,
    isModalActive,
    pathname,
    rootPager?.isBottomSheetOpen,
    panPointerEvents,
    effectivePointerEvents,
    forcePointerEventsAuto,
  ]);

  useEffect(() => {
    logSwipeOverlay({
      phase: "pointerEventsEffective",
      pathname,
      pointerEventsRaw: panPointerEvents,
      pointerEventsEffective: effectivePointerEvents,
      forcePointerEventsAuto,
      now: Date.now(),
    });
  }, [
    effectivePointerEvents,
    forcePointerEventsAuto,
    panPointerEvents,
    pathname,
  ]);

  useEffect(() => {
    if (!isOverlayDisabled) return;
    logSwipeOverlay({
      phase: "disabled",
      pathname,
      activeTab,
      isPlayerActive,
      isModalActive,
      isBottomSheetOpen: !!rootPager?.isBottomSheetOpen,
      pointerEventsRaw: panPointerEvents,
      pointerEventsEffective: effectivePointerEvents,
      forcePointerEventsAuto,
      now: Date.now(),
    });
  }, [
    isOverlayDisabled,
    pathname,
    activeTab,
    isPlayerActive,
    isModalActive,
    rootPager?.isBottomSheetOpen,
    panPointerEvents,
    effectivePointerEvents,
    forcePointerEventsAuto,
  ]);

  const panResponder = useMemo(() => {
    if (isOverlayDisabled) return null;

    return PanResponder.create({
      onStartShouldSetPanResponder: (_evt, gesture) => {
        const decision = false;
        logSwipeOverlay({
          phase: "startShouldSet",
          pathname,
          pointerEventsRaw: panPointerEventsRef.current,
          pointerEventsEffective: effectivePointerEvents,
          forcePointerEventsAuto,
          dx: gesture?.dx ?? 0,
          dy: gesture?.dy ?? 0,
          decision,
        });
        return decision;
      },
      onStartShouldSetPanResponderCapture: (_evt, gesture) => {
        const decision = false;
        logSwipeOverlay({
          phase: "startShouldSetCapture",
          pathname,
          pointerEventsRaw: panPointerEventsRef.current,
          pointerEventsEffective: effectivePointerEvents,
          forcePointerEventsAuto,
          dx: gesture?.dx ?? 0,
          dy: gesture?.dy ?? 0,
          decision,
        });
        return decision;
      },

      onMoveShouldSetPanResponder: (_evt, gesture) => {
        const dx = gesture.dx;
        const dy = gesture.dy;
        const rejectedForVertical = shouldRejectForVertical(dx, dy);
        if (rejectedForVertical) {
          logSwipeOverlay({
            phase: "moveShouldSet",
            pathname,
            pointerEventsRaw: panPointerEventsRef.current,
            pointerEventsEffective: effectivePointerEvents,
            forcePointerEventsAuto,
            dx,
            dy,
            rejectedForVertical,
            movementTarget: null,
            decision: false,
          });
          return false;
        }

        const movementTarget = getMovementTargetTab(dx, activeTab);
        if (!movementTarget || movementTarget === activeTab) {
          logSwipeOverlay({
            phase: "moveShouldSet",
            pathname,
            pointerEventsRaw: panPointerEventsRef.current,
            pointerEventsEffective: effectivePointerEvents,
            forcePointerEventsAuto,
            dx,
            dy,
            rejectedForVertical,
            movementTarget: movementTarget ?? null,
            decision: false,
          });
          return false;
        }

        const should = shouldCaptureSwipe(dx, dy);
        if (should) {
          setPanPE("auto", "moveShouldSet:true");
        }
        logSwipeOverlay({
          phase: "moveShouldSet",
          pathname,
          pointerEventsRaw: panPointerEventsRef.current,
          pointerEventsEffective: effectivePointerEvents,
          forcePointerEventsAuto,
          activeTab,
          movementTarget,
          dx,
          dy,
          decision: should,
        });
        return should;
      },

      onMoveShouldSetPanResponderCapture: (_evt, gesture) => {
        // Versão "capture" para vencer ScrollView/FlatList quando for swipe horizontal real.
        const dx = gesture.dx;
        const dy = gesture.dy;
        const rejectedForVertical = shouldRejectForVertical(dx, dy);
        if (rejectedForVertical) {
          logSwipeOverlay({
            phase: "moveShouldSetCapture",
            pathname,
            pointerEventsRaw: panPointerEventsRef.current,
            pointerEventsEffective: effectivePointerEvents,
            forcePointerEventsAuto,
            dx,
            dy,
            rejectedForVertical,
            movementTarget: null,
            decision: false,
          });
          return false;
        }

        const movementTarget = getMovementTargetTab(dx, activeTab);
        if (!movementTarget || movementTarget === activeTab) {
          logSwipeOverlay({
            phase: "moveShouldSetCapture",
            pathname,
            pointerEventsRaw: panPointerEventsRef.current,
            pointerEventsEffective: effectivePointerEvents,
            forcePointerEventsAuto,
            dx,
            dy,
            rejectedForVertical,
            movementTarget: movementTarget ?? null,
            decision: false,
          });
          return false;
        }

        const should = shouldCaptureSwipe(dx, dy);
        if (should) {
          setPanPE("auto", "moveShouldSetCapture:true");
        }
        logSwipeOverlay({
          phase: "moveShouldSetCapture",
          pathname,
          pointerEventsRaw: panPointerEventsRef.current,
          pointerEventsEffective: effectivePointerEvents,
          forcePointerEventsAuto,
          activeTab,
          movementTarget,
          dx,
          dy,
          decision: should,
        });
        return should;
      },

      onPanResponderGrant: () => {
        swipeRecognizedRef.current = false;
        didNavigateRef.current = false;
        rejectedForVerticalRef.current = false;
        didLogCaptureThresholdRef.current = false;
        didLogNavThresholdRef.current = false;
        translateX.setValue(0);

        logSwipeOverlay({
          phase: "grant",
          pathname,
          activeTab,
          pointerEventsRaw: panPointerEventsRef.current,
          pointerEventsEffective: effectivePointerEvents,
          forcePointerEventsAuto,
          now: Date.now(),
        });
      },

      onPanResponderMove: (_evt, gesture) => {
        const absX = Math.abs(gesture.dx);
        const absY = Math.abs(gesture.dy);

        const now = Date.now();
        if (now - lastMoveLogAtRef.current > 120) {
          lastMoveLogAtRef.current = now;
          logSwipeOverlay({
            phase: "move",
            pathname,
            activeTab,
            pointerEventsRaw: panPointerEventsRef.current,
            pointerEventsEffective: effectivePointerEvents,
            forcePointerEventsAuto,
            dx: gesture.dx,
            dy: gesture.dy,
            absX,
            absY,
            swipeRecognized: swipeRecognizedRef.current,
            rejectedForVertical: rejectedForVerticalRef.current,
          });
        }

        const movementTarget = getMovementTargetTab(gesture.dx, activeTab);

        if (
          __DEV__ &&
          movementTarget &&
          !didLogCaptureThresholdRef.current &&
          shouldCaptureSwipe(gesture.dx, gesture.dy)
        ) {
          didLogCaptureThresholdRef.current = true;
          logSwipeOverlay({
            phase: "moveCrossCaptureThreshold",
            pathname,
            activeTab,
            pointerEventsRaw: panPointerEventsRef.current,
            pointerEventsEffective: effectivePointerEvents,
            forcePointerEventsAuto,
            targetTab: movementTarget,
            dx: gesture.dx,
            dy: gesture.dy,
            absX,
            absY,
          });
        }

        if (
          __DEV__ &&
          movementTarget &&
          !didLogNavThresholdRef.current &&
          getReleaseTargetTab(gesture.dx, activeTab) &&
          absX > absY
        ) {
          didLogNavThresholdRef.current = true;
          logSwipeOverlay({
            phase: "moveCrossNavThreshold",
            pathname,
            activeTab,
            pointerEventsRaw: panPointerEventsRef.current,
            pointerEventsEffective: effectivePointerEvents,
            forcePointerEventsAuto,
            targetTab: getReleaseTargetTab(gesture.dx, activeTab),
            dx: gesture.dx,
            dy: gesture.dy,
            absX,
            absY,
          });
        }

        // Reject early para vertical: não brigar com scroll.
        if (
          !swipeRecognizedRef.current &&
          shouldRejectForVertical(gesture.dx, gesture.dy)
        ) {
          rejectedForVerticalRef.current = true;
          return;
        }

        // Se o gesto já foi rejeitado por vertical, não faz nada.
        if (rejectedForVerticalRef.current) return;

        // Atualiza visual
        translateX.setValue(gesture.dx);

        // Marca swipe como reconhecido se passou threshold
        if (
          movementTarget &&
          movementTarget !== activeTab &&
          !swipeRecognizedRef.current &&
          absX > 25 &&
          absX > absY
        ) {
          swipeRecognizedRef.current = true;
          gestureGate.markSwipeStart();

          logSwipeOverlay({
            phase: "swipeRecognized",
            pathname,
            activeTab,
            pointerEventsRaw: panPointerEventsRef.current,
            pointerEventsEffective: effectivePointerEvents,
            forcePointerEventsAuto,
            targetTab: movementTarget,
            dx: gesture.dx,
            dy: gesture.dy,
            absX,
            absY,
          });
        }
      },

      onPanResponderRelease: (_evt, gesture) => {
        // Ao terminar o gesto, o overlay volta a não participar do hit-test.
        setPanPE("none", "release");

        const absX = Math.abs(gesture.dx);
        const absY = Math.abs(gesture.dy);

        const targetTab = getReleaseTargetTab(gesture.dx, activeTab);

        const shouldNavigate =
          !!targetTab &&
          targetTab !== activeTab &&
          !rejectedForVerticalRef.current &&
          absX > absY;
        const isOnRootPager = pathname === "/";

        logSwipeOverlay({
          phase: "release",
          pathname,
          activeTab,
          pointerEventsRaw: panPointerEventsRef.current,
          pointerEventsEffective: effectivePointerEvents,
          forcePointerEventsAuto,
          targetTab: targetTab ?? null,
          dx: gesture.dx,
          dy: gesture.dy,
          absX,
          absY,
          rejectedForVertical: rejectedForVerticalRef.current,
          shouldNavigate,
          isOnRootPager,
        });

        if (shouldNavigate && !didNavigateRef.current) {
          didNavigateRef.current = true;

          logSwipeOverlay({
            phase: "shouldNavigate",
            pathname,
            activeTab,
            pointerEventsRaw: panPointerEventsRef.current,
            pointerEventsEffective: effectivePointerEvents,
            forcePointerEventsAuto,
            targetTab,
            dx: gesture.dx,
            dy: gesture.dy,
            absX,
            absY,
          });

          logSwipeOverlay({
            phase: "willNavigate",
            pathname,
            activeTab,
            pointerEventsRaw: panPointerEventsRef.current,
            pointerEventsEffective: effectivePointerEvents,
            forcePointerEventsAuto,
            targetTab,
          });

          // IMPORTANTE (determinístico): bloquear press APENAS quando
          // realmente vamos navegar (evita bloquear taps normais por jitter).
          logSwipeOverlay({
            phase: "markSwipeRecognized",
            pathname,
            activeTab,
            targetTab,
            now: Date.now(),
          });
          gestureBlock.markSwipeRecognized();

          // Ao finalizar, já deixa o gate em modo "block" antes de qualquer press.
          if (swipeRecognizedRef.current) {
            gestureGate.markSwipeEnd();
          }

          tabController.goToTab(targetTab);

          // Anima saída (puramente cosmético; overlay é invisível)
          Animated.timing(translateX, {
            toValue: targetTab === "terreiros" ? -width : width,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            translateX.setValue(0);
            swipeRecognizedRef.current = false;
            rejectedForVerticalRef.current = false;
          });
          return;
        }

        // Cancela swipe, volta para posição original
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start(() => {
          if (swipeRecognizedRef.current) {
            gestureGate.markSwipeEnd();
          }
          swipeRecognizedRef.current = false;
          rejectedForVerticalRef.current = false;
        });
      },

      onPanResponderTerminate: () => {
        // Ao terminar/interromper o gesto, o overlay volta a não participar do hit-test.
        setPanPE("none", "terminate");

        // Gesto interrompido, volta para posição original
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start(() => {
          if (swipeRecognizedRef.current) {
            gestureGate.markSwipeEnd();
          }
          swipeRecognizedRef.current = false;
          rejectedForVerticalRef.current = false;
        });

        logSwipeOverlay({
          phase: "terminate",
          pathname,
          activeTab,
          pointerEventsRaw: panPointerEventsRef.current,
          pointerEventsEffective: effectivePointerEvents,
          forcePointerEventsAuto,
          now: Date.now(),
        });
      },
    });
  }, [
    isOverlayDisabled,
    activeTab,
    pathname,
    tabController,
    gestureBlock,
    gestureGate,
    translateX,
    width,
    setPanPE,
    effectivePointerEvents,
    forcePointerEventsAuto,
  ]);

  if (isOverlayDisabled || !panResponder) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        pointerEvents={effectivePointerEvents}
        style={[styles.overlay, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
