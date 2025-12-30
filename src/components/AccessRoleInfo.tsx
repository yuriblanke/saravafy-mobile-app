import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SurfaceCard } from "@/src/components/SurfaceCard";
import { colors, spacing } from "@/src/theme";

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

export function AccessRoleInfo({ variant, info }: Props) {
  const [open, setOpen] = useState(false);

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;
  const textMuted =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;

  const iconBorder =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;
  const iconBg = variant === "light" ? colors.inputBgLight : colors.inputBgDark;

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  const a11yLabel =
    typeof info.accessibilityLabel === "string" &&
    info.accessibilityLabel.trim()
      ? info.accessibilityLabel.trim()
      : "Ver detalhes";

  const sections = info.sections ?? [];

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
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
        <Text style={[styles.iconText, { color: textMuted }]}>i</Text>
      </Pressable>

      {open ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar explicação"
            onPress={close}
            style={styles.backdrop}
          />

          <View style={styles.popoverHost} pointerEvents="box-none">
            <SurfaceCard
              variant={variant}
              style={styles.popoverCard}
              accessibilityRole="summary"
            >
              <Text style={[styles.popoverTitle, { color: textPrimary }]}>
                {info.title}
              </Text>

              {typeof info.heading === "string" && info.heading.trim() ? (
                <Text style={[styles.popoverHeading, { color: textSecondary }]}>
                  {info.heading.trim()}
                </Text>
              ) : null}

              {typeof info.body === "string" && info.body.trim() ? (
                <Text style={[styles.popoverBody, { color: textSecondary }]}>
                  {info.body.trim()}
                </Text>
              ) : null}

              {sections.map((section, idx) => (
                <View
                  key={`${section.title ?? "section"}:${idx}`}
                  style={styles.section}
                >
                  {typeof section.title === "string" && section.title.trim() ? (
                    <Text
                      style={[styles.sectionTitle, { color: textSecondary }]}
                    >
                      {section.title.trim()}
                    </Text>
                  ) : null}

                  {section.items.map((item) => (
                    <View key={item} style={styles.bulletRow}>
                      <Text style={[styles.bullet, { color: textMuted }]}>
                        -
                      </Text>
                      <Text
                        style={[styles.bulletText, { color: textSecondary }]}
                      >
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </SurfaceCard>
          </View>
        </View>
      ) : null}
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  popoverHost: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  popoverCard: {
    width: "100%",
    maxWidth: 520,
  },
  popoverTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  popoverHeading: {
    marginTop: spacing.sm,
    fontSize: 13,
    fontWeight: "900",
    opacity: 0.95,
  },
  popoverBody: {
    marginTop: spacing.sm,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    opacity: 0.92,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  bulletRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    alignItems: "flex-start",
  },
  bullet: {
    width: 10,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "900",
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
});
