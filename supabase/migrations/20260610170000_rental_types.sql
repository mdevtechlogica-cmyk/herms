ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS rental_type TEXT NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS custom_rent_amount NUMERIC(12,2);
