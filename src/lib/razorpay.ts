import { isNativeApp } from "@/lib/native";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayMethodFlags {
  upi?: boolean;
  card?: boolean;
  netbanking?: boolean;
  wallet?: boolean;
  emi?: boolean;
  paylater?: boolean;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  /** Pre-select tab when contact + email are prefilled. */
  method?: string | RazorpayMethodFlags;
  /** Required for UPI / GPay inside Android & iOS WebViews (Capacitor). */
  webview_intent?: boolean;
  handler: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (response?: { error?: { description?: string } }) => void) => void;
}

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

/** Razorpay expects E.164, e.g. +919876543210 */
function formatRazorpayContact(phone?: string): string | undefined {
  if (!phone?.trim()) return undefined;
  const compact = phone.replace(/\s/g, "");
  if (compact.startsWith("+")) return compact;
  const digits = compact.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return compact;
}

function buildMethodFlags(paymentMethod: "upi" | "card"): RazorpayMethodFlags {
  if (paymentMethod === "upi") {
    return { upi: true, card: false, netbanking: false, wallet: false, emi: false, paylater: false };
  }
  return { upi: false, card: true, netbanking: true, wallet: false, emi: false, paylater: false };
}

function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(opts: {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  paymentMethod: "upi" | "card";
  onSuccess: (paymentId: string, orderId: string, signature: string) => void;
  onDismiss?: () => void;
  onFailure?: (message: string) => void;
}): Promise<void> {
  await loadScript();
  if (!window.Razorpay) throw new Error("Razorpay unavailable");

  const prefill = {
    name: opts.customerName,
    contact: formatRazorpayContact(opts.customerPhone),
    email: opts.customerEmail,
  };

  const rzp = new window.Razorpay({
    key: opts.keyId,
    amount: opts.amount,
    currency: opts.currency,
    name: opts.name,
    description: opts.description,
    order_id: opts.orderId,
    prefill,
    theme: { color: "#0c2340" },
    // UPI / GPay do not appear in Capacitor WebView unless this flag is set.
    ...(isNativeApp ? { webview_intent: true } : {}),
    method: buildMethodFlags(opts.paymentMethod),
    handler: (res) => opts.onSuccess(
      res.razorpay_payment_id,
      res.razorpay_order_id,
      res.razorpay_signature,
    ),
    modal: { ondismiss: opts.onDismiss },
  });
  rzp.on("payment.failed", (response) => {
    const message = response?.error?.description ?? "Payment failed. Please try again.";
    opts.onFailure?.(message);
  });
  rzp.open();
}
