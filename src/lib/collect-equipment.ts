import { updateEquipmentStatus } from "@/lib/equipment-status";
import { isMissingSchema, toErrorMessage } from "@/lib/errors";
import type { BookingStatus, PaymentMethod } from "@/lib/types";

export const COLLECTIBLE_STATUSES: BookingStatus[] = ["assigned", "dispatched", "active"];

export function canCollectBooking(status: BookingStatus): boolean {
  return COLLECTIBLE_STATUSES.includes(status);
}

export interface CollectEquipmentInput {
  bookingId: string;
  returnDocumentUrl: string;
  advanceRefunded: number;
  refundMethod: PaymentMethod | string | null;
  notes?: string | null;
}

export async function completeEquipmentCollection(input: CollectEquipmentInput): Promise<void> {
  const { data: booking, error: fetchError } = await db
    .from("bookings")
    .select("id, equipment_id, advance_paid, total_amount, booking_status")
    .eq("id", input.bookingId)
    .maybeSingle();

  if (fetchError) throw new Error(toErrorMessage(fetchError));
  if (!booking) throw new Error("Booking not found");

  const refund = Math.max(0, Math.min(input.advanceRefunded, Number(booking.advance_paid) || 0));

  const fullPatch = {
    booking_status: "returned" as const,
    return_document_url: input.returnDocumentUrl,
    advance_refunded: refund,
    refund_method: input.refundMethod,
    collected_at: new Date().toISOString(),
    collection_notes: input.notes?.trim() || null,
    payment_status: refund >= Number(booking.advance_paid) && Number(booking.total_amount) <= Number(booking.advance_paid)
      ? "paid"
      : undefined,
  };

  const corePatch = { booking_status: "returned" as const };

  let updateError = (
    await db.from("bookings").update(fullPatch).eq("id", input.bookingId)
  ).error;

  if (updateError && isMissingSchema(updateError)) {
    updateError = (await db.from("bookings").update(corePatch).eq("id", input.bookingId)).error;
  }

  if (updateError) throw new Error(toErrorMessage(updateError));

  if (booking.equipment_id) {
    try {
      await updateEquipmentStatus(booking.equipment_id, "available");
    } catch (equipError) {
      console.warn("[Collect] equipment status:", toErrorMessage(equipError));
    }
  }

  if (refund > 0) {
    const { error: payError } = await db.from("payments").insert({
      booking_id: input.bookingId,
      amount: refund,
      payment_method: input.refundMethod ?? "cash",
      payment_status: "refunded",
      paid_at: new Date().toISOString(),
      transaction_id: `refund-${Date.now()}`,
    });
    if (payError && !isMissingSchema(payError)) {
      console.warn("[Collect] refund record:", toErrorMessage(payError));
    }
  }
}
