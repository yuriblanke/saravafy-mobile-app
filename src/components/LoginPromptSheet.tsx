import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { BottomSheet } from "@/src/components/BottomSheet";
import { useLoginPrompt } from "@/src/contexts/LoginPromptContext";
import { colors, spacing } from "@/src/theme";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

export function LoginPromptSheet() {
  const { isOpen, reason, closeLoginSheet } = useLoginPrompt();
  const { signInWithGoogle, retryGoogleLogin, authInProgress, authError } =
    useAuth();
  const { effectiveTheme } = usePreferences();
  const variant = effectiveTheme;

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  const logoSource =
    variant === "light"
      ? require("@/assets/images/saravafy-logo-full-light.png")
      : require("@/assets/images/saravafy-logo-full-dark.png");

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Erro ao chamar signInWithGoogle:", error);
    }
  };

  const handleRetry = async () => {
    try {
      await retryGoogleLogin();
    } catch (error) {
      console.error("Erro ao tentar novamente login Google:", error);
    }
  };

  return (
    <BottomSheet
      visible={isOpen}
      onClose={closeLoginSheet}
      variant={variant}
      closeOnBackdropPress
    >
      <View style={styles.container}>
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />

        <Text style={[styles.title, { color: textPrimary }]}>
          Entre para continuar
        </Text>

        {reason ? (
          <Text style={[styles.subtitle, { color: textSecondary }]}>
            {reason}
          </Text>
        ) : (
          <Text style={[styles.subtitle, { color: textSecondary }]}>
            Precisamos saber quem é você para continuar.
          </Text>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Entrar com Google"
          onPress={handleLogin}
          disabled={authInProgress}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.primaryButtonPressed : null,
            authInProgress ? styles.primaryButtonDisabled : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {authInProgress ? "Entrando…" : "Entrar com Google"}
          </Text>
        </Pressable>

        {authError ? (
          <View style={styles.errorWrap}>
            <Text
              style={[styles.errorText, { color: textSecondary }]}
              numberOfLines={6}
            >
              {authError}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tentar novamente"
              onPress={handleRetry}
              disabled={authInProgress}
              style={({ pressed }) => [
                styles.retryButton,
                { borderColor: colors.brass600 },
                pressed ? styles.retryButtonPressed : null,
                authInProgress ? styles.primaryButtonDisabled : null,
              ]}
            >
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Agora não"
          onPress={closeLoginSheet}
          disabled={authInProgress}
          style={({ pressed }) => [
            styles.skipLink,
            pressed ? styles.skipLinkPressed : null,
          ]}
        >
          <Text style={[styles.skipLinkText, { color: textSecondary }]}>
            Agora não
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  logo: {
    width: "100%",
    maxWidth: 200,
    height: 56,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: spacing.lg,
    textAlign: "center",
    lineHeight: 18,
  },
  primaryButton: {
    minHeight: 44,
    alignSelf: "stretch",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brass600,
    paddingVertical: 12,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.paper50,
    fontSize: 14,
    fontWeight: "800",
  },
  errorWrap: {
    marginTop: spacing.md,
    alignSelf: "stretch",
    gap: spacing.sm,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.95,
    textAlign: "center",
  },
  retryButton: {
    minHeight: 44,
    alignSelf: "stretch",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 2,
    paddingVertical: 12,
  },
  retryButtonPressed: {
    opacity: 0.85,
  },
  retryButtonText: {
    color: colors.brass600,
    fontSize: 14,
    fontWeight: "800",
  },
  skipLink: {
    marginTop: spacing.md,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  skipLinkPressed: {
    opacity: 0.5,
  },
  skipLinkText: {
    fontSize: 12,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
});
