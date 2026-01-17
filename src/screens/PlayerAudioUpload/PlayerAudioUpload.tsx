import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import {
  completePontoAudioUpload,
  initPontoAudioUpload,
  uploadToSignedUpload,
} from "@/src/api/pontoAudio";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { queryKeys } from "@/src/queries/queryKeys";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const TERMS_URL = "https://saravafy.com.br/termos-de-uso/";

const fillerPng = require("@/assets/images/filler.png");

type SelectedAudio = {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes: number | null;
  source: "file";
};

function normalizeExt(name: string): string {
  const lower = String(name ?? "")
    .trim()
    .toLowerCase();
  const idx = lower.lastIndexOf(".");
  if (idx === -1) return "";
  return lower.slice(idx + 1);
}

function isAllowedExt(ext: string) {
  const e = ext.trim().toLowerCase();
  return ["mp3", "m4a", "aac", "ogg", "wav"].includes(e);
}

function guessMimeType(ext: string): string {
  const e = ext.trim().toLowerCase();
  if (e === "mp3") return "audio/mpeg";
  if (e === "m4a") return "audio/mp4";
  if (e === "aac") return "audio/aac";
  if (e === "ogg") return "audio/ogg";
  if (e === "wav") return "audio/wav";
  return "application/octet-stream";
}

