-- ============================================================
-- HERMS: Fix branches table (run ONCE in Supabase SQL Editor)
-- Fixes: owner_id / country_code missing, RLS insert blocked
-- ============================================================

-- 1) Create table if missing
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Main Branch',
  country_code TEXT NOT NULL DEFAULT 'IN',
  address TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Add every column (safe if table already existed without them)
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'IN';
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3) Backfill
UPDATE public.branches SET name = 'Main Branch' WHERE name IS NULL;
UPDATE public.branches SET country_code = 'IN' WHERE country_code IS NULL;
UPDATE public.branches SET is_active = true WHERE is_active IS NULL;

UPDATE public.branches b
SET owner_id = sub.uid
FROM (
  SELECT user_id AS uid FROM public.user_roles WHERE role = 'admin' ORDER BY created_at LIMIT 1
) sub
WHERE b.owner_id IS NULL AND sub.uid IS NOT NULL;

ALTER TABLE public.branches ALTER COLUMN owner_id SET DEFAULT auth.uid();
ALTER TABLE public.branches ALTER COLUMN name SET DEFAULT 'Main Branch';
ALTER TABLE public.branches ALTER COLUMN country_code SET DEFAULT 'IN';

-- 4) Link equipment & bookings
ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- 5) Admin role for all profiles (shop-owner app)
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::public.app_role
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- 6) Permissions + RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'branches'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.branches', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "branches_select" ON public.branches FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "branches_insert" ON public.branches FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "branches_update" ON public.branches FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "branches_delete" ON public.branches FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_branches_owner ON public.branches(owner_id);

-- 7) Refresh PostgREST schema cache (required after adding columns)
NOTIFY pgrst, 'reload schema';

-- If the app still shows "schema cache" errors, wait 1 minute or in Supabase go to:
-- Project Settings → API → Reload schema
