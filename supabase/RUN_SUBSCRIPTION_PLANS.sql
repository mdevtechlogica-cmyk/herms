-- Run once in Supabase SQL Editor for plan limits (basic / intermediate / premium)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'basic';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_plan_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_plan_check
  CHECK (subscription_plan IN ('basic', 'intermediate', 'premium'));

NOTIFY pgrst, 'reload schema';
