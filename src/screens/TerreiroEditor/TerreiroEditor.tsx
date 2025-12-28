import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { supabase } from "@/lib/supabase";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { colors, radii, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";

type EditorMode = "create" | "edit";

type TerreiroForm = {
  id: string;
  title: string;
  about: string;
  linesOfWork: string;
  coverImageUrl: string;

  stateUF: string;
  city: string;
  neighborhood: string;
  address: string;
  phoneDigits: string;
  instagram: string;
  isWhatsappUi: boolean;
};

type TerreiroDbRow = {
  id: string;
  title: string;
  about: string | null;
  lines_of_work: string | null;
  cover_image_url: string | null;
};

type TerreiroContatoDbRow = {
  terreiro_id: string;
  city: string;
  state: string;
  neighborhood: string | null;
  address: string;
  phone_whatsapp: string;
  instagram_handle: string;
  is_primary: boolean;
};

const UF_OPTIONS = [
  { uf: "AC", label: "Acre" },
  { uf: "AL", label: "Alagoas" },
  { uf: "AP", label: "Amapá" },
  { uf: "AM", label: "Amazonas" },
  { uf: "BA", label: "Bahia" },
  { uf: "CE", label: "Ceará" },
  { uf: "DF", label: "Distrito Federal" },
  { uf: "ES", label: "Espírito Santo" },
  { uf: "GO", label: "Goiás" },
  { uf: "MA", label: "Maranhão" },
  { uf: "MT", label: "Mato Grosso" },
  { uf: "MS", label: "Mato Grosso do Sul" },
  { uf: "MG", label: "Minas Gerais" },
  { uf: "PA", label: "Pará" },
  { uf: "PB", label: "Paraíba" },
  { uf: "PR", label: "Paraná" },
  { uf: "PE", label: "Pernambuco" },
  { uf: "PI", label: "Piauí" },
  { uf: "RJ", label: "Rio de Janeiro" },
  { uf: "RN", label: "Rio Grande do Norte" },
  { uf: "RS", label: "Rio Grande do Sul" },
  { uf: "RO", label: "Rondônia" },
  { uf: "RR", label: "Roraima" },
  { uf: "SC", label: "Santa Catarina" },
  { uf: "SP", label: "São Paulo" },
  { uf: "SE", label: "Sergipe" },
  { uf: "TO", label: "Tocantins" },
] as const;

const CITIES_BY_UF: Record<string, string[]> = {
  PR: ["Curitiba", "Londrina", "Maringá", "Ponta Grossa"],
  SP: ["São Paulo", "Campinas", "Santos", "Ribeirão Preto"],
  RJ: ["Rio de Janeiro", "Niterói", "Petrópolis"],
  MG: ["Belo Horizonte", "Uberlândia", "Juiz de Fora"],
  RS: ["Porto Alegre", "Caxias do Sul", "Pelotas"],
  SC: ["Florianópolis", "Joinville", "Blumenau"],
  BA: ["Salvador", "Feira de Santana"],
  PE: ["Recife", "Olinda"],
};

function labelForUf(uf: string) {
  const match = UF_OPTIONS.find((o) => o.uf === uf);
  return match?.label ?? uf;
}

type SelectItem = { key: string; label: string; value: string };

function SelectModal({
  title,
  visible,
  variant,
  items,
  onClose,
  onSelect,
}: {
  title: string;
  visible: boolean;
  variant: "light" | "dark";
  items: SelectItem[];
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textMuted =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;
  const divider =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;
  const sheetBg =
    variant === "light" ? colors.surfaceCardBgLight : colors.surfaceCardBg;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.selectBackdrop} onPress={onClose} />
      <View style={styles.selectSheetWrap} pointerEvents="box-none">
        <View
          style={[
            styles.selectSheet,
            { backgroundColor: sheetBg, borderColor: divider },
          ]}
        >
          <View style={styles.selectHeaderRow}>
            <Text style={[styles.selectTitle, { color: textPrimary }]}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              hitSlop={10}
              onPress={onClose}
              style={({ pressed }) => [
                styles.selectCloseBtn,
                pressed ? styles.selectCloseBtnPressed : null,
              ]}
            >
              <Text style={[styles.selectCloseText, { color: textMuted }]}>
                ×
              </Text>
            </Pressable>
          </View>

          <View style={[styles.selectDivider, { backgroundColor: divider }]} />

          <FlatList
            data={items}
            keyExtractor={(i) => i.key}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.selectRow,
                  pressed ? styles.selectRowPressed : null,
                ]}
              >
                <Text style={[styles.selectRowText, { color: textPrimary }]}>
                  {item.label}
                </Text>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizePhoneDigits(value: string) {
  return onlyDigits(value).slice(0, 11);
}

