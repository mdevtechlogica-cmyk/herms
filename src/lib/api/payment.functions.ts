import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  createRazorpayOrderRequest,
  verifyRazorpaySignature,
} from "@/lib/razorpay.server";

const orderInput = z.object({
  amount: z.number().positive(),
  currency: z.string().default("INR"),
  referenceId: z.string().uuid(),
  receipt: z.string().optional(),
  purpose: z.enum(["booking", "subscription"]).default("booking"),
});

const verifyInput = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
  referenceId: z.string().uuid(),
  amount: z.number().positive(),
});

export const createRazorpayOrder = createServerFn({ method: "POST" })
  .validator(orderInput)
  .handler(async ({ data }) => {
    try {
      return await createRazorpayOrderRequest(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create payment order";
      if (message.includes("not configured") || message.toLowerCase().includes("unauthorized")) {
        throw new Error(message);
      }
      if (message.includes("401") || message.toLowerCase().includes("authentication")) {
        throw new Error("Razorpay authentication failed. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
      }
      throw new Error(message);
    }
  });

export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .validator(verifyInput)
  .handler(async ({ data }) => {
    if (!data.orderId || !data.paymentId || !data.signature) {
      throw new Error("Missing payment verification fields.");
    }
    const valid = verifyRazorpaySignature(data.orderId, data.paymentId, data.signature);
    if (!valid) {
      throw new Error("Payment verification failed. Signature mismatch — payment was not confirmed.");
    }
    return { verified: true as const, paymentId: data.paymentId, orderId: data.orderId };
  });
