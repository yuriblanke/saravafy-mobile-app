import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { colors, spacing } from "@/src/theme";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
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

  return (
    <SaravafyScreen variant={variant}>
      <View style={styles.container}>
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />

        <Text style={[styles.title, { color: textPrimary }]}>Bem-vindo</Text>
        <Text style={[styles.subtitle, { color: textSecondary }]}>
          Entre para continuar.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Entrar com Google"
          onPress={handleLogin}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.primaryButtonPressed : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>Entrar com Google</Text>
        </Pressable>
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
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: colors.paper50,
    fontSize: 14,
    fontWeight: "800",
  },
});
