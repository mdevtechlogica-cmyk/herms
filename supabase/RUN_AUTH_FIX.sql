-- HERMS auth fix: owner role for sign-up / Google sign-in
-- Run once in Supabase SQL Editor (project mttidtnsccvedjajjgmz)

-- 1) Bootstrap RPC (called by the app after sign-in)
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

GRANT EXECUTE ON FUNCTION public.bootstrap_app_access() TO authenticated;

-- 2) Auto-assign owner on new sign-up
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
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO _is_first;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE WHEN _is_first THEN 'admin'::public.app_role ELSE 'customer'::public.app_role END
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Fix EXISTING registered users (no owner yet → make all of them owner)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.profiles (id, full_name, email, trial_ends_at, subscription_active, subscription_plan)
    SELECT
      u.id,
      COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
      COALESCE(u.email, ''),
      now() + interval '15 days',
      false,
      'basic'
    FROM auth.users u
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    SELECT u.id, 'admin'::public.app_role
    FROM auth.users u
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