function formatBytes(n: number | null | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return "";
  const mb = n / (1024 * 1024);
  if (mb < 1) return `${Math.round(n / 1024)} KB`;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

async function getFileSizeBytes(uri: string): Promise<number | null> {
  try {
    const info: any = await FileSystem.getInfoAsync(uri);
    const size = info && typeof info === "object" ? (info as any).size : null;
    return typeof size === "number" && Number.isFinite(size) ? size : null;
  } catch {
    return null;
  }
}

export default function PlayerAudioUpload() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    pontoId?: string;
    pontoTitle?: string;
  }>();
  const pontoId = typeof params.pontoId === "string" ? params.pontoId : "";

  const { showToast } = useToast();
  const { effectiveTheme } = usePreferences();
  const variant = effectiveTheme;

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  const inputBg =
    variant === "light" ? colors.inputBgLight : colors.inputBgDark;
  const inputBorder =
    variant === "light" ? colors.inputBorderLight : colors.inputBorderDark;

  const queryClient = useQueryClient();

  const [interpreterName, setInterpreterName] = useState("");
  const [consentGranted, setConsentGranted] = useState(false);

  const [selectedAudio, setSelectedAudio] = useState<SelectedAudio | null>(
    null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  const canNavigateBack = !isUploading;

  useEffect(() => {
    if (!isUploading) return;

    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      showToast("Aguarde o envio terminar.");
      return true;
    });

    return () => sub.remove();
  }, [isUploading, showToast]);

  useEffect(() => {
    if (pontoId) return;
    showToast("Ponto inválido para envio de áudio.");
    router.back();
  }, [pontoId, router, showToast]);

  const headerTitle = "Enviar áudio";

  const pontoTitle = useMemo(() => {
    const raw = typeof params.pontoTitle === "string" ? params.pontoTitle : "";
    const t = raw.trim();
    return t ? t : null;
  }, [params.pontoTitle]);

  const onClose = useCallback(() => {
    if (!canNavigateBack) {
      showToast("Aguarde o envio terminar.");
      return;
    }
    router.back();
  }, [canNavigateBack, router, showToast]);

  const validateSelected = useCallback((audio: SelectedAudio) => {
    const ext = normalizeExt(audio.name);
    if (!ext || !isAllowedExt(ext)) {
      throw new Error("Formato inválido. Use mp3, m4a, aac, ogg ou wav.");
    }

    if (
      typeof audio.sizeBytes === "number" &&
      audio.sizeBytes > MAX_AUDIO_BYTES
    ) {
      throw new Error("Arquivo muito grande. Máximo: 50 MB.");
    }
  }, []);

  const pickAudioFile = useCallback(async () => {
    if (isUploading) return;

    const res = await DocumentPicker.getDocumentAsync({
      type: "audio/*",
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (res.canceled) return;
    const asset =
      Array.isArray(res.assets) && res.assets.length > 0 ? res.assets[0] : null;
    if (!asset?.uri) return;

    const name =
      typeof asset.name === "string" && asset.name.trim()
        ? asset.name
        : "audio";
    const ext = normalizeExt(name) || "m4a";
    const mimeType =
      typeof (asset as any).mimeType === "string" &&
      (asset as any).mimeType.trim()
        ? String((asset as any).mimeType)
        : guessMimeType(ext);

    const sizeBytes =
      typeof (asset as any).size === "number" ? (asset as any).size : null;

    const next: SelectedAudio = {
      uri: asset.uri,
      name,
      mimeType,
      sizeBytes,
      source: "file",
    };

    validateSelected(next);
    setSelectedAudio(next);
    setUploadError(null);
  }, [isUploading, validateSelected]);

  const goBack = useCallback(() => {
    if (!canNavigateBack) {
      showToast("Aguarde o envio terminar.");
      return;
    }
    router.back();
  }, [canNavigateBack, router, showToast]);

  const doUpload = useCallback(async () => {
    setUploadError(null);

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError) {
      const msg =
        typeof sessionError.message === "string" && sessionError.message.trim()
          ? sessionError.message
          : "Não foi possível validar sua sessão.";
      setUploadError(msg);
      showToast(msg);
      return;
    }
    if (!sessionData?.session?.access_token) {
      const msg = "Você precisa estar logada para enviar áudio.";
      setUploadError(msg);
      showToast(msg);
      return;
    }

    if (!pontoId) {
      setUploadError("Ponto inválido.");
      return;
    }

    const interpreter = interpreterName.trim();
    if (!interpreter) {
      setUploadError("Preencha o nome do intérprete.");
      return;
    }

    if (!consentGranted) {
      setUploadError("É necessário consentimento para enviar.");
      return;
    }

    if (!selectedAudio) {
      setUploadError("Selecione um áudio.");
      return;
    }

    try {
      validateSelected(selectedAudio);

      setIsUploading(true);
      setUploadProgress(0.1);

      const init = await initPontoAudioUpload({
        pontoId,
        interpreterName: interpreter,
        mimeType: selectedAudio.mimeType,
      });

      setUploadProgress(0.2);

      await uploadToSignedUpload({
        bucket: init.bucket,
        path: init.path,
        signedUpload: init.signedUpload,
        fileUri: selectedAudio.uri,
        mimeType: selectedAudio.mimeType,
      });

      setUploadProgress(0.85);

      const sizeBytes =
        typeof selectedAudio.sizeBytes === "number"
          ? selectedAudio.sizeBytes
          : await getFileSizeBytes(selectedAudio.uri);

      if (typeof sizeBytes !== "number") {
        throw new Error("Não foi possível identificar o tamanho do áudio.");
      }
      if (sizeBytes > MAX_AUDIO_BYTES) {
        throw new Error("Arquivo muito grande. Máximo: 50 MB.");
      }

      await completePontoAudioUpload({
        uploadToken: init.uploadToken,
        sizeBytes,
        durationMs: 0,
      });

      await queryClient.invalidateQueries({
        queryKey: queryKeys.pontoAudios.byPontoId(pontoId),
      });

      setUploadProgress(1);
      setIsDone(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível enviar.";
      setUploadError(msg);
      showToast(msg);
    } finally {
      setIsUploading(false);
    }
  }, [
    consentGranted,
    interpreterName,
    pontoId,
    queryClient,
    selectedAudio,
    showToast,
    validateSelected,
  ]);

  const progressPct = Math.round(uploadProgress * 100);
  const progressWidth = `${Math.max(0, Math.min(100, progressPct))}%` as const;
  const canSubmit =
    !isUploading &&
    Boolean(interpreterName.trim()) &&
    consentGranted &&
    Boolean(selectedAudio);

  return (
    <SaravafyScreen theme={variant} variant="stack">
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={goBack}
            hitSlop={10}
            style={[
              styles.headerIconBtn,
              !canNavigateBack ? styles.disabled : null,
            ]}
            disabled={!canNavigateBack}
          >
            <Ionicons name="chevron-back" size={22} color={textPrimary} />
          </Pressable>

          <Text
            style={[styles.headerTitle, { color: textPrimary }]}
            numberOfLines={1}
          >
            {headerTitle}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            onPress={onClose}
            hitSlop={10}
            style={[
              styles.headerIconBtn,
              !canNavigateBack ? styles.disabled : null,
            ]}
            disabled={!canNavigateBack}
          >
            <Text style={[styles.closeText, { color: textPrimary }]}>×</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {!isDone ? (
            <>
              <Text style={[styles.h1, { color: textPrimary }]}>
                Enviar áudio deste ponto
              </Text>
              <Text style={[styles.bodyText, { color: textSecondary }]}>
                Você pode enviar um áudio cantando este ponto. O áudio ficará
                disponível para toda a comunidade após revisão.
              </Text>

              {pontoTitle ? (
                <>
                  <Text style={[styles.label, { color: textSecondary }]}>
                    Ponto
                  </Text>
                  <View
                    style={[
                      styles.readonlyBox,
                      { backgroundColor: inputBg, borderColor: inputBorder },
                    ]}
                  >
                    <Text
                      style={[styles.readonlyText, { color: textPrimary }]}
                      numberOfLines={3}
                    >
                      {pontoTitle}
                    </Text>
                  </View>
                </>
              ) : null}

              <Text style={[styles.label, { color: textSecondary }]}>
                Nome do intérprete
              </Text>
              <TextInput
                value={interpreterName}
                onChangeText={setInterpreterName}
                editable={!isUploading}
                placeholder="Ex: Maria de Oxum"
                placeholderTextColor={
                  variant === "light"
                    ? colors.textMutedOnLight
                    : colors.textMutedOnDark
                }
                style={[
                  styles.input,
                  {
                    backgroundColor: inputBg,
                    borderColor: inputBorder,
                    color: textPrimary,
                  },
                ]}
              />

              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: consentGranted }}
                onPress={() => {
                  if (isUploading) return;
                  setConsentGranted((v) => !v);
                }}
                style={({ pressed }) => [
                  styles.checkboxRow,
                  pressed ? styles.pressed : null,
                  isUploading ? styles.disabled : null,
                ]}
                disabled={isUploading}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    {
                      borderColor: consentGranted
                        ? colors.forest700
                        : inputBorder,
                      backgroundColor: consentGranted
                        ? colors.forest700
                        : "transparent",
                    },
                  ]}
                >
                  {consentGranted ? (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={colors.paper50}
                    />
                  ) : null}
                </View>
                <Text style={[styles.checkboxText, { color: textPrimary }]}>
                  Declaro que sou a intérprete deste áudio e autorizo a
                  reprodução pública no Saravafy.
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  Alert.alert(
                    "Termos de uso",
                    "Abriremos os termos no navegador.",
                    [
                      { text: "Cancelar", style: "cancel" },
                      {
                        text: "Abrir",
                        onPress: () => {
                          void (async () => {
                            try {
                              // eslint-disable-next-line @typescript-eslint/no-var-requires
                              const {
                                Linking,
                                Platform,
                              } = require("react-native");
                              if (Platform.OS === "web") {
                                window.open(TERMS_URL, "_blank");
                              } else {
                                await Linking.openURL(TERMS_URL);
                              }
                            } catch {
                              showToast("Não foi possível abrir os termos.");
                            }
                          })();
                        },
                      },
                    ]
                  );
                }}
                style={({ pressed }) => [
                  styles.linkBtn,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={[styles.linkText, { color: colors.brass600 }]}>
                  Ver termos de uso
                </Text>
              </Pressable>

              <Text style={[styles.bodyText, { color: textSecondary }]}>
                Formatos: mp3, m4a, aac, ogg, wav • Máximo: 50 MB
              </Text>

              <View style={styles.row}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void pickAudioFile()}
                  disabled={isUploading}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    pressed ? styles.pressed : null,
                    isUploading ? styles.disabled : null,
                    { borderColor: inputBorder },
                  ]}
                >
                  <Text style={[styles.secondaryText, { color: textPrimary }]}>
                    Enviar arquivo
                  </Text>
                </Pressable>
              </View>

              {selectedAudio ? (
                <View
                  style={[
                    styles.fileBox,
                    { backgroundColor: inputBg, borderColor: inputBorder },
                  ]}
                >
                  <Text
                    style={[styles.fileName, { color: textPrimary }]}
                    numberOfLines={1}
                  >
                    {selectedAudio.name}
                  </Text>
                  <Text style={[styles.fileMeta, { color: textSecondary }]}>
                    Arquivo
                    {selectedAudio.sizeBytes
                      ? ` • ${formatBytes(selectedAudio.sizeBytes)}`
                      : ""}
                  </Text>
                </View>
              ) : null}

              {uploadError ? (
                <Text style={[styles.errorText, { color: colors.brass600 }]}>
                  {uploadError}
                </Text>
              ) : null}

              {isUploading ? (
                <View
                  style={[styles.progressWrap, { borderColor: inputBorder }]}
                >
                  <View
                    style={[styles.progressBar, { width: progressWidth }]}
                  />
                  <Text
                    style={[styles.progressLabel, { color: textSecondary }]}
                  >
                    Enviando… {progressPct}%
                  </Text>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={() => void doUpload()}
                disabled={!canSubmit}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed ? styles.pressed : null,
                  !canSubmit ? styles.disabled : null,
                  variant === "light"
                    ? styles.primaryLight
                    : styles.primaryDark,
                ]}
              >
                <Text style={styles.primaryText}>
                  {isUploading ? "Enviando…" : "Enviar áudio"}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.h1, { color: textPrimary }]}>
                Áudio enviado
              </Text>
              <Text style={[styles.bodyText, { color: textSecondary }]}>
                Obrigada por contribuir com o acervo. Seu áudio foi enviado e
                ficará disponível após revisão.
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed ? styles.pressed : null,
                  variant === "light"
                    ? styles.primaryLight
                    : styles.primaryDark,
                ]}
              >
                <Text style={styles.primaryText}>Fechar</Text>
              </Pressable>

              <Image
                source={fillerPng}
                style={styles.fillerImage}
                resizeMode="contain"
              />
            </>
          )}
        </ScrollView>
      </View>
    </SaravafyScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    height: 52,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  closeText: {
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 22,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  h1: {
    fontSize: 18,
    fontWeight: "900",
  },
  bodyText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  label: {
    marginTop: spacing.sm,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "800",
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "700",
  },
  readonlyBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    opacity: 0.78,
    borderStyle: "dashed",
  },
  readonlyText: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: spacing.md,
  },
  primaryLight: { backgroundColor: colors.forest700 },
  primaryDark: { backgroundColor: colors.forest300 },
  primaryText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.paper50,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: "900",
  },
  pressed: { opacity: 0.86 },
  disabled: { opacity: 0.6 },
  row: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  checkboxRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
    marginTop: spacing.sm,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxText: { flex: 1, fontSize: 13, fontWeight: "800", lineHeight: 18 },
  linkBtn: { alignSelf: "flex-start" },
  linkText: { fontSize: 13, fontWeight: "900" },
  fileBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: spacing.md,
    gap: 4,
  },
  fileName: { fontSize: 13, fontWeight: "900" },
  fileMeta: { fontSize: 12, fontWeight: "700" },
  errorText: { fontSize: 13, fontWeight: "800" },
  progressWrap: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: spacing.sm,
  },
  progressBar: {
    height: 10,
    backgroundColor: colors.forest700,
  },
  progressLabel: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: "800",
  },
  fillerImage: {
    width: "100%",
    height: 290,
  },
});
