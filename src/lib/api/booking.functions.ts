import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getBookingDbOrThrow } from "@/lib/booking-db.server";
import { assertStaffFromRequest } from "@/lib/server-auth";
import { emailOptionalSchema } from "@/lib/contact-validators";
import {
  createWalkInBookingServer,
  createWalkInShopCustomerServer,
  recordWalkInPaymentServer,
} from "@/lib/walk-in-booking.server";

const customerInput = z.object({
  branch_id: z.string().uuid().nullable(),
  full_name: z.string().trim().min(1),
  phone: z.string().regex(/^\+\d{7,15}$/, "Enter a valid phone number with country code"),
  email: emailOptionalSchema,
  address: z.string(),
  id_document_type: z.string(),
  id_document_number: z.string(),
  id_document_url: z.string().nullable(),
});

const bookingInput = z.object({
  shop_customer_id: z.string().uuid().nullable(),
  equipment_id: z.string().uuid(),
  branch_id: z.string().uuid().nullable(),
  start_date: z.string(),
  end_date: z.string(),
  number_of_days: z.number().int().positive(),
  insurance_required: z.boolean(),
  delivery_address: z.string().nullable(),
  subtotal: z.number(),
  insurance_cost: z.number(),
  transport_cost: z.number(),
  tax: z.number(),
  total_amount: z.number(),
  advance_amount: z.number(),
  advance_paid: z.number(),
  payment_method: z.enum(["upi", "card", "cash", "bank_transfer"]),
  booking_status: z.string(),
  payment_status: z.string(),
  rental_type: z.enum(["daily", "monthly", "custom"]),
  custom_rent_amount: z.number().nullable(),
  notes: z.string().nullable(),
  id_document_url: z.string().nullable(),
  handover_photo_url: z.string().nullable(),
  customer_signature_url: z.string().nullable(),
  customer_label: z.string(),
});

const paymentInput = z.object({
  booking_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_method: z.enum(["upi", "card", "cash", "bank_transfer"]),
  transaction_id: z.string().optional(),
  advance_paid: z.number().optional(),
  booking_status: z.string().optional(),
  payment_status: z.string().optional(),
});

export const createWalkInShopCustomerFn = createServerFn({ method: "POST" })
  .validator(customerInput)
  .handler(async ({ data }) => {
    await assertStaffFromRequest();
    const db = getBookingDbOrThrow();
    const id = await createWalkInShopCustomerServer(db, data);
    return { id };
  });

export const createWalkInBookingFn = createServerFn({ method: "POST" })
  .validator(bookingInput)
  .handler(async ({ data }) => {
    const { userId } = await assertStaffFromRequest();
    const db = getBookingDbOrThrow();
    const booking = await createWalkInBookingServer(db, {
      ...data,
      user_id: userId,
    });
    return booking;
  });

export const recordWalkInPaymentFn = createServerFn({ method: "POST" })
  .validator(paymentInput)
  .handler(async ({ data }) => {
    await assertStaffFromRequest();
    const db = getBookingDbOrThrow();
    await recordWalkInPaymentServer(
      db,
      data.booking_id,
      data.amount,
      data.payment_method,
      data.transaction_id,
      {
        advance_paid: data.advance_paid,
        booking_status: data.booking_status,
        payment_status: data.payment_status,
      },
    );
    return { ok: true as const };
  });
