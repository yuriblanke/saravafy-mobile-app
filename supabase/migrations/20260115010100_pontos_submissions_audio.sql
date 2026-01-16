-- Add audio support to ponto submissions + create Storage bucket

begin;

alter table public.pontos_submissions
  add column if not exists audio_bucket text,
  add column if not exists audio_path text,
  add column if not exists audio_url text,
  add column if not exists audio_mime_type text,
  add column if not exists audio_size_bytes bigint;

do $$
begin
  alter table public.pontos_submissions
    add constraint pontos_submissions_audio_requires_consent
    check (audio_url is null or has_author_consent is true);
exception
  when duplicate_object then
    null;
end $$;

insert into storage.buckets (id, name, public)
values ('pontos-audio', 'pontos-audio', true)
on conflict (id) do update
set public = excluded.public;

do $$
begin
  create policy "Authenticated can upload pontos audio"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'pontos-audio');
exception
  when duplicate_object then
    null;
end $$;

commit;
