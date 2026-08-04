-- Dokument-vedhæftninger på aktiviteter (kør i Supabase SQL Editor).
-- Opretter en PRIVAT bucket "documents" + RLS-policies scoped til
-- adventure_members, samme adgangsmønster som activity_comments.
--
-- Sti-konvention (sat af klienten, se js/sync.js): hvert objekt gemmes
-- som "<adventure_id>/<activity_id>/<uuid>-<filnavn>" — policies herunder
-- tjekker KUN første stikomponent (adventure_id) mod adventure_members,
-- adgang er pr. eventyr, ikke pr. aktivitet.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents', 'documents', false,
  10485760, -- 10 MB pr. fil
  array['image/png', 'image/jpeg', 'image/heic', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "members read documents" on storage.objects;
create policy "members read documents" on storage.objects
  for select using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.adventure_members m
      where m.adventure_id = (storage.foldername(name))[1]::uuid
      and m.user_id = auth.uid()
    )
  );

drop policy if exists "members upload documents" on storage.objects;
create policy "members upload documents" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and exists (
      select 1 from public.adventure_members m
      where m.adventure_id = (storage.foldername(name))[1]::uuid
      and m.user_id = auth.uid()
    )
  );

drop policy if exists "members delete documents" on storage.objects;
create policy "members delete documents" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.adventure_members m
      where m.adventure_id = (storage.foldername(name))[1]::uuid
      and m.user_id = auth.uid()
    )
  );
