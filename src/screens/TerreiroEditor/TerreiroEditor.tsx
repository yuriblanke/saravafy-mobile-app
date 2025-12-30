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
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { BottomSheet } from "@/src/components/BottomSheet";
import { SelectModal, type SelectItem } from "@/src/components/SelectModal";
import { getCachedAppInstallUrl } from "@/src/config/remoteConfig";
import { queryKeys } from "@/src/queries/queryKeys";
import {
  invalidateTerreiro,
  invalidateTerreiroListsForRoles,
  patchTerreiroInLists,
} from "@/src/queries/terreirosCache";
import { colors, radii, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system";
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
  created_by: string | null;
};

type TerreiroContatoDbRow = {
  terreiro_id: string;
  city: string;
  state: string;
  neighborhood: string | null;
  address: string;
  phone_whatsapp: string | null;
  phone_is_whatsapp: boolean | null;
  instagram_handle: string | null;
  is_primary: boolean | null;
};

type TerreiroRole = "admin" | "editor";

type TerreiroMemberRow = {
  terreiro_id: string;
  role: TerreiroRole;
  user_id: string | null;
  created_at: string | null;
};

type TerreiroInviteRow = {
  id: string;
  terreiro_id: string;
  email: string;
  role: TerreiroRole;
  status: string;
  created_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email?: string | null;
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

function normalizeEmail(input: string) {
  return (input ?? "").trim().toLowerCase();
}

function isValidEmail(input: string) {
  const email = normalizeEmail(input);
  if (!email) return false;
  if (/\s/.test(email)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function roleLabel(role: TerreiroRole) {
  return role === "admin" ? "Admin" : "Editor";
}

async function ensureWebp(uri: string) {
  const compressCandidates = [0.92, 0.86, 0.78, 0.7, 0.62] as const;
  const maxBytes = 2 * 1024 * 1024; // limite do bucket (2 MB)

  for (const compress of compressCandidates) {
    const result = await ImageManipulator.manipulateAsync(uri, [], {
      compress,
      format: ImageManipulator.SaveFormat.WEBP,
    });

    if (!result?.uri) continue;
    if (!result.uri.toLowerCase().includes(".webp")) {
      throw new Error("Encoder WEBP indisponível neste dispositivo.");
    }

    // Usar a API moderna do expo-file-system para checar tamanho sem depender
    // das tipagens do método legado getInfoAsync.
    const info = new FileSystem.File(result.uri).info();
    const size = typeof info?.size === "number" ? info.size : null;
    if (size === null || size <= maxBytes) {
      return result.uri;
    }
  }

  throw new Error(
    "A imagem ficou acima de 2 MB (limite do Storage). Tente uma imagem menor."
  );
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
  // Em Android/Expo, `fetch(file://...).blob()` pode falhar com "Network request failed".
  // Preferimos ler o arquivo local via FileSystem e enviar bytes.
  const file = new FileSystem.File(params.webpUri);
  const info = file.info();
  if (!info?.exists) {
    throw new Error("Não foi possível acessar a imagem selecionada.");
  }

  const bytes = await file.bytes();

  const upload = await supabase.storage
    .from("terreiros-images")
    .upload(params.path, bytes, { upsert: true, contentType: "image/webp" });

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

async function deleteFinalCoverIfPossible(terreiroId: string) {
  try {
    await supabase.storage
      .from("terreiros-images")
      .remove([`terreiros/${terreiroId}/cover.webp`]);
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
  phone_whatsapp: string | null;
  phone_is_whatsapp: boolean;
  instagram_handle: string | null;
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
        ? `Contato: ${res.error.message}`
        : "Contato: não foi possível salvar."
    );
  }
}

export default function TerreiroEditor() {
  const router = useRouter();
  const { mode, terreiroId } = useLocalSearchParams<{
    mode?: EditorMode;
    terreiroId?: string;
  }>();

  const queryClient = useQueryClient();

  const { user } = useAuth();
  const { showToast } = useToast();
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
  const [isInviteRoleModalOpen, setIsInviteRoleModalOpen] = useState(false);
  const [isRolesSheetOpen, setIsRolesSheetOpen] = useState(false);
  const [isInviteShareSheetOpen, setIsInviteShareSheetOpen] = useState(false);
  const [inviteToShare, setInviteToShare] = useState<TerreiroInviteRow | null>(
    null
  );

  const [citiesByUf, setCitiesByUf] = useState<Record<string, string[]>>({});
  const [citiesLoadingUf, setCitiesLoadingUf] = useState<string | null>(null);

  const initialSnapshotRef = useRef<string | null>(null);
  const webpLocalUriRef = useRef<string | null>(null);
  const coverRemoveRequestedRef = useRef(false);
  const terreiroCreatedByRef = useRef<string | null>(null);
  const initialTerreiroFieldsRef = useRef<{
    title: string;
    about: string;
    linesOfWork: string;
    coverImageUrl: string;
  } | null>(null);

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

  const [adminLoading, setAdminLoading] = useState(false);
  const [members, setMembers] = useState<TerreiroMemberRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileRow>>(
    {}
  );
  const [invitesPending, setInvitesPending] = useState<TerreiroInviteRow[]>([]);
  const [myTerreiroRole, setMyTerreiroRole] = useState<TerreiroRole | null>(
    null
  );

  const [inviteFormOpen, setInviteFormOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TerreiroRole>("editor");
  const [inviteInlineError, setInviteInlineError] = useState<string>("");
  const [inviteSending, setInviteSending] = useState(false);

  const buildInviteShareMessage = useCallback(
    async (invite: TerreiroInviteRow) => {
      const terreiroName = (form.title || "").trim() || "Terreiro";
      const emailConvidado = normalizeEmail(invite.email);
      const installUrl = await getCachedAppInstallUrl();

      const hasInstallUrl = !!(
        typeof installUrl === "string" && installUrl.trim()
      );
      const emailStepNumber = hasInstallUrl ? 3 : 1;

      return (
        `Você foi convidada para colaborar no terreiro “${terreiroName}” no Saravafy.\n\n` +
        (hasInstallUrl
          ? `O Saravafy ainda não foi lançado oficialmente na Play Store.\n` +
            `Para instalar agora, será necessário permitir a instalação de apps fora da loja.\n\n` +
            `1) Baixe o app pelo link: ${installUrl}\n` +
            `2) Ao instalar, aceite a permissão para apps desconhecidos\n`
          : "") +
        `${emailStepNumber}) Entre com o e-mail ${emailConvidado}\n\n` +
        `Assim que entrar, o convite vai aparecer para você aceitar ou recusar.`
      );
    },
    [form.title]
  );

  const openInviteShareSheet = useCallback((invite: TerreiroInviteRow) => {
    setInviteToShare(invite);
    setIsInviteShareSheetOpen(true);
  }, []);

  const closeInviteShareSheet = useCallback(() => {
    setIsInviteShareSheetOpen(false);
    setInviteToShare(null);
  }, []);

  const copyInviteMessage = useCallback(
    async (message: string, toastMessage?: string) => {
      await Clipboard.setStringAsync(message);
      showToast(toastMessage ?? "Mensagem copiada.");
    },
    [showToast]
  );

  const copyInviteMessageOnly = useCallback(async () => {
    if (!inviteToShare) return;
    const message = await buildInviteShareMessage(inviteToShare);
    await copyInviteMessage(message);
    closeInviteShareSheet();
  }, [
    buildInviteShareMessage,
    closeInviteShareSheet,
    copyInviteMessage,
    inviteToShare,
  ]);

  const shareInviteMoreOptions = useCallback(async () => {
    if (!inviteToShare) return;
    const message = await buildInviteShareMessage(inviteToShare);

    try {
      await Share.share({ message });
    } finally {
      closeInviteShareSheet();
    }
  }, [buildInviteShareMessage, closeInviteShareSheet, inviteToShare]);

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
            .select(
              "id, title, about, lines_of_work, cover_image_url, created_by"
            )
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
          terreiroCreatedByRef.current = t.created_by ?? null;
          initialTerreiroFieldsRef.current = {
            title: t.title ?? "",
            about: t.about ?? "",
            linesOfWork: t.lines_of_work ?? "",
            coverImageUrl: t.cover_image_url ?? "",
          };

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

  const isTerreiroAdminSectionEnabled = isEdit;

  const isAdmin = useMemo(() => {
    const ownerId = terreiroCreatedByRef.current;
    if (ownerId && user?.id && ownerId === user.id) return true;
    return myTerreiroRole === "admin";
  }, [myTerreiroRole, user?.id]);

  const loadAdminData = async (id: string) => {
    if (!id) return;
    if (!user?.id) return;

    setAdminLoading(true);
    try {
      const membersRes = await supabase
        .from("terreiro_members")
        .select("terreiro_id, role, user_id, created_at")
        .eq("terreiro_id", id)
        .order("created_at", { ascending: true });

      if (membersRes.error) {
        throw new Error(
          typeof membersRes.error.message === "string"
            ? membersRes.error.message
            : "Não foi possível carregar os membros."
        );
      }

      const nextMembers = (membersRes.data ?? []) as TerreiroMemberRow[];
      setMembers(nextMembers);

      const nextMyRole = (() => {
        const u = user.id;
        const match = nextMembers.find((m) => m.user_id === u);
        const role = match?.role;
        return role === "admin" || role === "editor" ? role : null;
      })();
      setMyTerreiroRole(nextMyRole);

      const profileIds = nextMembers
        .map((m) => m.user_id)
        .filter((pid): pid is string => typeof pid === "string" && !!pid);

      if (profileIds.length > 0) {
        const profilesRes = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, email")
          .in("id", profileIds);

        if (!profilesRes.error && Array.isArray(profilesRes.data)) {
          const map: Record<string, ProfileRow> = {};
          for (const p of profilesRes.data as any[]) {
            if (p?.id && typeof p.id === "string") {
              map[p.id] = {
                id: p.id,
                full_name: typeof p.full_name === "string" ? p.full_name : null,
                avatar_url:
                  typeof p.avatar_url === "string" ? p.avatar_url : null,
                email: typeof p.email === "string" ? p.email : null,
              };
            }
          }
          setProfilesById(map);
        }
      } else {
        setProfilesById({});
      }

      const ownerId = terreiroCreatedByRef.current;
      const computedIsAdmin =
        (ownerId && ownerId === user.id) || nextMyRole === "admin";

      if (computedIsAdmin) {
        const invitesRes = await supabase
          .from("terreiro_invites")
          .select("id, terreiro_id, email, role, status, created_at")
          .eq("terreiro_id", id)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (invitesRes.error) {
          throw new Error(
            typeof invitesRes.error.message === "string"
              ? invitesRes.error.message
              : "Não foi possível carregar os convites pendentes."
          );
        }

        setInvitesPending((invitesRes.data ?? []) as TerreiroInviteRow[]);
      } else {
        setInvitesPending([]);
      }
    } catch (e) {
      Alert.alert(
        "Erro",
        e instanceof Error
          ? e.message
          : "Não foi possível carregar a administração do terreiro."
      );
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (!isEdit) {
      setMembers([]);
      setInvitesPending([]);
      setProfilesById({});
      setMyTerreiroRole(null);
      setInviteFormOpen(false);
      setInviteEmail("");
      setInviteInlineError("");
      return;
    }

    void loadAdminData(resolvedTerreiroId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, resolvedTerreiroId, user?.id]);

  const inviteEmailValid = useMemo(
    () => isValidEmail(inviteEmail),
    [inviteEmail]
  );

  const sendInvite = async () => {
    if (!isEdit) return;
    if (!isAdmin) return;
    if (!user?.id) return;
    if (inviteSending) return;

    const emailNorm = inviteEmail.trim().toLowerCase();
    if (!emailNorm) {
      setInviteInlineError("Informe um e-mail válido.");
      return;
    }

    if (!isValidEmail(emailNorm)) {
      setInviteInlineError("Informe um e-mail válido.");
      return;
    }

    const pendingDup = invitesPending.some(
      (i) => normalizeEmail(i.email) === emailNorm && i.status === "pending"
    );
    if (pendingDup) {
      setInviteInlineError(
        "Este e-mail já possui um convite pendente para este terreiro."
      );
      return;
    }

    const memberEmailMatch = members.some((m) => {
      const pid = m.user_id;
      if (!pid) return false;
      const p = profilesById[pid];
      const memberEmail = p?.email ? normalizeEmail(p.email) : "";
      return memberEmail && memberEmail === emailNorm;
    });
    if (memberEmailMatch) {
      setInviteInlineError("Esta pessoa já tem acesso ao terreiro.");
      return;
    }

    setInviteSending(true);
    setInviteInlineError("");
    try {
      const insertRes = await supabase
        .from("terreiro_invites")
        .insert({
          terreiro_id: resolvedTerreiroId,
          email: emailNorm,
          role: inviteRole,
          created_by: user.id,
          status: "pending",
        } as any)
        .select("id")
        .single();

      if (insertRes.error) {
        const err = insertRes.error as any;
        const code = typeof err?.code === "string" ? err.code : "";
        const message = typeof err?.message === "string" ? err.message : "";

        if (
          code === "23505" ||
          message.includes("ux_terreiro_invites_pending")
        ) {
          setInviteInlineError(
            "Este e-mail já possui um convite pendente para este terreiro."
          );
          return;
        }

        throw new Error(message || "Não foi possível enviar o convite.");
      }

      setInviteEmail("");
      setInviteFormOpen(false);
      await loadAdminData(resolvedTerreiroId);
    } catch (e) {
      Alert.alert(
        "Erro",
        e instanceof Error ? e.message : "Não foi possível enviar o convite."
      );
    } finally {
      setInviteSending(false);
    }
  };

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
      coverRemoveRequestedRef.current = false;
      setForm((prev) => ({ ...prev, coverImageUrl: webpUri }));
    } catch (e) {
      Alert.alert(
        "Erro",
        e instanceof Error ? e.message : "Não foi possível preparar a imagem."
      );
    }
  };

  const removeCover = () => {
    if (saving) return;
    coverRemoveRequestedRef.current = true;
    webpLocalUriRef.current = null;
    setForm((prev) => ({ ...prev, coverImageUrl: "" }));
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
                ? `Terreiro: ${updateRes.error.message}`
                : "Terreiro: não foi possível finalizar a imagem."
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
          phone_whatsapp: digits ? digits : null,
          phone_is_whatsapp: !!form.isWhatsappUi,
          instagram_handle: instagram ? instagram : null,
          is_primary: true,
        };

        await upsertPrimaryContato(contatoPayload);

        applyTerreiroPatch({
          terreiroId: createdId,
          terreiroName: title,
          terreiroAvatarUrl: finalCoverUrl || undefined,
        });

        if (user?.id) {
          patchTerreiroInLists(queryClient, {
            userId: user.id,
            terreiro: {
              id: createdId,
              name: title,
              coverImageUrl:
                typeof finalCoverUrl === "string" ? finalCoverUrl : undefined,
              role: "admin",
            },
          });

          invalidateTerreiro(queryClient, createdId);
          invalidateTerreiroListsForRoles(queryClient, user.id);
          void queryClient.refetchQueries({
            queryKey: queryKeys.terreiros.withRole(user.id),
            type: "all",
          });
        }

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

      const initialTerreiro = initialTerreiroFieldsRef.current;
      const titleChanged =
        !initialTerreiro ||
        title.trim() !== (initialTerreiro.title ?? "").trim();
      const aboutChanged =
        !initialTerreiro ||
        form.about.trim() !== (initialTerreiro.about ?? "").trim();
      const linesChanged =
        !initialTerreiro ||
        form.linesOfWork.trim() !== (initialTerreiro.linesOfWork ?? "").trim();

      const wantsRemoveCover = coverRemoveRequestedRef.current;

      let coverImageUrl = wantsRemoveCover ? "" : form.coverImageUrl;
      if (newWebp) {
        coverImageUrl = await uploadCoverWebp({
          terreiroId: id,
          webpUri: newWebp,
        });
      }

      const shouldUpdateTerreiro =
        wantsRemoveCover ||
        !!newWebp ||
        titleChanged ||
        aboutChanged ||
        linesChanged;

      if (shouldUpdateTerreiro) {
        const updateTerreiro = await supabase
          .from("terreiros")
          .update({
            title,
            about: form.about.trim() ? form.about.trim() : null,
            lines_of_work: form.linesOfWork.trim()
              ? form.linesOfWork.trim()
              : null,
            cover_image_url: wantsRemoveCover
              ? null
              : coverImageUrl
              ? coverImageUrl
              : null,
          })
          .eq("id", id);

        if (updateTerreiro.error) {
          throw new Error(
            typeof updateTerreiro.error.message === "string"
              ? `Terreiro: ${updateTerreiro.error.message}`
              : "Terreiro: não foi possível salvar."
          );
        }

        if (wantsRemoveCover) {
          deleteFinalCoverIfPossible(id).catch(() => undefined);
        }
      }

      const contatoPayload = {
        terreiro_id: id,
        city,
        state: stateUF,
        neighborhood: form.neighborhood.trim()
          ? form.neighborhood.trim()
          : null,
        address,
        phone_whatsapp: digits ? digits : null,
        phone_is_whatsapp: !!form.isWhatsappUi,
        instagram_handle: instagram ? instagram : null,
        is_primary: true,
      };

      await upsertPrimaryContato(contatoPayload);

      applyTerreiroPatch({
        terreiroId: id,
        terreiroName: title,
        terreiroAvatarUrl: coverImageUrl || undefined,
      });

      if (user?.id) {
        patchTerreiroInLists(queryClient, {
          userId: user.id,
          terreiro: {
            id,
            name: title,
            coverImageUrl: wantsRemoveCover
              ? null
              : typeof coverImageUrl === "string" && coverImageUrl
              ? coverImageUrl
              : undefined,
          },
        });

        invalidateTerreiro(queryClient, id);
        invalidateTerreiroListsForRoles(queryClient, user.id);
      }

      if (user?.id) {
        fetchTerreirosQueAdministro(user.id).catch(() => undefined);
      }

      initialSnapshotRef.current = snapshotOf({ ...form, coverImageUrl });
      initialTerreiroFieldsRef.current = {
        title,
        about: form.about,
        linesOfWork: form.linesOfWork,
        coverImageUrl: coverImageUrl ?? "",
      };
      webpLocalUriRef.current = null;
      coverRemoveRequestedRef.current = false;

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
  const canEditImage = !isEdit || isAdmin;

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
              coverPreviewUri ? "Editar imagem" : "Adicionar imagem"
            }
            disabled={saving}
            onPress={() => {
              if (!canEditImage) {
                showToast("Somente admins podem editar a imagem do terreiro.");
                return;
              }
              pickCover();
            }}
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
              {coverPreviewUri ? "Editar imagem" : "Adicionar imagem"}
            </Text>
          </Pressable>

          {coverPreviewUri && canEditImage ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remover imagem"
              disabled={saving}
              onPress={() => {
                if (!canEditImage) {
                  showToast(
                    "Somente admins podem remover a imagem do terreiro."
                  );
                  return;
                }
                removeCover();
              }}
              style={({ pressed }) => [
                styles.coverRemoveBtn,
                pressed && !saving ? styles.rowPressed : null,
                saving ? styles.rowDisabled : null,
              ]}
            >
              <Text style={[styles.coverRemoveText, { color: colors.danger }]}>
                Remover imagem
              </Text>
            </Pressable>
          ) : null}

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
              pressed && form.stateUF && !saving ? styles.selectPressed : null,
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

          <View
            style={[
              styles.adminSectionWrap,
              { borderColor: inputBorder, backgroundColor: inputBg },
              !isTerreiroAdminSectionEnabled
                ? styles.adminSectionDisabled
                : null,
            ]}
          >
            <View style={styles.adminHeaderRow}>
              <Text style={[styles.adminTitle, { color: textPrimary }]}>
                Administração do terreiro
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Papéis no terreiro"
                hitSlop={10}
                onPress={() => setIsRolesSheetOpen(true)}
                style={({ pressed }) => [
                  styles.adminInfoBtn,
                  { borderColor: inputBorder },
                  pressed ? styles.rowPressed : null,
                ]}
              >
                <Text style={[styles.adminInfoBtnText, { color: textMuted }]}>
                  i
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.adminSubtitle, { color: textSecondary }]}>
              Convide pessoas da sua curimba para colaborar e administrar o
              acesso ao terreiro.
            </Text>

            <Text style={[styles.adminSecondaryText, { color: textSecondary }]}>
              Defina quem pode organizar coleções, editar pontos ou apenas
              visualizar as informações do terreiro.
            </Text>

            {!isTerreiroAdminSectionEnabled ? (
              <Text style={[styles.adminLockedText, { color: textMuted }]}>
                Salve o terreiro para poder convidar pessoas.
              </Text>
            ) : null}

            <View style={styles.adminActionsWrap}>
              {isTerreiroAdminSectionEnabled &&
              (myTerreiroRole === "admin" ||
                myTerreiroRole === "editor" ||
                isAdmin) ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Gerenciar acesso"
                  disabled={saving}
                  onPress={() => {
                    const terreiroId = form.id;
                    router.push({
                      pathname: "/access-manager" as any,
                      params: {
                        terreiroId,
                        terreiroTitle: form.title,
                      },
                    });
                  }}
                  style={({ pressed }) => [
                    styles.inviteCtaBtn,
                    pressed && !saving ? styles.footerBtnPressed : null,
                    saving ? styles.footerBtnDisabled : null,
                  ]}
                >
                  <Text style={styles.inviteCtaText}>Gerenciar acesso</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <Text style={[styles.label, { color: textSecondary }]}>Telefone</Text>
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
              onValueChange={(v) => setForm((p) => ({ ...p, isWhatsappUi: v }))}
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

      <SelectModal
        title="Papel"
        visible={isInviteRoleModalOpen}
        variant={variant}
        items={[
          { key: "admin", label: "Admin", value: "admin" },
          { key: "editor", label: "Editor", value: "editor" },
        ]}
        onClose={() => setIsInviteRoleModalOpen(false)}
        onSelect={(value) => {
          setInviteRole(value === "admin" ? "admin" : "editor");
        }}
      />

      <BottomSheet
        visible={isRolesSheetOpen}
        variant={variant}
        onClose={() => setIsRolesSheetOpen(false)}
      >
        <View>
          <Text style={[styles.rolesSheetTitle, { color: textPrimary }]}>
            Papéis no terreiro
          </Text>

          <Text style={[styles.rolesSheetH, { color: textPrimary }]}>
            Admin
          </Text>
          <Text style={[styles.rolesSheetP, { color: textSecondary }]}>
            Pode:
          </Text>
          <Text style={[styles.rolesSheetBullet, { color: textSecondary }]}>
            - Alterar todos os dados do terreiro
          </Text>
          <Text style={[styles.rolesSheetBullet, { color: textSecondary }]}>
            - Convidar e remover pessoas
          </Text>
          <Text style={[styles.rolesSheetBullet, { color: textSecondary }]}>
            - Definir quem pode colaborar
          </Text>

          <View style={styles.rolesSheetSpacer} />

          <Text style={[styles.rolesSheetH, { color: textPrimary }]}>
            Editor
          </Text>
          <Text style={[styles.rolesSheetP, { color: textSecondary }]}>
            Pode:
          </Text>
          <Text style={[styles.rolesSheetBullet, { color: textSecondary }]}>
            - Criar e editar coleções
          </Text>
          <Text style={[styles.rolesSheetBullet, { color: textSecondary }]}>
            - Organizar e adicionar pontos
          </Text>
          <Text style={[styles.rolesSheetP, { color: textSecondary }]}>
            Não pode:
          </Text>
          <Text style={[styles.rolesSheetBullet, { color: textSecondary }]}>
            - Alterar dados do terreiro
          </Text>
          <Text style={[styles.rolesSheetBullet, { color: textSecondary }]}>
            - Gerenciar pessoas ou permissões
          </Text>

          <View style={styles.rolesSheetSpacer} />

          <Text style={[styles.rolesSheetFooter, { color: textSecondary }]}>
            Esses papéis ajudam a organizar o cuidado coletivo com os pontos do
            terreiro.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Entendi"
            onPress={() => setIsRolesSheetOpen(false)}
            style={({ pressed }) => [
              styles.rolesSheetCloseBtn,
              pressed ? styles.footerBtnPressed : null,
            ]}
          >
            <Text style={styles.rolesSheetCloseText}>Entendi</Text>
          </Pressable>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={isInviteShareSheetOpen}
        variant={variant}
        onClose={closeInviteShareSheet}
      >
        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copiar mensagem"
            onPress={copyInviteMessageOnly}
            style={({ pressed }) => [
              styles.shareOptionBtn,
              pressed ? styles.footerBtnPressed : null,
            ]}
          >
            <Text style={[styles.shareOptionText, { color: textPrimary }]}>
              Copiar mensagem
            </Text>
          </Pressable>

          <View
            style={[styles.shareDivider, { backgroundColor: inputBorder }]}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mais opções"
            onPress={shareInviteMoreOptions}
            style={({ pressed }) => [
              styles.shareOptionBtn,
              pressed ? styles.footerBtnPressed : null,
            ]}
          >
            <Text style={[styles.shareOptionText, { color: textPrimary }]}>
              Mais opções…
            </Text>
          </Pressable>
        </View>
      </BottomSheet>
    </View>
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
  coverRemoveBtn: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  coverRemoveText: {
    fontSize: 13,
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

  adminSectionWrap: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  adminSectionDisabled: {
    opacity: 0.72,
  },
  adminHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  adminTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
  },
  adminInfoBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  adminInfoBtnText: {
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 14,
  },
  adminSubtitle: {
    marginTop: spacing.xs,
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.92,
  },
  adminSecondaryText: {
    marginTop: spacing.xs,
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.92,
    lineHeight: 16,
  },
  adminHighlightCard: {
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  adminHighlightText: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  adminLockedText: {
    marginTop: spacing.sm,
    fontSize: 12,
    fontWeight: "800",
  },
  adminListHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  adminListTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  adminListMeta: {
    fontSize: 12,
    fontWeight: "800",
    opacity: 0.9,
  },
  adminList: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  adminEmptyText: {
    marginTop: spacing.sm,
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.85,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  personAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "transparent",
  },
  personAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.9,
  },
  personMeta: {
    flex: 1,
  },
  personName: {
    fontSize: 13,
    fontWeight: "800",
  },
  personRole: {
    fontSize: 12,
    fontWeight: "900",
    opacity: 0.92,
  },
  adminActionsWrap: {
    marginTop: spacing.lg,
  },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  inviteMeta: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  inviteEmail: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  inviteShareBtn: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteShareText: {
    fontSize: 12,
    fontWeight: "900",
  },
  inviteCtaBtn: {
    marginTop: spacing.md,
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.brass600,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  inviteCtaText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.paper50,
  },
  inviteForm: {
    marginTop: spacing.md,
  },
  inlineErrorText: {
    marginTop: spacing.xs,
    fontSize: 12,
    fontWeight: "800",
  },
  inviteFormButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.md,
  },

  shareOptionBtn: {
    minHeight: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  shareOptionText: {
    fontSize: 14,
    fontWeight: "900",
  },
  shareDivider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.9,
    marginVertical: spacing.sm,
  },

  rolesSheetTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: spacing.md,
  },
  rolesSheetH: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  rolesSheetP: {
    fontSize: 13,
    fontWeight: "800",
    opacity: 0.92,
    marginBottom: spacing.xs,
  },
  rolesSheetBullet: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.92,
    lineHeight: 18,
  },
  rolesSheetSpacer: {
    height: spacing.md,
  },
  rolesSheetFooter: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.92,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  rolesSheetCloseBtn: {
    marginTop: spacing.lg,
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.brass600,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  rolesSheetCloseText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.paper50,
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
