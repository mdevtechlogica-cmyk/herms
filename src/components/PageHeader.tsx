import type { ReactNode } from "react";

export function PageHeader({
  title, description, actions,
}: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-4 sm:mb-6 min-w-0">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label, value, hint, icon: Icon, compact = false,
}: {
  label: string; value: string | number; hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "rounded-xl border bg-card p-3 shadow-sm min-w-0" : "rounded-xl border bg-card p-5 shadow-sm min-w-0"}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={compact ? "text-[10px] font-medium uppercase tracking-wider text-muted-foreground leading-tight" : "text-xs font-medium uppercase tracking-wider text-muted-foreground"}>{label}</div>
          <div className={compact ? "mt-1 text-lg font-bold text-foreground truncate" : "mt-2 text-2xl font-bold text-foreground"}>{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        {Icon && (
          <div className={compact ? "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent" : "grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent"}>
            <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
          </div>
        )}
      </div>
    </div>
  );
}
