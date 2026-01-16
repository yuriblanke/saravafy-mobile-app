import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { useToast } from "@/contexts/ToastContext";
import {
  createPontoSubmission,
  submitPontoCorrection,
} from "@/lib/pontosSubmissions";
import { supabase } from "@/lib/supabase";
import {
  completePontoAudioUpload,
  initPontoAudioUpload,
  uploadToSignedUpload,
} from "@/src/api/pontoAudio";
import { BottomSheet } from "@/src/components/BottomSheet";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { Separator } from "@/src/components/Separator";
import { queryKeys } from "@/src/queries/queryKeys";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useQueryClient } from "@tanstack/react-query";

const fillerPng = require("@/assets/images/filler.png");

export type PontoUpsertMode = "create" | "edit" | "correction";

export type PontoUpsertInitialValues = {
  id: string;
  title: string;
  artist?: string | null;
  lyrics: string;
  tags: readonly string[];
};

type Props = {
  visible: boolean;
  variant: "light" | "dark";
  mode: PontoUpsertMode;
  initialValues?: PontoUpsertInitialValues;
  onCancel: () => void;
  onSuccess?: (result?: {
    id: string;
    title: string;
    artist?: string | null;
    lyrics: string;
    tags: string[];
  }) => void;
};

function toUserFriendlyErrorMessage(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as any).message)
      : "";

  const lower = message.toLowerCase();
  if (
    lower.includes("permission") ||
    lower.includes("not allowed") ||
    lower.includes("rls") ||
    lower.includes("jwt") ||
    lower.includes("unauthorized")
  ) {
    return "Você precisa estar logada para concluir.";
  }

  return "Não foi possível salvar agora. Tente novamente.";
}

async function getFileSizeBytes(uri: string): Promise<number | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true } as any);
    const size = (info as any)?.size;
    return typeof size === "number" ? size : null;
  } catch {
    return null;
  }
}

