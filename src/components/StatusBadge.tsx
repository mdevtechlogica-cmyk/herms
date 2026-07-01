import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale-context";

const MAP: Record<string, string> = {
  // booking
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-info/10 text-info border-info/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  assigned: "bg-info/10 text-info border-info/20",
  dispatched: "bg-info/10 text-info border-info/20",
  active: "bg-success/10 text-success border-success/20",
  returned: "bg-muted text-muted-foreground border-border",
  completed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-muted text-muted-foreground border-border",
  // payment
  paid: "bg-success/10 text-success border-success/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  refunded: "bg-muted text-muted-foreground border-border",
  // equipment
  available: "bg-success/10 text-success border-success/20",
  booked: "bg-info/10 text-info border-info/20",
  under_maintenance: "bg-warning/10 text-warning border-warning/20",
  out_of_service: "bg-destructive/10 text-destructive border-destructive/20",
  // operator
  on_leave: "bg-muted text-muted-foreground border-border",
  // maintenance
  scheduled: "bg-info/10 text-info border-info/20",
  in_progress: "bg-warning/10 text-warning border-warning/20",
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
