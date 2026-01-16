import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { queryKeys } from "@/src/queries/queryKeys";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Audio } from "expo-av";
import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const AUDIO_BUCKET_ID = "ponto-audios" as const;
const TERMS_VERSION = "2026-01-16";
const TERMS_URL = "https://saravafy.com.br/termos-de-uso/";

type Step = "intro" | "name" | "consent" | "upload" | "done";

type SelectedAudio = {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes: number | null;
  source: "record" | "file";
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

async function putWithProgress(params: {
  url: string;
  blob: Blob;
  mimeType: string;
  onProgress: (progress01: number) => void;
}) {
  return await new Promise<{ ok: true }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", params.url);
    xhr.setRequestHeader("Content-Type", params.mimeType);

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const p = evt.total > 0 ? evt.loaded / evt.total : 0;
      params.onProgress(Math.max(0, Math.min(1, p)));
    };

    xhr.onload = () => {
      const status = xhr.status;
      if (status >= 200 && status < 300) {
        resolve({ ok: true });
        return;
      }
      reject(new Error("Não foi possível enviar o áudio."));
    };

    xhr.onerror = () => reject(new Error("Não foi possível enviar o áudio."));
    xhr.onabort = () => reject(new Error("Upload cancelado."));
    xhr.send(params.blob);
  });
}

