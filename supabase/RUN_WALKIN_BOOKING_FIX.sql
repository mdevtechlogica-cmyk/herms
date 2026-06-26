-- Fix Book Now → Razorpay: walk-in bookings must not require profiles.customer_id
-- Run once in Supabase SQL Editor (project mttidtnsccvedjajjgmz)
-- Or: npm run apply:walkin-fix

-- Walk-in customers live in shop_customers — customer_id can be null
ALTER TABLE public.bookings ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_customer_or_shop_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_customer_or_shop_check
  CHECK (customer_id IS NOT NULL OR shop_customer_id IS NOT NULL);

-- Backfill missing profiles for staff (Google sign-in without trigger)
INSERT INTO public.profiles (
  id, full_name, email, trial_ends_at, subscription_active, subscription_plan
)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
  COALESCE(u.email, ''),
  now() + interval '15 days',
  false,
  'basic'
FROM auth.users u
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = u.id AND ur.role::text IN ('admin', 'employee')
)
AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_create_walk_in_booking(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_id uuid;
  row_number text;
  shop_id uuid := NULLIF(payload->>'shop_customer_id', '')::uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'employee')
  ) THEN
    RAISE EXCEPTION 'Forbidden: staff only';
  END IF;

  INSERT INTO public.bookings (
    customer_id,
    equipment_id,
    start_date,
    end_date,
    number_of_days,
    operator_required,
    operator_cost,
    insurance_required,
    delivery_address,
    subtotal,
    insurance_cost,
    transport_cost,
    tax,
    total_amount,
    booking_status,
    payment_status,
    notes,
    shop_customer_id,
    branch_id,
    advance_amount,
    advance_paid,
    payment_method,
    rental_type,
    custom_rent_amount,
    id_document_url,
    handover_photo_url,
    customer_signature_url
  ) VALUES (
    CASE WHEN shop_id IS NOT NULL THEN NULL ELSE auth.uid() END,
    (payload->>'equipment_id')::uuid,
    (payload->>'start_date')::date,
    (payload->>'end_date')::date,
    (payload->>'number_of_days')::integer,
    COALESCE((payload->>'operator_required')::boolean, false),
    COALESCE((payload->>'operator_cost')::numeric, 0),
    COALESCE((payload->>'insurance_required')::boolean, false),
    NULLIF(payload->>'delivery_address', ''),
    COALESCE((payload->>'subtotal')::numeric, 0),
    COALESCE((payload->>'insurance_cost')::numeric, 0),
    COALESCE((payload->>'transport_cost')::numeric, 0),
    COALESCE((payload->>'tax')::numeric, 0),
    COALESCE((payload->>'total_amount')::numeric, 0),
    COALESCE((payload->>'booking_status')::public.booking_status, 'pending'),
    COALESCE((payload->>'payment_status')::public.payment_status, 'pending'),
    NULLIF(payload->>'notes', ''),
    shop_id,
    NULLIF(payload->>'branch_id', '')::uuid,
    COALESCE((payload->>'advance_amount')::numeric, 0),
    COALESCE((payload->>'advance_paid')::numeric, 0),
    NULLIF(payload->>'payment_method', ''),
    COALESCE(payload->>'rental_type', 'daily'),
    NULLIF(payload->>'custom_rent_amount', '')::numeric,
    NULLIF(payload->>'id_document_url', ''),
    NULLIF(payload->>'handover_photo_url', ''),
    NULLIF(payload->>'customer_signature_url', '')
  )
  RETURNING id, booking_number INTO row_id, row_number;

  RETURN jsonb_build_object('id', row_id, 'booking_number', row_number);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_walk_in_booking(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
