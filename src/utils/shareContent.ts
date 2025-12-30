import { getCachedAppInstallUrl } from "@/src/config/remoteConfig";
import * as Clipboard from "expo-clipboard";
import { Share } from "react-native";

function sanitizeTitle(value: string, fallback: string) {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

async function buildPreWebInstallBlock(): Promise<{
  preInstallBlock: string;
  openAppStepNumber: number;
}> {
  const installUrl = await getCachedAppInstallUrl();
  if (!installUrl) {
    return { preInstallBlock: "", openAppStepNumber: 1 };
  }

  return {
    preInstallBlock:
      `O Saravafy ainda não foi lançado oficialmente na Play Store.\n` +
      `Para instalar agora, será necessário permitir a instalação de apps fora da loja.\n\n` +
      `1) Baixe o app pelo link: ${installUrl}\n` +
      `2) Ao instalar, aceite a permissão para apps desconhecidos\n`,
    openAppStepNumber: 3,
  };
}

export async function buildShareMessageForPonto(pontoTitle: string) {
  const safeTitle = sanitizeTitle(pontoTitle, "Ponto");
  const { preInstallBlock, openAppStepNumber } =
    await buildPreWebInstallBlock();

  return (
    `Olha esse ponto “${safeTitle}” no Saravafy.\n\n` +
    preInstallBlock +
    `${openAppStepNumber}) Abra o Saravafy e procure por “${safeTitle}”\n\n` +
    `Aí você consegue ver e adicionar nas suas coleções.`
  );
}

export async function buildShareMessageForColecao(collectionTitle: string) {
  const safeTitle = sanitizeTitle(collectionTitle, "Coleção");
  const { preInstallBlock, openAppStepNumber } =
    await buildPreWebInstallBlock();

  return (
    `Olha essa coleção “${safeTitle}” no Saravafy.\n\n` +
    preInstallBlock +
    `${openAppStepNumber}) Abra o Saravafy e procure pela coleção “${safeTitle}”\n\n` +
    `Aí você consegue ver os pontos e salvar pra depois.`
  );
}

export async function buildShareMessageForTerreiro(terreiroName: string) {
  const safeName = sanitizeTitle(terreiroName, "Terreiro");
  const { preInstallBlock, openAppStepNumber } =
    await buildPreWebInstallBlock();

  return (
    `Olha o terreiro “${safeName}” no Saravafy.\n\n` +
    preInstallBlock +
    `${openAppStepNumber}) Abra o Saravafy e procure por “${safeName}”\n\n` +
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

export async function shareMoreOptions(message: string) {
  await Share.share({ message });
}
