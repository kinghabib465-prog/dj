-- 20240211_equipment_images_bucket.sql
-- Public bucket for equipment catalog images (public read, admin-only write)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('equipment-images', 'equipment-images', TRUE, 5 * 1024 * 1024, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

drop policy if exists "public_read_equipment_images" on storage.objects;
create policy "public_read_equipment_images" on storage.objects
  for select
  using (bucket_id = 'equipment-images');

drop policy if exists "admin_write_equipment_images" on storage.objects;
create policy "admin_write_equipment_images" on storage.objects
  for all
  using ((public.is_admin() or auth.role() = 'service_role') and bucket_id = 'equipment-images')
  with check ((public.is_admin() or auth.role() = 'service_role') and bucket_id = 'equipment-images');