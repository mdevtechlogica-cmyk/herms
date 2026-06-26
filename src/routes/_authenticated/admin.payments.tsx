import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranchScope } from "@/hooks/use-branch-scope";
import type { Booking } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/payments")({ component: Page });

function Page() {
  const [filter, setFilter] = useState("all");
  const { branchId, formatMoney, formatDate, filterByBranch } = useBranchScope();
  const { data: bookings = [] } = useQuery({
    queryKey: ["admin-payments", branchId],
    queryFn: async () => {
      const rows = ((await db.from("bookings").select("*, customer:profiles!bookings_customer_id_fkey(full_name, company_name), equipment:equipment(equipment_name)").order("created_at", { ascending: false })).data ?? []) as Booking[];
      return filterByBranch(rows);
    },
  });
  const rows = filter === "all" ? bookings : bookings.filter(b => b.payment_status === filter);

  return (
    <>
      <PageHeader title="Payments" description="All booking payments and balances." actions={
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      } />
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground"><tr className="text-left">
            <th className="px-5 py-3 font-medium">Booking</th>
            <th className="px-5 py-3 font-medium">Customer</th>
            <th className="px-5 py-3 font-medium">Equipment</th>
            <th className="px-5 py-3 font-medium">Date</th>
            <th className="px-5 py-3 font-medium">Amount</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr></thead>
          <tbody>{rows.map(b => (
            <tr key={b.id} className="border-t">
              <td className="px-5 py-3 font-mono text-xs">{b.booking_number}</td>
              <td className="px-5 py-3">{b.customer?.full_name}</td>
              <td className="px-5 py-3">{b.equipment?.equipment_name}</td>
              <td className="px-5 py-3 text-muted-foreground">{formatDate(b.created_at)}</td>
              <td className="px-5 py-3 font-medium">{formatMoney(b.total_amount)}</td>
              <td className="px-5 py-3"><StatusBadge status={b.payment_status} /></td>
            </tr>
          ))}{rows.length === 0 && (<tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No payments.</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
