-- Shop staff roles: admin (owner) + employee. Walk-in customers are NOT app users.
-- Run in Supabase SQL Editor after RUN_AUTH_FIX.sql (or on fresh install).

DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'employee';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.is_shop_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin', 'employee')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_shop_staff(uuid) TO authenticated, service_role;

-- Self-service signup = shop owner (admin). Employees are invited separately.
CREATE OR REPLACE FUNCTION public.bootstrap_app_access()
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _user auth.users%ROWTYPE;
  _role public.app_role;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO _role
  FROM public.user_roles
  WHERE user_id = _uid AND role::text IN ('admin', 'employee')
  ORDER BY CASE role::text WHEN 'admin' THEN 0 ELSE 1 END
  LIMIT 1;

  IF FOUND THEN
    RETURN _role;
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

  DELETE FROM public.user_roles WHERE user_id = _uid;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin');
  RETURN 'admin'::public.app_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'herms_invited_role', '') = 'employee' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (
    id, full_name, email, trial_ends_at, subscription_active, subscription_plan
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    now() + interval '15 days',
    false,
    'basic'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Staff can use shop data (same as admin for operations)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'shop_customers', 'equipment', 'equipment_categories', 'bookings',
        'payments', 'maintenance_logs', 'invoices', 'operators', 'country_tax_configs'
      )
      AND qual LIKE '%has_role(auth.uid(), ''admin'')%'
  LOOP
    EXECUTE format(
      'ALTER POLICY %I ON %I.%I USING (public.is_shop_staff(auth.uid()))',
      pol.policyname, pol.schemaname, pol.tablename
    );
  END LOOP;
END $$;

-- Branches: staff read; only admin writes
DROP POLICY IF EXISTS "branches_staff_select" ON public.branches;
CREATE POLICY "branches_staff_select" ON public.branches FOR SELECT TO authenticated
  USING (public.is_shop_staff(auth.uid()));

DROP POLICY IF EXISTS "branches_owner_select" ON public.branches;
DROP POLICY IF EXISTS "branches_owner_write" ON public.branches;

CREATE POLICY "branches_admin_write" ON public.branches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles: staff see own; admin sees all
DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_self_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- user_roles: admin lists team; everyone sees own row
DROP POLICY IF EXISTS "user_roles_select_self_or_admin" ON public.user_roles;
CREATE POLICY "user_roles_select_self_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

GRANT EXECUTE ON FUNCTION public.bootstrap_app_access() TO authenticated;