function formatPhone(digits: string) {
  const raw = normalizePhoneDigits(digits);
  if (!raw) return "";

  const ddd = raw.slice(0, 2);
  const rest = raw.slice(2);

  if (raw.length <= 2) return `(${ddd}`;

  if (raw.length <= 6) {
    return `(${ddd}) ${rest}`;
  }

  if (raw.length === 10) {
    const p1 = rest.slice(0, 4);
    const p2 = rest.slice(4, 8);
    return `(${ddd}) ${p1}-${p2}`;
  }

  // 11 dígitos
  const p1 = rest.slice(0, 1);
  const p2 = rest.slice(1, 5);
  const p3 = rest.slice(5, 9);
  return `(${ddd}) ${p1} ${p2}-${p3}`;
}

function normalizeInstagram(input: string) {
  const raw = (input ?? "").trim();
  if (!raw) return "";

  const lower = raw.toLowerCase();
  const looksLikeUrl = lower.includes("instagram.com/");

  let handle = raw;
  if (looksLikeUrl) {
    try {
      const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
      const parts = url.pathname.split("/").filter(Boolean);
      handle = parts[0] ?? "";
    } catch {
      // mantém handle como está
    }
  }

  handle = handle.replace(/^@+/, "").trim();
  if (!handle) return "";

  // remove tudo após espaços
  handle = handle.split(/\s+/)[0] ?? handle;

  // remove query-like fragments
  handle = handle.replace(/[?#].*$/, "");

  return `@${handle}`;
}

function withCacheBust(url: string) {
  const v = Date.now();
  return url.includes("?") ? `${url}&v=${v}` : `${url}?v=${v}`;
}

async function ensureWebp(uri: string) {
  const result = await ImageManipulator.manipulateAsync(uri, [], {
    compress: 0.92,
    format: ImageManipulator.SaveFormat.WEBP,
  });

  if (!result?.uri) throw new Error("Falha ao converter imagem para WEBP.");
  if (!result.uri.toLowerCase().includes(".webp")) {
    // Não permitir fallback silencioso
    throw new Error("Encoder WEBP indisponível neste dispositivo.");
  }

  return result.uri;
}

async function uploadCoverWebp(params: {
  terreiroId: string;
  webpUri: string;
}) {
  const path = `terreiros/${params.terreiroId}/cover.webp`;

  return uploadCoverWebpToPath({ path, webpUri: params.webpUri });
}

async function uploadCoverWebpToPath(params: {
  path: string;
  webpUri: string;
}) {
  const blob = await (await fetch(params.webpUri)).blob();
  const upload = await supabase.storage
    .from("terreiros-images")
    .upload(params.path, blob, { upsert: true, contentType: "image/webp" });

  if (upload.error) {
    throw new Error(
      typeof upload.error.message === "string"
        ? upload.error.message
        : "Não foi possível enviar a imagem."
    );
  }

  const pub = supabase.storage
    .from("terreiros-images")
    .getPublicUrl(params.path);
  const publicUrl = pub?.data?.publicUrl;
  if (!publicUrl) {
    throw new Error("Não foi possível obter a URL pública da imagem.");
  }

  return withCacheBust(publicUrl);
}

async function uploadCoverWebpTemp(params: {
  draftId: string;
  webpUri: string;
}) {
  const path = `terreiros/__pending__/${params.draftId}/cover.webp`;
  return uploadCoverWebpToPath({ path, webpUri: params.webpUri });
}

async function deleteTempCoverIfPossible(draftId: string) {
  try {
    await supabase.storage
      .from("terreiros-images")
      .remove([`terreiros/__pending__/${draftId}/cover.webp`]);
  } catch {
    // silêncio
  }
}

function snapshotOf(form: TerreiroForm) {
  return JSON.stringify({
    ...form,
    // evitar depender de formatação
    phoneDigits: normalizePhoneDigits(form.phoneDigits),
    instagram: normalizeInstagram(form.instagram),
  });
}

export default function TerreiroEditor() {
  const router = useRouter();
  const { mode, terreiroId } = useLocalSearchParams<{
    mode?: EditorMode;
    terreiroId?: string;
  }>();

  const { user } = useAuth();
  const {
    effectiveTheme,
    activeContext,
    applyTerreiroPatch,
    fetchTerreirosQueAdministro,
  } = usePreferences();

  const variant = effectiveTheme;

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;
  const textMuted =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;

  const inputBg =
    variant === "light" ? colors.inputBgLight : colors.inputBgDark;
  const inputBorder =
    variant === "light" ? colors.inputBorderLight : colors.inputBorderDark;

  const editorMode: EditorMode = mode === "edit" ? "edit" : "create";
  const resolvedTerreiroId =
    typeof terreiroId === "string" && terreiroId.trim()
      ? terreiroId.trim()
      : "";

  const isEdit = editorMode === "edit" && !!resolvedTerreiroId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [isUfModalOpen, setIsUfModalOpen] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);

  const initialSnapshotRef = useRef<string | null>(null);
  const webpLocalUriRef = useRef<string | null>(null);

  const [form, setForm] = useState<TerreiroForm>(() => {
    const id = isEdit ? resolvedTerreiroId : Crypto.randomUUID();

    return {
      id,
      title: "",
      about: "",
      linesOfWork: "",
      coverImageUrl: "",

      stateUF: "",
      city: "",
      neighborhood: "",
      address: "",
      phoneDigits: "",
      instagram: "",
      isWhatsappUi: true,
    };
  });

  const dirty = useMemo(() => {
    if (!initialSnapshotRef.current) return false;
    return snapshotOf(form) !== initialSnapshotRef.current;
  }, [form]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!isEdit) {
        initialSnapshotRef.current = snapshotOf(form);
        return;
      }

      setLoading(true);
      try {
        const [terreiroRes, contatoRes] = await Promise.all([
          supabase
            .from("terreiros")
            .select("id, title, about, lines_of_work, cover_image_url")
            .eq("id", resolvedTerreiroId)
            .maybeSingle(),
          supabase
            .from("terreiros_contatos")
            .select(
              "terreiro_id, city, state, neighborhood, address, phone_whatsapp, instagram_handle, is_primary"
            )
            .eq("terreiro_id", resolvedTerreiroId)
            .eq("is_primary", true)
            .maybeSingle(),
        ]);

        if (terreiroRes.error) {
          throw new Error(
            typeof terreiroRes.error.message === "string"
              ? terreiroRes.error.message
              : "Não foi possível carregar o terreiro."
          );
        }

        const t = terreiroRes.data as TerreiroDbRow | null;
        const c = contatoRes.data as TerreiroContatoDbRow | null;

        if (!t?.id) throw new Error("Terreiro não encontrado.");

        if (!cancelled) {
          setForm((prev) => ({
            ...prev,
            id: t.id,
            title: t.title ?? "",
            about: t.about ?? "",
            linesOfWork: t.lines_of_work ?? "",
            coverImageUrl: t.cover_image_url ?? "",

            stateUF: c?.state ?? "",
            city: c?.city ?? "",
            neighborhood: c?.neighborhood ?? "",
            address: c?.address ?? "",
            phoneDigits: normalizePhoneDigits(c?.phone_whatsapp ?? ""),
            instagram: normalizeInstagram(c?.instagram_handle ?? ""),
          }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, resolvedTerreiroId]);

  useEffect(() => {
    if (loading) return;
    if (initialSnapshotRef.current) return;
    initialSnapshotRef.current = snapshotOf(form);
  }, [form, loading]);

  const citiesForSelectedUf = form.stateUF
    ? CITIES_BY_UF[form.stateUF] ?? []
    : [];

  const onCancel = () => {
    if (!dirty) {
      router.back();
      return;
    }

    Alert.alert("Descartar alterações?", "Suas alterações não foram salvas.", [
      { text: "Continuar", style: "cancel" },
      { text: "Descartar", style: "destructive", onPress: () => router.back() },
    ]);
  };

  const pickCover = async () => {
    if (saving) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permissão", "Permita acesso às fotos para escolher a capa.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
      exif: false,
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];
    const uri = asset?.uri;
    if (!uri) return;

    try {
      const webpUri = await ensureWebp(uri);
      webpLocalUriRef.current = webpUri;
      setForm((prev) => ({ ...prev, coverImageUrl: webpUri }));
    } catch (e) {
      Alert.alert(
        "Erro",
        e instanceof Error ? e.message : "Não foi possível preparar a imagem."
      );
    }
  };

  const onSave = async () => {
    if (saving) return;

    const title = form.title.trim();
    if (!title) {
      Alert.alert("Faltou algo", "Nome do terreiro é obrigatório.");
      return;
    }

    const stateUF = form.stateUF.trim();
    const city = form.city.trim();
    const address = form.address.trim();

    if (!stateUF) {
      Alert.alert("Faltou algo", "Estado (UF) é obrigatório.");
      return;
    }

    if (!city) {
      Alert.alert("Faltou algo", "Cidade é obrigatória.");
      return;
    }

    if (!address) {
      Alert.alert("Faltou algo", "Endereço é obrigatório.");
      return;
    }

    setSaving(true);
    try {
      const digits = normalizePhoneDigits(form.phoneDigits);
      const instagram = normalizeInstagram(form.instagram);

      const newWebp = webpLocalUriRef.current;

      if (!isEdit) {
        // CREATE (RLS): upload primeiro, depois RPC.
        const draftId = form.id;

        let tempCoverUrl: string | null = null;
        if (newWebp) {
          tempCoverUrl = await uploadCoverWebpTemp({
            draftId,
            webpUri: newWebp,
          });
        }

        const rpcRes = await supabase.rpc("fn_create_terreiro", {
          p_title: title,
          p_state: stateUF,
          p_city: city,
          p_address: address,
          p_about: form.about.trim() ? form.about.trim() : null,
          p_lines_of_work: form.linesOfWork.trim()
            ? form.linesOfWork.trim()
            : null,
          p_cover_image_url: tempCoverUrl,
          p_neighborhood: form.neighborhood.trim()
            ? form.neighborhood.trim()
            : null,
          p_phone_digits: digits,
          p_instagram_handle: instagram,
        });

        if (rpcRes.error) {
          throw new Error(
            typeof rpcRes.error.message === "string"
              ? rpcRes.error.message
              : "Não foi possível criar o terreiro."
          );
        }

        const createdId = rpcRes.data;
        if (typeof createdId !== "string" || !createdId) {
          throw new Error("Não foi possível obter o ID do terreiro criado.");
        }

        // Garantir o caminho final obrigatório do cover.
        let finalCoverUrl: string | null = tempCoverUrl;
        if (newWebp) {
          finalCoverUrl = await uploadCoverWebp({
            terreiroId: createdId,
            webpUri: newWebp,
          });

          const updateRes = await supabase
            .from("terreiros")
            .update({ cover_image_url: finalCoverUrl })
            .eq("id", createdId);

          if (updateRes.error) {
            throw new Error(
              typeof updateRes.error.message === "string"
                ? updateRes.error.message
                : "Não foi possível finalizar a imagem do terreiro."
            );
          }

          deleteTempCoverIfPossible(draftId).catch(() => undefined);
        }

        applyTerreiroPatch({
          terreiroId: createdId,
          terreiroName: title,
          terreiroAvatarUrl: finalCoverUrl || undefined,
        });

        if (user?.id) {
          fetchTerreirosQueAdministro(user.id).catch(() => undefined);
        }

        initialSnapshotRef.current = snapshotOf({
          ...form,
          coverImageUrl: finalCoverUrl ?? "",
        });
        webpLocalUriRef.current = null;

        router.back();
        return;
      }

      // EDIT: updates normais (sem RPC)
      const id = resolvedTerreiroId;

      let coverImageUrl = form.coverImageUrl;
      if (newWebp) {
        coverImageUrl = await uploadCoverWebp({
          terreiroId: id,
          webpUri: newWebp,
        });
      }

      const updateTerreiro = await supabase
        .from("terreiros")
        .update({
          title,
          about: form.about.trim() ? form.about.trim() : null,
          lines_of_work: form.linesOfWork.trim()
            ? form.linesOfWork.trim()
            : null,
          cover_image_url: coverImageUrl ? coverImageUrl : null,
        })
        .eq("id", id);

      if (updateTerreiro.error) {
        throw new Error(
          typeof updateTerreiro.error.message === "string"
            ? updateTerreiro.error.message
            : "Não foi possível salvar o terreiro."
        );
      }

      const contatoPayload = {
        terreiro_id: id,
        city,
        state: stateUF,
        neighborhood: form.neighborhood.trim()
          ? form.neighborhood.trim()
          : null,
        address,
        phone_whatsapp: digits,
        instagram_handle: instagram,
        is_primary: true,
      };

      const contatoUpdate = await supabase
        .from("terreiros_contatos")
        .update(contatoPayload as any)
        .eq("terreiro_id", id)
        .eq("is_primary", true)
        .select("terreiro_id");

      if (contatoUpdate.error) {
        throw new Error(
          typeof contatoUpdate.error.message === "string"
            ? contatoUpdate.error.message
            : "Não foi possível salvar o contato."
        );
      }

      if (
        !Array.isArray(contatoUpdate.data) ||
        contatoUpdate.data.length === 0
      ) {
        const contatoInsert = await supabase
          .from("terreiros_contatos")
          .insert(contatoPayload as any);

        if (contatoInsert.error) {
          throw new Error(
            typeof contatoInsert.error.message === "string"
              ? contatoInsert.error.message
              : "Não foi possível salvar o contato."
          );
        }
      }

      applyTerreiroPatch({
        terreiroId: id,
        terreiroName: title,
        terreiroAvatarUrl: coverImageUrl || undefined,
      });

      if (user?.id) {
        fetchTerreirosQueAdministro(user.id).catch(() => undefined);
      }

      initialSnapshotRef.current = snapshotOf({ ...form, coverImageUrl });
      webpLocalUriRef.current = null;

      router.back();
    } catch (e) {
      Alert.alert(
        "Erro",
        e instanceof Error ? e.message : "Não foi possível salvar."
      );
    } finally {
      setSaving(false);
    }
  };

  const onChangeUf = (next: string) => {
    setForm((prev) => ({
      ...prev,
      stateUF: next,
      city: prev.stateUF === next ? prev.city : "",
    }));
  };

  const onChangeCity = (next: string) => {
    setForm((prev) => ({ ...prev, city: next }));
  };

  const coverPreviewUri = form.coverImageUrl;

  const ufItems: SelectItem[] = UF_OPTIONS.map((o) => ({
    key: o.uf,
    label: `${o.label} (${o.uf})`,
    value: o.uf,
  }));

  const cityItems: SelectItem[] = citiesForSelectedUf.map((c) => ({
    key: c,
    label: c,
    value: c,
  }));

  return (
    <SaravafyScreen variant={variant}>
      <View style={styles.root}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <SurfaceCard variant={variant}>
            <Text style={[styles.sectionTitle, { color: textMuted }]}>
              Dados do terreiro
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={pickCover}
              style={({ pressed }) => [
                styles.coverPicker,
                {
                  borderColor: inputBorder,
                  backgroundColor: inputBg,
                },
                pressed ? styles.coverPickerPressed : null,
              ]}
            >
              {coverPreviewUri ? (
                <Image
                  source={{ uri: coverPreviewUri }}
                  style={styles.coverImage}
                />
              ) : (
                <View style={styles.coverPlaceholder} />
              )}
            </Pressable>

            <Text style={[styles.label, { color: textSecondary }]}>
              Nome do terreiro
            </Text>
            <TextInput
              value={form.title}
              onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
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
            />

            <Text style={[styles.label, { color: textSecondary }]}>Sobre</Text>
            <TextInput
              value={form.about}
              onChangeText={(v) => setForm((p) => ({ ...p, about: v }))}
              placeholder=""
              placeholderTextColor={textSecondary}
              multiline
              style={[
                styles.textArea,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: textPrimary,
                },
              ]}
            />

            <Text style={[styles.label, { color: textSecondary }]}>
              Linhas de trabalho
            </Text>
            <TextInput
              value={form.linesOfWork}
              onChangeText={(v) => setForm((p) => ({ ...p, linesOfWork: v }))}
              placeholder=""
              placeholderTextColor={textSecondary}
              multiline
              style={[
                styles.textArea,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: textPrimary,
                },
              ]}
            />
          </SurfaceCard>

          <View style={styles.gap} />

          <SurfaceCard variant={variant}>
            <Text style={[styles.sectionTitle, { color: textMuted }]}>
              Contato principal
            </Text>

            <Text style={[styles.label, { color: textSecondary }]}>
              Estado (UF)
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => setIsUfModalOpen(true)}
              style={({ pressed }) => [
                styles.selectField,
                { backgroundColor: inputBg, borderColor: inputBorder },
                saving ? styles.selectDisabled : null,
                pressed && !saving ? styles.selectPressed : null,
              ]}
            >
              <Text
                style={[
                  styles.selectValue,
                  { color: form.stateUF ? textPrimary : textSecondary },
                ]}
                numberOfLines={1}
              >
                {form.stateUF
                  ? `${labelForUf(form.stateUF)} (${form.stateUF})`
                  : "Selecionar"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={textMuted} />
            </Pressable>

            <Text style={[styles.label, { color: textSecondary }]}>Cidade</Text>
            <Pressable
              accessibilityRole="button"
              disabled={!form.stateUF || saving}
              onPress={() => {
                if (!form.stateUF || saving) return;
                setIsCityModalOpen(true);
              }}
              style={({ pressed }) => [
                styles.selectField,
                { backgroundColor: inputBg, borderColor: inputBorder },
                !form.stateUF || saving ? styles.selectDisabled : null,
                pressed && form.stateUF && !saving
                  ? styles.selectPressed
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.selectValue,
                  { color: form.city ? textPrimary : textSecondary },
                ]}
                numberOfLines={1}
              >
                {form.city ? form.city : "Selecionar"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={textMuted} />
            </Pressable>

            <Text style={[styles.label, { color: textSecondary }]}>Bairro</Text>
            <TextInput
              value={form.neighborhood}
              onChangeText={(v) => setForm((p) => ({ ...p, neighborhood: v }))}
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
            />

            <Text style={[styles.label, { color: textSecondary }]}>
              Endereço
            </Text>
            <TextInput
              value={form.address}
              onChangeText={(v) => setForm((p) => ({ ...p, address: v }))}
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
            />

            <Text style={[styles.label, { color: textSecondary }]}>
              Telefone
            </Text>
            <TextInput
              value={formatPhone(form.phoneDigits)}
              onChangeText={(v) => {
                const digits = normalizePhoneDigits(v);
                setForm((p) => ({ ...p, phoneDigits: digits }));
              }}
              placeholder=""
              placeholderTextColor={textSecondary}
              keyboardType="number-pad"
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
              accessibilityState={{ checked: form.isWhatsappUi }}
              onPress={() =>
                setForm((p) => ({ ...p, isWhatsappUi: !p.isWhatsappUi }))
              }
              style={({ pressed }) => [
                styles.checkboxRow,
                pressed ? styles.checkboxRowPressed : null,
              ]}
            >
              <View
                style={[
                  styles.checkboxBox,
                  { borderColor: inputBorder, backgroundColor: inputBg },
                  form.isWhatsappUi ? styles.checkboxBoxChecked : null,
                ]}
              />
              <Text style={[styles.checkboxText, { color: textSecondary }]}>
                É WhatsApp?
              </Text>
            </Pressable>

            <Text style={[styles.label, { color: textSecondary }]}>
              Instagram
            </Text>
            <TextInput
              value={form.instagram}
              onChangeText={(v) =>
                setForm((p) => ({ ...p, instagram: normalizeInstagram(v) }))
              }
              placeholder="@nomedoseuterreiro"
              placeholderTextColor={textSecondary}
              autoCapitalize="none"
              style={[
                styles.input,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: textPrimary,
                },
              ]}
            />
          </SurfaceCard>

          <View style={styles.gap} />

          <View style={styles.footerBar}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              disabled={saving}
              style={({ pressed }) => [
                styles.cancelBtn,
                { borderColor: inputBorder, backgroundColor: inputBg },
                pressed ? styles.footerBtnPressed : null,
                saving ? styles.footerBtnDisabled : null,
              ]}
            >
              <Text style={[styles.footerBtnText, { color: textPrimary }]}>
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={onSave}
              disabled={saving || loading}
              style={({ pressed }) => [
                styles.saveBtn,
                pressed ? styles.footerBtnPressed : null,
                saving || loading ? styles.footerBtnDisabled : null,
              ]}
            >
              <Text style={styles.saveBtnText}>Salvar</Text>
            </Pressable>
          </View>

          <Image
            source={require("@/assets/images/filler.png")}
            style={styles.filler}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />

          <View style={styles.bottomPad} />
        </ScrollView>

        {loading ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <Text style={[styles.loadingText, { color: textSecondary }]}>
              Carregando…
            </Text>
          </View>
        ) : null}

        <SelectModal
          title="Estado (UF)"
          visible={isUfModalOpen}
          variant={variant}
          items={ufItems}
          onClose={() => setIsUfModalOpen(false)}
          onSelect={onChangeUf}
        />

        <SelectModal
          title="Cidade"
          visible={isCityModalOpen}
          variant={variant}
          items={cityItems}
          onClose={() => setIsCityModalOpen(false)}
          onSelect={onChangeCity}
        />
      </View>
    </SaravafyScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  gap: {
    height: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
    marginBottom: spacing.sm,
  },
  label: {
    marginTop: spacing.sm,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.92,
  },
  input: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "700",
  },
  textArea: {
    minHeight: 88,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "700",
    textAlignVertical: "top",
  },
  selectField: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  selectValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  selectPressed: {
    opacity: 0.92,
  },
  selectDisabled: {
    opacity: 0.6,
  },
  selectBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayBackdrop,
  },
  selectSheetWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  selectSheet: {
    width: "100%",
    maxHeight: "70%",
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  selectHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  selectTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
  },
  selectCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  selectCloseBtnPressed: {
    opacity: 0.85,
  },
  selectCloseText: {
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 22,
  },
  selectDivider: {
    height: StyleSheet.hairlineWidth,
  },
  selectRow: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: "center",
  },
  selectRowPressed: {
    opacity: 0.92,
  },
  selectRowText: {
    fontSize: 14,
    fontWeight: "800",
  },
  coverPicker: {
    width: "100%",
    height: 160,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  coverPickerPressed: {
    opacity: 0.94,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverPlaceholder: {
    flex: 1,
  },
  checkboxRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  checkboxRowPressed: {
    opacity: 0.92,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  checkboxBoxChecked: {
    backgroundColor: colors.brass600,
    borderColor: colors.brass600,
  },
  checkboxText: {
    fontSize: 13,
    fontWeight: "700",
  },
  footerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  saveBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.brass600,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  footerBtnText: {
    fontSize: 14,
    fontWeight: "900",
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.paper50,
  },
  footerBtnPressed: {
    opacity: 0.92,
  },
  footerBtnDisabled: {
    opacity: 0.6,
  },
  filler: {
    width: "100%",
    height: 180,
    marginTop: spacing.lg,
  },
  bottomPad: {
    height: spacing.xl,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.85,
  },
});
