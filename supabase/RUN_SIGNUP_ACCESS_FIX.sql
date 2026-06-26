-- HERMS: let every new self-service signup become a shop owner (admin).
-- Run once in Supabase SQL Editor if sign-in says "one-time database setup".
-- Safe to re-run.

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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

GRANT EXECUTE ON FUNCTION public.bootstrap_app_access() TO authenticated;

-- Promote existing signups that were stuck as customer / no role
INSERT INTO public.profiles (id, full_name, email, trial_ends_at, subscription_active, subscription_plan)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
  COALESCE(u.email, ''),
  now() + interval '15 days',
  false,
  'basic'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = u.id AND ur.role::text IN ('admin', 'employee')
)
ON CONFLICT (user_id, role) DO NOTHING;
