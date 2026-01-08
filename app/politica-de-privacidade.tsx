import React, { useEffect } from "react";
import { Linking, Platform } from "react-native";

const PRIVACY_URL = "https://saravafy.com.br/politica-de-privacidade/";

export default function PrivacyPolicyRoute() {
  useEffect(() => {
    if (Platform.OS !== "web") {
      void Linking.openURL(PRIVACY_URL);
    }
  }, []);

  if (Platform.OS !== "web") return null;

  return (
    <main style={{ padding: 16 }}>
      <h1>Política de Privacidade — Saravafy</h1>
      <p>
        Esta página é servida pelo site público. Abra em:{" "}
        <a href={PRIVACY_URL} target="_blank" rel="noreferrer noopener">
          {PRIVACY_URL}
        </a>
      </p>
    </main>
  );
}
