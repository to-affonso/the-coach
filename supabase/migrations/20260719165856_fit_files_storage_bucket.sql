-- Bucket privado para os arquivos FIT originais (backup fiel para reprocessar,
-- conforme modelo-de-dados.md > activities.fit_file_path). Convenção de path:
-- {user_id}/{external_id}.fit — o motor de sync grava com a secret key
-- (bypassa RLS), mas as policies abaixo garantem que, mesmo via chave
-- publishable, cada usuário só acessa a própria pasta.
insert into storage.buckets (id, name, public)
values ('fit-files', 'fit-files', false);

create policy "fit_files_owner_select" on storage.objects
for select to authenticated
using (
  bucket_id = 'fit-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "fit_files_owner_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'fit-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "fit_files_owner_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'fit-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
