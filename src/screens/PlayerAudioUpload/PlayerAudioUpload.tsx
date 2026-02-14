import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { BottomSheet } from "@/src/components/BottomSheet";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { Separator } from "@/src/components/Separator";
import {
  PontoAudioUploadController,
  type PontoAudioUploadControllerRenderProps,
} from "@/src/components/pontos/PontoAudioUploadController";
import { queryKeys } from "@/src/queries/queryKeys";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BackHandler,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const TERMS_URL =
  "https://www.saravafy.com.br/termos-de-uso-interprete-de-ponto-audio";

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

function normalizeMimeType(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

function extFromMimeType(mimeTypeRaw: unknown): string {
  const mimeType = normalizeMimeType(mimeTypeRaw);
  if (!mimeType) return "";
  if (mimeType === "audio/mpeg") return "mp3";
  if (mimeType === "audio/mp4" || mimeType === "audio/x-m4a") return "m4a";
  if (mimeType === "audio/aac") return "aac";
  if (mimeType === "audio/ogg") return "ogg";
  if (mimeType === "audio/wav" || mimeType === "audio/x-wav") return "wav";
  return "";
}

function isAllowedAudioMimeType(mimeTypeRaw: unknown) {
  const mimeType = normalizeMimeType(mimeTypeRaw);
  if (!mimeType) return false;
  return [
    "audio/mpeg",
    "audio/mp4",
    "audio/x-m4a",
    "audio/aac",
    "audio/ogg",
    "audio/wav",
    "audio/x-wav",
  ].includes(mimeType);
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
    null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

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

  const validateSelected = useCallback((audio: SelectedAudio) => {
    const ext = normalizeExt(audio.name) || normalizeExt(audio.uri);
    const okByExt = Boolean(ext) && isAllowedExt(ext);
    const okByMime = isAllowedAudioMimeType(audio.mimeType);

    if (!okByExt && !okByMime) {
      throw new Error("Formato inválido. Use mp3, m4a, aac, ogg ou wav.");
    }

    if (
      typeof audio.sizeBytes === "number" &&
      audio.sizeBytes > MAX_AUDIO_BYTES
    ) {
      throw new Error("Arquivo muito grande. Máximo: 50 MB.");
    }
  }, []);

  const audioInput = useMemo(() => {
    if (!selectedAudio) return null;
    return {
      uri: selectedAudio.uri,
      mimeType: selectedAudio.mimeType,
      sizeBytes: selectedAudio.sizeBytes,
    };
  }, [selectedAudio]);

  return (
    <PontoAudioUploadController
      pontoId={pontoId}
      interpreterName={interpreterName}
      audio={audioInput}
      interpreterConsent={consentGranted}
      onDone={() => {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.pontoAudios.byPontoId(pontoId),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.pontoAudios.hasAnyUploadedByPontoId(pontoId),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.pontosSubmissions.pending(),
        });
        setIsDone(true);
      }}
    >
      {(ctx) => (
        <PlayerAudioUploadView
          ctx={ctx}
          variant={variant}
          headerTitle={headerTitle}
          pontoTitle={pontoTitle}
          inputBg={inputBg}
          inputBorder={inputBorder}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          isDone={isDone}
          interpreterName={interpreterName}
          onChangeInterpreterName={setInterpreterName}
          consentGranted={consentGranted}
          onToggleConsent={() => setConsentGranted((v) => !v)}
          selectedAudio={selectedAudio}
          onChangeSelectedAudio={setSelectedAudio}
          uploadError={uploadError}
          onSetUploadError={setUploadError}
          validateSelected={validateSelected}
          onClose={() => router.back()}
        />
      )}
    </PontoAudioUploadController>
  );
}

