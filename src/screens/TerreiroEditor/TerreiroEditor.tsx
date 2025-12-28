import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { supabase } from "@/lib/supabase";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
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
  phone_is_whatsapp: boolean;
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

type IbgeMunicipio = { nome?: string };

async function fetchIbgeMunicipiosByUf(uf: string) {
  const safeUf = (uf ?? "").trim().toUpperCase();
  if (!safeUf) return [];

  const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(
    safeUf
  )}/municipios?orderBy=nome`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`IBGE: não foi possível carregar cidades (${res.status}).`);
  }

  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];

  return (data as IbgeMunicipio[])
    .map((m) => (typeof m?.nome === "string" ? m.nome.trim() : ""))
    .filter(Boolean);
}

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
  emptyLabel,
  onClose,
  onSelect,
}: {
  title: string;
  visible: boolean;
  variant: "light" | "dark";
  items: SelectItem[];
  emptyLabel?: string;
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

          {items.length === 0 ? (
            <View style={styles.selectEmptyWrap}>
              <Text style={[styles.selectEmptyText, { color: textMuted }]}>
                {emptyLabel ?? "Nenhuma opção disponível."}
              </Text>
            </View>
          ) : (
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
          )}
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

async function upsertPrimaryContato(payload: {
  terreiro_id: string;
  city: string;
  state: string;
  neighborhood: string | null;
  address: string;
  phone_whatsapp: string;
  phone_is_whatsapp: boolean;
  instagram_handle: string;
  is_primary: boolean;
}) {
  const res = await supabase
    .from("terreiros_contatos")
    .upsert(payload as any, { onConflict: "terreiro_id" })
    .select("terreiro_id")
    .single();

  if (res.error) {
    throw new Error(
      typeof res.error.message === "string"
        ? res.error.message
        : "Não foi possível salvar o contato."
    );
  }
}

export default function TerreiroEditor() {
  const router = useRouter();
  const { mode, terreiroId } = useLocalSearchParams<{
    mode?: EditorMode;
    terreiroId?: string;
  }>();

  const { user } = useAuth();
  const { effectiveTheme, applyTerreiroPatch, fetchTerreirosQueAdministro } =
    usePreferences();

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

  const [citiesByUf, setCitiesByUf] = useState<Record<string, string[]>>({});
  const [citiesLoadingUf, setCitiesLoadingUf] = useState<string | null>(null);

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
              "terreiro_id, city, state, neighborhood, address, phone_whatsapp, phone_is_whatsapp, instagram_handle, is_primary"
            )
            .eq("terreiro_id", resolvedTerreiroId)
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
            isWhatsappUi:
              typeof c?.phone_is_whatsapp === "boolean"
                ? c.phone_is_whatsapp
                : true,
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

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (saving) return true;

      if (!dirty) {
        router.back();
        return true;
      }

      Alert.alert(
        "Descartar alterações?",
        "Suas alterações não foram salvas.",
        [
          { text: "Continuar", style: "cancel" },
          {
            text: "Descartar",
            style: "destructive",
            onPress: () => router.back(),
          },
        ]
      );
      return true;
    });

    return () => sub.remove();
  }, [dirty, router, saving]);

  const citiesForSelectedUf = form.stateUF
    ? citiesByUf[form.stateUF] ?? []
    : [];

  const isCityLoading = !!form.stateUF && citiesLoadingUf === form.stateUF;

  const ensureCitiesForUf = async (uf: string) => {
    const safeUf = (uf ?? "").trim().toUpperCase();
    if (!safeUf) return;

    if (citiesByUf[safeUf]?.length) return;
    if (citiesLoadingUf === safeUf) return;

    setCitiesLoadingUf(safeUf);
    try {
      const cities = await fetchIbgeMunicipiosByUf(safeUf);
      setCitiesByUf((prev) => ({ ...prev, [safeUf]: cities }));
    } catch (e) {
      Alert.alert(
        "Erro",
        e instanceof Error
          ? e.message
          : "Não foi possível carregar as cidades do IBGE."
      );
    } finally {
      setCitiesLoadingUf((prev) => (prev === safeUf ? null : prev));
    }
  };

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
      mediaTypes: "images",
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

        const tryRpcMinimal = async () =>
          supabase.rpc("fn_create_terreiro", {
            p_title: title,
            p_about: form.about.trim() ? form.about.trim() : null,
            p_lines_of_work: form.linesOfWork.trim()
              ? form.linesOfWork.trim()
              : null,
            p_cover_image_url: tempCoverUrl,
          });

        const tryRpcWithRequiredAddressArgs = async () =>
          supabase.rpc("fn_create_terreiro", {
            p_title: title,
            p_state: stateUF,
            p_city: city,
            p_address: address,
            p_about: form.about.trim() ? form.about.trim() : null,
            p_lines_of_work: form.linesOfWork.trim()
              ? form.linesOfWork.trim()
              : null,
            p_cover_image_url: tempCoverUrl,
          });

        let createdId: string | null = null;

        const rpcMin = await tryRpcMinimal();
        if (!rpcMin.error && typeof rpcMin.data === "string" && rpcMin.data) {
          createdId = rpcMin.data;
        }

        if (!createdId) {
          const rpcReq = await tryRpcWithRequiredAddressArgs();
          if (!rpcReq.error && typeof rpcReq.data === "string" && rpcReq.data) {
            createdId = rpcReq.data;
          }

          if (!createdId) {
            const msg =
              (rpcReq.error && typeof rpcReq.error.message === "string"
                ? rpcReq.error.message
                : "") ||
              (rpcMin.error && typeof rpcMin.error.message === "string"
                ? rpcMin.error.message
                : "");

            throw new Error(msg || "Não foi possível criar o terreiro.");
          }
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

        // Gravar/atualizar contato primário via tabela dedicada.
        const contatoPayload = {
          terreiro_id: createdId,
          city,
          state: stateUF,
          neighborhood: form.neighborhood.trim()
            ? form.neighborhood.trim()
            : null,
          address,
          phone_whatsapp: digits,
          phone_is_whatsapp: !!form.isWhatsappUi,
          instagram_handle: instagram,
          is_primary: true,
        };

        await upsertPrimaryContato(contatoPayload);

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
        phone_is_whatsapp: !!form.isWhatsappUi,
        instagram_handle: instagram,
        is_primary: true,
      };

      await upsertPrimaryContato(contatoPayload);

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

    if (next) {
      void ensureCitiesForUf(next);
    }
  };

  const onChangeCity = (next: string) => {
    setForm((prev) => ({ ...prev, city: next }));
  };

  const coverPreviewUri = form.coverImageUrl;

  const canSubmit =
    !saving &&
    !loading &&
    !!form.title.trim() &&
    !!form.stateUF.trim() &&
    !!form.city.trim() &&
    !!form.address.trim();

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
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            hitSlop={12}
            onPress={onCancel}
            style={({ pressed }) => [
              styles.topBarBtn,
              pressed ? styles.topBarBtnPressed : null,
            ]}
          >
            <Ionicons name="close" size={22} color={textMuted} />
          </Pressable>

          <Text style={[styles.topBarTitle, { color: textPrimary }]}>
            {isEdit ? "Editar terreiro" : "Criar terreiro"}
          </Text>

          <View style={styles.topBarSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={[styles.label, { color: textSecondary }]}>
              Nome do terreiro <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              value={form.title}
              onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
              placeholder="Nome do terreiro"
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

            <Text style={[styles.label, { color: textSecondary }]}>Imagem</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                coverPreviewUri ? "Trocar imagem" : "Adicionar imagem"
              }
              disabled={saving}
              onPress={pickCover}
              style={({ pressed }) => [
                styles.coverRow,
                { borderColor: inputBorder, backgroundColor: inputBg },
                saving ? styles.rowDisabled : null,
                pressed && !saving ? styles.rowPressed : null,
              ]}
            >
              {coverPreviewUri ? (
                <Image
                  source={{ uri: coverPreviewUri }}
                  style={styles.coverThumb}
                />
              ) : (
                <View style={styles.coverIconWrap}>
                  <Ionicons name="image-outline" size={18} color={textMuted} />
                </View>
              )}

              <Text style={[styles.coverRowText, { color: textPrimary }]}>
                {coverPreviewUri ? "Trocar imagem" : "Adicionar imagem"}
              </Text>
            </Pressable>

            <Text style={[styles.label, { color: textSecondary }]}>Sobre</Text>
            <TextInput
              value={form.about}
              onChangeText={(v) => setForm((p) => ({ ...p, about: v }))}
              placeholder="Conte um pouco sobre o terreiro, sua história e propósito"
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
              placeholder="Linhas espirituais e frentes de trabalho do terreiro"
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
          </View>

          <View
            style={[styles.sectionDivider, { backgroundColor: inputBorder }]}
          />

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textMuted }]}>
              Contato principal
            </Text>

            <Text style={[styles.label, { color: textSecondary }]}>
              Estado (UF) <Text style={styles.requiredStar}>*</Text>
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

            <Text style={[styles.label, { color: textSecondary }]}>
              Cidade <Text style={styles.requiredStar}>*</Text>
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={!form.stateUF || saving}
              onPress={() => {
                if (!form.stateUF || saving) return;
                setIsCityModalOpen(true);
                void ensureCitiesForUf(form.stateUF);
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
                {form.city
                  ? form.city
                  : isCityLoading
                  ? "Carregando…"
                  : "Selecionar"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={textMuted} />
            </Pressable>

            <Text style={[styles.label, { color: textSecondary }]}>Bairro</Text>
            <TextInput
              value={form.neighborhood}
              onChangeText={(v) => setForm((p) => ({ ...p, neighborhood: v }))}
              placeholder="Bairro (opcional)"
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
              Endereço <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              value={form.address}
              onChangeText={(v) => setForm((p) => ({ ...p, address: v }))}
              placeholder="Endereço"
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
              placeholder="(11) 9 9999-9999"
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

            <View
              accessible
              accessibilityRole="switch"
              accessibilityLabel="Este telefone é WhatsApp?"
              style={styles.switchRow}
            >
              <Text style={[styles.switchLabel, { color: textSecondary }]}>
                Este telefone é WhatsApp?
              </Text>
              <Switch
                value={!!form.isWhatsappUi}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, isWhatsappUi: v }))
                }
                disabled={saving}
                trackColor={{
                  false: inputBorder,
                  true: colors.brass600,
                }}
                thumbColor={colors.paper50}
              />
            </View>

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
          </View>

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
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.saveBtn,
                pressed ? styles.footerBtnPressed : null,
                !canSubmit ? styles.footerBtnDisabled : null,
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
          emptyLabel={
            !form.stateUF
              ? "Selecione um estado (UF)."
              : isCityLoading
              ? "Carregando…"
              : "Nenhuma cidade encontrada."
          }
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  topBarBtnPressed: {
    opacity: 0.7,
  },
  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
  },
  topBarSpacer: {
    width: 40,
    height: 40,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
    marginBottom: spacing.sm,
  },
  section: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.9,
  },
  requiredStar: {
    color: colors.brass600,
    fontWeight: "900",
  },
  label: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
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
    minHeight: 72,
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
  selectEmptyWrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  selectEmptyText: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.9,
    textAlign: "center",
  },
  coverRow: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  coverThumb: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  coverIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  coverRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  rowPressed: {
    opacity: 0.92,
  },
  rowDisabled: {
    opacity: 0.6,
  },
  switchRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: spacing.sm,
  },
  switchLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.92,
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
    height: 265,
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
