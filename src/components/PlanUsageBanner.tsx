import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { usePlan } from "@/lib/plan-context";
import { Button } from "@/components/ui/button";

interface PlanUsageBannerProps {
  kind: "branch" | "equipment";
}

export function PlanUsageBanner({ kind }: PlanUsageBannerProps) {
  const { limits, branchUsage, equipmentUsage, canAddBranch, canAddEquipment } = usePlan();
  const blocked = kind === "branch" ? !canAddBranch : !canAddEquipment;
  const usage = kind === "branch" ? branchUsage : equipmentUsage;

  return (
    <div className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${blocked ? "border-amber-500/50 bg-amber-500/5" : "bg-muted/30"}`}>
      <div>
        <p className="text-sm font-medium">
          {limits.label} plan · {kind === "branch" ? "Branches" : "Equipment"}: {usage}
        </p>
        {blocked && (
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            Limit reached. Upgrade your plan to add more {kind === "branch" ? "branches" : "equipment"}.
          </p>
        )}
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link to="/admin/subscription">View plans</Link>
      </Button>
    </div>
  );
}
