import { Redirect } from "expo-router";

export default function Index() {
  // Redireciona para o grupo auth, onde o layout principal cuidará do fluxo
  return <Redirect href="/(auth)/login" />;
}
