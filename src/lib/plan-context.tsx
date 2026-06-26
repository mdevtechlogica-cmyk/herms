import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/db";
import type { Profile } from "@/lib/types";
import { isMissingSchema, toErrorMessage } from "@/lib/errors";
import {
  countOwnerBranches,
  countShopEquipment,
  effectivePlanForAccess,
  isTrialActive,
  isWithinLimit,
  limitLabel,
  readStoredPlan,
  readStoredSubscriptionActive,
  readStoredTrialEndsAt,
  resolvePlan,
  resolveSubscriptionActive,
  resolveTrialEndsAt,
  trialDaysRemaining,
  trialEndsAtFromCreatedAt,
  writeStoredPlan,
  writeStoredSubscriptionActive,
  writeStoredTrialEndsAt,
  PLAN_LIMITS,
  type SubscriptionPlan,
} from "@/lib/plans";

interface PlanCtx {
  plan: SubscriptionPlan;
  effectivePlan: SubscriptionPlan;
  limits: (typeof PLAN_LIMITS)[SubscriptionPlan];
  branchCount: number;
  equipmentCount: number;
  canAddBranch: boolean;
  canAddEquipment: boolean;
  branchUsage: string;
  equipmentUsage: string;
  loading: boolean;
  planPersistedInDb: boolean;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  trialEndsAt: Date | null;
  subscriptionActive: boolean;
  hasAppAccess: boolean;
  setPlan: (plan: SubscriptionPlan) => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<PlanCtx | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user, profile, refresh: refreshAuth, patchProfile } = useAuth();
  const qc = useQueryClient();
  const [localPlan, setLocalPlan] = useState<SubscriptionPlan | null>(null);
  const [localTrialEndsAt, setLocalTrialEndsAt] = useState<string | null>(null);
  const [localSubscriptionActive, setLocalSubscriptionActive] = useState(false);
  const [trialBootstrapped, setTrialBootstrapped] = useState(false);
  const [subscriptionSchemaReady, setSubscriptionSchemaReady] = useState(false);
  const [schemaProbed, setSchemaProbed] = useState(false);

  const profileHasPlanColumn =
    subscriptionSchemaReady ||
    (profile != null && "subscription_plan" in profile);

  const profileHasTrialColumn =
    subscriptionSchemaReady ||
    (profile != null && "trial_ends_at" in profile);

  const profileHasSubscriptionActiveColumn =
    subscriptionSchemaReady ||
    (profile != null && "subscription_active" in profile);

  useEffect(() => {
    if (!user?.id) {
      setLocalPlan(null);
      setLocalTrialEndsAt(null);
      setLocalSubscriptionActive(false);
      setTrialBootstrapped(false);
      return;
    }
    if (!profileHasPlanColumn) {
      setLocalPlan(readStoredPlan(user.id));
    }
    if (!profileHasTrialColumn) {
      setLocalTrialEndsAt(readStoredTrialEndsAt(user.id));
    }
    if (!profileHasSubscriptionActiveColumn) {
      setLocalSubscriptionActive(readStoredSubscriptionActive(user.id));
    }
  }, [user?.id, profileHasPlanColumn, profileHasTrialColumn, profileHasSubscriptionActiveColumn]);

  // Detect subscription columns in Supabase (null values are valid — column existing is what matters).
  useEffect(() => {
    if (!user?.id) {
      setSubscriptionSchemaReady(false);
      setSchemaProbed(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      const { data, error } = await db
        .from("profiles")
        .select("subscription_plan, trial_ends_at, subscription_active")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;
      setSchemaProbed(true);

      if (error && isMissingSchema(error)) {
        setSubscriptionSchemaReady(false);
        return;
      }

      if (error) {
        console.warn("[Plan] subscription schema probe failed:", toErrorMessage(error));
        setSubscriptionSchemaReady(false);
        return;
      }

      setSubscriptionSchemaReady(true);

      const storedPlan = readStoredPlan(user.id) ?? "basic";
      const patch: Record<string, string | boolean> = {};
      if (!data?.subscription_plan) patch.subscription_plan = storedPlan;
      if (!data?.trial_ends_at && profile?.created_at) {
        patch.trial_ends_at = trialEndsAtFromCreatedAt(profile.created_at);
      }
      if (data?.subscription_active !== true && readStoredSubscriptionActive(user.id)) {
        patch.subscription_active = true;
      }

      if (Object.keys(patch).length === 0) return;

      const { error: syncError } = await db
        .from("profiles")
        .update(patch)
        .eq("id", user.id);

      if (cancelled || syncError) return;

      patchProfile(patch as Partial<Profile>);
      if (typeof patch.subscription_plan === "string") {
        writeStoredPlan(user.id, patch.subscription_plan as SubscriptionPlan);
        setLocalPlan(patch.subscription_plan as SubscriptionPlan);
      }
      if (typeof patch.trial_ends_at === "string") {
        writeStoredTrialEndsAt(user.id, patch.trial_ends_at);
        setLocalTrialEndsAt(patch.trial_ends_at);
      }
      if (patch.subscription_active === true) {
        writeStoredSubscriptionActive(user.id, true);
        setLocalSubscriptionActive(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, profile?.created_at, patchProfile]);

  useEffect(() => {
    if (!user?.id || !profile || trialBootstrapped) return;

    const existing = resolveTrialEndsAt(
      profileHasTrialColumn ? profile.trial_ends_at : localTrialEndsAt,
      user.id,
      profile.created_at,
    );
    if (existing) {
      setTrialBootstrapped(true);
      return;
    }

    const endsAt = trialEndsAtFromCreatedAt(profile.created_at ?? new Date().toISOString());
    setTrialBootstrapped(true);

    void (async () => {
      const { error } = await db
        .from("profiles")
        .update({ trial_ends_at: endsAt })
        .eq("id", user.id);

      if (error && isMissingSchema(error)) {
        writeStoredTrialEndsAt(user.id, endsAt);
        setLocalTrialEndsAt(endsAt);
        return;
      }

      if (!error) {
        writeStoredTrialEndsAt(user.id, endsAt);
        setLocalTrialEndsAt(endsAt);
        patchProfile({ trial_ends_at: endsAt });
      }
    })();
  }, [
    user?.id,
    profile,
    trialBootstrapped,
    profileHasTrialColumn,
    localTrialEndsAt,
  ]);

  const plan = resolvePlan(
    profileHasPlanColumn ? profile?.subscription_plan : localPlan,
    user?.id,
  );

  const trialEndsAt = resolveTrialEndsAt(
    profileHasTrialColumn ? profile?.trial_ends_at : localTrialEndsAt,
    user?.id,
    profile?.created_at,
  );

  const subscriptionActive = resolveSubscriptionActive(
    profile?.subscription_active,
    user?.id,
    profileHasSubscriptionActiveColumn,
  ) || localSubscriptionActive;

  const trialActive = isTrialActive(trialEndsAt);
  const hasAppAccess = !!user;
  const effectivePlan = effectivePlanForAccess(
    plan,
    trialActive || !!user,
    subscriptionActive || !!user,
  );
  const planPersistedInDb = subscriptionSchemaReady || (schemaProbed && profileHasPlanColumn);

  const { data: branchCount = 0, isLoading: branchesLoading } = useQuery({
    queryKey: ["plan-branch-count", user?.id],
    queryFn: () => countOwnerBranches(user!.id),
    enabled: !!user && hasAppAccess,
  });

  const { data: equipmentCount = 0, isLoading: equipmentLoading } = useQuery({
    queryKey: ["plan-equipment-count"],
    queryFn: countShopEquipment,
    enabled: !!user && hasAppAccess,
  });

  const limits = PLAN_LIMITS[effectivePlan];
  const canAddBranch = isWithinLimit(branchCount, limits.branches);
  const canAddEquipment = isWithinLimit(equipmentCount, limits.equipment);

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["plan-branch-count"] });
    await qc.invalidateQueries({ queryKey: ["plan-equipment-count"] });
    await qc.invalidateQueries({ queryKey: ["workspace-branches"] });
  }, [qc]);

  const setPlan = useCallback(async (next: SubscriptionPlan) => {
    if (!user) throw new Error("Sign in to change your plan");

    const payload = {
      subscription_plan: next,
      subscription_active: true,
    };

    const { data, error } = await db
      .from("profiles")
      .update(payload)
      .eq("id", user.id)
      .select("subscription_plan, subscription_active")
      .maybeSingle();

    writeStoredPlan(user.id, next);
    writeStoredSubscriptionActive(user.id, true);
    setLocalPlan(next);
    setLocalSubscriptionActive(true);

    if (error) {
      if (isMissingSchema(error)) {
        await refresh();
        return;
      }
      throw new Error(toErrorMessage(error));
    }

    if (data) {
      patchProfile({
        subscription_plan: data.subscription_plan as SubscriptionPlan,
        subscription_active: data.subscription_active === true,
      });
    }

    await refresh();
  }, [user, patchProfile, refresh]);

  const value = useMemo<PlanCtx>(() => ({
    plan,
    effectivePlan,
    limits,
    branchCount,
    equipmentCount,
    canAddBranch,
    canAddEquipment,
    branchUsage: limitLabel(branchCount, limits.branches),
    equipmentUsage: limitLabel(equipmentCount, limits.equipment),
    loading: branchesLoading || equipmentLoading,
    planPersistedInDb,
    isTrialActive: trialActive,
    trialDaysRemaining: trialDaysRemaining(trialEndsAt),
    trialEndsAt,
    subscriptionActive,
    hasAppAccess,
    setPlan,
    refresh,
  }), [
    plan, effectivePlan, limits, branchCount, equipmentCount, canAddBranch, canAddEquipment,
    branchesLoading, equipmentLoading, planPersistedInDb, trialActive, trialEndsAt,
    subscriptionActive, hasAppAccess, setPlan, refresh,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlan() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlan must be used inside PlanProvider");
  return ctx;
}

export function planLimitMessage(kind: "branch" | "equipment", plan: SubscriptionPlan): string {
  const limits = PLAN_LIMITS[plan];
  if (kind === "branch") {
    return `Your ${limits.label} plan allows ${limits.branches} branch(es). Upgrade to add more.`;
  }
  return `Your ${limits.label} plan allows ${limits.equipment} equipment. Upgrade to add more.`;
}
