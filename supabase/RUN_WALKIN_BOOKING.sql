-- Run once in Supabase SQL Editor for walk-in Book Now flow

CREATE TABLE IF NOT EXISTS public.shop_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  id_document_type TEXT,
  id_document_number TEXT,
  id_document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS shop_customer_id UUID REFERENCES public.shop_customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advance_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS id_document_url TEXT,
  ADD COLUMN IF NOT EXISTS handover_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS customer_signature_url TEXT;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_customers TO authenticated;
ALTER TABLE public.shop_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_customers_admin" ON public.shop_customers;
CREATE POLICY "shop_customers_admin" ON public.shop_customers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "bookings_admin_insert" ON public.bookings;
CREATE POLICY "bookings_admin_insert" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('rental-assets', 'rental-assets', true, 52428800, NULL)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "rental_assets_admin_upload" ON storage.objects;
CREATE POLICY "rental_assets_admin_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rental-assets' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "rental_assets_admin_update" ON storage.objects;
CREATE POLICY "rental_assets_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'rental-assets' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'rental-assets' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "rental_assets_read" ON storage.objects;
CREATE POLICY "rental_assets_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'rental-assets');

NOTIFY pgrst, 'reload schema';