export function PontoUpsertModal({
  visible,
  variant,
  mode,
  initialValues,
  onCancel,
  onSuccess,
}: Props) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [issueDetails, setIssueDetails] = useState("");

  // Submission-only fields (create mode)
  const [isTraditional, setIsTraditional] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [interpreterName, setInterpreterName] = useState("");

  const [attachedAudio, setAttachedAudio] = useState<null | {
    uri: string;
    name: string;
    mimeType?: string | null;
    size?: number | null;
  }>(null);
  const pendingAudioRef = useRef<null | {
    uri: string;
    name: string;
    mimeType?: string | null;
    size?: number | null;
  }>(null);

  const [hasRightsConsent, setHasRightsConsent] = useState(false);

  const [rightsSheet, setRightsSheet] = useState<null | {
    reason: "toggle-off" | "audio" | "submit";
  }>(null);
  const [rightsChecked, setRightsChecked] = useState(false);
  const resumeSubmitAfterConsentRef = useRef(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createdSubmissionIdRef = useRef<string | null>(null);
  const [audioUploadPhase, setAudioUploadPhase] = useState<
    null | "init" | "upload" | "complete"
  >(null);

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

  const headerTitle =
    mode === "create"
      ? "Enviar ponto"
      : mode === "correction"
      ? "Corrigir ponto"
      : "Salvar alterações";
  const primaryCta =
    mode === "create"
      ? "Enviar"
      : mode === "correction"
      ? "Enviar correção"
      : "Salvar alterações";

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && lyrics.trim().length > 0;
  }, [title, lyrics]);

  const hasAudioAttached = !!attachedAudio;

  useEffect(() => {
    if (!visible) return;

    setErrorMessage(null);

    if ((mode === "edit" || mode === "correction") && initialValues) {
      setTitle(initialValues.title ?? "");
      setArtist(
        typeof initialValues.artist === "string" ? initialValues.artist : ""
      );
      setLyrics(initialValues.lyrics ?? "");
      setTags(
        Array.isArray(initialValues.tags)
          ? initialValues.tags
              .map((t) => (typeof t === "string" ? t.trim() : ""))
              .filter(Boolean)
          : []
      );
      setTagsInput("");
      setIssueDetails("");
      return;
    }

    if (mode === "create") {
      setTitle("");
      setArtist("");
      setLyrics("");
      setTags([]);
      setTagsInput("");
      setIssueDetails("");
      setIsTraditional(true);
      setAuthorName("");
      setInterpreterName("");
      setAttachedAudio(null);
      pendingAudioRef.current = null;
      setHasRightsConsent(false);
      setRightsSheet(null);
      setRightsChecked(false);
      resumeSubmitAfterConsentRef.current = false;
      createdSubmissionIdRef.current = null;
      setAudioUploadPhase(null);
    }
  }, [initialValues, mode, visible]);

  const normalizeTag = useCallback((value: string) => {
    return String(value ?? "")
      .trim()
      .replace(/\s+/g, " ");
  }, []);

  const addTagsFromRaw = useCallback(
    (raw: string) => {
      const parts = String(raw ?? "")
        .split(",")
        .map((t) => normalizeTag(t))
        .filter(Boolean);

      if (parts.length === 0) return;

      setTags((prev) => {
        const seen = new Set(prev.map((t) => t.toLowerCase()));
        const next = [...prev];
        for (const part of parts) {
          const key = part.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          next.push(part);
        }
        return next;
      });
    },
    [normalizeTag]
  );

  const handleTagsInputChange = useCallback(
    (value: string) => {
      const next = String(value ?? "");
      if (!next.includes(",")) {
        setTagsInput(next);
        return;
      }

      const parts = next.split(",");
      const toCommit = parts.slice(0, -1).join(",");
      const rest = parts[parts.length - 1] ?? "";

      addTagsFromRaw(toCommit);
      setTagsInput(rest.replace(/^\s+/, ""));
    },
    [addTagsFromRaw]
  );

  const removeTagAt = useCallback((index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const openRightsSheet = useCallback(
    (reason: "toggle-off" | "audio" | "submit") => {
      setRightsChecked(false);
      setRightsSheet({ reason });
    },
    []
  );

  const closeRightsSheet = useCallback(() => {
    // Cancel/close behavior depends on why it opened
    const reason = rightsSheet?.reason;
    setRightsSheet(null);
    setRightsChecked(false);

    if (reason === "audio") {
      // Block attach and keep previous state
      pendingAudioRef.current = null;
      resumeSubmitAfterConsentRef.current = false;
      return;
    }

    if (reason === "submit") {
      // Block submit attempt
      resumeSubmitAfterConsentRef.current = false;
      return;
    }

    if (reason === "toggle-off") {
      // Keep toggle ON (no-op)
      return;
    }
  }, [rightsSheet]);

  const confirmRights = useCallback(() => {
    if (!rightsChecked) return;

    const reason = rightsSheet?.reason;
    setHasRightsConsent(true);
    setRightsSheet(null);
    setRightsChecked(false);

    if (reason === "toggle-off") {
      setIsTraditional(false);
      return;
    }

    if (reason === "audio") {
      const pending = pendingAudioRef.current;
      pendingAudioRef.current = null;
      if (pending) setAttachedAudio(pending);
      // Audio implies autoria/execução definida
      setIsTraditional(false);
      return;
    }

    if (reason === "submit") {
      // If submission requires consent due to audio, keep consistent state
      setIsTraditional(false);
      if (resumeSubmitAfterConsentRef.current) {
        resumeSubmitAfterConsentRef.current = false;
        // Submit will be re-triggered by caller
      }
    }
  }, [rightsChecked, rightsSheet]);

  const handleTraditionalToggle = useCallback(
    (nextValue: boolean) => {
      if (mode !== "create") {
        setIsTraditional(nextValue);
        return;
      }

      // ON -> OFF must require explicit consent
      if (isTraditional && nextValue === false && !hasRightsConsent) {
        openRightsSheet("toggle-off");
        return;
      }

      setIsTraditional(nextValue);
    },
    [hasRightsConsent, isTraditional, mode, openRightsSheet]
  );

  const pickAudio = useCallback(async () => {
    if (mode !== "create") return;
    if (isSubmitting) return;

    const res = await DocumentPicker.getDocumentAsync({
      type: "audio/*",
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (res.canceled) return;
    const asset =
      Array.isArray(res.assets) && res.assets.length > 0 ? res.assets[0] : null;
    if (!asset?.uri) return;

    const picked = {
      uri: asset.uri,
      name:
        typeof asset.name === "string" && asset.name.trim()
          ? asset.name
          : "audio",
      mimeType: (asset as any).mimeType ?? null,
      size:
        typeof (asset as any).size === "number" ? (asset as any).size : null,
    };

    // Audio always requires explicit consent; if toggle is ON, it also forces OFF after confirmation.
    if (!hasRightsConsent) {
      pendingAudioRef.current = picked;
      openRightsSheet("audio");
      return;
    }

    setAttachedAudio(picked);
    setIsTraditional(false);
  }, [hasRightsConsent, isSubmitting, mode, openRightsSheet]);

  const submit = async () => {
    setErrorMessage(null);

    if (!title.trim() || !lyrics.trim()) {
      setErrorMessage("Preencha Título e Letra.");
      return;
    }

    if (mode === "edit" && (!initialValues || !initialValues.id)) {
      setErrorMessage("Ponto inválido para edição.");
      return;
    }

    if (mode === "correction" && (!initialValues || !initialValues.id)) {
      setErrorMessage("Ponto inválido para correção.");
      return;
    }

    setIsSubmitting(true);
    try {
      const tagsValue = tags;
      const artistValue = artist.trim() ? artist.trim() : null;

      const authorValue = authorName.trim();
      const interpreterValue = interpreterName.trim();

      // Regras de direitos: áudio sempre exige aceite; toggle OFF não é permitido sem aceite
      if (mode === "create") {
        if (hasAudioAttached && !hasRightsConsent) {
          setIsSubmitting(false);
          resumeSubmitAfterConsentRef.current = true;
          openRightsSheet("submit");
          return;
        }

        if (!isTraditional && !hasRightsConsent) {
          setIsSubmitting(false);
          resumeSubmitAfterConsentRef.current = true;
          openRightsSheet("submit");
          return;
        }
      }

      if (mode === "create") {
        if (attachedAudio && !interpreterValue) {
          setErrorMessage("Preencha o Nome do intérprete para anexar áudio.");
          setIsSubmitting(false);
          return;
        }

        let submissionId = createdSubmissionIdRef.current;
        if (!submissionId) {
          const created = await createPontoSubmission({
            title: title.trim(),
            artist: artistValue,
            lyrics: lyrics.trim(),
            tags: tagsValue,
            author_name: authorValue ? authorValue : null,
            interpreter_name: interpreterValue ? interpreterValue : null,
            has_author_consent: hasRightsConsent ? true : null,
          });

          submissionId = created.id;
          createdSubmissionIdRef.current = submissionId;
        }

        if (attachedAudio) {
          const mimeType =
            typeof attachedAudio.mimeType === "string" &&
            attachedAudio.mimeType.trim()
              ? attachedAudio.mimeType
              : "audio/m4a";
          const sizeBytesRaw =
            typeof attachedAudio.size === "number"
              ? attachedAudio.size
              : await getFileSizeBytes(attachedAudio.uri);
          if (typeof sizeBytesRaw !== "number") {
            throw new Error("Não foi possível identificar o tamanho do áudio.");
          }

          setAudioUploadPhase("init");
          const init = await initPontoAudioUpload({
            pontoId: submissionId,
            interpreterName: interpreterValue,
            mimeType,
          });

          setAudioUploadPhase("upload");
          await uploadToSignedUpload({
            bucket: init.bucket,
            path: init.path,
            signedUpload: init.signedUpload,
            fileUri: attachedAudio.uri,
            mimeType,
          });

          setAudioUploadPhase("complete");
          await completePontoAudioUpload({
            uploadToken: init.uploadToken,
            sizeBytes: sizeBytesRaw,
            durationMs: 0,
          });

          await queryClient.invalidateQueries({
            queryKey: queryKeys.pontoAudios.byPontoId(submissionId),
          });
        }

        onCancel();
        onSuccess?.();
        return;
      }

      if (mode === "correction") {
        await submitPontoCorrection({
          target_ponto_id: initialValues!.id,
          title: title.trim(),
          lyrics: lyrics.trim(),
          tags: tagsValue,
          artist: artistValue,
          issue_details: issueDetails.trim() ? issueDetails.trim() : null,
        });

        onCancel();
        onSuccess?.();
        return;
      }

      const pontoId = initialValues!.id;

      const res = await supabase
        .from("pontos")
        .update({
          title: title.trim(),
          artist: artistValue,
          lyrics: lyrics.trim(),
          tags,
        })
        .eq("id", pontoId)
        .select("id, title, artist, lyrics, tags")
        .single();

      if (res.error) {
        throw new Error(
          typeof res.error.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Erro ao salvar alterações."
        );
      }

      const row: any = res.data ?? {};
      const updated = {
        id: String(row.id ?? pontoId),
        title: typeof row.title === "string" ? row.title : title.trim(),
        artist: typeof row.artist === "string" ? row.artist : artistValue,
        lyrics: typeof row.lyrics === "string" ? row.lyrics : lyrics.trim(),
        tags: Array.isArray(row.tags)
          ? row.tags.filter((v: any) => typeof v === "string")
          : tagsValue,
      };

      onCancel();
      onSuccess?.(updated);
    } catch (e) {
      const msg = toUserFriendlyErrorMessage(e);
      setErrorMessage(msg);
      showToast(msg);
    } finally {
      setAudioUploadPhase(null);
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onCancel}
    >
      <SaravafyScreen theme={variant}>
        <View style={styles.screen}>
          <BottomSheet
            visible={!!rightsSheet}
            variant={variant}
            onClose={closeRightsSheet}
          >
            <View>
              <Text style={[styles.sheetTitle, { color: textPrimary }]}>
                Direitos de veiculação
              </Text>
              <Text style={[styles.sheetBody, { color: textSecondary }]}>
                Ao enviar um ponto com autoria definida ou com áudio cantado e
                tocado, você declara que possui os direitos necessários para
                compartilhar esse conteúdo no Saravafy.
              </Text>

              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel="Li e estou ciente"
                accessibilityState={{ checked: rightsChecked }}
                onPress={() => setRightsChecked((v) => !v)}
                style={({ pressed }) => [
                  styles.checkboxRow,
                  pressed ? styles.pressed : null,
                ]}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    {
                      borderColor:
                        variant === "light"
                          ? colors.inputBorderLight
                          : colors.inputBorderDark,
                      backgroundColor: rightsChecked
                        ? colors.brass600
                        : "transparent",
                    },
                  ]}
                >
                  {rightsChecked ? (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={colors.paper50}
                    />
                  ) : null}
                </View>
                <Text style={[styles.checkboxText, { color: textPrimary }]}>
                  Li e estou ciente
                </Text>
              </Pressable>

              <View style={styles.sheetActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={closeRightsSheet}
                  style={({ pressed }) => [
                    styles.sheetActionRow,
                    pressed ? styles.sheetActionPressed : null,
                  ]}
                >
                  <Text
                    style={[styles.sheetActionText, { color: textPrimary }]}
                  >
                    Cancelar
                  </Text>
                </Pressable>

                <Separator variant={variant} />

                <Pressable
                  accessibilityRole="button"
                  disabled={!rightsChecked}
                  onPress={() => {
                    const shouldResume = resumeSubmitAfterConsentRef.current;
                    confirmRights();
                    if (shouldResume) {
                      setTimeout(() => {
                        void submit();
                      }, 0);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.sheetActionRow,
                    pressed ? styles.sheetActionPressed : null,
                    !rightsChecked ? styles.disabled : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.sheetActionText,
                      {
                        color: rightsChecked ? colors.brass600 : textSecondary,
                      },
                    ]}
                  >
                    Tenho os direitos desse ponto
                  </Text>
                </Pressable>
              </View>
            </View>
          </BottomSheet>

          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (isSubmitting) return;
                onCancel();
              }}
              hitSlop={10}
              style={styles.headerBtn}
            >
              <Text style={[styles.headerBtnText, { color: textPrimary }]}>
                Cancelar
              </Text>
            </Pressable>

            <Text style={[styles.headerTitle, { color: textPrimary }]}>
              {headerTitle}
            </Text>

            <View style={styles.headerRight} />
          </View>

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {mode === "create" ? (
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextCol}>
                  <Text style={[styles.toggleTitle, { color: textPrimary }]}>
                    Ponto tradicional / livre
                  </Text>
                  <Text style={[styles.toggleDesc, { color: textSecondary }]}>
                    Marque esta opção para pontos tradicionais, de domínio
                    coletivo ou sem autoria definida.
                  </Text>
                </View>

                <Switch
                  accessibilityLabel="Ponto tradicional / livre"
                  value={isTraditional}
                  onValueChange={handleTraditionalToggle}
                  trackColor={{
                    false: colors.surfaceCardBorder,
                    true: colors.brass600,
                  }}
                  thumbColor={colors.paper50}
                />
              </View>
            ) : null}

            <Text style={[styles.label, { color: textSecondary }]}>
              Título *
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ponto das Caboclas"
              placeholderTextColor={textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: textPrimary,
                },
              ]}
              autoCapitalize="sentences"
              autoCorrect
              editable={!isSubmitting}
              returnKeyType="next"
            />

            {mode === "create" ? (
              <>
                <Text style={[styles.label, { color: textSecondary }]}>
                  Autor{isTraditional ? "" : " *"}
                </Text>
                <TextInput
                  value={authorName}
                  onChangeText={setAuthorName}
                  placeholder={
                    isTraditional
                      ? "Pode deixar em branco"
                      : "Indique o autor deste ponto"
                  }
                  placeholderTextColor={textSecondary}
                  style={[
                    styles.input,
                    {
                      backgroundColor: inputBg,
                      borderColor: inputBorder,
                      color: textPrimary,
                    },
                  ]}
                  autoCapitalize="sentences"
                  autoCorrect
                  editable={!isSubmitting}
                  returnKeyType="next"
                />

                <Text style={[styles.label, { color: textSecondary }]}>
                  Intérprete
                </Text>
                <TextInput
                  value={interpreterName}
                  onChangeText={setInterpreterName}
                  placeholder="Preencha quando enviar o áudio junto com o ponto"
                  placeholderTextColor={textSecondary}
                  style={[
                    styles.input,
                    {
                      backgroundColor: inputBg,
                      borderColor: inputBorder,
                      color: textPrimary,
                    },
                  ]}
                  autoCapitalize="sentences"
                  autoCorrect
                  editable={!isSubmitting}
                  returnKeyType="next"
                />

                <View style={styles.audioBlock}>
                  <Text style={[styles.label, { color: textSecondary }]}>
                    Áudio (opcional)
                  </Text>

                  {attachedAudio ? (
                    <View
                      style={[
                        styles.audioRow,
                        {
                          borderColor: inputBorder,
                          backgroundColor: inputBg,
                        },
                      ]}
                    >
                      <Ionicons
                        name="musical-notes"
                        size={16}
                        color={textPrimary}
                      />
                      <Text
                        style={[styles.audioName, { color: textPrimary }]}
                        numberOfLines={1}
                      >
                        {attachedAudio.name}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Remover áudio"
                        hitSlop={10}
                        onPress={() => setAttachedAudio(null)}
                        style={({ pressed }) => [
                          styles.audioRemoveBtn,
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        <Ionicons
                          name="close"
                          size={18}
                          color={colors.brass600}
                        />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Adicionar áudio"
                      onPress={() => {
                        void pickAudio();
                      }}
                      style={({ pressed }) => [
                        styles.audioAddBtn,
                        { borderColor: inputBorder },
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <Ionicons name="add" size={18} color={colors.brass600} />
                      <Text
                        style={[styles.audioAddText, { color: textPrimary }]}
                      >
                        Adicionar áudio
                      </Text>
                    </Pressable>
                  )}
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.label, { color: textSecondary }]}>
                  Autor
                </Text>
                <TextInput
                  value={artist}
                  onChangeText={setArtist}
                  placeholder=""
                  placeholderTextColor={textSecondary}
                  style={[
                    styles.input,
                    {
                      backgroundColor: inputBg,
                      borderColor: inputBorder,
                      color: textPrimary,
                    },
                  ]}
                  autoCapitalize="sentences"
                  autoCorrect
                  editable={!isSubmitting}
                  returnKeyType="next"
                />
              </>
            )}

            <Text style={[styles.label, { color: textSecondary }]}>
              Letra *
            </Text>
            <TextInput
              value={lyrics}
              onChangeText={setLyrics}
              placeholder="Digite a letra do ponto…"
              placeholderTextColor={textSecondary}
              style={[
                styles.input,
                styles.inputMultiline,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: textPrimary,
                },
              ]}
              autoCapitalize="sentences"
              autoCorrect
              editable={!isSubmitting}
              multiline
              textAlignVertical="top"
            />

            <Text style={[styles.label, { color: textSecondary }]}>
              Tags (opcional)
            </Text>
            <View
              style={[
                styles.tagsInputWrap,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                },
              ]}
            >
              <View style={styles.tagsFlow}>
                {tags.map((t, idx) => (
                  <View
                    key={`${t}:${idx}`}
                    style={[
                      styles.tagChip,
                      {
                        borderColor:
                          variant === "light"
                            ? colors.inputBorderLight
                            : colors.inputBorderDark,
                        backgroundColor:
                          variant === "light"
                            ? colors.paper100
                            : colors.earth700,
                      },
                    ]}
                  >
                    <Text style={[styles.tagChipText, { color: textPrimary }]}>
                      {t}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remover tag ${t}`}
                      hitSlop={10}
                      onPress={() => removeTagAt(idx)}
                      style={({ pressed }) => [
                        styles.tagChipRemove,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <Ionicons
                        name="close"
                        size={14}
                        color={colors.brass600}
                      />
                    </Pressable>
                  </View>
                ))}

                <TextInput
                  value={tagsInput}
                  onChangeText={handleTagsInputChange}
                  onBlur={() => {
                    const raw = tagsInput.trim();
                    if (!raw) return;
                    addTagsFromRaw(raw);
                    setTagsInput("");
                  }}
                  placeholder={
                    tags.length === 0 ? "Ogum, Exu, Preto Velho" : ""
                  }
                  placeholderTextColor={textSecondary}
                  style={[styles.tagsInput, { color: textPrimary }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  onKeyPress={(e) => {
                    const key = (e.nativeEvent as any).key;
                    if (key !== "Backspace") return;
                    if (tagsInput.length > 0) return;
                    setTags((prev) => prev.slice(0, -1));
                  }}
                />
              </View>
            </View>

            {mode === "correction" ? (
              <>
                <Text style={[styles.label, { color: textSecondary }]}>
                  Nota (opcional)
                </Text>
                <TextInput
                  value={issueDetails}
                  onChangeText={setIssueDetails}
                  placeholder="Ex.: letra errada, autor incorreto, falta uma parte…"
                  placeholderTextColor={textSecondary}
                  style={[
                    styles.input,
                    styles.inputNote,
                    {
                      backgroundColor: inputBg,
                      borderColor: inputBorder,
                      color: textPrimary,
                    },
                  ]}
                  autoCapitalize="sentences"
                  autoCorrect
                  editable={!isSubmitting}
                  multiline
                  textAlignVertical="top"
                />
              </>
            ) : null}

            {errorMessage ? (
              <Text style={[styles.errorText, { color: colors.brass600 }]}>
                {errorMessage}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={submit}
                disabled={!canSubmit || isSubmitting}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.forest400,
                    opacity: pressed ? 0.9 : 1,
                  },
                  !canSubmit || isSubmitting ? styles.primaryBtnDisabled : null,
                ]}
              >
                {isSubmitting ? (
                  <View style={styles.primaryBtnRow}>
                    <ActivityIndicator color={"#fff"} />
                    <Text style={styles.primaryBtnText}>
                      {mode === "create"
                        ? "Enviando…"
                        : mode === "correction"
                        ? "Enviando…"
                        : "Salvando…"}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.primaryBtnText}>{primaryCta}</Text>
                )}
              </Pressable>
            </View>

            <Image
              source={fillerPng}
              style={styles.fillerImage}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </ScrollView>
        </View>
      </SaravafyScreen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  headerBtnText: {
    fontSize: 13,
    fontWeight: "900",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  headerRight: {
    width: 64,
  },
  formScroll: {
    flex: 1,
  },
  form: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  toggleRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 8,
    marginTop: spacing.sm,
  },
  toggleTextCol: {
    flex: 1,
    minWidth: 0,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  toggleDesc: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.9,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  sheetBody: {
    marginTop: spacing.sm,
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.95,
  },
  checkboxRow: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxText: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "800",
  },
  sheetActions: {
    marginTop: spacing.md,
  },
  sheetActionRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },
  sheetActionText: {
    fontSize: 14,
    fontWeight: "800",
  },
  sheetActionPressed: {
    opacity: 0.75,
  },
  label: {
    fontSize: 12,
    fontWeight: "900",
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
  },
  inputMultiline: {
    height: 180,
    paddingTop: 12,
    paddingBottom: 12,
  },
  inputNote: {
    height: 96,
    paddingTop: 12,
    paddingBottom: 12,
  },
  audioBlock: {
    marginTop: spacing.sm,
  },
  audioAddBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: spacing.xs,
  },
  audioAddText: {
    fontSize: 13,
    fontWeight: "900",
  },
  audioRow: {
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: spacing.xs,
  },
  audioName: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: "800",
  },
  audioRemoveBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  tagsInputWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  tagsFlow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  tagChip: {
    height: 30,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 10,
    paddingRight: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: "800",
  },
  tagChipRemove: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  tagsInput: {
    minWidth: 80,
    flexGrow: 1,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "800",
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  errorText: {
    marginTop: spacing.sm,
    fontSize: 12,
    fontWeight: "800",
  },
  actions: {
    marginTop: spacing.md,
  },
  primaryBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.55,
  },
  primaryBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  fillerImage: {
    width: "100%",
    height: 290,
    marginTop: spacing.lg,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.55,
  },
});
