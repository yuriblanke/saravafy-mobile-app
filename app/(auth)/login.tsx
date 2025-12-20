import { useAuth } from "@/contexts/AuthContext";
import React from "react";
import { Button, StyleSheet, Text, View } from "react-native";

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();

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
    <View style={styles.container}>
      <Text style={styles.title}>Bem-vindo</Text>
      <Button title="Entrar com Google" onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
});
