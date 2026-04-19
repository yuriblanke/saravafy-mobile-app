import { getAppInstallUrl } from "@/src/config/remoteConfig";
import { colors, spacing } from "@/src/theme";
import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text } from "react-native";

/**
 * Exibe um botão primário "Baixar nova versão" quando o link de instalação
 * está disponível em public_app_config. Usado em telas de erro de fetch para
 * orientar usuários com o app desatualizado.
 */
export function DownloadUpdateButton() {
  const [installUrl, setInstallUrl] = useState<string | null>(null);

  useEffect(() => {
    void getAppInstallUrl()
      .then((url) => {
        if (url) setInstallUrl(url);
      })
      .catch(() => {});
  }, []);

  if (!installUrl) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Baixar nova versão do aplicativo"
      onPress={() => void Linking.openURL(installUrl)}
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
    >
      <Text style={styles.text}>Baixar nova versão</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignSelf: "center",
    marginTop: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.brass600,
  },
  btnPressed: {
    opacity: 0.75,
  },
  text: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
});
