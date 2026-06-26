-- Run this ONCE in Supabase SQL Editor if Book Now shows "Booking failed"
-- Combines walk-in customers, booking fields, branches link, rental types, storage, and admin policies

-- Shop customers
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

-- Branches (if missing)
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'IN',
  address TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS shop_customer_id UUID REFERENCES public.shop_customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advance_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS rental_type TEXT NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS custom_rent_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS id_document_url TEXT,
  ADD COLUMN IF NOT EXISTS handover_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS customer_signature_url TEXT;

ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;

ALTER TABLE public.shop_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_customers_admin" ON public.shop_customers;
CREATE POLICY "shop_customers_admin" ON public.shop_customers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "branches_owner_select" ON public.branches;
CREATE POLICY "branches_owner_select" ON public.branches
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "branches_owner_write" ON public.branches;
CREATE POLICY "branches_owner_write" ON public.branches
  FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "bookings_admin_insert" ON public.bookings;
CREATE POLICY "bookings_admin_insert" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "bookings_admin_update" ON public.bookings;
CREATE POLICY "bookings_admin_update" ON public.bookings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage bucket
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

-- Admin RPC helpers (bypass RLS after role check — fixes "row level security" on Book Now)
CREATE OR REPLACE FUNCTION public.admin_create_walk_in_shop_customer(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  INSERT INTO public.shop_customers (
    branch_id, full_name, phone, email, address,
    id_document_type, id_document_number, id_document_url
  ) VALUES (
    NULLIF(payload->>'branch_id', '')::uuid,
    payload->>'full_name',
    NULLIF(payload->>'phone', ''),
    NULLIF(payload->>'email', ''),
    NULLIF(payload->>'address', ''),
    NULLIF(payload->>'id_document_type', ''),
    NULLIF(payload->>'id_document_number', ''),
    NULLIF(payload->>'id_document_url', '')
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_walk_in_booking(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_id uuid;
  row_number text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  INSERT INTO public.bookings (
    customer_id, equipment_id, start_date, end_date, number_of_days,
    operator_required, operator_cost, insurance_required, delivery_address,
    subtotal, insurance_cost, transport_cost, tax, total_amount,
    booking_status, payment_status, notes,
    shop_customer_id, branch_id, advance_amount, advance_paid, payment_method,
    rental_type, custom_rent_amount, id_document_url, handover_photo_url, customer_signature_url
  ) VALUES (
    (payload->>'customer_id')::uuid,
    (payload->>'equipment_id')::uuid,
    (payload->>'start_date')::date,
    (payload->>'end_date')::date,
    (payload->>'number_of_days')::integer,
    COALESCE((payload->>'operator_required')::boolean, false),
    COALESCE((payload->>'operator_cost')::numeric, 0),
    COALESCE((payload->>'insurance_required')::boolean, false),
    NULLIF(payload->>'delivery_address', ''),
    COALESCE((payload->>'subtotal')::numeric, 0),
    COALESCE((payload->>'insurance_cost')::numeric, 0),
    COALESCE((payload->>'transport_cost')::numeric, 0),
    COALESCE((payload->>'tax')::numeric, 0),
    COALESCE((payload->>'total_amount')::numeric, 0),
    COALESCE((payload->>'booking_status')::public.booking_status, 'pending'),
    COALESCE((payload->>'payment_status')::public.payment_status, 'pending'),
    NULLIF(payload->>'notes', ''),
    NULLIF(payload->>'shop_customer_id', '')::uuid,
    NULLIF(payload->>'branch_id', '')::uuid,
    COALESCE((payload->>'advance_amount')::numeric, 0),
    COALESCE((payload->>'advance_paid')::numeric, 0),
    NULLIF(payload->>'payment_method', ''),
    COALESCE(payload->>'rental_type', 'daily'),
    NULLIF(payload->>'custom_rent_amount', '')::numeric,
    NULLIF(payload->>'id_document_url', ''),
    NULLIF(payload->>'handover_photo_url', ''),
    NULLIF(payload->>'customer_signature_url', '')
  )
  RETURNING id, booking_number INTO row_id, row_number;

  RETURN jsonb_build_object('id', row_id, 'booking_number', row_number);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_record_walk_in_payment(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  INSERT INTO public.payments (
    booking_id, transaction_id, amount, payment_method, payment_status, paid_at
  ) VALUES (
    (payload->>'booking_id')::uuid,
    NULLIF(payload->>'transaction_id', ''),
    (payload->>'amount')::numeric,
    payload->>'payment_method',
    COALESCE((payload->>'payment_status')::public.payment_status, 'paid'),
    COALESCE((payload->>'paid_at')::timestamptz, now())
  );

  IF payload ? 'advance_paid' OR payload ? 'booking_status' OR payload ? 'booking_status_payment' THEN
    UPDATE public.bookings
    SET
      advance_paid = COALESCE((payload->>'advance_paid')::numeric, advance_paid),
      booking_status = COALESCE(
        NULLIF(payload->>'booking_status', '')::public.booking_status,
        booking_status
      ),
      payment_status = COALESCE(
        NULLIF(payload->>'booking_status_payment', '')::public.payment_status,
        payment_status
      )
    WHERE id = (payload->>'booking_id')::uuid;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_walk_in_shop_customer(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_walk_in_booking(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_walk_in_payment(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
