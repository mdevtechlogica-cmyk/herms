-- Run once in Supabase SQL Editor for Collect Equipment flow

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS return_document_url TEXT,
  ADD COLUMN IF NOT EXISTS advance_refunded NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_method TEXT,
  ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS collection_notes TEXT;

NOTIFY pgrst, 'reload schema';
