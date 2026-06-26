import crypto from "node:crypto";
import process from "node:process";

export function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim().replace(/^["']|["']$/g, "");
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim().replace(/^["']|["']$/g, "");
  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay keys not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env",
    );
  }
  if (!keyId.startsWith("rzp_test_") && !keyId.startsWith("rzp_live_")) {
    throw new Error(
      "RAZORPAY_KEY_ID must start with rzp_test_ (test mode) or rzp_live_ (live mode).",
    );
  }
  return { keyId, keySecret };
}

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const { keySecret } = getRazorpayCredentials();
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

export async function createRazorpayOrderRequest(input: {
  amount: number;
  currency: string;
  referenceId: string;
  receipt?: string;
  purpose?: "booking" | "subscription";
}) {
  const { keyId, keySecret } = getRazorpayCredentials();
  const amountPaise = Math.round(input.amount * 100);
  if (amountPaise < 100) {
    throw new Error("Minimum online payment is ₹1");
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const receipt = (input.receipt ?? `${input.purpose ?? "order"}_${input.referenceId}`).slice(0, 40);

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: input.currency,
      receipt,
      notes: {
        reference_id: input.referenceId,
        purpose: input.purpose ?? "booking",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 401) {
      throw new Error(
        "Razorpay authentication failed (401). Key ID and Key Secret must be a matching pair from the same Razorpay dashboard row. Run: npm run setup:razorpay",
      );
    }
    throw new Error(`Razorpay order failed (${res.status}): ${err}`);
  }

  const order = (await res.json()) as { id: string; amount: number; currency: string };
  return { orderId: order.id, amount: order.amount, currency: order.currency, keyId };
}
