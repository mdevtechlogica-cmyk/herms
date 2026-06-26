-- Run once in Supabase SQL Editor for country & language on profiles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'IN';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_preferred_language_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_preferred_language_check
  CHECK (preferred_language IN ('en', 'hi', 'ar'));

NOTIFY pgrst, 'reload schema';
