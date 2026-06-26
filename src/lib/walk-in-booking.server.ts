import {
  isMissingRpc,
  isMissingSchema,
  isRlsError,
  toErrorMessage,
} from "@/lib/errors";
import type {
  WalkInBookingInput,
  WalkInCustomerInput,
} from "@/lib/walk-in-booking";
import type { PaymentMethod } from "@/lib/types";

const RLS_FIX_HINT =
  "Run supabase/RUN_BOOKINGS_RLS_ONLY.sql in Supabase SQL Editor, then retry.";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbClient = { from: (table: string) => any; rpc: (fn: string, args: unknown) => any };

function buildBookingPayload(input: WalkInBookingInput) {
  const customerNote = `Walk-in customer: ${input.customer_label}`;
  const rentalNote = input.rental_type === "custom"
    ? `Rental: custom (${input.custom_rent_amount ?? 0})`
    : `Rental: ${input.rental_type}`;
  const mergedNotes = [input.notes, customerNote, rentalNote].filter(Boolean).join("\n");

  const core: Record<string, unknown> = {
    equipment_id: input.equipment_id,
    start_date: input.start_date,
    end_date: input.end_date,
    number_of_days: input.number_of_days,
    operator_required: false,
    operator_cost: 0,
    insurance_required: input.insurance_required,
    delivery_address: input.delivery_address,
    subtotal: input.subtotal,
    insurance_cost: input.insurance_cost,
    transport_cost: input.transport_cost,
    tax: input.tax,
    total_amount: input.total_amount,
    booking_status: input.booking_status,
    payment_status: input.payment_status,
    notes: mergedNotes,
  };

  // Walk-in rentals use shop_customers — not the staff user's profile
  if (!input.shop_customer_id) {
    core.customer_id = input.user_id;
  }

  const extended: Record<string, unknown> = {
    ...core,
    shop_customer_id: input.shop_customer_id,
    branch_id: input.branch_id,
    advance_amount: input.advance_amount,
    advance_paid: input.advance_paid,
    payment_method: input.payment_method,
    rental_type: input.rental_type,
    custom_rent_amount: input.custom_rent_amount,
    id_document_url: input.id_document_url,
    handover_photo_url: input.handover_photo_url,
    customer_signature_url: input.customer_signature_url,
  };

  return { core, extended };
}

export async function createWalkInShopCustomerServer(
  db: DbClient,
  input: WalkInCustomerInput,
): Promise<string | null> {
  const rpcPayload = {
    branch_id: input.branch_id ?? "",
    full_name: input.full_name,
    phone: input.phone,
    email: input.email,
    address: input.address,
    id_document_type: input.id_document_type,
    id_document_number: input.id_document_number,
    id_document_url: input.id_document_url ?? "",
  };

  const { data: rpcId, error: rpcError } = await db.rpc(
    "admin_create_walk_in_shop_customer",
    { payload: rpcPayload },
  );
  if (!rpcError && rpcId) return rpcId as string;
  if (rpcError && !isMissingRpc(rpcError)) {
    if (isRlsError(rpcError)) throw new Error(`${toErrorMessage(rpcError)} — ${RLS_FIX_HINT}`);
    if (!isMissingSchema(rpcError)) throw new Error(toErrorMessage(rpcError));
  }

  const { data, error } = await db.from("shop_customers").insert({
    branch_id: input.branch_id,
    full_name: input.full_name,
    phone: input.phone,
    email: input.email || null,
    address: input.address || null,
    id_document_type: input.id_document_type,
    id_document_number: input.id_document_number || null,
    id_document_url: input.id_document_url,
  }).select("id").single();

  if (!error) return data.id as string;
  if (isMissingSchema(error)) return null;
  if (isRlsError(error)) throw new Error(`${toErrorMessage(error)} — ${RLS_FIX_HINT}`);
  throw new Error(toErrorMessage(error));
}

