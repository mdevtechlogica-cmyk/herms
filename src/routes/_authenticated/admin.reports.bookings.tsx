import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { ReportShell } from "@/components/reports/ReportShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { downloadCsv } from "@/lib/export-csv";
import { ClipboardList } from "lucide-react";
import type { Booking, BookingStatus } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/reports/bookings")({
  component: BookingsReport,
});

function BookingsReport() {
  const { branchId, formatMoney, formatDate, filterByBranch } = useBranchScope();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["report-bookings", branchId],
    queryFn: async () => {
      const rows = ((await db
        .from("bookings")
        .select("*, equipment:equipment(equipment_name), shop_customer:shop_customers(full_name)")
        .order("start_date", { ascending: false })
      ).data ?? []) as Booking[];
      return filterByBranch(rows);
    },
  });

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (fromDate && b.start_date < fromDate) return false;
      if (toDate && b.start_date > toDate) return false;
      if (statusFilter !== "all" && b.booking_status !== statusFilter) return false;
      return true;
    });
  }, [bookings, fromDate, toDate, statusFilter]);

  const stats = useMemo(() => {
    const revenue = filtered.reduce((s, b) => s + (b.total_amount ?? 0), 0);
    const active = filtered.filter((b) => ["active", "dispatched", "assigned"].includes(b.booking_status)).length;
    return { count: filtered.length, revenue, active };
  }, [filtered]);

  const customerName = (b: Booking) =>
    b.shop_customer?.full_name ?? b.customer?.full_name ?? "—";

  const exportCsv = () => {
    downloadCsv(
      `bookings-report-${branchId ?? "all"}.csv`,
      ["Booking #", "Customer", "Equipment", "Start", "End", "Days", "Total", "Booking status", "Payment"],
      filtered.map((b) => [
        b.booking_number,
        customerName(b),
        b.equipment?.equipment_name ?? "",
        b.start_date,
        b.end_date,
        b.number_of_days,
        b.total_amount,
        b.booking_status,
        b.payment_status,
      ]),
    );
  };

  return (
    <ReportShell
      title="Bookings report"
      description="Rental bookings for the selected branch"
      icon={ClipboardList}
      accent="from-blue-500/20 via-blue-500/5 to-transparent"
      stats={[
        { label: "Bookings", value: stats.count, icon: ClipboardList },
        { label: "Total value", value: formatMoney(stats.revenue) },
        { label: "In progress", value: stats.active, hint: "Active, dispatched, or assigned" },
      ]}
      filters={
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs">From (start date)</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">To (start date)</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BookingStatus | "all")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {(["pending", "approved", "active", "completed", "returned", "cancelled"] as const).map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      }
      onExport={exportCsv}
      exportDisabled={filtered.length === 0}
    >
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground border-b">
          <tr className="text-left">
            <th className="px-5 py-3 font-medium">Booking</th>
            <th className="px-5 py-3 font-medium">Customer</th>
            <th className="px-5 py-3 font-medium">Equipment</th>
            <th className="px-5 py-3 font-medium">Period</th>
            <th className="px-5 py-3 font-medium">Total</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium">Payment</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">Loading…</td></tr>
          ) : filtered.length === 0 ? (
            <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">No bookings for these filters.</td></tr>
          ) : (
            filtered.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="px-5 py-3 font-medium">{b.booking_number}</td>
                <td className="px-5 py-3">{customerName(b)}</td>
                <td className="px-5 py-3">{b.equipment?.equipment_name ?? "—"}</td>
                <td className="px-5 py-3 text-muted-foreground">
                  {formatDate(b.start_date)} – {formatDate(b.end_date)}
                </td>
                <td className="px-5 py-3">{formatMoney(b.total_amount)}</td>
                <td className="px-5 py-3"><StatusBadge status={b.booking_status} /></td>
                <td className="px-5 py-3"><StatusBadge status={b.payment_status} /></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </ReportShell>
  );
}
