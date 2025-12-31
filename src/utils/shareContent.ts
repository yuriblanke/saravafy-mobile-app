import * as Clipboard from "expo-clipboard";
import { Share } from "react-native";

import {
  buildPublicColecaoUrl,
  buildPublicPontoUrl,
  buildPublicTerreiroUrl,
} from "@/src/config/links";

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

  return `Olha esse ponto “${safeTitle}” no Saravafy.\n\n${url}`;
}

export async function buildShareMessageForColecao(params: {
  collectionId: string;
  collectionTitle: string;
}) {
  const safeTitle = sanitizeTitle(params.collectionTitle, "Coleção");
  const url = buildPublicColecaoUrl(params.collectionId);
  return `Olha essa coleção “${safeTitle}” no Saravafy.\n\n${url}`;
}

export async function buildShareMessageForTerreiro(params: {
  terreiroId: string;
  terreiroName: string;
}) {
  const safeName = sanitizeTitle(params.terreiroName, "Terreiro");
  const url = buildPublicTerreiroUrl(params.terreiroId);
  return `Olha o terreiro “${safeName}” no Saravafy.\n\n${url}`;
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
