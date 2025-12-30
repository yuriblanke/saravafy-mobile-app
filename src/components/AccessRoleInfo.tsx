import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SurfaceCard } from "@/src/components/SurfaceCard";
import {
  getAccessRoleCopy,
  getAccessRoleLabel,
  type AccessRole,
} from "@/src/constants/accessRoleCopy";
import { colors, spacing } from "@/src/theme";

type Props = {
  variant: "light" | "dark";
  role: AccessRole;
};

export function AccessRoleInfo({ variant, role }: Props) {
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
  const iconBg =
    variant === "light" ? colors.inputBgLight : colors.inputBgDark;

  const copy = useMemo(() => getAccessRoleCopy(role), [role]);
  const roleLabel = useMemo(() => getAccessRoleLabel(role), [role]);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ver o que o nível ${roleLabel} permite`}
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
                O que esse nível de acesso permite
              </Text>

              <Text style={[styles.popoverHeading, { color: textSecondary }]}>
                {copy.heading}
              </Text>

              {copy.sections.map((section) => (
                <View key={section.title} style={styles.section}>
                  <Text
                    style={[styles.sectionTitle, { color: textSecondary }]}
                  >
                    {section.title}
                  </Text>

                  {section.items.map((item) => (
                    <View key={item} style={styles.bulletRow}>
                      <Text style={[styles.bullet, { color: textMuted }]}>-</Text>
                      <Text style={[styles.bulletText, { color: textSecondary }]}>
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
