
-- Regional preferences on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en';

-- Country-based tax & currency (admin-managed, overrides app defaults)
CREATE TABLE IF NOT EXISTS public.country_tax_configs (
  country_code TEXT PRIMARY KEY,
  tax_name TEXT NOT NULL,
  tax_rate NUMERIC(6,4) NOT NULL CHECK (tax_rate >= 0 AND tax_rate <= 1),
  tax_id_label TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.country_tax_configs TO anon, authenticated;
GRANT ALL ON public.country_tax_configs TO service_role;
ALTER TABLE public.country_tax_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tax_configs_read_all" ON public.country_tax_configs
  FOR SELECT USING (true);

CREATE POLICY "tax_configs_admin_write" ON public.country_tax_configs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.country_tax_configs (country_code, tax_name, tax_rate, tax_id_label, currency_code)
VALUES
  ('IN', 'GST', 0.18, 'GST Number', 'INR'),
  ('US', 'Sales Tax', 0.08, 'Tax ID', 'USD'),
  ('AE', 'VAT', 0.05, 'TRN', 'AED'),
  ('GB', 'VAT', 0.20, 'VAT Number', 'GBP'),
  ('SA', 'VAT', 0.15, 'VAT Number', 'SAR')
ON CONFLICT (country_code) DO NOTHING;
