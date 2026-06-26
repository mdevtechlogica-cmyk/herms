-- Quick fix: missing phone / address / country_code / owner_id on branches
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'IN';
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.branches ALTER COLUMN owner_id SET DEFAULT auth.uid();
NOTIFY pgrst, 'reload schema';
