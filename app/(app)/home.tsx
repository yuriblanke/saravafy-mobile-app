import { useAuth } from "@/contexts/AuthContext";
import React from "react";
import { Button, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Esta é a home</Text>
      {user && (
        <View style={styles.userInfo}>
          <Text>Bem-vindo, {user.user_metadata?.name || user.email}!</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      )}
      <Button title="Sair" onPress={signOut} />
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
  userInfo: {
    marginVertical: 20,
    alignItems: "center",
  },
  email: {
    marginTop: 5,
    color: "#666",
  },
});
