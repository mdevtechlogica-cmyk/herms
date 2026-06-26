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
import { Banknote, Clock, CheckCircle2 } from "lucide-react";
import type { Booking, PaymentStatus } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/reports/revenue")({
  component: RevenueReport,
});

function RevenueReport() {
  const { branchId, formatMoney, formatDate, filterByBranch } = useBranchScope();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "all">("all");

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["report-revenue", branchId],
    queryFn: async () => {
      const rows = ((await db
        .from("bookings")
        .select("*, equipment:equipment(equipment_name), shop_customer:shop_customers(full_name)")
        .order("created_at", { ascending: false })
      ).data ?? []) as Booking[];
      return filterByBranch(rows);
    },
  });

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const d = b.created_at.slice(0, 10);
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      if (paymentFilter !== "all" && b.payment_status !== paymentFilter) return false;
      return true;
    });
  }, [bookings, fromDate, toDate, paymentFilter]);

  const stats = useMemo(() => {
    const paid = filtered.filter((b) => b.payment_status === "paid");
    const pending = filtered.filter((b) => b.payment_status === "pending");
    return {
      gross: filtered.reduce((s, b) => s + b.total_amount, 0),
      collected: paid.reduce((s, b) => s + (b.advance_paid || b.total_amount), 0),
      pending: pending.reduce((s, b) => s + b.total_amount, 0),
      paidCount: paid.length,
      pendingCount: pending.length,
    };
  }, [filtered]);

  const exportCsv = () => {
    downloadCsv(
      `revenue-report-${branchId ?? "all"}.csv`,
      ["Booking #", "Date", "Customer", "Equipment", "Total", "Advance paid", "Payment status", "Method"],
      filtered.map((b) => [
        b.booking_number,
        b.created_at.slice(0, 10),
        b.shop_customer?.full_name ?? "",
        b.equipment?.equipment_name ?? "",
        b.total_amount,
        b.advance_paid ?? 0,
        b.payment_status,
        b.payment_method ?? "",
      ]),
    );
  };

  return (
    <ReportShell
      title="Revenue report"
      description="Payment collection and outstanding balances"
      icon={Banknote}
      accent="from-emerald-500/20 via-emerald-500/5 to-transparent"
      stats={[
        { label: "Gross value", value: formatMoney(stats.gross), icon: Banknote },
        { label: "Collected", value: formatMoney(stats.collected), icon: CheckCircle2 },
        { label: "Pending", value: formatMoney(stats.pending), icon: Clock, hint: `${stats.pendingCount} bookings` },
      ]}
      filters={
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs">From (created)</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">To (created)</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Payment status</Label>
            <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as PaymentStatus | "all")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {(["paid", "pending", "failed", "refunded"] as const).map((s) => (
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
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Customer</th>
              <th className="px-5 py-3 font-medium">Total</th>
              <th className="px-5 py-3 font-medium">Advance</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No payment records for these filters.</td></tr>
            ) : (
              filtered.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="px-5 py-3 font-medium">{b.booking_number}</td>
                  <td className="px-5 py-3">{formatDate(b.created_at)}</td>
                  <td className="px-5 py-3">{b.shop_customer?.full_name ?? "—"}</td>
                  <td className="px-5 py-3">{formatMoney(b.total_amount)}</td>
                  <td className="px-5 py-3">{formatMoney(b.advance_paid ?? 0)}</td>
                  <td className="px-5 py-3"><StatusBadge status={b.payment_status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
    </ReportShell>
  );
}
