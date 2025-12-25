import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function Collection() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams();

  // TODO: Buscar dados reais da collection pelo id
  // Por enquanto, assume collection vazia

  return (
    <View style={styles.screen}>
      <Text style={styles.header}>{name || "Coleção"}</Text>
      <View style={styles.emptyState}>
        <Ionicons
          name="albums-outline"
          size={48}
          color={colors.forest400}
          style={{ marginBottom: 16 }}
        />
        <Text style={styles.emptyTitle}>Esta coleção ainda não tem pontos</Text>
        <Text style={styles.emptyBody}>
          Para montar esta coleção, procure pontos e adicione os que fazem
          sentido aqui.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && styles.ctaButtonPressed,
          ]}
          onPress={() => router.replace("/home")}
        >
          <Text style={styles.ctaButtonText}>Buscar pontos</Text>
        </Pressable>
        <Text style={styles.emptyHint}>
          Ao abrir um ponto, toque em ‘Adicionar à coleção’ e selecione esta
          coleção.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper50,
    padding: spacing.lg,
    alignItems: "center",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: spacing.xl,
    color: colors.textPrimaryOnLight,
    alignSelf: "flex-start",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimaryOnLight,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 15,
    color: colors.textSecondaryOnLight,
    marginBottom: 24,
    textAlign: "center",
  },
  ctaButton: {
    backgroundColor: colors.forest500,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  ctaButtonPressed: {
    opacity: 0.8,
  },
  ctaButtonText: {
    color: colors.paper50,
    fontWeight: "bold",
    fontSize: 16,
  },
  emptyHint: {
    fontSize: 13,
    color: colors.textMutedOnLight,
    marginTop: 8,
    textAlign: "center",
  },
});
