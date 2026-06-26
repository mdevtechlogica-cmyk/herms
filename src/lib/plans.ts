import { fetchBranchesForOwner } from "@/lib/branches";
import { db } from "@/lib/db";
import type { CountryCode } from "@/lib/locale/countries";

export type SubscriptionPlan = "basic" | "intermediate" | "premium";

export const TRIAL_DAYS = 15;

export interface PlanLimits {
  branches: number;
  equipment: number;
  label: string;
  description: string;
}

/** Monthly subscription price in local currency (affordable SMB tiers). */
export const SUBSCRIPTION_MONTHLY_PRICE: Record<
  CountryCode,
  Record<SubscriptionPlan, number>
> = {
  IN: { basic: 499, intermediate: 1299, premium: 2499 },
  US: { basic: 15, intermediate: 39, premium: 79 },
  AE: { basic: 55, intermediate: 145, premium: 289 },
  GB: { basic: 12, intermediate: 32, premium: 65 },
  SA: { basic: 55, intermediate: 145, premium: 289 },
  EU: { basic: 15, intermediate: 39, premium: 79 },
  AU: { basic: 20, intermediate: 55, premium: 110 },
  CA: { basic: 20, intermediate: 50, premium: 100 },
  SG: { basic: 20, intermediate: 55, premium: 110 },
};

export function getSubscriptionMonthlyPrice(
  country: CountryCode,
  plan: SubscriptionPlan,
): number {
  return SUBSCRIPTION_MONTHLY_PRICE[country][plan];
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  basic: {
    branches: 1,
    equipment: 30,
    label: "Basic",
    description: "1 branch · up to 30 equipment",
  },
  intermediate: {
    branches: 5,
    equipment: 100,
    label: "Intermediate",
    description: "5 branches · up to 100 equipment",
  },
  premium: {
    branches: Number.POSITIVE_INFINITY,
    equipment: Number.POSITIVE_INFINITY,
    label: "Premium",
    description: "Unlimited branches & equipment",
  },
};

export function isSubscriptionPlan(value: string): value is SubscriptionPlan {
  return value === "basic" || value === "intermediate" || value === "premium";
}

export function normalizePlan(value: string | null | undefined): SubscriptionPlan {
  if (value && isSubscriptionPlan(value)) return value;
  return "basic";
}

const PLAN_STORAGE_PREFIX = "herms_subscription_plan:";
const TRIAL_ENDS_PREFIX = "herms_trial_ends_at:";
const SUBSCRIPTION_ACTIVE_PREFIX = "herms_subscription_active:";

export function readStoredPlan(userId: string): SubscriptionPlan | null {
  try {
    const raw = localStorage.getItem(`${PLAN_STORAGE_PREFIX}${userId}`);
    return raw && isSubscriptionPlan(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeStoredPlan(userId: string, plan: SubscriptionPlan) {
  try {
    localStorage.setItem(`${PLAN_STORAGE_PREFIX}${userId}`, plan);
  } catch {
    /* ignore quota errors */
  }
}

export function trialEndsAtFromCreatedAt(createdAt: string): string {
  return new Date(new Date(createdAt).getTime() + TRIAL_DAYS * 86_400_000).toISOString();
}

export function readStoredTrialEndsAt(userId: string): string | null {
  try {
    return localStorage.getItem(`${TRIAL_ENDS_PREFIX}${userId}`);
  } catch {
    return null;
  }
}

export function writeStoredTrialEndsAt(userId: string, iso: string) {
  try {
    localStorage.setItem(`${TRIAL_ENDS_PREFIX}${userId}`, iso);
  } catch {
    /* ignore */
  }
}

export function readStoredSubscriptionActive(userId: string): boolean {
  try {
    return localStorage.getItem(`${SUBSCRIPTION_ACTIVE_PREFIX}${userId}`) === "1";
  } catch {
    return false;
  }
}

export function writeStoredSubscriptionActive(userId: string, active: boolean) {
  try {
    localStorage.setItem(`${SUBSCRIPTION_ACTIVE_PREFIX}${userId}`, active ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function resolveTrialEndsAt(
  profileEndsAt: string | null | undefined,
  userId: string | null | undefined,
  createdAt?: string | null,
): Date | null {
  if (profileEndsAt) return new Date(profileEndsAt);
  if (userId) {
    const stored = readStoredTrialEndsAt(userId);
    if (stored) return new Date(stored);
  }
  if (createdAt) return new Date(trialEndsAtFromCreatedAt(createdAt));
  return null;
}

export function resolveSubscriptionActive(
  profileActive: boolean | null | undefined,
  userId: string | null | undefined,
  profileHasColumn = false,
): boolean {
  if (profileHasColumn) return profileActive === true;
  if (userId && readStoredSubscriptionActive(userId)) return true;
  if (userId && readStoredPlan(userId)) return true;
  return false;
}

export function isTrialActive(trialEndsAt: Date | null): boolean {
  if (!trialEndsAt) return false;
  return Date.now() < trialEndsAt.getTime();
}

export function trialDaysRemaining(trialEndsAt: Date | null): number {
  if (!trialEndsAt) return 0;
  return Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000));
}

export function effectivePlanForAccess(
  plan: SubscriptionPlan,
  trialActive: boolean,
  subscriptionActive: boolean,
): SubscriptionPlan {
  if (trialActive && !subscriptionActive) return "premium";
  return plan;
}

/** Profile column wins; otherwise use per-user local storage. */
export function resolvePlan(
  profilePlan: string | null | undefined,
  userId: string | null | undefined,
): SubscriptionPlan {
  if (profilePlan && isSubscriptionPlan(profilePlan)) return profilePlan;
  if (userId) {
    const stored = readStoredPlan(userId);
    if (stored) return stored;
  }
  return "basic";
}

export function isWithinLimit(current: number, max: number): boolean {
  if (!Number.isFinite(max)) return true;
  return current < max;
}

export function limitLabel(current: number, max: number): string {
  if (!Number.isFinite(max)) return `${current} (unlimited)`;
  return `${current} / ${max}`;
}

export async function countOwnerBranches(ownerId: string): Promise<number> {
  const branches = await fetchBranchesForOwner(ownerId);
  return branches.filter((b) => b.is_active).length;
}

export async function countShopEquipment(): Promise<number> {
  const { count, error } = await db
    .from("equipment")
    .select("*", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}