export async function createWalkInBookingServer(
  db: DbClient,
  input: WalkInBookingInput,
): Promise<{ id: string; booking_number: string }> {
  const { core, extended } = buildBookingPayload(input);

  const rpcPayload = Object.fromEntries(
    Object.entries(extended).map(([k, v]) => [k, v ?? ""]),
  );

  const { data: rpcData, error: rpcError } = await db.rpc(
    "admin_create_walk_in_booking",
    { payload: rpcPayload },
  );
  if (!rpcError && rpcData) {
    const row = rpcData as { id: string; booking_number: string };
    const { error: statusError } = await db
      .from("equipment")
      .update({ status: "booked" })
      .eq("id", input.equipment_id);
    if (statusError) {
      console.warn("[Booking] equipment status:", toErrorMessage(statusError));
    }
    return { id: row.id, booking_number: row.booking_number };
  }
  if (rpcError && !isMissingRpc(rpcError)) {
    if (isRlsError(rpcError)) throw new Error(`${toErrorMessage(rpcError)} — ${RLS_FIX_HINT}`);
    if (!isMissingSchema(rpcError)) throw new Error(toErrorMessage(rpcError));
  }

  for (const payload of [core, extended]) {
    const cleaned = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined),
    );
    const { data, error } = await db.from("bookings").insert(cleaned)
      .select("id, booking_number").single();
    if (!error && data) {
      const { error: statusError } = await db
        .from("equipment")
        .update({ status: "booked" })
        .eq("id", input.equipment_id);
      if (statusError) {
        console.warn("[Booking] equipment status:", toErrorMessage(statusError));
      }
      return data as { id: string; booking_number: string };
    }
    if (error && !isMissingSchema(error)) {
      if (isRlsError(error)) throw new Error(`${toErrorMessage(error)} — ${RLS_FIX_HINT}`);
      throw new Error(toErrorMessage(error));
    }
  }

  throw new Error(`Could not save booking. ${RLS_FIX_HINT}`);
}

export async function recordWalkInPaymentServer(
  db: DbClient,
  bookingId: string,
  amount: number,
  paymentMethod: PaymentMethod,
  transactionId?: string,
  bookingUpdate?: {
    advance_paid?: number;
    booking_status?: string;
    payment_status?: string;
  },
): Promise<void> {
  const rpcPayload = {
    booking_id: bookingId,
    transaction_id: transactionId ?? "",
    amount,
    payment_method: paymentMethod,
    payment_status: "paid",
    paid_at: new Date().toISOString(),
    advance_paid: bookingUpdate?.advance_paid,
    booking_status: bookingUpdate?.booking_status,
    booking_status_payment: bookingUpdate?.payment_status,
  };

  const { error: rpcError } = await db.rpc("admin_record_walk_in_payment", {
    payload: rpcPayload,
  });
  if (!rpcError) return;
  if (!isMissingRpc(rpcError) && !isMissingSchema(rpcError)) {
    if (isRlsError(rpcError)) throw new Error(`${toErrorMessage(rpcError)} — ${RLS_FIX_HINT}`);
    throw new Error(toErrorMessage(rpcError));
  }

  const { error: paymentError } = await db.from("payments").insert({
    booking_id: bookingId,
    transaction_id: transactionId ?? null,
    amount,
    payment_method: paymentMethod,
    payment_status: "paid",
    paid_at: new Date().toISOString(),
  });
  if (paymentError && !isMissingSchema(paymentError)) {
    if (isRlsError(paymentError)) throw new Error(`${toErrorMessage(paymentError)} — ${RLS_FIX_HINT}`);
    throw new Error(toErrorMessage(paymentError));
  }

  if (bookingUpdate) {
    const { error: bookingError } = await db.from("bookings").update({
      advance_paid: bookingUpdate.advance_paid,
      booking_status: bookingUpdate.booking_status,
      payment_status: bookingUpdate.payment_status,
    }).eq("id", bookingId);
    if (bookingError && !isMissingSchema(bookingError)) {
      if (isRlsError(bookingError)) throw new Error(`${toErrorMessage(bookingError)} — ${RLS_FIX_HINT}`);
      throw new Error(toErrorMessage(bookingError));
    }
  }
}
