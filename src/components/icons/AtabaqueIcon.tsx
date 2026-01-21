import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

export function AtabaqueIcon(props: {
  size?: number;
  color: string;
  filled?: boolean;
}) {
  const size =
    typeof props.size === "number" && props.size > 0 ? props.size : 18;
  const filled = props.filled === true;
  const color = props.color;

  const dims = useMemo(() => {
    const w = Math.round(size);
    const h = Math.round(size);

    const headH = Math.max(2, Math.round(h * 0.22));
    const bodyW = Math.max(6, Math.round(w * 0.62));
    const bodyH = Math.max(8, Math.round(h * 0.62));
    const baseH = Math.max(2, Math.round(h * 0.1));
    const border = Math.max(1, Math.round(size * 0.08));

    return {
      w,
      h,
      headH,
      bodyW,
      bodyH,
      baseH,
      border,
    };
  }, [size]);

  const strokeStyle = useMemo(() => {
    return filled
      ? {
          borderWidth: 0,
          backgroundColor: color,
        }
      : {
          borderWidth: dims.border,
          borderColor: color,
          backgroundColor: "transparent",
        };
  }, [color, dims.border, filled]);

  return (
    <View style={[styles.root, { width: dims.w, height: dims.h }]}>
      {/* Cabeça */}
      <View
        style={[
          styles.head,
          {
            width: Math.round(dims.w * 0.78),
            height: dims.headH,
            borderRadius: Math.round(dims.headH / 2),
            top: Math.round(dims.h * 0.06),
            left: Math.round((dims.w - dims.w * 0.78) / 2),
          },
          strokeStyle,
        ]}
      />

      {/* Corpo */}
      <View
        style={[
          styles.body,
          {
            width: dims.bodyW,
            height: dims.bodyH,
            borderRadius: Math.round(dims.bodyW * 0.18),
            top: Math.round(dims.h * 0.18),
            left: Math.round((dims.w - dims.bodyW) / 2),
          },
          strokeStyle,
        ]}
      >
        {!filled ? (
          <>
            <View
              style={{
                position: "absolute",
                left: Math.round(dims.bodyW * 0.18),
                right: Math.round(dims.bodyW * 0.18),
                top: Math.round(dims.bodyH * 0.32),
                height: Math.max(1, Math.round(dims.border / 1.2)),
                backgroundColor: color,
                opacity: 0.9,
                borderRadius: 999,
              }}
            />
            <View
              style={{
                position: "absolute",
                left: Math.round(dims.bodyW * 0.18),
                right: Math.round(dims.bodyW * 0.18),
                top: Math.round(dims.bodyH * 0.55),
                height: Math.max(1, Math.round(dims.border / 1.2)),
                backgroundColor: color,
                opacity: 0.9,
                borderRadius: 999,
              }}
            />
          </>
        ) : null}
      </View>

      {/* Base */}
      <View
        style={[
          styles.base,
          {
            width: Math.round(dims.w * 0.56),
            height: dims.baseH,
            borderRadius: Math.round(dims.baseH / 2),
            bottom: Math.round(dims.h * 0.06),
            left: Math.round((dims.w - dims.w * 0.56) / 2),
          },
          filled
            ? { backgroundColor: color }
            : { backgroundColor: color, opacity: 0.9 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "relative",
  },
  head: {
    position: "absolute",
  },
  body: {
    position: "absolute",
    overflow: "hidden",
  },
  base: {
    position: "absolute",
  },
});
