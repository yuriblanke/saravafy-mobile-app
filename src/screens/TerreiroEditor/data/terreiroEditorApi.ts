import { supabase } from "@/lib/supabase";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";

// ---- Image helpers ----

export function withCacheBust(url: string) {
  const v = Date.now();
  return url.includes("?") ? `${url}&v=${v}` : `${url}?v=${v}`;
}

export function makeUniqueFileName(ext: string) {
  const safeExt = (ext ?? "").trim().toLowerCase().replace(/^\.+/, "");
  const finalExt = safeExt || "bin";
  return `${Date.now()}-${Crypto.randomUUID()}.${finalExt}`;
}

export async function ensureWebp(uri: string): Promise<string> {
  const compressCandidates = [0.92, 0.86, 0.78, 0.7, 0.62] as const;
  const maxBytes = 2 * 1024 * 1024;

  for (const compress of compressCandidates) {
    const result = await ImageManipulator.manipulateAsync(uri, [], {
      compress,
      format: ImageManipulator.SaveFormat.WEBP,
    });

    if (!result?.uri) continue;
    if (!result.uri.toLowerCase().includes(".webp")) {
      throw new Error("Encoder WEBP indisponível neste dispositivo.");
    }

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

// ---- Storage ----

export async function uploadCoverWebp(params: {
  terreiroId: string;
  webpUri: string;
}): Promise<string> {
  const path = `terreiros/${params.terreiroId}/cover.webp`;
  return uploadCoverWebpToPath({ path, webpUri: params.webpUri });
}

export async function uploadCoverWebpToPath(params: {
  path: string;
  webpUri: string;
}): Promise<string> {
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

export async function deleteFinalCoverIfPossible(terreiroId: string) {
  try {
    await supabase.storage
      .from("terreiros-images")
      .remove([`terreiros/${terreiroId}/cover.webp`]);
  } catch {
    // silêncio
  }
}

type StorageListItem = { name?: unknown; id?: unknown };

async function listAllStorageItems(params: {
  bucket: string;
  path: string;
}): Promise<StorageListItem[]> {
  const items: StorageListItem[] = [];
  const limit = 1000;
  let offset = 0;

  while (true) {
    const res = await supabase.storage
      .from(params.bucket)
      .list(params.path, { limit, offset });

    if (res.error) {
      throw new Error(
        typeof res.error.message === "string" && res.error.message.trim()
          ? res.error.message
          : "Não foi possível listar os arquivos do Storage."
      );
    }

    const batch = (res.data ?? []) as StorageListItem[];
    items.push(...batch);

    if (batch.length < limit) break;
    offset += limit;
  }

  return items;
}

async function collectStorageFilePathsRecursively(params: {
  bucket: string;
  folderPath: string;
}): Promise<string[]> {
  const items = await listAllStorageItems({
    bucket: params.bucket,
    path: params.folderPath,
  });

  const paths: string[] = [];

  for (const item of items) {
    const name = typeof item?.name === "string" ? item.name : "";
    if (!name) continue;

    const nextPath = `${params.folderPath}/${name}`;
    const isFolder = item?.id === null;

    if (isFolder) {
      const nested = await collectStorageFilePathsRecursively({
        bucket: params.bucket,
        folderPath: nextPath,
      });
      paths.push(...nested);
    } else {
      paths.push(nextPath);
    }
  }

  return paths;
}

export async function deleteTerreiroStorageFolder(terreiroId: string) {
  const bucket = "terreiros-images";
  const root = `terreiros/${terreiroId}`;

  const paths = await collectStorageFilePathsRecursively({
    bucket,
    folderPath: root,
  }).catch((error) => {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Não foi possível excluir os arquivos do terreiro."
    );
  });

  if (paths.length === 0) return;

  const chunkSize = 100;
  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize);
    const res = await supabase.storage.from(bucket).remove(chunk);

    if (res.error) {
      throw new Error(
        typeof res.error.message === "string" && res.error.message.trim()
          ? res.error.message
          : "Não foi possível excluir os arquivos do terreiro."
      );
    }
  }
}

