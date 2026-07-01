import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";
import { WorkspaceSelector } from "@/components/WorkspaceSelector";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useWorkspace } from "@/lib/workspace-context";
import { useCountUp } from "@/hooks/use-count-up";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell,
  CartesianGrid,
} from "recharts";
import {
  Truck, CheckCircle2, CalendarClock, CircleDollarSign, AlertCircle, Wrench,
  TrendingUp, Construction, Plus, PackageCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Booking, Equipment } from "@/lib/types";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  component: AdminDashboard,
});

const CHART_COLORS = {
  bar: "oklch(0.74 0.16 65)",
  grid: "hsl(var(--border) / 0.5)",
};
const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];

const BORDER_ACCENTS = {
  accent: "border-l-accent",
  success: "border-l-success",
  info: "border-l-info",
  warning: "border-l-warning",
} as const;

function DashboardStat({
  label, value, icon: Icon, accent,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent: keyof typeof BORDER_ACCENTS;
}) {
  const isNumeric = typeof value === "number";
  const animated = useCountUp(isNumeric ? value : 0, isNumeric);
  const display = isNumeric ? String(animated) : value;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-l-[3px] bg-card p-4 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5",
        BORDER_ACCENTS[accent],
      )}
    >
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-mono font-bold tracking-tight text-foreground truncate">{display}</p>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { profile } = useAuth();
  const { t, formatMoney, formatDate } = useLocale();
  const { branch } = useWorkspace();
  const { branchId, filterByBranch } = useBranchScope();

  const { data: equipment = [], isLoading: equipmentLoading } = useQuery({
    queryKey: ["admin-equipment", branchId],
    queryFn: async () => {
      const { data } = await db.from("equipment").select("*");
      return filterByBranch((data ?? []) as Equipment[]);
    },
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["admin-bookings", branchId],
    queryFn: async () => {
      const { data } = await db
        .from("bookings")
        .select("*, equipment:equipment(equipment_name)")
        .order("created_at", { ascending: false });
      return filterByBranch((data ?? []) as Booking[]);
    },
  });

  const dataLoading = equipmentLoading || bookingsLoading;

  const totalEq = equipment.length;
  const avail = equipment.filter((e) => e.status === "available").length;
  const active = bookings.filter((b) => ["active", "dispatched", "assigned"].includes(b.booking_status)).length;
  const revenue = bookings
    .filter((b) => b.payment_status === "paid")
    .reduce((s, b) => s + Number(b.total_amount), 0);
  const pendingPay = bookings
    .filter((b) => b.payment_status === "pending" && b.booking_status === "completed")
    .reduce((s, b) => s + Number(b.total_amount), 0);
  const maintenance = equipment.filter((e) => e.status === "under_maintenance").length;
  const utilization = totalEq > 0 ? Math.round((avail / totalEq) * 100) : 0;

  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const label = d.toLocaleString("en", { month: "short" });
    const m = d.getMonth();
    const y = d.getFullYear();
    const rev = bookings
      .filter((b) => {
        const bd = new Date(b.created_at);
        return bd.getMonth() === m && bd.getFullYear() === y && b.payment_status === "paid";
      })
      .reduce((s, b) => s + Number(b.total_amount), 0);
    return { month: label, revenue: rev };
  });

  const statusPie = (["available", "booked", "under_maintenance", "out_of_service"] as const).map((s) => ({
    name: s.replace(/_/g, " "),
    value: equipment.filter((e) => e.status === s).length,
  }));

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const recent = bookings.slice(0, 6);

  return (
    <div className="space-y-6 pb-2">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-[oklch(0.45_0.12_65)] text-primary-foreground shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12),_transparent_55%)]" />
        <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        <div className="relative p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
              <Construction className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-primary-foreground/75">{t.dashboard.description}</p>
              <h1 className="text-xl sm:text-2xl font-bold font-heading tracking-tight mt-0.5">
                {t.dashboard.greeting.replace("{name}", firstName)}
              </h1>
              {branch && (
                <p className="text-xs text-primary-foreground/70 mt-1 truncate">
                  {branch.name}
                </p>
              )}
            </div>
            {!dataLoading && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium ring-1 ring-white/20">
                <TrendingUp className="h-3.5 w-3.5" />
                {utilization}% {t.dashboard.fleetReady}
              </div>
            )}
          </div>
          <WorkspaceSelector variant="embedded" />
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-white text-primary hover:bg-white/90 font-semibold shadow-md"
            >
              <Link to="/admin/book-now">
                <Plus className="h-5 w-5 mr-2" />
                {t.dashboard.bookNow}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto border-white/40 bg-white/10 text-primary-foreground hover:bg-white/20 font-semibold"
            >
              <Link to="/admin/collect-equipment">
                <PackageCheck className="h-5 w-5 mr-2" />
                {t.dashboard.collectEquipment}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {dataLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          {t.common.loading}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <DashboardStat label={t.dashboard.totalEquipment} value={totalEq} icon={Truck} accent="info" />
        <DashboardStat label={t.dashboard.available} value={avail} icon={CheckCircle2} accent="success" />
        <DashboardStat label={t.dashboard.activeRentals} value={active} icon={CalendarClock} accent="accent" />
        <DashboardStat label={t.dashboard.revenue} value={formatMoney(revenue)} icon={CircleDollarSign} accent="info" />
        <DashboardStat label={t.dashboard.pendingPay} value={formatMoney(pendingPay)} icon={AlertCircle} accent="warning" />
        <DashboardStat label={t.dashboard.inMaintenance} value={maintenance} icon={Wrench} accent="warning" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border bg-card p-5 shadow-sm lg:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-foreground">{t.dashboard.monthlyRevenue}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t.dashboard.lastSixMonths}</p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                  formatter={(v: number) => [formatMoney(v), t.dashboard.revenue]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid hsl(var(--border))",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="revenue" fill={CHART_COLORS.bar} radius={[8, 8, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground">{t.dashboard.equipmentStatus}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{totalEq} {t.dashboard.unitsTotal}</p>
          </div>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="52%"
                  outerRadius="78%"
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {statusPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid hsl(var(--border))",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {statusPie.map((s, i) => (
              s.value > 0 ? (
                <div key={s.name} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
                  <span className="capitalize truncate">{s.name}</span>
                  <span className="ml-auto font-semibold text-foreground">{s.value}</span>
                </div>
              ) : null
            ))}
          </div>
        </div>
      </div>

      {/* Recent bookings */}
      <section className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
          <div>
            <h3 className="font-semibold">{t.dashboard.recentBookings}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{recent.length} {t.dashboard.shown}</p>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="divide-y md:hidden">
          {recent.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t.dashboard.noBookings}</p>
          ) : recent.map((b) => (
            <div key={b.id} className="px-4 py-3.5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-muted-foreground">{b.booking_number}</p>
                  <p className="font-medium text-sm truncate">{b.equipment?.equipment_name}</p>
                </div>
                <StatusBadge status={b.booking_status} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {formatDate(b.start_date)} → {formatDate(b.end_date)}
                </span>
                <span className="font-semibold text-foreground">{formatMoney(b.total_amount)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="px-5 py-3 font-medium text-xs uppercase tracking-wider">Booking</th>
                <th className="px-5 py-3 font-medium text-xs uppercase tracking-wider">Equipment</th>
                <th className="px-5 py-3 font-medium text-xs uppercase tracking-wider">Dates</th>
                <th className="px-5 py-3 font-medium text-xs uppercase tracking-wider">Amount</th>
                <th className="px-5 py-3 font-medium text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((b) => (
                <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{b.booking_number}</td>
                  <td className="px-5 py-3.5 font-medium">{b.equipment?.equipment_name}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {formatDate(b.start_date)} → {formatDate(b.end_date)}
                  </td>
                  <td className="px-5 py-3.5 font-semibold">{formatMoney(b.total_amount)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={b.booking_status} /></td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                    {t.dashboard.noBookings}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
