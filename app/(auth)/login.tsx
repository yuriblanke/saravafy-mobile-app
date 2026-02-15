import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { useAuthV2 } from "@/src/features/auth-v2";
import { colors, spacing } from "@/src/theme";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

export default function LoginScreen() {
  const { signInWithGoogle, retryGoogleLogin, authInProgress, authError } =
    useAuth();
  const {
    signInWithGoogle: signInWithGoogleV2,
    retryGoogleLogin: retryGoogleLoginV2,
    authInProgress: authInProgressV2,
    authError: authErrorV2,
  } = useAuthV2();
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      console.log("SESSION ATUAL:", data.session);
    });
  }, []);

  const handleLogin = async () => {
    console.log("Botão pressionado - iniciando login...");
    try {
      await signInWithGoogle();
      console.log("signInWithGoogle executado");
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

  const handleLoginV2 = async () => {
    console.log("Botão V2 pressionado - iniciando login...");
    try {
      await signInWithGoogleV2();
      console.log("signInWithGoogleV2 executado");
    } catch (error) {
      console.error("Erro ao chamar signInWithGoogleV2:", error);
    }
  };

  const handleRetryV2 = async () => {
    try {
      await retryGoogleLoginV2();
    } catch (error) {
      console.error("Erro ao tentar novamente login Google V2:", error);
    }
  };

  return (
    <SaravafyScreen theme={variant}>
      <View style={styles.container}>
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.subtitle, { color: textSecondary }]}>
          Deixa o ponto te guiar
        </Text>

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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Entrar com Google 2.0 (teste)"
          onPress={handleLoginV2}
          disabled={authInProgressV2}
          style={({ pressed }) => [
            styles.primaryButton,
            styles.secondaryGoogleButton,
            pressed ? styles.primaryButtonPressed : null,
            authInProgressV2 ? styles.primaryButtonDisabled : null,
          ]}
        >
          <Text style={styles.secondaryGoogleButtonText}>
            {authInProgressV2
              ? "Entrando…"
              : "Entrar com Google 2.0 (teste)"}
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

        {authErrorV2 ? (
          <View style={styles.errorWrap}>
            <Text
              style={[styles.errorText, { color: textSecondary }]}
              numberOfLines={6}
            >
              {authErrorV2}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tentar novamente login 2.0"
              onPress={handleRetryV2}
              disabled={authInProgressV2}
              style={({ pressed }) => [
                styles.retryButton,
                { borderColor: colors.brass600 },
                pressed ? styles.retryButtonPressed : null,
                authInProgressV2 ? styles.primaryButtonDisabled : null,
              ]}
            >
              <Text style={styles.retryButtonText}>Tentar novamente (2.0)</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </SaravafyScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  logo: {
    width: "100%",
    maxWidth: 320,
    height: 84,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: spacing.xl,
  },
  primaryButton: {
    minHeight: 44,
    alignSelf: "stretch",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brass600,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.brass600,
    paddingVertical: 12,
    marginBottom: spacing.sm,
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
  secondaryGoogleButton: {
    backgroundColor: "transparent",
  },
  secondaryGoogleButtonText: {
    color: colors.brass600,
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
});
