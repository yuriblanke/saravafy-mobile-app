import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { usePreferences } from "@/contexts/PreferencesContext";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { colors, radii, spacing } from "@/src/theme";
import { usePathname } from "expo-router";

const dismissListeners = new Set<() => void>();

export function dismissAllTooltips() {
  for (const fn of dismissListeners) {
    try {
      fn();
    } catch {
      // ignore
    }
  }
}

type AnchorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  anchorRef: React.RefObject<any>;
  open: boolean;
  onClose: () => void;
  variant?: "light" | "dark";
  title?: string;
  text: string;
  maxWidth?: number;
};

const GAP = 8;
const SCREEN_PADDING = 12;

export function TooltipPopover({
  anchorRef,
  open,
  onClose,
  variant: variantOverride,
  title,
  text,
  maxWidth = 260,
}: Props) {
  const { effectiveTheme } = usePreferences();
  const pathname = usePathname();

  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const [cardSize, setCardSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  // Close when navigating to another route.
  useEffect(() => {
    if (!open) return;
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Global dismiss channel (used by scroll begin drag).
  useEffect(() => {
    if (!open) return;
    const fn = () => {
      if (open) close();
    };
    dismissListeners.add(fn);
    return () => {
      dismissListeners.delete(fn);
    };
  }, [close, open]);

  const measureAnchor = useCallback(() => {
    const node = anchorRef.current;
    if (!node || typeof node.measureInWindow !== "function") return;

    node.measureInWindow(
      (x: number, y: number, width: number, height: number) => {
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        setAnchor({ x, y, width, height });
      }
    );
  }, [anchorRef]);

  useEffect(() => {
    if (!open) {
      setAnchor(null);
      setCardSize(null);
      return;
    }

    measureAnchor();

    // Measure again next tick to reduce race with layout.
    const t = setTimeout(() => {
      measureAnchor();
    }, 0);

    return () => clearTimeout(t);
  }, [measureAnchor, open]);

  // Keep positioning sane on rotation/screen resize.
  useEffect(() => {
    if (!open) return;

    const sub = Dimensions.addEventListener("change", () => {
      measureAnchor();
    });

    return () => {
      // RN returns different shapes across versions.
      sub?.remove?.();
    };
  }, [measureAnchor, open]);

  const variant = variantOverride ?? effectiveTheme;
  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  const windowDims = Dimensions.get("window");

  const computed = useMemo(() => {
    if (!anchor) return null;

    const maxCardWidth = Math.min(
      maxWidth,
      windowDims.width - SCREEN_PADDING * 2
    );
    const measuredHeight = cardSize?.height ?? 120;

    const anchorCenterX = anchor.x + anchor.width / 2;

    const left = Math.max(
      SCREEN_PADDING,
      Math.min(
        anchorCenterX - maxCardWidth / 2,
        windowDims.width - SCREEN_PADDING - maxCardWidth
      )
    );

    const aboveTop = anchor.y - measuredHeight - GAP;
    const belowTop = anchor.y + anchor.height + GAP;

    const canFitAbove = aboveTop >= SCREEN_PADDING;
    const canFitBelow =
      belowTop + measuredHeight <= windowDims.height - SCREEN_PADDING;

    let top = canFitAbove ? aboveTop : canFitBelow ? belowTop : belowTop;

    top = Math.max(
      SCREEN_PADDING,
      Math.min(top, windowDims.height - SCREEN_PADDING - measuredHeight)
    );

    return { left, top, width: maxCardWidth };
  }, [anchor, cardSize?.height, maxWidth, windowDims.height, windowDims.width]);

  if (!open) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar explicação"
        onPress={close}
        style={styles.backdrop}
      />

      {computed ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.cardHost,
            {
              left: computed.left,
              top: computed.top,
              width: computed.width,
            },
          ]}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (!Number.isFinite(width) || !Number.isFinite(height)) return;
            if (width <= 0 || height <= 0) return;

            const prev = cardSize;
            if (prev && prev.width === width && prev.height === height) return;
            setCardSize({ width, height });
          }}
        >
          <SurfaceCard variant={variant} style={styles.card}>
            {typeof title === "string" && title.trim() ? (
              <Text style={[styles.title, { color: textPrimary }]}>
                {title.trim()}
              </Text>
            ) : null}

            <Text style={[styles.body, { color: textSecondary }]}>{text}</Text>
          </SurfaceCard>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  cardHost: {
    position: "absolute",
    zIndex: 2000,
  },
  card: {
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: 13,
    fontWeight: "900",
  },
  body: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    flexWrap: "wrap",
  },
});
