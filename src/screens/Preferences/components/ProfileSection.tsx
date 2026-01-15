import React from "react";
import { StyleSheet, Text, View } from "react-native";

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

import { getDisplayName } from "./utils";

type Props = {
  variant: "light" | "dark";
};

export function ProfileSection({ variant }: Props) {
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

  const displayName = getDisplayName(nameFromMetadata || userEmail);

  const { isCurator, isLoading: isCuratorLoading } = useIsCurator();
  const { isDevMaster } = useIsDevMaster();

  const { curatorModeEnabled, isSaving, setCuratorModeEnabled } =
    useCuratorMode();

  const showCuratorToggle = !isCuratorLoading && isCurator;

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
        <Text style={[styles.name, { color: textPrimary }]} numberOfLines={1}>
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

        <View style={styles.badgesRow}>
          {!isCuratorLoading && isCurator ? (
            <Badge label="Curator" variant={variant} appearance="secondary" />
          ) : null}

          {isDevMaster ? (
            <Badge
              label="Dev Master"
              variant={variant}
              appearance="secondary"
            />
          ) : null}

          {!isCuratorLoading && !isCurator && !isDevMaster ? (
            <Badge label="Pessoa" variant={variant} appearance="secondary" />
          ) : null}
        </View>
      </View>

      {showCuratorToggle ? (
        <PreferencesSwitchItem
          variant={variant}
          title="Modo Curator"
          description={
            isSaving ? "Salvando…" : "Ativa botões de gestão do acervo no app"
          }
          value={curatorModeEnabled}
          onValueChange={(next) => {
            if (isSaving) return;
            void setCuratorModeEnabled(next);
          }}
        />
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
    marginTop: spacing.xs,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
