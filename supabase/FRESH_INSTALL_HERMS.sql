-- =============================================================================
-- HERMS — Complete fresh Supabase database install
-- =============================================================================
-- Use on a NEW empty Supabase project (SQL Editor → paste all → Run).
--
-- Includes: tables, enums, RLS, triggers, functions, storage, seed data.
-- Matches the HERMS Android app codebase (owner branches, shop_customers, etc.)
--
-- After running:
--   1. Update .env with new SUPABASE_URL, keys, VITE_* vars
--   2. Sign up first user in app → becomes admin automatically
--   3. npm run dev → test Book Now
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'customer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.equipment_status AS ENUM ('available', 'booked', 'under_maintenance', 'out_of_service');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.booking_status AS ENUM ('pending', 'approved', 'rejected', 'assigned', 'dispatched', 'active', 'returned', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.operator_status AS ENUM ('available', 'assigned', 'on_leave');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.maintenance_type AS ENUM ('preventive', 'breakdown', 'scheduled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.maintenance_status AS ENUM ('scheduled', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  company_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  gst_number TEXT,
  blocked BOOLEAN NOT NULL DEFAULT false,
  country_code TEXT NOT NULL DEFAULT 'IN',
  preferred_language TEXT NOT NULL DEFAULT 'en',
  subscription_plan TEXT DEFAULT 'basic',
  trial_ends_at TIMESTAMPTZ,
  subscription_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profiles_subscription_plan_check
    CHECK (subscription_plan IS NULL OR subscription_plan IN ('basic', 'intermediate', 'premium'))
);

