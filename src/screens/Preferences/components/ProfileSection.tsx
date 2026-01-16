import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { useCuratorMode } from "@/contexts/CuratorModeContext";
import { Badge } from "@/src/components/Badge";
import {
  PreferencesSection,
  PreferencesSwitchItem,
} from "@/src/components/preferences";
import { useIsCurator } from "@/src/hooks/useIsCurator";
import { useIsDevMaster } from "@/src/hooks/useIsDevMaster";
import { colors, spacing } from "@/src/theme";

import { getDisplayName, getInitials } from "./utils";

type Props = {
  variant: "light" | "dark";
};

export function ProfileSection({ variant }: Props) {
  const router = useRouter();
  const { user } = useAuth();

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  const dividerColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;

  const cardBg = variant === "light" ? colors.paper100 : colors.forest800;

  const userEmail = typeof user?.email === "string" ? user.email : "";
  const nameFromMetadata =
    typeof user?.user_metadata?.name === "string"
      ? user.user_metadata.name
      : "";

  const userPhotoUrl =
    (typeof user?.user_metadata?.avatar_url === "string" &&
      user.user_metadata.avatar_url) ||
    (typeof user?.user_metadata?.picture === "string" &&
      user.user_metadata.picture) ||
    undefined;

  const displayName = getDisplayName(nameFromMetadata || userEmail);
  const initials = getInitials(nameFromMetadata || userEmail || "?");

  const { isCurator, isLoading: isCuratorLoading } = useIsCurator();
  const { isDevMaster } = useIsDevMaster();

  const { curatorModeEnabled, isSaving, setCuratorModeEnabled } =
    useCuratorMode();

  const showCuratorToggle = !isCuratorLoading && isCurator;
  const showBadges = (!isCuratorLoading && isCurator) || isDevMaster;

  return (
    <PreferencesSection title="Conta" variant={variant}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: cardBg,
            borderColor: dividerColor,
          },
        ]}
      >
        <View style={styles.identityRow}>
          <View style={styles.avatarWrap}>
            {userPhotoUrl ? (
              <Image
                source={{ uri: userPhotoUrl }}
                style={styles.avatarImage}
              />
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

          <View style={styles.identityTextCol}>
            <Text
              style={[styles.name, { color: textPrimary }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>

            {userEmail ? (
              <Text
                style={[styles.email, { color: textSecondary }]}
                numberOfLines={1}
              >
                {userEmail}
              </Text>
            ) : null}
          </View>
        </View>

        {showBadges ? (
          <View style={styles.badgesRow}>
            {!isCuratorLoading && isCurator ? (
              <Badge
                label="Pessoa Guardiã do Acervo"
                variant={variant}
                appearance="secondary"
              />
            ) : null}

            {isDevMaster ? (
              <Badge
                label="Dev Master"
                variant={variant}
                appearance="secondary"
              />
            ) : null}
          </View>
        ) : null}
      </View>

      {showCuratorToggle ? (
        <PreferencesSwitchItem
          variant={variant}
          title="Modo Guardião"
          description="Ativa botões de gestão do acervo no app"
          value={curatorModeEnabled}
          onValueChange={(next) => {
            if (isSaving) return;
            void setCuratorModeEnabled(next);
          }}
        />
      ) : null}

      {!isCuratorLoading && isCurator ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            router.push("/review-submissions" as any);
          }}
          style={({ pressed }) => [
            styles.curatorRow,
            {
              borderColor: dividerColor,
              backgroundColor:
                variant === "light" ? colors.inputBgLight : colors.inputBgDark,
            },
            pressed ? styles.curatorRowPressed : null,
          ]}
        >
          <View style={styles.curatorRowLeft}>
            <Ionicons name="clipboard-outline" size={18} color={textSecondary} />
            <View style={styles.curatorRowTextCol}>
              <Text style={[styles.curatorRowTitle, { color: textPrimary }]}>
                Revisar envios
              </Text>
              <Text style={[styles.curatorRowDesc, { color: textSecondary }]}>
                Confirmação de submissions
              </Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={18} color={textSecondary} />
        </Pressable>
      ) : null}
    </PreferencesSection>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: 6,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  identityTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 999,
    overflow: "hidden",
  },
  avatarImage: {
    width: 44,
    height: 44,
    resizeMode: "cover",
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
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
    fontSize: 14,
    fontWeight: "800",
  },
  name: {
    fontSize: 18,
    fontWeight: "900",
  },
  email: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.9,
  },
  badgesRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  curatorRow: {
    marginTop: spacing.sm,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  curatorRowPressed: {
    opacity: 0.9,
  },
  curatorRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  curatorRowTextCol: {
    flex: 1,
    minWidth: 0,
  },
  curatorRowTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  curatorRowDesc: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.9,
  },
});
