import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Invoice, Booking } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/invoices")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const { branchId, formatMoney, formatDate, taxLabel, filterByBranch } = useBranchScope();
  const { data: eligible = [] } = useQuery({
    queryKey: ["invoice-eligible", branchId],
    queryFn: async () => {
      const rows = ((await db.from("bookings").select("*").in("booking_status", ["completed", "returned"])).data ?? []) as Booking[];
      return filterByBranch(rows);
    },
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices", branchId],
    queryFn: async () => {
      const bookings = filterByBranch(
        ((await db.from("bookings").select("id, branch_id").in("booking_status", ["completed", "returned"])).data ?? []) as Booking[],
      );
      const ids = new Set(bookings.map((b) => b.id));
      const rows = ((await db.from("invoices").select("*").order("invoice_date", { ascending: false })).data ?? []) as Invoice[];
      return rows.filter((i) => ids.has(i.booking_id));
    },
  });
  const existingBookingIds = new Set(invoices.map(i => i.booking_id));
  const pending = eligible.filter(b => !existingBookingIds.has(b.id));

  const generate = useMutation({
    mutationFn: async () => {
      if (pending.length === 0) return 0;
      const payload = pending.map(b => ({
        booking_id: b.id, customer_id: b.customer_id,
        amount: Number(b.subtotal) + Number(b.operator_cost) + Number(b.insurance_cost) + Number(b.transport_cost),
        tax: Number(b.tax), total: Number(b.total_amount),
      }));
      const { error } = await db.from("invoices").insert(payload);
      if (error) throw error;
      return payload.length;
    },
    onSuccess: (n) => { toast.success(`Generated ${n} invoice(s)`); qc.invalidateQueries({ queryKey: ["invoices"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadInvoice = (inv: Invoice) => {
    const html = `<html><head><title>${inv.invoice_number}</title><style>body{font-family:'Inter',system-ui,sans-serif;padding:40px;color:#282A33}h1{color:#2A2D35}table{width:100%;border-collapse:collapse;margin-top:20px}td,th{border-bottom:1px solid #EBEBED;padding:10px;text-align:left}.total{font-size:18px;font-weight:bold}</style></head><body>
      <h1>HERMS — Invoice ${inv.invoice_number}</h1>
      <p>Date: ${formatDate(inv.invoice_date)}</p>
      <table><tr><th>Description</th><th>Amount</th></tr>
      <tr><td>Rental charges</td><td>${formatMoney(inv.amount)}</td></tr>
      <tr><td>${taxLabel}</td><td>${formatMoney(inv.tax)}</td></tr>
      <tr><td class="total">Total</td><td class="total">${formatMoney(inv.total)}</td></tr></table>
      </body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${inv.invoice_number}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader title="Invoices" description={`${invoices.length} invoices · ${pending.length} pending`} actions={
        <Button onClick={() => generate.mutate()} disabled={pending.length === 0}><Plus className="h-4 w-4 mr-1" /> Generate for completed</Button>
      } />
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground"><tr className="text-left">
            <th className="px-5 py-3 font-medium">Invoice #</th>
            <th className="px-5 py-3 font-medium">Date</th>
            <th className="px-5 py-3 font-medium">Amount</th>
            <th className="px-5 py-3 font-medium">Tax</th>
            <th className="px-5 py-3 font-medium">Total</th>
            <th className="px-5 py-3 font-medium text-right">Action</th>
          </tr></thead>
          <tbody>{invoices.map(i => (
            <tr key={i.id} className="border-t">
              <td className="px-5 py-3 font-mono text-xs">{i.invoice_number}</td>
              <td className="px-5 py-3 text-muted-foreground">{formatDate(i.invoice_date)}</td>
              <td className="px-5 py-3">{formatMoney(i.amount)}</td>
              <td className="px-5 py-3">{formatMoney(i.tax)}</td>
              <td className="px-5 py-3 font-medium">{formatMoney(i.total)}</td>
              <td className="px-5 py-3 text-right">
                <Button size="sm" variant="outline" onClick={() => downloadInvoice(i)}><Download className="h-3.5 w-3.5 mr-1" />Download</Button>
              </td>
            </tr>
          ))}{invoices.length === 0 && (<tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No invoices yet. Generate from completed bookings.</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
