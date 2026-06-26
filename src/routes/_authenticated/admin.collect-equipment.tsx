import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/db";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { uploadRentalAssetWithFallback } from "@/lib/storage";
import { canCollectBooking, completeEquipmentCollection } from "@/lib/collect-equipment";
import { toErrorMessage } from "@/lib/errors";
import { ArrowLeft, Camera, Loader2, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import type { Booking, PaymentMethod } from "@/lib/types";

type CollectSearch = { bookingId?: string };

export const Route = createFileRoute("/_authenticated/admin/collect-equipment")({
  component: CollectEquipmentPage,
  validateSearch: (search: Record<string, unknown>): CollectSearch => ({
    bookingId: typeof search.bookingId === "string" ? search.bookingId : undefined,
  }),
});

const REFUND_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI / GPay" },
  { value: "bank_transfer", label: "Bank transfer" },
];

function CollectEquipmentPage() {
  const { bookingId: initialBookingId } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { branchId, formatMoney, formatDate, filterByBranch } = useBranchScope();

  const [selectedId, setSelectedId] = useState(initialBookingId ?? "");
  const [returnFile, setReturnFile] = useState<File | null>(null);
  const [advanceRefunded, setAdvanceRefunded] = useState("");
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["collect-bookings", branchId],
    queryFn: async () => {
      const rows = ((await db
        .from("bookings")
        .select("*, equipment:equipment(equipment_name), shop_customer:shop_customers(full_name, phone)")
        .order("created_at", { ascending: false })
      ).data ?? []) as Booking[];
      return filterByBranch(rows).filter((b) => canCollectBooking(b.booking_status));
    },
  });

  useEffect(() => {
    if (initialBookingId) setSelectedId(initialBookingId);
  }, [initialBookingId]);

  const selected = useMemo(
    () => bookings.find((b) => b.id === selectedId) ?? null,
    [bookings, selectedId],
  );

  const maxRefund = selected ? Number(selected.advance_paid) || 0 : 0;

  const submit = async () => {
    if (!selected) {
      toast.error("Select a booking to collect");
      return;
    }
    if (!returnFile) {
      toast.error("Take or upload a photo of the return document");
      return;
    }

    const refund = Number(advanceRefunded) || 0;
    if (refund < 0 || refund > maxRefund) {
      toast.error(`Refund must be between 0 and ${formatMoney(maxRefund)}`);
      return;
    }

    setSubmitting(true);
    try {
      const ts = Date.now();
      const prefix = `returns/${branchId ?? "main"}/${selected.id}/${ts}`;
      const returnDocumentUrl = await uploadRentalAssetWithFallback(
        returnFile,
        `${prefix}/return-doc-${returnFile.name}`,
      );

      await completeEquipmentCollection({
        bookingId: selected.id,
        returnDocumentUrl,
        advanceRefunded: refund,
        refundMethod,
        notes,
      });

      toast.success("Equipment collected successfully");
      await qc.invalidateQueries({ queryKey: ["admin-bookings-full"] });
      await qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      await qc.invalidateQueries({ queryKey: ["collect-bookings"] });
      await qc.invalidateQueries({ queryKey: ["admin-equipment"] });
      navigate({ to: "/admin/bookings" });
    } catch (e) {
      toast.error(toErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Collect equipment"
        description="Record equipment return with document photo and advance refund"
        actions={
          <Button variant="outline" asChild>
            <Link to="/admin/dashboard"><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Link>
          </Button>
        }
      />

      <div className="max-w-xl space-y-5">
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div>
            <Label>Active rental *</Label>
            <Select value={selectedId} onValueChange={setSelectedId} disabled={isLoading}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={isLoading ? "Loading…" : "Select booking"} /></SelectTrigger>
              <SelectContent>
                {bookings.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.booking_number} · {b.equipment?.equipment_name} · {b.shop_customer?.full_name ?? "Customer"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {bookings.length === 0 && !isLoading && (
              <p className="text-sm text-muted-foreground mt-2">No active rentals to collect. Bookings must be assigned, dispatched, or active.</p>
            )}
          </div>

          {selected && (
            <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs">{selected.booking_number}</span>
                <StatusBadge status={selected.booking_status} />
              </div>
              <p><strong>{selected.equipment?.equipment_name}</strong></p>
              <p className="text-muted-foreground">{selected.shop_customer?.full_name} · {selected.shop_customer?.phone}</p>
              <p className="text-muted-foreground">{formatDate(selected.start_date)} → {formatDate(selected.end_date)}</p>
              <p>Total {formatMoney(selected.total_amount)} · Advance paid {formatMoney(selected.advance_paid)}</p>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Camera className="h-4 w-4" /> Return document
          </h2>
          <div>
            <Label>Photo of signed return document *</Label>
            <Input
              type="file"
              accept="image/*"
              capture="environment"
              className="mt-1"
              onChange={(e) => setReturnFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground mt-1">Use camera on mobile to capture the return receipt or handover form.</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Advance refund</h2>
          <div>
            <Label>Amount to return to customer</Label>
            <Input
              type="number"
              min={0}
              max={maxRefund}
              step="0.01"
              value={advanceRefunded}
              onChange={(e) => setAdvanceRefunded(e.target.value)}
              placeholder={maxRefund > 0 ? `Max ${formatMoney(maxRefund)}` : "0"}
              className="mt-1"
            />
            {maxRefund > 0 && (
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs mt-1"
                onClick={() => setAdvanceRefunded(String(maxRefund))}
              >
                Refund full advance ({formatMoney(maxRefund)})
              </Button>
            )}
          </div>
          <div>
            <Label>Refund method</Label>
            <Select value={refundMethod} onValueChange={(v) => setRefundMethod(v as PaymentMethod)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REFUND_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Condition, damages, remarks…" className="mt-1" />
          </div>
        </div>

        <Button
          size="lg"
          className="w-full"
          disabled={submitting || !selected || !returnFile}
          onClick={() => void submit()}
        >
          {submitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…</>
          ) : (
            <><PackageCheck className="h-4 w-4 mr-2" /> Complete collection</>
          )}
        </Button>
      </div>
    </>
  );
}
