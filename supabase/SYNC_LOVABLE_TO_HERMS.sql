-- =============================================================================
-- SYNC: Lovable full_schema.sql  →  HERMS app (current codebase)
-- =============================================================================
-- Run ONCE in Lovable chat or Supabase SQL Editor.
--
-- Your Lovable export uses a MULTI-TENANT model (tenants, tenant_members,
-- customers, booking_documents). The HERMS Android app uses a SIMPLER model:
--   • branches.owner_id  (not branches.tenant_id)
--   • shop_customers     (not customers)
--   • subscription on profiles (not tenants.plan)
--   • country_tax_configs
--
-- This script ADDS what HERMS needs without dropping your existing data.
-- Safe to re-run (IF NOT EXISTS / OR REPLACE).
-- =============================================================================

-- ---------- 1. Profiles: locale + subscription (HERMS) ----------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_active BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_plan_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_plan_check
  CHECK (subscription_plan IS NULL OR subscription_plan IN ('basic', 'intermediate', 'premium'));

UPDATE public.profiles SET subscription_plan = 'basic' WHERE subscription_plan IS NULL;
UPDATE public.profiles SET trial_ends_at = created_at + interval '15 days' WHERE trial_ends_at IS NULL;

-- ---------- 2. Country tax configs (HERMS — not in Lovable) ----------
CREATE TABLE IF NOT EXISTS public.country_tax_configs (
  country_code TEXT PRIMARY KEY,
  tax_name TEXT NOT NULL,
  tax_rate NUMERIC(6,4) NOT NULL CHECK (tax_rate >= 0 AND tax_rate <= 1),
  tax_id_label TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.country_tax_configs TO anon, authenticated;
GRANT ALL ON public.country_tax_configs TO service_role;
ALTER TABLE public.country_tax_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tax_configs_read_all" ON public.country_tax_configs;
CREATE POLICY "tax_configs_read_all" ON public.country_tax_configs FOR SELECT USING (true);

DROP POLICY IF EXISTS "tax_configs_admin_write" ON public.country_tax_configs;
CREATE POLICY "tax_configs_admin_write" ON public.country_tax_configs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.country_tax_configs (country_code, tax_name, tax_rate, tax_id_label, currency_code)
VALUES
  ('IN', 'GST', 0.18, 'GST Number', 'INR'),
  ('US', 'Sales Tax', 0.08, 'Tax ID', 'USD'),
  ('AE', 'VAT', 0.05, 'TRN', 'AED'),
  ('GB', 'VAT', 0.20, 'VAT Number', 'GBP'),
  ('SA', 'VAT', 0.15, 'VAT Number', 'SAR')
ON CONFLICT (country_code) DO NOTHING;

-- ---------- 3. Branches: HERMS owner model (alongside Lovable tenant model) ----------
-- Lovable branches use tenant_id; HERMS app queries owner_id.
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Backfill owner_id from tenant owner for existing Lovable branches
UPDATE public.branches b
SET owner_id = tm.user_id
FROM public.tenant_members tm
WHERE b.owner_id IS NULL
  AND b.tenant_id = tm.tenant_id
  AND tm.role = 'owner';

-- Map Lovable country → HERMS country_code if empty
UPDATE public.branches SET country_code = COALESCE(country, 'IN') WHERE country_code IS NULL;

CREATE INDEX IF NOT EXISTS idx_branches_owner ON public.branches(owner_id);

DROP POLICY IF EXISTS "branches_owner_select" ON public.branches;
CREATE POLICY "branches_owner_select" ON public.branches
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR (
      tenant_id IS NOT NULL
      AND to_regprocedure('public.is_tenant_member(uuid)') IS NOT NULL
      AND public.is_tenant_member(tenant_id)
    )
  );

DROP POLICY IF EXISTS "branches_owner_write" ON public.branches;
CREATE POLICY "branches_owner_write" ON public.branches
  FOR ALL TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR (
      tenant_id IS NOT NULL
      AND to_regprocedure('public.is_tenant_owner(uuid)') IS NOT NULL
      AND public.is_tenant_owner(tenant_id)
    )
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR (
      tenant_id IS NOT NULL
      AND to_regprocedure('public.is_tenant_owner(uuid)') IS NOT NULL
      AND public.is_tenant_owner(tenant_id)
    )
  );

-- ---------- 4. Shop customers (HERMS walk-in — not in Lovable) ----------
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_customers TO authenticated;
GRANT ALL ON public.shop_customers TO service_role;
ALTER TABLE public.shop_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_customers_admin" ON public.shop_customers;
CREATE POLICY "shop_customers_admin" ON public.shop_customers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS shop_customer_id UUID REFERENCES public.shop_customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advance_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS rental_type TEXT NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS custom_rent_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS id_document_url TEXT,
  ADD COLUMN IF NOT EXISTS handover_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS customer_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS return_document_url TEXT,
  ADD COLUMN IF NOT EXISTS advance_refunded NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_method TEXT,
  ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS collection_notes TEXT;

-- Lovable multi-tenant column (no-op if already present)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- ---------- 6. Book Now RLS + RPC (fixes row-level security error) ----------
DROP POLICY IF EXISTS "bookings_admin_insert" ON public.bookings;
CREATE POLICY "bookings_admin_insert" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "bookings_admin_update" ON public.bookings;
CREATE POLICY "bookings_admin_update" ON public.bookings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "payments_admin_write" ON public.payments;
CREATE POLICY "payments_admin_write" ON public.payments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Helper: resolve tenant_id for inserts (works with Lovable multi-tenant OR plain admin)
CREATE OR REPLACE FUNCTION public.herms_booking_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE tid uuid;
BEGIN
  IF to_regclass('public.tenant_members') IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT tenant_id INTO tid FROM public.tenant_members WHERE user_id = auth.uid() LIMIT 1;
  RETURN tid;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_walk_in_shop_customer(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_id uuid;
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
  tid uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  tid := public.herms_booking_tenant_id();

  INSERT INTO public.bookings (
    customer_id,
    tenant_id,
    equipment_id,
    start_date,
    end_date,
    number_of_days,
    operator_required,
    operator_cost,
    insurance_required,
    delivery_address,
    subtotal,
    insurance_cost,
    transport_cost,
    tax,
    total_amount,
    booking_status,
    payment_status,
    notes,
    shop_customer_id,
    branch_id,
    advance_amount,
    advance_paid,
    payment_method,
    rental_type,
    custom_rent_amount,
    id_document_url,
    handover_photo_url,
    customer_signature_url
  ) VALUES (
    auth.uid(),
    tid,
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
    booking_id,
    tenant_id,
    transaction_id,
    amount,
    payment_method,
    payment_status,
    paid_at
  ) VALUES (
    (payload->>'booking_id')::uuid,
    public.herms_booking_tenant_id(),
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

GRANT EXECUTE ON FUNCTION public.herms_booking_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_walk_in_shop_customer(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_walk_in_booking(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_walk_in_payment(jsonb) TO authenticated;

-- ---------- 7. Storage for rental documents ----------
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
