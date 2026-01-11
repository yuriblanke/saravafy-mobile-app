/**
 * AuthLogger: Utilitário para logging estruturado e persistente de tentativas de login OAuth no Supabase.
 *
 * Responsabilidades:
 * - Gerar e manter attempt_id (UUID) por tentativa
 * - Inserir eventos na tabela public.auth_login_attempts
 * - Nunca logar tokens sensíveis
 * - Garantir que falha de logging não quebre o fluxo (best-effort)
 * - Dedupe/debounce para evitar spam
 */

import { supabase } from "@/lib/supabase";
import * as Application from "expo-constants";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

// Tipos
export interface AuthLogEvent {
  event: string;
  details?: Record<string, any>;
  userId?: string | null;
}

interface PendingLog {
  attemptId: string;
  event: string;
  detailsHash: string;
  timestamp: number;
}

// Cache para dedupe (attempt_id + event + hash(details) em janela de 1s)
const recentLogs: PendingLog[] = [];
const DEDUPE_WINDOW_MS = 1000;
const MAX_RECENT_LOGS = 50;

// Memória local dos últimos eventos para debug
const localLogHistory: Array<{
  attemptId: string;
  event: string;
  timestamp: string;
  details: any;
}> = [];

/**
 * Gera um UUID v4 para o attempt_id
 */
