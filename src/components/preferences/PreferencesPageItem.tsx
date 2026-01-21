import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/src/theme";

type Props = {
  variant: "light" | "dark";
  title: string;
  avatarUrl?: string;
  initials: string;
  afterTitle?: React.ReactNode;
  subtitle?: React.ReactNode;
  rightAccessory?: React.ReactNode;
  onPress?: () => void;
  onPressEdit?: () => void;
  showEditButton?: boolean;
};

export function PreferencesPageItem({
  variant,
  title,
  avatarUrl,
  initials,
  afterTitle,
  subtitle,
  rightAccessory,
  onPress,
  onPressEdit,
  showEditButton = true,
}: Props) {
  const [isEditPressed, setIsEditPressed] = React.useState(false);
  const editPressTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  React.useEffect(() => {
    return () => {
      if (editPressTimeoutRef.current) {
        clearTimeout(editPressTimeoutRef.current);
      }
    };
  }, []);

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
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
      <View style={styles.left} pointerEvents="box-none">
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
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, { color: textPrimary }]}
              numberOfLines={1}
            >
              {title}
            </Text>

            {afterTitle ? (
              <View style={styles.afterTitle}>{afterTitle}</View>
            ) : null}
          </View>

          {subtitle ? <View style={styles.subtitleRow}>{subtitle}</View> : null}
        </View>
      </View>

      {rightAccessory ? (
        <View style={styles.rightAccessory} pointerEvents="box-none">
          {rightAccessory}
        </View>
      ) : showEditButton && onPressEdit ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Editar ${title}`}
          onPressIn={() => {
            if (editPressTimeoutRef.current) {
              clearTimeout(editPressTimeoutRef.current);
            }
            setIsEditPressed(true);
          }}
          onPressOut={() => {
            // Delay para garantir que isEditPressed persiste até o onPress do pai ser avaliado
            editPressTimeoutRef.current = setTimeout(() => {
              setIsEditPressed(false);
            }, 100);
          }}
          onPress={(e) => {
            // Prevent the row onPress from firing when the edit button is tapped.
            // Relying on `disabled={isEditPressed}` alone is not enough because
            // state updates may not apply before the parent Pressable evaluates.
            e.stopPropagation();
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
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, { borderColor }]}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isEditPressed}
      onPress={() => {
        if (isEditPressed) return;
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        { borderColor, backgroundColor: interactiveBg },
        pressed && !isEditPressed
          ? [styles.rowPressed, { backgroundColor: pressedBg }]
          : null,
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  title: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "800",
  },
  afterTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: "auto",
  },
  subtitleRow: {
    marginTop: 6,
  },
  rightAccessory: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
