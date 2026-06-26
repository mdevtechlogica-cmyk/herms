import { Link } from "@tanstack/react-router";
import { BarChart3, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { REPORT_CATALOG, REPORT_CATEGORIES } from "@/lib/reports/catalog";
import { cn } from "@/lib/utils";

export function ReportsHub() {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Insights and exportable summaries for your branch"
      />

      <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-5 sm:p-6 mb-6">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Analytics hub</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Open any report to filter by date or status and download CSV for your records.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {REPORT_CATEGORIES.map((cat) => {
          const items = REPORT_CATALOG.filter((r) => r.category === cat.id);
          if (!items.length) return null;
          return (
            <section key={cat.id} className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {cat.label}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((r) => (
                  <Link
                    key={r.to}
                    to={r.to}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border bg-card p-4 sm:p-5",
                      "hover:border-primary/30 hover:shadow-md transition-all",
                    )}
                  >
                    <div
                      className={cn(
                        "absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none",
                        r.gradient,
                      )}
                    />
                    <div className="relative flex items-start gap-3 sm:gap-4">
                      <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", r.tone)}>
                        <r.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold group-hover:text-primary transition-colors">
                            {r.title}
                          </h3>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-snug">
                          {r.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
