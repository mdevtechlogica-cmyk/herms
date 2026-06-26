-- Team + employee invite setup (run once in Supabase SQL Editor)
-- npm run apply:invite-employee

-- 1) Permissions table
CREATE TABLE IF NOT EXISTS public.employee_permissions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_permissions_self_read" ON public.employee_permissions;
CREATE POLICY "employee_permissions_self_read" ON public.employee_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "employee_permissions_admin_write" ON public.employee_permissions;
CREATE POLICY "employee_permissions_admin_write" ON public.employee_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_permissions TO authenticated;

-- 2) RPC: register new employee after auth sign-up
CREATE OR REPLACE FUNCTION public.admin_register_employee(
  target_user_id uuid,
  p_full_name text,
  p_email text,
  p_permissions text[] DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid user id';
  END IF;

  INSERT INTO public.profiles (
    id, full_name, email, trial_ends_at, subscription_active, subscription_plan
  )
  VALUES (
    target_user_id,
    COALESCE(NULLIF(trim(p_full_name), ''), 'Employee'),
    NULLIF(trim(p_email), ''),
    now() + interval '15 days',
    false,
    'basic'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;

  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, 'employee');

  INSERT INTO public.employee_permissions (user_id, permissions, updated_at)
  VALUES (target_user_id, COALESCE(p_permissions, ARRAY[]::text[]), now())
  ON CONFLICT (user_id) DO UPDATE SET
    permissions = EXCLUDED.permissions,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_register_employee(uuid, text, text, text[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
