import { useGestureBlock } from "@/contexts/GestureBlockContext";
import { useGestureGate } from "@/contexts/GestureGateContext";
import { useRootPager } from "@/contexts/RootPagerContext";
import { useTabController, type TabKey } from "@/contexts/TabControllerContext";
import { usePathname, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

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
  const router = useRouter();
  const pathname = usePathname();
  const rootPager = useRootPager();
  const tabController = useTabController();
  const gestureBlock = useGestureBlock();
  const gestureGate = useGestureGate();
  const { width } = useWindowDimensions();

  const [panPointerEvents, setPanPointerEvents] = useState<"none" | "auto">(
    "none"
  );
  const panPointerEventsRef = useRef<"none" | "auto">("none");
  const setPanPE = useCallback((next: "none" | "auto") => {
    if (panPointerEventsRef.current === next) return;
    panPointerEventsRef.current = next;
    setPanPointerEvents(next);
    if (__DEV__) {
      console.log("[SwipeOverlay] pointerEvents -> " + next);
    }
  }, []);

  const translateX = useRef(new Animated.Value(0)).current;
  const swipeRecognizedRef = useRef(false);
  const didNavigateRef = useRef(false);
  const rejectedForVerticalRef = useRef(false);

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

  // Segurança extra: quando o overlay estiver habilitado, garantimos que ele
  // comece fora do hit-test (pointerEvents="none") at cruzar o capture threshold.
  useEffect(() => {
    if (isOverlayDisabled) return;
    setPanPE("none");
  }, [isOverlayDisabled, setPanPE]);

  useEffect(() => {
    if (!__DEV__) return;
    console.log("[SwipeOverlay] mount", {
      pathname,
      activeTab,
    });
    return () => {
      console.log("[SwipeOverlay] unmount", {
        pathname,
        activeTab,
      });
    };
  }, [activeTab, pathname]);

  useEffect(() => {
    if (!__DEV__) return;
    console.log("[SwipeOverlay] state", {
      pathname,
      activeTab,
      isPlayerActive,
      isOverlayDisabled,
      isBottomSheetOpen: !!rootPager?.isBottomSheetOpen,
    });
  }, [
    activeTab,
    isOverlayDisabled,
    isPlayerActive,
    pathname,
    rootPager?.isBottomSheetOpen,
  ]);

  const panResponder = useMemo(() => {
    if (isOverlayDisabled) return null;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,

      onMoveShouldSetPanResponder: (_evt, gesture) => {
        if (shouldRejectForVertical(gesture.dx, gesture.dy)) return false;

        const movementTarget = getMovementTargetTab(gesture.dx, activeTab);
        if (!movementTarget) return false;
        if (movementTarget === activeTab) return false;

        const should = shouldCaptureSwipe(gesture.dx, gesture.dy);
        if (should) {
          setPanPE("auto");
        }
        if (__DEV__ && should) {
          console.log("[SwipeOverlay] capture(move)", {
            pathname,
            activeTab,
            targetTab: movementTarget,
            dx: gesture.dx,
            dy: gesture.dy,
          });
        }
        return should;
      },

      onMoveShouldSetPanResponderCapture: (_evt, gesture) => {
        // Versão "capture" para vencer ScrollView/FlatList quando for swipe horizontal real.
        if (shouldRejectForVertical(gesture.dx, gesture.dy)) return false;

        const movementTarget = getMovementTargetTab(gesture.dx, activeTab);
        if (!movementTarget) return false;
        if (movementTarget === activeTab) return false;

        const should = shouldCaptureSwipe(gesture.dx, gesture.dy);
        if (should) {
          setPanPE("auto");
        }
        if (__DEV__ && should) {
          console.log("[SwipeOverlay] capture(move/capture)", {
            pathname,
            activeTab,
            targetTab: movementTarget,
            dx: gesture.dx,
            dy: gesture.dy,
          });
        }
        return should;
      },

      onPanResponderGrant: () => {
        swipeRecognizedRef.current = false;
        didNavigateRef.current = false;
        rejectedForVerticalRef.current = false;
        didLogCaptureThresholdRef.current = false;
        didLogNavThresholdRef.current = false;
        translateX.setValue(0);

        if (__DEV__) {
          console.log("[SwipeOverlay] grant", {
            pathname,
            activeTab,
            now: Date.now(),
          });
        }
      },

      onPanResponderMove: (_evt, gesture) => {
        const absX = Math.abs(gesture.dx);
        const absY = Math.abs(gesture.dy);

        const movementTarget = getMovementTargetTab(gesture.dx, activeTab);

        if (
          __DEV__ &&
          movementTarget &&
          !didLogCaptureThresholdRef.current &&
          shouldCaptureSwipe(gesture.dx, gesture.dy)
        ) {
          didLogCaptureThresholdRef.current = true;
          console.log("[SwipeOverlay] move:cross_capture_threshold", {
            pathname,
            activeTab,
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
          console.log("[SwipeOverlay] move:cross_nav_threshold", {
            pathname,
            activeTab,
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

          if (__DEV__) {
            console.log("[SwipeOverlay] swipeRecognized", {
              pathname,
              activeTab,
              targetTab: movementTarget,
              dx: gesture.dx,
              dy: gesture.dy,
            });
          }
        }
      },

      onPanResponderRelease: (_evt, gesture) => {
        // Ao terminar o gesto, o overlay volta a no participar do hit-test.
        setPanPE("none");

        const absX = Math.abs(gesture.dx);
        const absY = Math.abs(gesture.dy);

        const targetTab = getReleaseTargetTab(gesture.dx, activeTab);

        const shouldNavigate =
          !!targetTab &&
          targetTab !== activeTab &&
          !rejectedForVerticalRef.current &&
          absX > absY;
        const isOnRootPager = pathname === "/";

        if (__DEV__) {
          console.log("[SwipeOverlay] release", {
            pathname,
            activeTab,
            targetTab: targetTab ?? null,
            dx: gesture.dx,
            dy: gesture.dy,
            absX,
            absY,
            rejectedForVertical: rejectedForVerticalRef.current,
            shouldNavigate,
            isOnRootPager,
          });
        }

        if (shouldNavigate && !didNavigateRef.current) {
          didNavigateRef.current = true;

          if (__DEV__) {
            console.log("[SwipeOverlay] shouldNavigate", {
              pathname,
              activeTab,
              targetTab,
              dx: gesture.dx,
              dy: gesture.dy,
              absX,
              absY,
            });
          }

          if (__DEV__) {
            console.log("[SwipeOverlay] willNavigate", {
              pathname,
              targetTab,
              restoreHref: tabController.getLastHrefForTab(targetTab),
            });
          }

          // IMPORTANTE (determinístico): bloquear press APENAS quando
          // realmente vamos navegar (evita bloquear taps normais por jitter).
          if (__DEV__) {
            console.log("[SwipeOverlay] markSwipeRecognized", {
              pathname,
              activeTab,
              targetTab,
              now: Date.now(),
            });
          }
          gestureBlock.markSwipeRecognized();

          // Ao finalizar, já deixa o gate em modo "block" antes de qualquer press.
          if (swipeRecognizedRef.current) {
            gestureGate.markSwipeEnd();
          }

          const restoreHref = tabController.getLastHrefForTab(targetTab);
          const shouldRestoreDeep =
            typeof restoreHref === "string" &&
            restoreHref.length > 0 &&
            restoreHref !== "/";

          if (isOnRootPager) {
            tabController.goToTab(targetTab);

            if (shouldRestoreDeep) {
              requestAnimationFrame(() => {
                router.push(restoreHref as any);
              });
            }
          } else {
            // Está em tela profunda (Terreiro/Collection)
            // Primeiro volta para /(app), depois troca aba, depois restaura.
            router.push("/(app)");
            requestAnimationFrame(() => {
              tabController.goToTab(targetTab);
            });

            if (shouldRestoreDeep) {
              requestAnimationFrame(() => {
                router.push(restoreHref as any);
              });
            }
          }

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
        // Ao terminar/interromper o gesto, o overlay volta a no participar do hit-test.
        setPanPE("none");

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

        if (__DEV__) {
          console.log("[SwipeOverlay] terminate", { pathname });
        }
      },
    });
  }, [
    isOverlayDisabled,
    activeTab,
    pathname,
    router,
    tabController,
    gestureBlock,
    gestureGate,
    translateX,
    width,
    setPanPE,
  ]);

  if (isOverlayDisabled || !panResponder) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        pointerEvents={panPointerEvents}
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
