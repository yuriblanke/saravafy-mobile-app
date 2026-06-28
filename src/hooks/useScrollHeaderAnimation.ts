import { useCallback, useMemo, useRef, useState } from "react";
import { Animated } from "react-native";

export function useScrollHeaderAnimation(params: { headerTotalHeight: number }) {
  const { headerTotalHeight } = params;

  const [h1Height, setH1Height] = useState<number | null>(null);
  const [titleBlockY, setTitleBlockY] = useState<number | null>(null);
  const [terreiroRowY, setTerreiroRowY] = useState<number | null>(null);
  const [actionsBottomY, setActionsBottomY] = useState<number | null>(null);
  const [pontosTopY, setPontosTopY] = useState<number | null>(null);

  const headerTitleOpacity = useRef(new Animated.Value(0)).current;
  const headerTitleVisibleRef = useRef(false);
  const [isHeaderTitleVisible, setIsHeaderTitleVisible] = useState(false);

  const headerGradientOpacity = useRef(new Animated.Value(0)).current;
  const headerGradientVisibleRef = useRef(false);

  const setHeaderTitleVisible = useCallback(
    (visible: boolean) => {
      if (headerTitleVisibleRef.current === visible) return;
      headerTitleVisibleRef.current = visible;
      setIsHeaderTitleVisible(visible);

      // Asymmetric: scroll→header fades in; header→scroll snaps immediately.
      headerTitleOpacity.stopAnimation();
      if (!visible) {
        headerTitleOpacity.setValue(0);
        return;
      }

      Animated.timing(headerTitleOpacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }).start();
    },
    [headerTitleOpacity]
  );

  const titleShareOpacity = useMemo(
    () =>
      headerTitleOpacity.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
        extrapolate: "clamp",
      }),
    [headerTitleOpacity]
  );

  const setHeaderGradientVisible = useCallback(
    (visible: boolean) => {
      if (headerGradientVisibleRef.current === visible) return;
      headerGradientVisibleRef.current = visible;
      Animated.timing(headerGradientOpacity, {
        toValue: visible ? 1 : 0,
        duration: 160,
        useNativeDriver: true,
      }).start();
    },
    [headerGradientOpacity]
  );

  const headerBackdropOpacity = useMemo(
    () =>
      headerGradientOpacity.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.75],
        extrapolate: "clamp",
      }),
    [headerGradientOpacity]
  );

  const topGradientHeight = useMemo(() => {
    const h = typeof pontosTopY === "number" && pontosTopY > 0 ? pontosTopY : 220;
    return Math.max(160, Math.min(360, h));
  }, [pontosTopY]);

  const terreiroRowTopY = useMemo(() => {
    if (typeof titleBlockY !== "number" || typeof terreiroRowY !== "number") return null;
    return titleBlockY + terreiroRowY;
  }, [titleBlockY, terreiroRowY]);

  const headerGradientThreshold = useMemo(() => {
    if (typeof terreiroRowTopY === "number" && terreiroRowTopY > 0) {
      return Math.max(0, terreiroRowTopY - headerTotalHeight);
    }

    const topGradientNoLongerBehindHeader = Math.max(
      0,
      topGradientHeight - headerTotalHeight
    );

    if (typeof actionsBottomY === "number" && actionsBottomY > 0) {
      const actionsBottomReachedHeader = Math.max(
        0,
        actionsBottomY - headerTotalHeight
      );
      return Math.max(actionsBottomReachedHeader, topGradientNoLongerBehindHeader);
    }

    const base = typeof h1Height === "number" && h1Height > 0 ? h1Height : 44;
    const fallback = Math.max(0, base + 52); // 52 = headerVisibleHeight
    return Math.max(fallback, topGradientNoLongerBehindHeader);
  }, [
    actionsBottomY,
    h1Height,
    headerTotalHeight,
    topGradientHeight,
    terreiroRowTopY,
  ]);

  const onScroll = useCallback(
    (y: number) => {
      const base = typeof h1Height === "number" && h1Height > 0 ? h1Height : 44;
      const threshold = Math.max(0, base - 8);
      setHeaderTitleVisible(y >= threshold);
      setHeaderGradientVisible(y >= headerGradientThreshold);
    },
    [h1Height, headerGradientThreshold, setHeaderGradientVisible, setHeaderTitleVisible]
  );

  return {
    setH1Height,
    setTitleBlockY,
    setTerreiroRowY,
    setActionsBottomY,
    setPontosTopY,
    isHeaderTitleVisible,
    headerTitleOpacity,
    headerGradientOpacity,
    headerBackdropOpacity,
    titleShareOpacity,
    topGradientHeight,
    onScroll,
  };
}
