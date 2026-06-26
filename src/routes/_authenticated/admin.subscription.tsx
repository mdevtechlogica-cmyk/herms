import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { SubscriptionPlansPicker } from "@/components/SubscriptionPlansPicker";
import { useLocale } from "@/lib/locale-context";
import { useWorkspace } from "@/lib/workspace-context";
import { usePlan } from "@/lib/plan-context";
import { getSubscriptionMonthlyPrice, PLAN_LIMITS } from "@/lib/plans";
import { COUNTRIES } from "@/lib/locale/countries";

export const Route = createFileRoute("/_authenticated/admin/subscription")({
  component: AdminSubscription,
});

function AdminSubscription() {
  const {
    plan,
    branchUsage,
    equipmentUsage,
    isTrialActive,
    trialDaysRemaining,
    subscriptionActive,
  } = usePlan();
  const { formatMoney } = useLocale();
  const { country } = useWorkspace();
  const currentPrice = getSubscriptionMonthlyPrice(country, plan);

  return (
    <>
      <PageHeader
        title="Subscription"
        description={`Plans priced for ${COUNTRIES[country].name} (${COUNTRIES[country].currency}) — change country on the dashboard`}
      />

      <div className="mb-6 rounded-xl border bg-muted/30 p-4 text-sm space-y-1">
        <p>
          Current plan: <span className="font-semibold">{PLAN_LIMITS[plan].label}</span>
          <span className="text-muted-foreground">
            {" "}· {formatMoney(currentPrice)}/mo
          </span>
          {subscriptionActive && (
            <span className="text-muted-foreground"> · Active subscription</span>
          )}
        </p>
        <p className="text-muted-foreground">
          Branches: {branchUsage} · Equipment: {equipmentUsage}
        </p>
        {isTrialActive && !subscriptionActive && (
          <p className="text-sky-700 dark:text-sky-400 text-xs pt-1">
            Free trial: {trialDaysRemaining} day{trialDaysRemaining === 1 ? "" : "s"} left with Premium access.
            Subscribe anytime to keep access after the trial.
          </p>
        )}
      </div>

      <SubscriptionPlansPicker />
    </>
  );
}