function PlayerAudioUploadView(props: {
  ctx: PontoAudioUploadControllerRenderProps;
  variant: "light" | "dark";
  headerTitle: string;
  pontoTitle: string | null;
  inputBg: string;
  inputBorder: string;
  textPrimary: string;
  textSecondary: string;
  isDone: boolean;
  interpreterName: string;
  onChangeInterpreterName: (v: string) => void;
  consentGranted: boolean;
  onToggleConsent: () => void;
  selectedAudio: SelectedAudio | null;
  onChangeSelectedAudio: (v: SelectedAudio | null) => void;
  uploadError: string | null;
  onSetUploadError: (v: string | null) => void;
  validateSelected: (audio: SelectedAudio) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [termsSheetVisible, setTermsSheetVisible] = useState(false);

  const {
    ctx,
    variant,
    headerTitle,
    pontoTitle,
    inputBg,
    inputBorder,
    textPrimary,
    textSecondary,
    isDone,
    interpreterName,
    onChangeInterpreterName,
    consentGranted,
    onToggleConsent,
    selectedAudio,
    onChangeSelectedAudio,
    uploadError,
    onSetUploadError,
    validateSelected,
    onClose,
  } = props;

  const canNavigateBack = !ctx.isUploading;

  useEffect(() => {
    if (!ctx.isUploading) return;

    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      showToast("Aguarde o envio terminar.");
      return true;
    });

    return () => sub.remove();
  }, [ctx.isUploading, showToast]);

  const pickAudioFile = useCallback(async () => {
    if (ctx.isUploading) return;
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (res.canceled) return;
      const asset =
        Array.isArray(res.assets) && res.assets.length > 0
          ? res.assets[0]
          : null;
      if (!asset?.uri) return;

      const rawName =
        typeof asset.name === "string" && asset.name.trim() ? asset.name : "";

      const mimeTypeFromAsset =
        typeof (asset as any).mimeType === "string" &&
        (asset as any).mimeType.trim()
          ? String((asset as any).mimeType)
          : "";

      const extFromName = normalizeExt(rawName);
      const extFromUri = normalizeExt(asset.uri);
      const extFromMime = extFromMimeType(mimeTypeFromAsset);

      const ext = extFromName || extFromUri || extFromMime || "m4a";
      const name = (() => {
        const base = rawName || "audio";
        const hasExt = Boolean(normalizeExt(base));
        return hasExt ? base : `${base}.${ext}`;
      })();

      const mimeType = mimeTypeFromAsset
        ? mimeTypeFromAsset
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
      onChangeSelectedAudio(next);
      onSetUploadError(null);
    } catch (e) {
      const message =
        e instanceof Error && e.message.trim()
          ? e.message.trim()
          : "Erro ao selecionar o áudio.";
      onSetUploadError(message);
      showToast(message);
    }
  }, [
    ctx.isUploading,
    onChangeSelectedAudio,
    onSetUploadError,
    showToast,
    validateSelected,
  ]);

  const progressPct = Math.round(ctx.progress * 100);
  const progressWidth = `${Math.max(0, Math.min(100, progressPct))}%` as const;

  const canSubmit =
    !ctx.isUploading &&
    Boolean(interpreterName.trim()) &&
    consentGranted &&
    Boolean(selectedAudio);

  const goBack = useCallback(() => {
    if (!canNavigateBack) {
      showToast("Aguarde o envio terminar.");
      return;
    }
    router.back();
  }, [canNavigateBack, router, showToast]);

  const handleClose = useCallback(() => {
    if (!canNavigateBack) {
      showToast("Aguarde o envio terminar.");
      return;
    }
    onClose();
  }, [canNavigateBack, onClose, showToast]);

  const doUpload = useCallback(async () => {
    onSetUploadError(null);

    const interpreter = interpreterName.trim();
    if (!interpreter) {
      onSetUploadError("Preencha o nome do intérprete.");
      return;
    }

    if (!consentGranted) {
      onSetUploadError("É necessário consentimento para enviar.");
      return;
    }

    if (!selectedAudio) {
      onSetUploadError("Selecione um áudio.");
      return;
    }

    try {
      validateSelected(selectedAudio);
      await ctx.start();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível enviar.";
      onSetUploadError(msg);
      showToast(msg);
    }
  }, [
    consentGranted,
    ctx,
    interpreterName,
    onSetUploadError,
    selectedAudio,
    showToast,
    validateSelected,
  ]);

  const errorToShow = uploadError ?? ctx.errorMessage;

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
            onPress={handleClose}
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
                Intérprete
              </Text>
              <TextInput
                value={interpreterName}
                onChangeText={onChangeInterpreterName}
                editable={!ctx.isUploading}
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
                  if (ctx.isUploading) return;
                  onToggleConsent();
                }}
                style={({ pressed }) => [
                  styles.checkboxRow,
                  pressed ? styles.pressed : null,
                  ctx.isUploading ? styles.disabled : null,
                ]}
                disabled={ctx.isUploading}
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
                  setTermsSheetVisible(true);
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

              <BottomSheet
                visible={termsSheetVisible}
                variant={variant}
                onClose={() => setTermsSheetVisible(false)}
              >
                <View>
                  <Text style={[styles.h1, { color: textPrimary }]}>
                    Termos de uso
                  </Text>
                  <Text style={[styles.bodyText, { color: textSecondary }]}>
                    Abriremos os termos no navegador.
                  </Text>

                  <View style={styles.row}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setTermsSheetVisible(false)}
                      style={({ pressed }) => [
                        styles.secondaryBtn,
                        pressed ? styles.pressed : null,
                        { borderColor: inputBorder },
                      ]}
                    >
                      <Text
                        style={[styles.secondaryText, { color: textPrimary }]}
                      >
                        Cancelar
                      </Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setTermsSheetVisible(false);
                        void (async () => {
                          try {
                            if (Platform.OS === "web") {
                              window.open(TERMS_URL, "_blank");
                            } else {
                              await Linking.openURL(TERMS_URL);
                            }
                          } catch {
                            showToast("Não foi possível abrir os termos.");
                          }
                        })();
                      }}
                      style={({ pressed }) => [
                        styles.primaryBtn,
                        variant === "light"
                          ? styles.primaryLight
                          : styles.primaryDark,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <Text style={styles.primaryText}>Abrir</Text>
                    </Pressable>
                  </View>

                  <Separator variant={variant} />
                </View>
              </BottomSheet>

              <Text style={[styles.bodyText, { color: textSecondary }]}>
                Formatos: mp3, m4a, aac, ogg, wav • Máximo: 50 MB
              </Text>

              <View style={styles.row}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void pickAudioFile()}
                  disabled={ctx.isUploading}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    pressed ? styles.pressed : null,
                    ctx.isUploading ? styles.disabled : null,
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

              {errorToShow ? (
                <Text style={[styles.errorText, { color: colors.brass600 }]}>
                  {errorToShow}
                </Text>
              ) : null}

              {ctx.isUploading ? (
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
                  {ctx.isUploading ? "Enviando…" : "Enviar áudio"}
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
                onPress={handleClose}
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
