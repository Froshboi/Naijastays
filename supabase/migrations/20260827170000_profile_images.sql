insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

drop policy if exists "Profile images are public" on storage.objects;
create policy "Profile images are public"
on storage.objects for select
using (bucket_id = 'profile-images');

drop policy if exists "Users can upload profile images" on storage.objects;
create policy "Users can upload profile images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update profile images" on storage.objects;
create policy "Users can update profile images"
on storage.objects for update
to authenticated
using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);
