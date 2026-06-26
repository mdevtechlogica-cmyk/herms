import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ReportStat {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
}

interface ReportShellProps {
  title: string;
  description: string;
  accent?: string;
  icon?: LucideIcon;
  stats?: ReportStat[];
  filters?: React.ReactNode;
  onExport?: () => void;
  exportDisabled?: boolean;
  children: React.ReactNode;
}

export function ReportShell({
  title,
  description,
  accent = "from-primary/15 via-primary/5 to-transparent",
  icon: Icon,
  stats = [],
  filters,
  onExport,
  exportDisabled,
  children,
}: ReportShellProps) {
  return (
    <div className="space-y-5">
      <Link
        to="/admin/reports"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All reports
      </Link>

      <div className={cn("rounded-2xl border bg-gradient-to-br p-5 sm:p-6", accent)}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            {Icon ? (
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-background/80 border shadow-sm">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            ) : null}
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
          {onExport ? (
            <Button
              variant="secondary"
              className="shrink-0 bg-background/80"
              onClick={onExport}
              disabled={exportDisabled}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV
            </Button>
          ) : null}
        </div>

        {stats.length > 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border bg-background/70 backdrop-blur-sm px-4 py-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {s.label}
                  </p>
                  {s.icon ? <s.icon className="h-4 w-4 text-muted-foreground" /> : null}
                </div>
                <p className="text-lg font-bold mt-1 tabular-nums">{s.value}</p>
                {s.hint ? <p className="text-[11px] text-muted-foreground mt-0.5">{s.hint}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {filters ? (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Filters
          </p>
          {filters}
        </div>
      ) : null}

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {children}
      </div>
    </div>
  );
}
