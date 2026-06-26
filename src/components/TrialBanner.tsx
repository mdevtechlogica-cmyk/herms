import { Link } from "@tanstack/react-router";
import { usePlan } from "@/lib/plan-context";
import { Clock } from "lucide-react";

export function TrialBanner() {
  const { isTrialActive, trialDaysRemaining, subscriptionActive } = usePlan();

  if (!isTrialActive || subscriptionActive) return null;

  const days = trialDaysRemaining;
  const label = days === 1 ? "1 day" : `${days} days`;

  return (
    <div className="mb-4 rounded-xl border border-sky-500/30 bg-sky-500/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
      <p className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-sky-600 shrink-0" />
        <span>
          Free trial: <strong>{label}</strong> left with full Premium access.
        </span>
      </p>
      <Link to="/admin/subscription" className="text-primary font-medium underline underline-offset-2 shrink-0">
        View plans
      </Link>
    </div>
  );
}