// ---- DB helpers ----

export async function upsertPrimaryContato(payload: {
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

// ---- Create terreiro flow ----

export type CreateTerreiroFlowInput = {
  currentUserId: string;
  title: string;
  about: string | null;
  linesOfWork: string | null;
  contato: {
    city: string;
    stateUF: string;
    neighborhood: string | null;
    address: string;
    phoneDigits: string | null;
    phoneIsWhatsapp: boolean;
    instagramHandle: string | null;
  };
  coverWebpUri: string | null;
  onBaseCreated?: (terreiroId: string) => void | Promise<void>;
};

export type CreateTerreiroFlowResult = {
  terreiroId: string;
  coverImageUrl: string | null;
  coverImageFailed: boolean;
};

export async function createTerreiroFlow(
  input: CreateTerreiroFlowInput
): Promise<CreateTerreiroFlowResult> {
  const log = (...args: unknown[]) => {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.debug("[CreateTerreiroFlow]", ...args);
    }
  };

  log("3.1 insert terreiros");
  const terreiroRes = await supabase
    .from("terreiros")
    .insert({
      title: input.title,
      about: input.about,
      lines_of_work: input.linesOfWork,
      created_by: input.currentUserId,
    } as any)
    .select("id")
    .single();

  if (terreiroRes.error || !terreiroRes.data?.id) {
    throw new Error(
      typeof terreiroRes.error?.message === "string" &&
      terreiroRes.error.message.trim()
        ? `Terreiro: ${terreiroRes.error.message}`
        : "Terreiro: não foi possível criar."
    );
  }

  const terreiroId = terreiroRes.data.id as string;

  log("3.2 insert terreiro_members (admin/active)");
  const memberRes = await supabase.from("terreiro_members").insert({
    terreiro_id: terreiroId,
    user_id: input.currentUserId,
    role: "admin",
    status: "active",
  } as any);

  if (memberRes.error) {
    throw new Error(
      typeof memberRes.error.message === "string" && memberRes.error.message
        ? `Acesso: ${memberRes.error.message}`
        : "Acesso: não foi possível criar a administração do terreiro."
    );
  }

  log("3.3 upsert terreiros_contatos");
  await upsertPrimaryContato({
    terreiro_id: terreiroId,
    city: input.contato.city,
    state: input.contato.stateUF,
    neighborhood: input.contato.neighborhood,
    address: input.contato.address,
    phone_whatsapp: input.contato.phoneDigits,
    phone_is_whatsapp: input.contato.phoneIsWhatsapp,
    instagram_handle: input.contato.instagramHandle,
    is_primary: true,
  });

  if (input.onBaseCreated) {
    try {
      await input.onBaseCreated(terreiroId);
    } catch (e) {
      log("onBaseCreated failed", e);
    }
  }

  let coverImageUrl: string | null = null;
  let coverImageFailed = false;

  if (input.coverWebpUri) {
    const fileName = makeUniqueFileName("webp");
    const path = `terreiros/${terreiroId}/${fileName}`;

    try {
      log("3.4 upload storage", { path });
      const uploadedUrl = await uploadCoverWebpToPath({
        path,
        webpUri: input.coverWebpUri,
      });

      log("3.4 update terreiros.cover_image_url");
      const updateRes = await supabase
        .from("terreiros")
        .update({ cover_image_url: uploadedUrl })
        .eq("id", terreiroId);

      if (updateRes.error) {
        throw new Error(
          typeof updateRes.error.message === "string"
            ? updateRes.error.message
            : "Não foi possível salvar a URL da imagem."
        );
      }

      coverImageUrl = uploadedUrl;
    } catch (error) {
      coverImageFailed = true;
      coverImageUrl = null;
      log("3.4 failed", error instanceof Error ? error.message : error);
    }
  }

  return { terreiroId, coverImageUrl, coverImageFailed };
}
