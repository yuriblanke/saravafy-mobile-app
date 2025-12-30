import { useGestureGate } from "@/contexts/GestureGateContext";
import { useRootPager } from "@/contexts/RootPagerContext";
import { useTabController, type TabKey } from "@/contexts/TabControllerContext";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
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
  const gestureGate = useGestureGate();
  const { width } = useWindowDimensions();

  const translateX = useRef(new Animated.Value(0)).current;
  const swipeRecognizedRef = useRef(false);
  const didNavigateRef = useRef(false);
  const rejectedForVerticalRef = useRef(false);

  // Desabilita overlay no player (swipe de música tem prioridade)
  // e quando algum bottom sheet está aberto (o TabView já bloqueia swipe nesse estado).
  const isPlayerActive = pathname === "/player";
  const isOverlayDisabled = isPlayerActive || !!rootPager?.isBottomSheetOpen;

  useEffect(() => {
    if (!__DEV__) return;
    console.log("[SwipeOverlay] state", {
      pathname,
      isPlayerActive,
      isOverlayDisabled,
      isBottomSheetOpen: !!rootPager?.isBottomSheetOpen,
    });
  }, [isOverlayDisabled, isPlayerActive, pathname, rootPager?.isBottomSheetOpen]);

  const panResponder = useMemo(() => {
    if (isOverlayDisabled) return null;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,

      onMoveShouldSetPanResponder: (_evt, gesture) => {
        if (shouldRejectForVertical(gesture.dx, gesture.dy)) return false;

        const should = shouldCaptureSwipe(gesture.dx, gesture.dy);
        if (__DEV__ && should) {
          console.log("[SwipeOverlay] capture(move)", {
            pathname,
            dx: gesture.dx,
            dy: gesture.dy,
          });
        }
        return should;
      },

      onMoveShouldSetPanResponderCapture: (_evt, gesture) => {
        // Versão "capture" para vencer ScrollView/FlatList quando for swipe horizontal real.
        if (shouldRejectForVertical(gesture.dx, gesture.dy)) return false;

        const should = shouldCaptureSwipe(gesture.dx, gesture.dy);
        if (__DEV__ && should) {
          console.log("[SwipeOverlay] capture(move/capture)", {
            pathname,
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
        translateX.setValue(0);

        if (__DEV__) {
          console.log("[SwipeOverlay] grant", { pathname });
        }
      },

      onPanResponderMove: (_evt, gesture) => {
        const absX = Math.abs(gesture.dx);
        const absY = Math.abs(gesture.dy);

        // Reject early para vertical: não brigar com scroll.
        if (!swipeRecognizedRef.current && shouldRejectForVertical(gesture.dx, gesture.dy)) {
          rejectedForVerticalRef.current = true;
          return;
        }

        // Se o gesto já foi rejeitado por vertical, não faz nada.
        if (rejectedForVerticalRef.current) return;

        // Atualiza visual
        translateX.setValue(gesture.dx);

        // Marca swipe como reconhecido se passou threshold
        if (!swipeRecognizedRef.current && absX > 25 && absX > absY) {
          swipeRecognizedRef.current = true;
          gestureGate.markSwipeStart();

          if (__DEV__) {
            console.log("[SwipeOverlay] swipeRecognized", {
              pathname,
              dx: gesture.dx,
              dy: gesture.dy,
            });
          }
        }
      },

      onPanResponderRelease: (_evt, gesture) => {
        const absX = Math.abs(gesture.dx);
        const absY = Math.abs(gesture.dy);

        // Determina direção do swipe
        const isSwipeRight = gesture.dx > 40; // direita = vai para Terreiros
        const isSwipeLeft = gesture.dx < -40; // esquerda = vai para Pontos

        const shouldNavigate =
          !rejectedForVerticalRef.current &&
          absX > absY &&
          (isSwipeRight || isSwipeLeft);

        const targetTab: TabKey = isSwipeRight ? "terreiros" : "pontos";
        const isOnRootPager = pathname === "/";

        if (__DEV__) {
          console.log("[SwipeOverlay] release", {
            pathname,
            dx: gesture.dx,
            dy: gesture.dy,
            absX,
            absY,
            rejectedForVertical: rejectedForVerticalRef.current,
            shouldNavigate,
            isSwipeLeft,
            isSwipeRight,
            isOnRootPager,
          });
        }

        if (shouldNavigate && !didNavigateRef.current) {
          didNavigateRef.current = true;

          if (__DEV__) {
            console.log("[SwipeOverlay] willNavigate", {
              pathname,
              targetTab,
              restoreHref: tabController.getLastHrefForTab(targetTab),
            });
          }

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
            toValue: isSwipeRight ? width : -width,
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
    pathname,
    router,
    tabController,
    gestureGate,
    translateX,
    width,
  ]);

  if (isOverlayDisabled || !panResponder) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        pointerEvents="auto"
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
