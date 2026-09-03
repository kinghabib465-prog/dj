-- 20240115_create_booking_receipts_bucket.sql

-- Create private bucket for booking receipts with size limit and allowed MIME types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('booking-receipts', 'booking-receipts', FALSE, 5 * 1024 * 1024, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policy: only admins (public.is_admin()) can read/write objects in this bucket
CREATE POLICY "admin_can_read_write_receipts" ON storage.objects
FOR ALL
USING (
  (auth.role() = 'service_role' OR public.is_admin())
  AND bucket_id = 'booking-receipts'
)
WITH CHECK (
  (auth.role() = 'service_role' OR public.is_admin())
  AND bucket_id = 'booking-receipts'
);
