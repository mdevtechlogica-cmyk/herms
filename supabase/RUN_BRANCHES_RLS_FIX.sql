-- Fix: "new row violates row-level security policy" on branches
-- Run once in Supabase SQL Editor

-- Remove all existing branch policies (avoids conflicts from partial migrations)
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'branches'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.branches', pol.policyname);
  END LOOP;
END $$;

-- Auto-set owner from logged-in user when omitted
ALTER TABLE public.branches
  ALTER COLUMN owner_id SET DEFAULT auth.uid();

-- Ensure admin role exists for shop owners (safe if already assigned)
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::public.app_role
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.id AND ur.role = 'admin'
)
ON CONFLICT (user_id, role) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Read own branches (or all if admin)
CREATE POLICY "branches_select" ON public.branches
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- Insert: must be owner of the new row (matches auth.uid())
CREATE POLICY "branches_insert" ON public.branches
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "branches_update" ON public.branches
  FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "branches_delete" ON public.branches
  FOR DELETE TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

NOTIFY pgrst, 'reload schema';
