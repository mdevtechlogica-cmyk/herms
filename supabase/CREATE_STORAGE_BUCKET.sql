-- Run this in Supabase → SQL Editor if Book Now shows "Bucket not found"

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('rental-assets', 'rental-assets', true, 52428800, NULL)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "rental_assets_admin_upload" ON storage.objects;
CREATE POLICY "rental_assets_admin_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'rental-assets'
    AND public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "rental_assets_admin_update" ON storage.objects;
CREATE POLICY "rental_assets_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'rental-assets' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'rental-assets' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "rental_assets_read" ON storage.objects;
CREATE POLICY "rental_assets_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'rental-assets');

NOTIFY pgrst, 'reload schema';
