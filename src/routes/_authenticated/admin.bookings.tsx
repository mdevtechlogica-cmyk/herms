import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { canCollectBooking } from "@/lib/collect-equipment";
import { PackageCheck } from "lucide-react";
import { toast } from "sonner";
import type { Booking, BookingStatus } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/bookings")({ component: AdminBookings });

const TRANSITIONS: BookingStatus[] = ["pending","approved","rejected","assigned","dispatched","active","returned","completed","cancelled"];

function AdminBookings() {
  const qc = useQueryClient();
  const { branchId, formatMoney, formatDate, filterByBranch, t } = useBranchScope();
  const { data: bookings = [] } = useQuery({
    queryKey: ["admin-bookings-full", branchId],
    queryFn: async () => {
      const rows = ((await db.from("bookings")
        .select("*, equipment:equipment(equipment_name), shop_customer:shop_customers(full_name, phone, email), customer:profiles!bookings_customer_profile_fkey(full_name, company_name, email)")
        .order("created_at", { ascending: false })).data ?? []) as Booking[];
      return filterByBranch(rows);
    },
  });

  const upd = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      const patch: Record<string, unknown> = { booking_status: status };
      if (status === "completed") patch.payment_status = "paid";
      const { error } = await db.from("bookings").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(t.bookings.updated); qc.invalidateQueries({ queryKey: ["admin-bookings-full"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title={t.bookings.title}
        description={t.bookings.totalBookings.replace("{count}", String(bookings.length))}
        actions={
          <Button asChild>
            <Link to="/admin/book-now">{t.bookings.bookNow}</Link>
          </Button>
        }
      />
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground"><tr className="text-left">
            <th className="px-5 py-3 font-medium">{t.bookings.bookingNumber}</th>
            <th className="px-5 py-3 font-medium">{t.bookings.customer}</th>
            <th className="px-5 py-3 font-medium">{t.bookings.equipment}</th>
            <th className="px-5 py-3 font-medium">{t.bookings.period}</th>
            <th className="px-5 py-3 font-medium">{t.bookings.amount}</th>
            <th className="px-5 py-3 font-medium">{t.bookings.payment}</th>
            <th className="px-5 py-3 font-medium">{t.bookings.status}</th>
            <th className="px-5 py-3 font-medium">{t.bookings.transition}</th>
            <th className="px-5 py-3 font-medium">{t.bookings.actions}</th>
          </tr></thead>
          <tbody>{bookings.map(b => (
            <tr key={b.id} className="border-t">
              <td className="px-5 py-3 font-mono text-xs">{b.booking_number}</td>
              <td className="px-5 py-3">
                <div className="font-medium">{b.shop_customer?.full_name || b.customer?.full_name || "—"}</div>
                <div className="text-xs text-muted-foreground">{b.shop_customer?.phone || b.customer?.company_name}</div>
              </td>
              <td className="px-5 py-3">{b.equipment?.equipment_name}</td>
              <td className="px-5 py-3 text-muted-foreground">{formatDate(b.start_date)} → {formatDate(b.end_date)}</td>
              <td className="px-5 py-3 font-medium">{formatMoney(b.total_amount)}</td>
              <td className="px-5 py-3"><StatusBadge status={b.payment_status} /></td>
              <td className="px-5 py-3"><StatusBadge status={b.booking_status} /></td>
              <td className="px-5 py-3">
                <Select value={b.booking_status} onValueChange={(v) => upd.mutate({ id: b.id, status: v as BookingStatus })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{TRANSITIONS.map(s => <SelectItem key={s} value={s} className="text-xs">{t.status[s]}</SelectItem>)}</SelectContent>
                </Select>
              </td>
              <td className="px-5 py-3">
                {canCollectBooking(b.booking_status) ? (
                  <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                    <Link to="/admin/collect-equipment" search={{ bookingId: b.id }}>
                      <PackageCheck className="h-3.5 w-3.5 mr-1" /> {t.bookings.collect}
                    </Link>
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}{bookings.length === 0 && (
            <tr><td colSpan={9} className="px-5 py-10 text-center text-muted-foreground">{t.bookings.empty}</td></tr>
          )}</tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-3">{t.bookings.tip}</p>
    </>
  );
}
