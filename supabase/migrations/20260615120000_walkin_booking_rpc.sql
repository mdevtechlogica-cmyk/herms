-- Admin RPC helpers for walk-in bookings (bypass RLS safely after role check)

DROP POLICY IF EXISTS "bookings_admin_insert" ON public.bookings;
CREATE POLICY "bookings_admin_insert" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "bookings_admin_update" ON public.bookings;
CREATE POLICY "bookings_admin_update" ON public.bookings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_create_walk_in_shop_customer(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  INSERT INTO public.shop_customers (
    branch_id, full_name, phone, email, address,
    id_document_type, id_document_number, id_document_url
  ) VALUES (
    NULLIF(payload->>'branch_id', '')::uuid,
    payload->>'full_name',
    NULLIF(payload->>'phone', ''),
    NULLIF(payload->>'email', ''),
    NULLIF(payload->>'address', ''),
    NULLIF(payload->>'id_document_type', ''),
    NULLIF(payload->>'id_document_number', ''),
    NULLIF(payload->>'id_document_url', '')
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_walk_in_booking(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_id uuid;
  row_number text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
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
    CASE WHEN NULLIF(payload->>'shop_customer_id', '')::uuid IS NOT NULL THEN NULL ELSE auth.uid() END,
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
    NULLIF(payload->>'shop_customer_id', '')::uuid,
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

CREATE OR REPLACE FUNCTION public.admin_record_walk_in_payment(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  INSERT INTO public.payments (
    booking_id,
    transaction_id,
    amount,
    payment_method,
    payment_status,
    paid_at
  ) VALUES (
    (payload->>'booking_id')::uuid,
    NULLIF(payload->>'transaction_id', ''),
    (payload->>'amount')::numeric,
    payload->>'payment_method',
    COALESCE((payload->>'payment_status')::public.payment_status, 'paid'),
    COALESCE((payload->>'paid_at')::timestamptz, now())
  );

  IF payload ? 'advance_paid' OR payload ? 'booking_status' OR payload ? 'booking_status_payment' THEN
    UPDATE public.bookings
    SET
      advance_paid = COALESCE((payload->>'advance_paid')::numeric, advance_paid),
      booking_status = COALESCE(
        NULLIF(payload->>'booking_status', '')::public.booking_status,
        booking_status
      ),
      payment_status = COALESCE(
        NULLIF(payload->>'booking_status_payment', '')::public.payment_status,
        payment_status
      )
    WHERE id = (payload->>'booking_id')::uuid;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_walk_in_shop_customer(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_walk_in_booking(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_walk_in_payment(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