export function generateAttemptId(): string {
  try {
    return Crypto.randomUUID();
  } catch (error) {
    console.warn("[AuthLogger] Erro ao gerar UUID, usando fallback", error);
    // Fallback simples (não é ideal, mas funcional)
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
}

/**
 * Coleta metadados do device/app
 */
function collectDeviceMetadata() {
  const metadata: {
    platform: string;
    os_version: string | null;
    app_version: string | null;
    build_number: string | null;
  } = {
    platform: Platform.OS,
    os_version: Platform.Version?.toString() ?? null,
    app_version: null,
    build_number: null,
  };

  try {
    // Tentar pegar versão do app via expo-constants
    const manifest2 = Application.default?.manifest2;
    const extra = manifest2?.extra as any;

    if (extra?.expoClient?.version) {
      metadata.app_version = extra.expoClient.version;
    }

    if (extra?.expoClient?.ios?.buildNumber) {
      metadata.build_number = extra.expoClient.ios.buildNumber;
    } else if (extra?.expoClient?.android?.versionCode) {
      metadata.build_number = String(extra.expoClient.android.versionCode);
    }
  } catch (error) {
    console.warn("[AuthLogger] Erro ao coletar metadados do app", error);
  }

  return metadata;
}

/**
 * Coleta informações de rede (simplificado, sem NetInfo por ora)
 */
function collectNetworkInfo() {
  // Se NetInfo não estiver disponível, retorna unknown
  return {
    network_type: "unknown" as const,
    network_details: null,
  };
}

/**
 * Gera hash simples de um objeto (para dedupe)
 */
function hashObject(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

/**
 * Verifica se um log já foi processado recentemente (dedupe)
 */
function isDuplicate(attemptId: string, event: string, details: any): boolean {
  const now = Date.now();
  const detailsHash = hashObject(details);

  // Limpar logs antigos
  while (
    recentLogs.length > 0 &&
    now - recentLogs[0].timestamp > DEDUPE_WINDOW_MS
  ) {
    recentLogs.shift();
  }

  // Verificar duplicata
  const duplicate = recentLogs.some(
    (log) =>
      log.attemptId === attemptId &&
      log.event === event &&
      log.detailsHash === detailsHash
  );

  if (!duplicate) {
    recentLogs.push({ attemptId, event, detailsHash, timestamp: now });
  }

  return duplicate;
}

/**
 * Adiciona evento à memória local (para debug)
 */
function addToLocalHistory(attemptId: string, event: string, details: any) {
  localLogHistory.push({
    attemptId,
    event,
    timestamp: new Date().toISOString(),
    details,
  });

  // Manter apenas os últimos MAX_RECENT_LOGS
  if (localLogHistory.length > MAX_RECENT_LOGS) {
    localLogHistory.shift();
  }
}

/**
 * Retorna os logs locais recentes (para debug)
 */
export function getRecentAuthLogs() {
  return [...localLogHistory];
}

/**
 * Limpa os logs locais
 */
export function clearRecentAuthLogs() {
  localLogHistory.length = 0;
}

/**
 * Sanitiza detalhes para garantir que não contenham tokens sensíveis
 */
function sanitizeDetails(details: any): any {
  if (!details || typeof details !== "object") {
    return details;
  }

  const sanitized = { ...details };

  // Remover campos sensíveis (se existirem acidentalmente)
  const sensitiveFields = [
    "access_token",
    "refresh_token",
    "id_token",
    "code",
    "token",
    "secret",
    "password",
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      delete sanitized[field];
    }
  }

  return sanitized;
}

/**
 * Classifica URL em categorias (para logging)
 */
export function classifyUrl(url: string): {
  urlKind: string;
  urlHost?: string;
  urlPath?: string;
} {
  try {
    if (url.includes("expo-development-client")) {
      return { urlKind: "dev_client" };
    }

    // Verificar se tem query param 'url' (metro)
    const hasMetroUrl = url.includes("?url=") || url.includes("&url=");
    if (hasMetroUrl) {
      return { urlKind: "metro" };
    }

    // Tentar fazer parse
    const parsed = new URL(url);
    const host = parsed.host || parsed.hostname;
    const path = parsed.pathname;

    // Verificar se é callback de auth
    if (path.includes("auth/callback") || path.includes("/callback")) {
      return {
        urlKind: "auth_callback",
        urlHost: host,
        urlPath: path,
      };
    }

    return {
      urlKind: "other",
      urlHost: host,
      urlPath: path,
    };
  } catch (error) {
    return { urlKind: "invalid" };
  }
}

/**
 * Insere um evento de autenticação no Supabase
 */
export async function logAuthEvent(
  attemptId: string,
  event: string,
  details: any = {},
  userId?: string | null
): Promise<void> {
  try {
    // Dedupe
    if (isDuplicate(attemptId, event, details)) {
      console.info("[AuthLogger] Log duplicado ignorado", { attemptId, event });
      return;
    }

    // Sanitizar detalhes
    const sanitizedDetails = sanitizeDetails(details);

    // Adicionar à memória local
    addToLocalHistory(attemptId, event, sanitizedDetails);

    // Coletar metadados
    const deviceMetadata = collectDeviceMetadata();
    const networkInfo = collectNetworkInfo();

    // Preparar payload
    const payload = {
      attempt_id: attemptId,
      user_id: userId ?? null,
      provider: "google",
      event,
      client_ts: new Date().toISOString(),
      platform: deviceMetadata.platform,
      os_version: deviceMetadata.os_version,
      app_version: deviceMetadata.app_version,
      build_number: deviceMetadata.build_number,
      network_type: networkInfo.network_type,
      network_details: networkInfo.network_details,
      browser_details: null, // Pode ser preenchido futuramente
      details: sanitizedDetails,
    };

    // Inserir no Supabase (best-effort)
    const { error } = await supabase
      .from("auth_login_attempts")
      .insert(payload);

    if (error) {
      console.warn("[AuthLogger] Erro ao inserir log (não-crítico)", {
        event,
        error: error.message,
      });
    } else if (__DEV__) {
      console.info("[AuthLogger] Log inserido", { attemptId, event });
    }
  } catch (error) {
    // Nunca quebrar o fluxo
    console.warn("[AuthLogger] Erro ao processar log (não-crítico)", {
      event,
      error,
    });
  }
}

/**
 * Classe para gerenciar uma tentativa de login
 */
export class AuthAttempt {
  public readonly attemptId: string;
  private userId: string | null = null;

  constructor(attemptId?: string) {
    this.attemptId = attemptId ?? generateAttemptId();
  }

  /**
   * Define o user_id da tentativa (após obter sessão)
   */
  setUserId(userId: string | null) {
    this.userId = userId;
  }

  /**
   * Loga um evento desta tentativa
   */
  async log(event: string, details?: any): Promise<void> {
    await logAuthEvent(this.attemptId, event, details, this.userId);
  }
}
