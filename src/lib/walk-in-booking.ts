import { db, supabase } from "@/lib/db";
import { BOOKING_SERVICE_ROLE_HINT } from "@/lib/booking-db.server";
import { isMissingRpc, isRlsError, toErrorMessage } from "@/lib/errors";
import {
  createWalkInBookingFn,
  createWalkInShopCustomerFn,
  recordWalkInPaymentFn,
} from "@/lib/api/booking.functions";
import {
  createWalkInBookingServer,
  createWalkInShopCustomerServer,
  recordWalkInPaymentServer,
} from "@/lib/walk-in-booking.server";
import type { PaymentMethod, RentalType } from "@/lib/types";

export interface WalkInCustomerInput {
  branch_id: string | null;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  id_document_type: string;
  id_document_number: string;
  id_document_url: string | null;
}

export interface WalkInBookingInput {
  user_id: string;
  shop_customer_id: string | null;
  equipment_id: string;
  branch_id: string | null;
  start_date: string;
  end_date: string;
  number_of_days: number;
  insurance_required: boolean;
  delivery_address: string | null;
  subtotal: number;
  insurance_cost: number;
  transport_cost: number;
  tax: number;
  total_amount: number;
  advance_amount: number;
  advance_paid: number;
  payment_method: PaymentMethod;
  booking_status: string;
  payment_status: string;
  rental_type: RentalType;
  custom_rent_amount: number | null;
  notes: string | null;
  id_document_url: string | null;
  handover_photo_url: string | null;
  customer_signature_url: string | null;
  customer_label: string;
}

const SQL_FIX =
  "Run supabase/RUN_BOOKINGS_RLS_ONLY.sql in Supabase SQL Editor (https://supabase.com/dashboard/project/nafiagoakklihweizces/sql), then retry.";

function isMissingServiceRole(err: unknown): boolean {
  return toErrorMessage(err).includes("SUPABASE_SERVICE_ROLE_KEY");
}

async function sessionUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sign in again and retry.");
  return data.user.id;
}

function shouldTryClientFallback(err: unknown): boolean {
  return isMissingServiceRole(err) || isRlsError(err) || isMissingRpc(err);
}

async function withServerThenClient<T>(
  serverFn: () => Promise<T>,
  clientFn: () => Promise<T>,
): Promise<T> {
  try {
    return await serverFn();
  } catch (serverErr) {
    if (!shouldTryClientFallback(serverErr)) throw serverErr;
  }

  try {
    return await clientFn();
  } catch (clientErr) {
    const base = toErrorMessage(clientErr);
    if (isRlsError(clientErr)) {
      throw new Error(
        `${base} — Fix: (A) run npm run setup:book-now on your PC and restart npm run dev, OR (B) ${SQL_FIX}`,
      );
    }
    throw clientErr;
  }
}

export async function createWalkInShopCustomer(
  input: WalkInCustomerInput,
): Promise<string | null> {
  return withServerThenClient(
    async () => {
      const result = await createWalkInShopCustomerFn({ data: input });
      return result.id;
    },
    () => createWalkInShopCustomerServer(db, input),
  );
}

export async function createWalkInBooking(
  input: WalkInBookingInput,
): Promise<{ id: string; booking_number: string }> {
  const uid = await sessionUserId();
  const withSession = { ...input, user_id: uid };
  const { user_id: _userId, ...bookingData } = withSession;
  return withServerThenClient(
    () => createWalkInBookingFn({ data: bookingData }),
    () => createWalkInBookingServer(db, withSession),
  );
}

export async function recordWalkInPayment(
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
  await withServerThenClient(
    () => recordWalkInPaymentFn({
      data: {
        booking_id: bookingId,
        amount,
        payment_method: paymentMethod,
        transaction_id: transactionId,
        advance_paid: bookingUpdate?.advance_paid,
        booking_status: bookingUpdate?.booking_status,
        payment_status: bookingUpdate?.payment_status,
      },
    }).then(() => undefined),
    () => recordWalkInPaymentServer(
      db,
      bookingId,
      amount,
      paymentMethod,
      transactionId,
      bookingUpdate,
    ),
  );
}

export { BOOKING_SERVICE_ROLE_HINT };