export default function PlayerAudioUpload() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    pontoId?: string;
    pontoTitle?: string;
  }>();
  const pontoId = typeof params.pontoId === "string" ? params.pontoId : "";

  const { user } = useAuth();
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

  const [step, setStep] = useState<Step>("intro");
  const [interpreterName, setInterpreterName] = useState("");
  const [consentGranted, setConsentGranted] = useState(false);

  const [selectedAudio, setSelectedAudio] = useState<SelectedAudio | null>(
    null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

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

  const headerTitle = useMemo(() => {
    const t =
      typeof params.pontoTitle === "string" ? params.pontoTitle.trim() : "";
    if (t) return "Enviar áudio";
    return "Enviar áudio";
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

  const startRecording = useCallback(async () => {
    if (isUploading) return;
    if (isRecording) return;

    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      showToast("Permissão de microfone negada.");
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await rec.startAsync();

    recordingRef.current = rec;
    setIsRecording(true);
    setSelectedAudio(null);
    setUploadError(null);
  }, [isRecording, isUploading, showToast]);

  const stopRecording = useCallback(async () => {
    const rec = recordingRef.current;
    if (!rec) return;

    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (!uri) {
        throw new Error("Não foi possível acessar o arquivo gravado.");
      }

      const sizeBytes = await getFileSizeBytes(uri);

      const name = `gravacao-${Date.now()}.m4a`;
      const next: SelectedAudio = {
        uri,
        name,
        mimeType: "audio/mp4",
        sizeBytes,
        source: "record",
      };

      validateSelected(next);
      setSelectedAudio(next);
      setIsRecording(false);
      setUploadError(null);
    } catch (e) {
      setIsRecording(false);
      showToast(e instanceof Error ? e.message : "Erro ao gravar.");
    } finally {
      recordingRef.current = null;
    }
  }, [showToast, validateSelected]);

  const ensureAuthed = useCallback(() => {
    if (user?.id) return true;
    showToast("Você precisa estar logada para enviar áudio.");
    return false;
  }, [showToast, user?.id]);

  const goNext = useCallback(() => {
    if (step === "intro") {
      setStep("name");
      return;
    }

    if (step === "name") {
      if (!ensureAuthed()) return;
      if (!interpreterName.trim()) {
        showToast("Preencha o nome do intérprete.");
        return;
      }
      setStep("consent");
      return;
    }

    if (step === "consent") {
      if (!consentGranted) {
        showToast("Você precisa aceitar o consentimento.");
        return;
      }
      setStep("upload");
      return;
    }

    if (step === "upload") {
      // upload step has its own action
      return;
    }
  }, [consentGranted, ensureAuthed, interpreterName, showToast, step]);

  const goBackStep = useCallback(() => {
    if (!canNavigateBack) {
      showToast("Aguarde o envio terminar.");
      return;
    }

    if (step === "intro") {
      router.back();
      return;
    }

    if (step === "name") {
      setStep("intro");
      return;
    }

    if (step === "consent") {
      setStep("name");
      return;
    }

    if (step === "upload") {
      setStep("consent");
      return;
    }

    if (step === "done") {
      router.back();
      return;
    }
  }, [canNavigateBack, router, showToast, step]);

  const doUpload = useCallback(async () => {
    setUploadError(null);

    if (!ensureAuthed()) return;
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
      setUploadError("Selecione ou grave um áudio.");
      return;
    }

    try {
      validateSelected(selectedAudio);

      const ext = normalizeExt(selectedAudio.name) || "m4a";
      const safeExt = isAllowedExt(ext) ? ext : "m4a";
      const objectPath = `${pontoId}/${Crypto.randomUUID()}.${safeExt}`;

      setIsUploading(true);
      setUploadProgress(0);

      const signed = await supabase.storage
        .from(AUDIO_BUCKET_ID)
        .createSignedUploadUrl(objectPath);

      if (signed.error) {
        throw new Error(
          typeof signed.error.message === "string" &&
          signed.error.message.trim()
            ? signed.error.message
            : "Não foi possível iniciar o upload."
        );
      }

      const signedUrl = (signed.data as any)?.signedUrl;
      if (typeof signedUrl !== "string" || !signedUrl.trim()) {
        throw new Error("Não foi possível iniciar o upload (URL ausente).");
      }

      const blob = await (await fetch(selectedAudio.uri)).blob();
      await putWithProgress({
        url: signedUrl,
        blob,
        mimeType: selectedAudio.mimeType,
        onProgress: setUploadProgress,
      });

      const sizeBytes =
        typeof selectedAudio.sizeBytes === "number"
          ? selectedAudio.sizeBytes
          : await getFileSizeBytes(selectedAudio.uri);

      if (typeof sizeBytes === "number" && sizeBytes > MAX_AUDIO_BYTES) {
        throw new Error("Arquivo muito grande. Máximo: 50 MB.");
      }

      const insert = await supabase.from("pontos_submissions").insert({
        kind: "audio_upload",
        status: "pending",
        ponto_id: pontoId,
        payload: {},
        has_audio: true,
        interpreter_name: interpreter,
        interpreter_consent_granted: true,
        terms_version: TERMS_VERSION,
        audio_bucket_id: AUDIO_BUCKET_ID,
        audio_object_path: objectPath,
      });

      if (insert.error) {
        throw new Error(
          typeof insert.error.message === "string" &&
          insert.error.message.trim()
            ? insert.error.message
            : "Não foi possível registrar o envio."
        );
      }

      await queryClient.invalidateQueries({
        queryKey: queryKeys.pontosSubmissions.pending(),
      });

      setIsUploading(false);
      setUploadProgress(1);
      setStep("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível enviar.";
      setIsUploading(false);
      setUploadError(msg);
      showToast(msg);
    }
  }, [
    consentGranted,
    ensureAuthed,
    interpreterName,
    pontoId,
    queryClient,
    selectedAudio,
    showToast,
    validateSelected,
  ]);

  const progressPct = Math.round(uploadProgress * 100);
  const progressWidth = `${Math.max(0, Math.min(100, progressPct))}%` as const;

  return (
    <SaravafyScreen theme={variant} variant="stack">
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={goBackStep}
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

        <View style={styles.content}>
          {step === "intro" ? (
            <>
              <Text style={[styles.h1, { color: textPrimary }]}>
                Enviar áudio deste ponto
              </Text>
              <Text style={[styles.bodyText, { color: textSecondary }]}>
                Você pode gravar ou enviar um áudio cantando este ponto.\nO
                áudio ficará disponível para toda a comunidade após revisão.
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={goNext}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed ? styles.pressed : null,
                  variant === "light"
                    ? styles.primaryLight
                    : styles.primaryDark,
                ]}
              >
                <Text style={styles.primaryText}>Continuar</Text>
              </Pressable>
            </>
          ) : null}

          {step === "name" ? (
            <>
              <Text style={[styles.h1, { color: textPrimary }]}>
                Identificação do intérprete
              </Text>
              <Text style={[styles.bodyText, { color: textSecondary }]}>
                Esse nome aparecerá como intérprete do áudio.
              </Text>

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
                accessibilityRole="button"
                onPress={goNext}
                disabled={isUploading}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed ? styles.pressed : null,
                  isUploading ? styles.disabled : null,
                  variant === "light"
                    ? styles.primaryLight
                    : styles.primaryDark,
                ]}
              >
                <Text style={styles.primaryText}>Continuar</Text>
              </Pressable>
            </>
          ) : null}

          {step === "consent" ? (
            <>
              <Text style={[styles.h1, { color: textPrimary }]}>
                Consentimento do intérprete
              </Text>

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
                ]}
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
                              // Keep as Linking-free: Expo Router route not guaranteed.
                              // Use window.open on web / Linking on native by relying on Alert action.
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

              <Pressable
                accessibilityRole="button"
                onPress={goNext}
                disabled={isUploading}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed ? styles.pressed : null,
                  isUploading ? styles.disabled : null,
                  variant === "light"
                    ? styles.primaryLight
                    : styles.primaryDark,
                ]}
              >
                <Text style={styles.primaryText}>Continuar</Text>
              </Pressable>
            </>
          ) : null}

          {step === "upload" ? (
            <>
              <Text style={[styles.h1, { color: textPrimary }]}>
                Upload do áudio
              </Text>
              <Text style={[styles.bodyText, { color: textSecondary }]}>
                Formatos: mp3, m4a, aac, ogg, wav • Máximo: 50 MB
              </Text>

              <View style={styles.row}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (isRecording) {
                      void stopRecording();
                    } else {
                      void startRecording();
                    }
                  }}
                  disabled={isUploading}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    pressed ? styles.pressed : null,
                    isUploading ? styles.disabled : null,
                    { borderColor: inputBorder },
                  ]}
                >
                  <Text style={[styles.secondaryText, { color: textPrimary }]}>
                    {isRecording ? "Parar gravação" : "Gravar agora"}
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => void pickAudioFile()}
                  disabled={isUploading || isRecording}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    pressed ? styles.pressed : null,
                    isUploading || isRecording ? styles.disabled : null,
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
                    {selectedAudio.source === "record" ? "Gravação" : "Arquivo"}
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
                disabled={isUploading || !selectedAudio}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed ? styles.pressed : null,
                  isUploading || !selectedAudio ? styles.disabled : null,
                  variant === "light"
                    ? styles.primaryLight
                    : styles.primaryDark,
                ]}
              >
                <Text style={styles.primaryText}>
                  {isUploading ? "Enviando…" : "Enviar para revisão"}
                </Text>
              </Pressable>
            </>
          ) : null}

          {step === "done" ? (
            <>
              <Text style={[styles.h1, { color: textPrimary }]}>
                Áudio enviado para revisão
              </Text>
              <Text style={[styles.bodyText, { color: textSecondary }]}>
                Obrigada por contribuir com o acervo.\nSeu áudio passará por uma
                revisão antes de ser publicado.
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
            </>
          ) : null}
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
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
});
