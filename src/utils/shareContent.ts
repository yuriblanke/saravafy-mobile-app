import { APP_INSTALL_URL } from "@/src/config/links";
import * as Clipboard from "expo-clipboard";
import { Linking, Share } from "react-native";

function sanitizeTitle(value: string, fallback: string) {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function buildPreWebInstallBlock() {
  return (
    `O Saravafy ainda não foi lançado oficialmente na Play Store.\n` +
    `Para instalar agora, será necessário permitir a instalação de apps fora da loja.\n\n` +
    `1) Baixe o app pelo link: ${APP_INSTALL_URL}\n` +
    `2) Ao instalar, aceite a permissão para apps desconhecidos\n`
  );
}

export function buildShareMessageForPonto(pontoTitle: string) {
  const safeTitle = sanitizeTitle(pontoTitle, "Ponto");

  return (
    `Olha esse ponto “${safeTitle}” no Saravafy.\n\n` +
    buildPreWebInstallBlock() +
    `3) Abra o Saravafy e procure por “${safeTitle}”\n\n` +
    `Aí você consegue ver e adicionar nas suas coleções.`
  );
}

export function buildShareMessageForColecao(collectionTitle: string) {
  const safeTitle = sanitizeTitle(collectionTitle, "Coleção");

  return (
    `Olha essa coleção “${safeTitle}” no Saravafy.\n\n` +
    buildPreWebInstallBlock() +
    `3) Abra o Saravafy e procure pela coleção “${safeTitle}”\n\n` +
    `Se fizer sentido, você pode favoritar e tocar no player.`
  );
}

export function buildShareMessageForTerreiro(terreiroName: string) {
  const safeName = sanitizeTitle(terreiroName, "Terreiro");

  return (
    `Olha o terreiro “${safeName}” no Saravafy.\n\n` +
    buildPreWebInstallBlock() +
    `3) Abra o Saravafy e procure por “${safeName}”\n\n` +
    `Assim você encontra as coleções e os pontos desse terreiro.`
  );
}

export async function copyMessage(
  message: string,
  showToast?: (msg: string) => void,
  toastMessage?: string
) {
  await Clipboard.setStringAsync(message);
  showToast?.(toastMessage ?? "Mensagem copiada.");
}

export async function shareViaWhatsApp(
  message: string,
  showToast?: (msg: string) => void
) {
  const can = await Linking.canOpenURL("whatsapp://send");

  if (!can) {
    await copyMessage(message, showToast);
    return;
  }

  try {
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    await Linking.openURL(url);
  } catch {
    await copyMessage(message, showToast);
  }
}

export async function shareViaInstagram(
  message: string,
  showToast?: (msg: string) => void
) {
  await Clipboard.setStringAsync(message);

  try {
    const can = await Linking.canOpenURL("instagram://app");
    if (can) {
      await Linking.openURL("instagram://app");
    }
  } finally {
    showToast?.("Mensagem copiada. Cole no Instagram.");
  }
}

export async function shareMoreOptions(message: string) {
  await Share.share({ message });
}
