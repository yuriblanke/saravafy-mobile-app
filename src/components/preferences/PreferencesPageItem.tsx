import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/src/theme";

type Props = {
  variant: "light" | "dark";
  title: string;
  avatarUrl?: string;
  initials: string;
  isActive: boolean;
  onPressSwitch?: () => void;
  onPressEdit: () => void;
};

export function PreferencesPageItem({
  variant,
  title,
  avatarUrl,
  initials,
  isActive,
  onPressSwitch,
  onPressEdit,
}: Props) {
  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;
  const textMuted =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;

  const borderColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;

  const interactiveBg =
    variant === "light" ? colors.inputBgLight : colors.inputBgDark;
  const pressedBg = variant === "light" ? colors.paper50 : colors.forest700;

  const content = (
    <>
      <View style={styles.left} pointerEvents="none">
        <View style={styles.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                variant === "light"
                  ? styles.avatarPlaceholderLight
                  : styles.avatarPlaceholderDark,
              ]}
            >
              <Text style={[styles.avatarInitials, { color: textPrimary }]}>
                {initials}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.textCol}>
          <Text
            style={[styles.title, { color: textPrimary }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {isActive ? (
            <Text
              style={[styles.activeHint, { color: textSecondary }]}
              numberOfLines={1}
            >
              Usando agora
            </Text>
          ) : null}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Editar ${title}`}
        onPress={(e) => {
          e.stopPropagation?.();
          onPressEdit();
        }}
        hitSlop={12}
        style={({ pressed }) => [
          styles.editBtn,
          pressed ? styles.editBtnPressed : null,
        ]}
      >
        <Ionicons name="pencil" size={18} color={textMuted} />
      </Pressable>
    </>
  );

  if (isActive) {
    return <View style={[styles.row, { borderColor }]}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPressSwitch}
      style={({ pressed }) => [
        styles.row,
        { borderColor, backgroundColor: interactiveBg },
        pressed ? [styles.rowPressed, { backgroundColor: pressedBg }] : null,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowPressed: {
    opacity: 0.94,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
  },
  activeHint: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.85,
  },
  avatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 999,
    overflow: "hidden",
  },
  avatarImage: {
    width: 32,
    height: 32,
    resizeMode: "cover",
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPlaceholderDark: {
    borderColor: colors.surfaceCardBorder,
    backgroundColor: colors.inputBgDark,
  },
  avatarPlaceholderLight: {
    borderColor: colors.surfaceCardBorderLight,
    backgroundColor: colors.paper100,
  },
  avatarInitials: {
    fontSize: 12,
    fontWeight: "700",
  },
  editBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  editBtnPressed: {
    opacity: 0.75,
  },
});
