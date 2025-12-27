import { supabase } from "@/lib/supabase";

export type CreatePontoSubmissionInput = {
  title: string;
  lyrics: string;
  tags?: string[];
};

export type PontoSubmissionRow = {
  id: string;
  created_at?: string;
  created_by?: string;
  title: string;
  lyrics: string;
  tags: string[];
  status?: string;
};

export function parseTagsInput(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function createPontoSubmission(input: CreatePontoSubmissionInput) {
  const payload = {
    title: input.title,
    lyrics: input.lyrics,
    tags: input.tags ?? [],
  };

  const { data, error } = await supabase
    .from("pontos_submissions")
    .insert(payload)
    .select("id, created_at, created_by, title, lyrics, tags, status")
    .single();

  if (error) throw error;

  return data as PontoSubmissionRow;
}
