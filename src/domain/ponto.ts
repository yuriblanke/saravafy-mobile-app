/**
 * Tipos de domínio para pontos e versões.
 * Reflete a arquitetura ponto_versoes introduzida em 2025-03-29.
 */

export type PontoVersao = {
  id: string;
  ponto_id: string;
  versao_num: number;
  is_canonical: boolean;
  /** null = herda pontos.title */
  title: string | null;
  lyrics: string;
  lyrics_preview_6: string | null;
  lyrics_sync: Record<string, unknown> | null;
  tags: string[];
  author_name: string | null;
  is_public_domain: boolean | null;
  source_submission_id: string | null;
  created_by: string;
  curated_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PontoWithVersao = {
  id: string;
  title: string;
  tags: string[];
  is_active: boolean;
  restricted: boolean;
  is_public_domain: boolean;
  author_name: string | null;
  created_by: string | null;
  curated_by: string | null;
  created_at: string;
  updated_at: string;
  /** versão canônica ou versão selecionada */
  versao: PontoVersao;
  /** Título resolvido: COALESCE(versao.title, ponto.title) */
  displayTitle: string;
};

export type PontoSubmissionKind =
  | "new"
  | "correction"
  | "issue"
  | "audio_upload"
  | "variation";
