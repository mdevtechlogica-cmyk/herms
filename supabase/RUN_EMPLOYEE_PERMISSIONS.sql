-- Employee access permissions (run once in Supabase SQL Editor)
-- npm run apply:employee-permissions

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

NOTIFY pgrst, 'reload schema';
