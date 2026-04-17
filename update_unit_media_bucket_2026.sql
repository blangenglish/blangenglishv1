-- Update bucket to allow larger files (200MB)
UPDATE storage.buckets
SET file_size_limit = 209715200,  -- 200 MB in bytes
    allowed_mime_types = ARRAY[
      'video/mp4','video/webm','video/ogg','video/quicktime',
      'audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/m4a','audio/x-m4a',
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg','image/png','image/gif','image/webp','image/svg+xml'
    ]
WHERE id = 'unit-media';

-- Drop old policies if exist and recreate cleanly
DROP POLICY IF EXISTS "unit_media_admin_upload" ON storage.objects;
DROP POLICY IF EXISTS "unit_media_public_read" ON storage.objects;
DROP POLICY IF EXISTS "unit_media_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "unit_media_admin_update" ON storage.objects;

-- New policies
CREATE POLICY "unit_media_authenticated_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'unit-media');

CREATE POLICY "unit_media_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'unit-media');

CREATE POLICY "unit_media_authenticated_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'unit-media');

CREATE POLICY "unit_media_authenticated_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'unit-media');
