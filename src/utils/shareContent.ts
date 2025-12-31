import * as Clipboard from "expo-clipboard";
import { Share } from "react-native";

import { buildPublicPontoUrl } from "@/src/config/links";
import { pontoIdToCode } from "@/src/utils/pontoCode";

function sanitizeTitle(value: string, fallback: string) {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function buildShareMessageForPonto(params: {
  pontoId: string;
  pontoTitle: string;
}) {
  const safeTitle = sanitizeTitle(params.pontoTitle, "Ponto");
  const url = buildPublicPontoUrl(params.pontoId);
  const code = pontoIdToCode(params.pontoId);

  return (
    `Olha esse ponto “${safeTitle}” no Saravafy.\n\n` +
    `${url}\n\n` +
    `Código: ${code}`
  );
}

export async function buildShareMessageForColecao(collectionTitle: string) {
  const safeTitle = sanitizeTitle(collectionTitle, "Coleção");
  return `Olha essa coleção “${safeTitle}” no Saravafy.`;
}

export async function buildShareMessageForTerreiro(terreiroName: string) {
  const safeName = sanitizeTitle(terreiroName, "Terreiro");
  return `Olha o terreiro “${safeName}” no Saravafy.`;
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