-- ---------------------------------------------------------------------------
-- USER ROLES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- ---------------------------------------------------------------------------
-- BRANCHES (HERMS owner model)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- SHOP CUSTOMERS (walk-in / Book Now)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- COUNTRY TAX CONFIGS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.country_tax_configs (
  country_code TEXT PRIMARY KEY,
  tax_name TEXT NOT NULL,
  tax_rate NUMERIC(6,4) NOT NULL CHECK (tax_rate >= 0 AND tax_rate <= 1),
  tax_id_label TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- EQUIPMENT CATEGORIES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipment_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- EQUIPMENT
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_name TEXT NOT NULL,
  category_id UUID REFERENCES public.equipment_categories(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  brand TEXT,
  model TEXT,
  manufacture_year INT,
  serial_number TEXT,
  registration_number TEXT,
  daily_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  weekly_rate NUMERIC(12,2),
  monthly_rate NUMERIC(12,2),
  operator_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
  transport_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
  fuel_type TEXT,
  capacity TEXT,
  description TEXT,
  status public.equipment_status NOT NULL DEFAULT 'available',
  location TEXT,
  main_image TEXT,
  gallery_images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- OPERATORS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_name TEXT NOT NULL,
  license_number TEXT,
  experience INT,
  phone TEXT,
  status public.operator_status NOT NULL DEFAULT 'available',
  assigned_booking UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- BOOKINGS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number TEXT UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE RESTRICT,
  operator_id UUID REFERENCES public.operators(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  shop_customer_id UUID REFERENCES public.shop_customers(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  number_of_days INT NOT NULL,
  operator_required BOOLEAN NOT NULL DEFAULT false,
  insurance_required BOOLEAN NOT NULL DEFAULT false,
  delivery_address TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  operator_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  insurance_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  transport_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  advance_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  advance_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  advance_refunded NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  rental_type TEXT NOT NULL DEFAULT 'daily',
  custom_rent_amount NUMERIC(12,2),
  booking_status public.booking_status NOT NULL DEFAULT 'pending',
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  id_document_url TEXT,
  handover_photo_url TEXT,
  customer_signature_url TEXT,
  return_document_url TEXT,
  refund_method TEXT,
  collected_at TIMESTAMPTZ,
  collection_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- PAYMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  transaction_id TEXT,
  amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT,
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- MAINTENANCE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  maintenance_type public.maintenance_type NOT NULL,
  vendor TEXT,
  cost NUMERIC(12,2) DEFAULT 0,
  remarks TEXT,
  next_service_date DATE,
  status public.maintenance_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- INVOICES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- REVIEWS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_status BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_branches_owner ON public.branches(owner_id);
CREATE INDEX IF NOT EXISTS idx_equipment_branch ON public.equipment(branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_branch ON public.bookings(branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_shop_customer ON public.bookings(shop_customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_equipment ON public.bookings(equipment_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);

-- ---------------------------------------------------------------------------
-- HELPER FUNCTIONS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- Callable after sign-up if on_auth_user_created trigger did not assign a role.
CREATE OR REPLACE FUNCTION public.bootstrap_app_access()
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _has_admin boolean;
  _user auth.users%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'admin') THEN
    RETURN 'admin'::public.app_role;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO _has_admin;

  IF NOT _has_admin THEN
    SELECT * INTO _user FROM auth.users WHERE id = _uid;

    INSERT INTO public.profiles (
      id, full_name, email, company_name, phone, address, gst_number,
      trial_ends_at, subscription_active, subscription_plan
    )
    VALUES (
      _uid,
      COALESCE(_user.raw_user_meta_data->>'full_name', _user.raw_user_meta_data->>'name', ''),
      COALESCE(_user.email, ''),
      _user.raw_user_meta_data->>'company_name',
      _user.raw_user_meta_data->>'phone',
      _user.raw_user_meta_data->>'address',
      _user.raw_user_meta_data->>'gst_number',
      now() + interval '15 days',
      false,
      'basic'
    )
    ON CONFLICT (id) DO NOTHING;

    DELETE FROM public.user_roles WHERE user_id = _uid;
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin');
    RETURN 'admin'::public.app_role;
  END IF;

  SELECT * INTO _user FROM auth.users WHERE id = _uid;

  INSERT INTO public.profiles (
    id, full_name, email, trial_ends_at, subscription_active, subscription_plan
  )
  VALUES (
    _uid,
    COALESCE(_user.raw_user_meta_data->>'full_name', _user.raw_user_meta_data->>'name', ''),
    COALESCE(_user.email, ''),
    now() + interval '15 days',
    false,
    'basic'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN 'customer'::public.app_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- BOOKING NUMBER
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.booking_number_seq START 1;

CREATE OR REPLACE FUNCTION public.set_booking_number()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.booking_number IS NULL THEN
    NEW.booking_number := 'BK-' || EXTRACT(YEAR FROM now())::TEXT || '-'
      || LPAD(nextval('public.booking_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_set_number ON public.bookings;
CREATE TRIGGER bookings_set_number
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_booking_number();

-- ---------------------------------------------------------------------------
-- BOOKING OVERLAP CHECK
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_booking_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.equipment_id = NEW.equipment_id
      AND b.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND b.booking_status IN ('approved', 'assigned', 'dispatched', 'active')
      AND NEW.start_date <= b.end_date
      AND NEW.end_date >= b.start_date
  ) THEN
    RAISE EXCEPTION 'This equipment is unavailable for the selected period.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_overlap ON public.bookings;
CREATE TRIGGER bookings_overlap
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_booking_overlap();

-- ---------------------------------------------------------------------------
-- INVOICE NUMBER
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION public.set_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'INV-' || EXTRACT(YEAR FROM now())::TEXT || '-'
      || LPAD(nextval('public.invoice_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invoices_set_number ON public.invoices;
CREATE TRIGGER invoices_set_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_invoice_number();

-- ---------------------------------------------------------------------------
-- UPDATED_AT TRIGGERS
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS profiles_updated ON public.profiles;
CREATE TRIGGER profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS equipment_updated ON public.equipment;
CREATE TRIGGER equipment_updated
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS bookings_updated ON public.bookings;
CREATE TRIGGER bookings_updated
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS branches_updated ON public.branches;
CREATE TRIGGER branches_updated
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- NEW USER: profile + first user = admin + 15-day trial
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (
    id, full_name, email, company_name, phone, address, gst_number,
    trial_ends_at, subscription_active, subscription_plan
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'address',
    NEW.raw_user_meta_data->>'gst_number',
    now() + interval '15 days',
    false,
    'basic'
  );

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO _is_first;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE WHEN _is_first THEN 'admin'::public.app_role ELSE 'customer'::public.app_role END
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- WALK-IN BOOKING RPC (Book Now — bypasses RLS safely)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_create_walk_in_shop_customer(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  row_id uuid;
  row_number text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  INSERT INTO public.bookings (
    customer_id,
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  INSERT INTO public.payments (
    booking_id,
    transaction_id,
    amount,
    payment_method,
    payment_status,
    paid_at
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

-- ---------------------------------------------------------------------------
-- GRANTS
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_customers TO authenticated;
GRANT ALL ON public.shop_customers TO service_role;

GRANT SELECT ON public.country_tax_configs TO anon, authenticated;
GRANT ALL ON public.country_tax_configs TO service_role;

GRANT SELECT ON public.equipment_categories TO anon, authenticated;
GRANT ALL ON public.equipment_categories TO service_role;

GRANT SELECT ON public.equipment TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.equipment TO authenticated;
GRANT ALL ON public.equipment TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operators TO authenticated;
GRANT ALL ON public.operators TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_logs TO authenticated;
GRANT ALL ON public.maintenance_logs TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;

GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

GRANT USAGE, SELECT ON SEQUENCE public.booking_number_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.invoice_number_seq TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

GRANT EXECUTE ON FUNCTION public.bootstrap_app_access() TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_create_walk_in_shop_customer(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_walk_in_booking(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_walk_in_payment(jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_tax_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_self_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- user_roles
DROP POLICY IF EXISTS "user_roles_select_self_or_admin" ON public.user_roles;
CREATE POLICY "user_roles_select_self_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- branches
DROP POLICY IF EXISTS "branches_owner_select" ON public.branches;
CREATE POLICY "branches_owner_select" ON public.branches FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "branches_owner_write" ON public.branches;
CREATE POLICY "branches_owner_write" ON public.branches FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- shop_customers
DROP POLICY IF EXISTS "shop_customers_admin" ON public.shop_customers;
CREATE POLICY "shop_customers_admin" ON public.shop_customers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- country_tax_configs
DROP POLICY IF EXISTS "tax_configs_read_all" ON public.country_tax_configs;
CREATE POLICY "tax_configs_read_all" ON public.country_tax_configs FOR SELECT USING (true);

DROP POLICY IF EXISTS "tax_configs_admin_write" ON public.country_tax_configs;
CREATE POLICY "tax_configs_admin_write" ON public.country_tax_configs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- equipment_categories
DROP POLICY IF EXISTS "categories_read_all" ON public.equipment_categories;
CREATE POLICY "categories_read_all" ON public.equipment_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "categories_admin_write" ON public.equipment_categories;
CREATE POLICY "categories_admin_write" ON public.equipment_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- equipment
DROP POLICY IF EXISTS "equipment_read_all" ON public.equipment;
CREATE POLICY "equipment_read_all" ON public.equipment FOR SELECT USING (true);

DROP POLICY IF EXISTS "equipment_admin_write" ON public.equipment;
CREATE POLICY "equipment_admin_write" ON public.equipment FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- operators
DROP POLICY IF EXISTS "operators_admin_all" ON public.operators;
CREATE POLICY "operators_admin_all" ON public.operators FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "operators_read_auth" ON public.operators;
CREATE POLICY "operators_read_auth" ON public.operators FOR SELECT TO authenticated USING (true);

-- bookings
DROP POLICY IF EXISTS "bookings_select_own_or_admin" ON public.bookings;
CREATE POLICY "bookings_select_own_or_admin" ON public.bookings FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "bookings_insert_self" ON public.bookings;
CREATE POLICY "bookings_insert_self" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "bookings_admin_insert" ON public.bookings;
CREATE POLICY "bookings_admin_insert" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "bookings_update_own_or_admin" ON public.bookings;
CREATE POLICY "bookings_update_own_or_admin" ON public.bookings FOR UPDATE TO authenticated
  USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "bookings_admin_update" ON public.bookings;
CREATE POLICY "bookings_admin_update" ON public.bookings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "bookings_delete_admin" ON public.bookings;
CREATE POLICY "bookings_delete_admin" ON public.bookings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- payments
DROP POLICY IF EXISTS "payments_select_own_or_admin" ON public.payments;
CREATE POLICY "payments_select_own_or_admin" ON public.payments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "payments_admin_write" ON public.payments;
CREATE POLICY "payments_admin_write" ON public.payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- maintenance
DROP POLICY IF EXISTS "maintenance_admin_all" ON public.maintenance_logs;
CREATE POLICY "maintenance_admin_all" ON public.maintenance_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- invoices
DROP POLICY IF EXISTS "invoices_select_own_or_admin" ON public.invoices;
CREATE POLICY "invoices_select_own_or_admin" ON public.invoices FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "invoices_admin_write" ON public.invoices;
CREATE POLICY "invoices_admin_write" ON public.invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- reviews
DROP POLICY IF EXISTS "reviews_read_all" ON public.reviews;
CREATE POLICY "reviews_read_all" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "reviews_insert_self" ON public.reviews;
CREATE POLICY "reviews_insert_self" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "reviews_update_own" ON public.reviews;
CREATE POLICY "reviews_update_own" ON public.reviews FOR UPDATE TO authenticated
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "reviews_delete_own_or_admin" ON public.reviews;
CREATE POLICY "reviews_delete_own_or_admin" ON public.reviews FOR DELETE TO authenticated
  USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- notifications
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
CREATE POLICY "notifications_own" ON public.notifications FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- STORAGE (rental document uploads)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- SEED DATA
-- ---------------------------------------------------------------------------
INSERT INTO public.country_tax_configs (country_code, tax_name, tax_rate, tax_id_label, currency_code)
VALUES
  ('IN', 'GST', 0.18, 'GST Number', 'INR'),
  ('US', 'Sales Tax', 0.08, 'Tax ID', 'USD'),
  ('AE', 'VAT', 0.05, 'TRN', 'AED'),
  ('GB', 'VAT', 0.20, 'VAT Number', 'GBP'),
  ('SA', 'VAT', 0.15, 'VAT Number', 'SAR')
ON CONFLICT (country_code) DO NOTHING;

NOTIFY pgrst, 'reload schema';
