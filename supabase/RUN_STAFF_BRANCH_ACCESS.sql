-- Let employees read admin-created branches (for workspace + equipment by branch)
-- Run once in Supabase SQL Editor: npm run apply:staff-branches

-- Ensure is_shop_staff exists (from RUN_STAFF_ROLES.sql)
CREATE OR REPLACE FUNCTION public.is_shop_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin', 'employee')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_shop_staff(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "branches_select" ON public.branches;
CREATE POLICY "branches_select" ON public.branches
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_shop_staff(auth.uid())
  );

NOTIFY pgrst, 'reload schema';
