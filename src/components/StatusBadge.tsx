import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale-context";

const MAP: Record<string, string> = {
  // booking
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-blue-100 text-blue-800 border-blue-200",
  rejected: "bg-rose-100 text-rose-800 border-rose-200",
  assigned: "bg-indigo-100 text-indigo-800 border-indigo-200",
  dispatched: "bg-sky-100 text-sky-800 border-sky-200",
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  returned: "bg-violet-100 text-violet-800 border-violet-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-slate-200 text-slate-700 border-slate-300",
  // payment
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  failed: "bg-rose-100 text-rose-800 border-rose-200",
  refunded: "bg-slate-200 text-slate-700 border-slate-300",
  // equipment
  available: "bg-emerald-100 text-emerald-800 border-emerald-200",
  booked: "bg-blue-100 text-blue-800 border-blue-200",
  under_maintenance: "bg-amber-100 text-amber-800 border-amber-200",
  out_of_service: "bg-rose-100 text-rose-800 border-rose-200",
  // operator
  on_leave: "bg-slate-200 text-slate-700 border-slate-300",
  // maintenance
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const { t } = useLocale();
  const statusKey = status as keyof typeof t.status;
  const label = t.status[statusKey] ?? status.replace(/_/g, " ");
  return (
    <Badge variant="outline" className={cn("capitalize font-medium", MAP[status] ?? "", className)}>
      {label}
    </Badge>
  );
}
