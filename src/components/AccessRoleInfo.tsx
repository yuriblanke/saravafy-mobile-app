import React, { useMemo, useRef } from "react";

import { TooltipPopover } from "@/src/components/TooltipPopover";

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

export function AccessRoleInfo({ info }: Props) {
  const anchorRef = useRef<any>(null);

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

  return (
    <TooltipPopover
      anchorRef={anchorRef}
      title={info.title}
      text={text}
      maxWidth={260}
    />
  );
}
