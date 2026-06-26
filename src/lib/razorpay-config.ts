import type { CountryCode } from "@/lib/locale/countries";
import { getSubscriptionMonthlyPrice, type SubscriptionPlan } from "@/lib/plans";

/** Indian Razorpay merchant accounts settle in INR. */
export const RAZORPAY_CURRENCY = "INR";

export function isRazorpayOnlineSupported(country: CountryCode): boolean {
  return country === "IN";
}

/** Amount sent to Razorpay Orders API (INR, India plan price). */
export function getRazorpaySubscriptionAmount(plan: SubscriptionPlan): number {
  return getSubscriptionMonthlyPrice("IN", plan);
}
