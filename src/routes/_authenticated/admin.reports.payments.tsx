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
import { CreditCard, CheckCircle2, Clock } from "lucide-react";
import type { Booking, PaymentStatus } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/reports/payments")({
  component: PaymentsReport,
});

function PaymentsReport() {
  const { branchId, formatMoney, formatDate, filterByBranch } = useBranchScope();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "all">("all");

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["report-payments", branchId],
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
      total: filtered.length,
      collected: paid.reduce((s, b) => s + (b.advance_paid || b.total_amount), 0),
      outstanding: pending.reduce((s, b) => s + b.total_amount, 0),
      advanceTotal: filtered.reduce((s, b) => s + (b.advance_paid ?? 0), 0),
    };
  }, [filtered]);

  const exportCsv = () => {
    downloadCsv(
      `payments-report-${branchId ?? "all"}.csv`,
      ["Booking #", "Date", "Customer", "Equipment", "Total", "Advance", "Method", "Status"],
      filtered.map((b) => [
        b.booking_number,
        b.created_at.slice(0, 10),
        b.shop_customer?.full_name ?? "",
        b.equipment?.equipment_name ?? "",
        b.total_amount,
        b.advance_paid ?? 0,
        b.payment_method ?? "",
        b.payment_status,
      ]),
    );
  };

  return (
    <ReportShell
      title="Payments report"
      description="Payment methods, advances, and outstanding amounts"
      icon={CreditCard}
      accent="from-teal-500/20 via-teal-500/5 to-transparent"
      stats={[
        { label: "Transactions", value: stats.total, icon: CreditCard },
        { label: "Collected", value: formatMoney(stats.collected), icon: CheckCircle2 },
        { label: "Outstanding", value: formatMoney(stats.outstanding), icon: Clock },
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
              <th className="px-5 py-3 font-medium">Method</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">No payments for these filters.</td></tr>
            ) : (
              filtered.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="px-5 py-3 font-medium">{b.booking_number}</td>
                  <td className="px-5 py-3">{formatDate(b.created_at)}</td>
                  <td className="px-5 py-3">{b.shop_customer?.full_name ?? "—"}</td>
                  <td className="px-5 py-3">{formatMoney(b.total_amount)}</td>
                  <td className="px-5 py-3">{formatMoney(b.advance_paid ?? 0)}</td>
                  <td className="px-5 py-3 capitalize">{b.payment_method ?? "—"}</td>
                  <td className="px-5 py-3"><StatusBadge status={b.payment_status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
    </ReportShell>
  );
}
