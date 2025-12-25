import { useColorScheme } from "@/components/useColorScheme";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function Collection() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // TODO: Buscar dados reais da collection pelo id
  // Por enquanto, assume collection vazia

  return (
    <LinearGradient
      colors={[colors.screenGradient.from, colors.screenGradient.to]}
      style={styles.screen}
    >
      <View style={styles.headerWrap}>
        <Text
          style={isDark ? styles.headerDark : styles.headerLight}
          numberOfLines={2}
        >
          {name || "Coleção"}
        </Text>
      </View>
      <SurfaceCard variant={isDark ? "dark" : "light"} style={styles.card}>
        <View style={styles.cardContent}>
          <Ionicons
            name="albums-outline"
            size={48}
            color={isDark ? colors.forest400 : colors.forest500}
            style={{ marginBottom: spacing.lg }}
          />
          <Text style={isDark ? styles.emptyTitleDark : styles.emptyTitleLight}>
            Sua coleção está vazia
          </Text>
          <Text style={isDark ? styles.emptyBodyDark : styles.emptyBodyLight}>
            Adicione pontos que você quer guardar aqui.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && styles.ctaButtonPressed,
              isDark ? styles.ctaButtonDark : styles.ctaButtonLight,
            ]}
            onPress={() => router.replace("/home")}
          >
            <Ionicons
              name="search"
              size={18}
              color={isDark ? colors.brass600 : colors.brass500}
              style={{ marginRight: 8 }}
            />
            <Text
              style={
                isDark ? styles.ctaButtonTextDark : styles.ctaButtonTextLight
              }
            >
              Buscar pontos
            </Text>
          </Pressable>
          <Text style={isDark ? styles.emptyHintDark : styles.emptyHintLight}>
            Abra um ponto e toque em 'Adicionar à coleção'.
          </Text>
        </View>
      </SurfaceCard>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing.lg,
    alignItems: "stretch",
    justifyContent: "flex-start",
  },
  headerWrap: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    alignItems: "flex-start",
  },
  headerDark: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.textPrimaryOnDark,
    marginLeft: 2,
    marginBottom: 0,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerLight: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.textPrimaryOnLight,
    marginLeft: 2,
    marginBottom: 0,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    marginHorizontal: 0,
    marginBottom: spacing.xl,
    marginTop: 0,
    alignSelf: "stretch",
    borderRadius: 18,
    // padding handled by SurfaceCard
  },
  cardContent: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitleDark: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimaryOnDark,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  emptyTitleLight: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimaryOnLight,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  emptyBodyDark: {
    fontSize: 15,
    color: colors.textSecondaryOnDark,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  emptyBodyLight: {
    fontSize: 15,
    color: colors.textSecondaryOnLight,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginBottom: spacing.md,
    marginTop: 2,
    minWidth: 180,
  },
  ctaButtonDark: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.brass600,
  },
  ctaButtonLight: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.brass500,
  },
  ctaButtonPressed: {
    opacity: 0.85,
  },
  ctaButtonTextDark: {
    color: colors.brass600,
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  ctaButtonTextLight: {
    color: colors.brass500,
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  emptyHintDark: {
    fontSize: 13,
    color: colors.textMutedOnDark,
    marginTop: spacing.md,
    textAlign: "center",
  },
  emptyHintLight: {
    fontSize: 13,
    color: colors.textMutedOnLight,
    marginTop: spacing.md,
    textAlign: "center",
  },
});
