-- Run once in Supabase SQL Editor: plans + 15-day trial + subscription gate

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'basic';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_active BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_plan_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_plan_check
  CHECK (subscription_plan IS NULL OR subscription_plan IN ('basic', 'intermediate', 'premium'));

UPDATE public.profiles
SET subscription_plan = 'basic'
WHERE subscription_plan IS NULL;

UPDATE public.profiles
SET trial_ends_at = created_at + interval '15 days'
WHERE trial_ends_at IS NULL;

-- Existing users: keep access (already using the app)
UPDATE public.profiles
SET subscription_active = true
WHERE subscription_active = false;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  );
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO _is_first;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN _is_first THEN 'admin'::public.app_role ELSE 'customer'::public.app_role END);
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
