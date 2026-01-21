#!/usr/bin/env tsx
/**
 * Script para limpar tokens de autenticação corrompidos do AsyncStorage.
 * Uso: npx tsx scripts/clear-auth-storage.ts
 *
 * Soluciona: "Invalid Refresh Token: Refresh Token Not Found"
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

async function clearAuthStorage() {
  try {
    console.log("🧹 Limpando tokens de autenticação do AsyncStorage...");

    // Supabase usa essas chaves para guardar session/tokens
    const authKeys = [
      "supabase.auth.token",
      "sb-auth-token",
      "@supabase/auth-token",
    ];

    const allKeys = await AsyncStorage.getAllKeys();
    console.log(`📦 Total de chaves: ${allKeys.length}`);

    const keysToRemove = allKeys.filter(
      (key) =>
        authKeys.some((authKey) => key.includes(authKey)) ||
        (key.includes("supabase") && key.includes("auth")),
    );

    if (keysToRemove.length === 0) {
      console.log("✅ Nenhuma chave de autenticação encontrada.");
      return;
    }

    console.log(`🗑️  Removendo ${keysToRemove.length} chave(s):`);
    keysToRemove.forEach((k) => console.log(`   - ${k}`));

    await AsyncStorage.multiRemove(keysToRemove);

    console.log("✅ Tokens removidos com sucesso!");
    console.log("💡 Reinicie o app e faça login novamente.");
  } catch (error) {
    console.error("❌ Erro ao limpar storage:", error);
    process.exit(1);
  }
}

clearAuthStorage();
