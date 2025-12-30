import React, { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { TooltipPopover, dismissAllTooltips } from "@/src/components/TooltipPopover";
import { colors } from "@/src/theme";

export type InfoSection = {
  title?: string;
  items: readonly string[];
};

export type InfoProps = {
  accessibilityLabel?: string;
  title: string;
  heading?: string;
  body?: string;
  sections?: readonly InfoSection[];
};

type Props = {
  variant: "light" | "dark";
  info: InfoProps;
};

export function AccessRoleInfo({ info, variant }: Props) {
  const anchorRef = useRef<any>(null);
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => {
    setOpen((v) => {
      const next = !v;
      if (next) dismissAllTooltips();
      return next;
    });
  }, []);

  const text = useMemo(() => {
    const lines: string[] = [];

    if (typeof info.heading === "string" && info.heading.trim()) {
      lines.push(info.heading.trim());
    }

    if (typeof info.body === "string" && info.body.trim()) {
      if (lines.length) lines.push("");
      lines.push(info.body.trim());
    }

    const sections = info.sections ?? [];
    for (const section of sections) {
      const sectionLines: string[] = [];

      if (typeof section.title === "string" && section.title.trim()) {
        sectionLines.push(section.title.trim());
      }

      for (const item of section.items ?? []) {
        sectionLines.push(`- ${item}`);
      }

      if (sectionLines.length) {
        if (lines.length) lines.push("");
        lines.push(...sectionLines);
      }
    }

    return lines.join("\n").trim() || " ";
  }, [info.body, info.heading, info.sections]);

  const iconBorder =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;
  const iconBg = variant === "light" ? colors.inputBgLight : colors.inputBgDark;
  const iconText =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;

  return (
    <>
      <Pressable
        ref={anchorRef}
        accessibilityRole="button"
        accessibilityLabel={info.accessibilityLabel || "Ver detalhes"}
        onPress={toggle}
        hitSlop={8}
        style={[
          styles.icon,
          {
            backgroundColor: iconBg,
            borderColor: iconBorder,
          },
        ]}
      >
        <Text style={[styles.iconText, { color: iconText }]}>i</Text>
      </Pressable>

      <TooltipPopover
        anchorRef={anchorRef}
        open={open}
        onClose={close}
        variant={variant}
        title={info.title}
        text={text}
        maxWidth={260}
      />
    </>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 12,
  },
});
