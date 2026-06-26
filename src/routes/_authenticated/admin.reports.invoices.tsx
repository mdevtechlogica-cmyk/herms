import { createFileRoute } from "@tanstack/react-router";

import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { db } from "@/lib/db";

import { ReportShell } from "@/components/reports/ReportShell";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { useBranchScope } from "@/hooks/use-branch-scope";

import { downloadCsv } from "@/lib/export-csv";

import { FileText, Banknote } from "lucide-react";

import type { Booking, Invoice } from "@/lib/types";



export const Route = createFileRoute("/_authenticated/admin/reports/invoices")({

  component: InvoicesReport,

});



function InvoicesReport() {

  const { branchId, formatMoney, formatDate, taxLabel, filterByBranch } = useBranchScope();

  const [fromDate, setFromDate] = useState("");

  const [toDate, setToDate] = useState("");



  const { data: invoices = [], isLoading } = useQuery({

    queryKey: ["report-invoices", branchId],

    queryFn: async () => {

      const bookings = filterByBranch(

        ((await db.from("bookings").select("id, branch_id")).data ?? []) as Booking[],

      );

      const ids = new Set(bookings.map((b) => b.id));

      const rows = ((await db

        .from("invoices")

        .select("*")

        .order("invoice_date", { ascending: false })

      ).data ?? []) as Invoice[];

      return rows.filter((i) => ids.has(i.booking_id));

    },

  });



  const filtered = useMemo(() => {

    return invoices.filter((inv) => {

      const d = inv.invoice_date.slice(0, 10);

      if (fromDate && d < fromDate) return false;

      if (toDate && d > toDate) return false;

      return true;

    });

  }, [invoices, fromDate, toDate]);



  const stats = useMemo(() => ({

    count: filtered.length,

    subtotal: filtered.reduce((s, i) => s + Number(i.amount), 0),

    tax: filtered.reduce((s, i) => s + Number(i.tax), 0),

    total: filtered.reduce((s, i) => s + Number(i.total), 0),

  }), [filtered]);



  const exportCsv = () => {

    downloadCsv(

      `invoices-report-${branchId ?? "all"}.csv`,

      ["Invoice #", "Date", "Booking ID", "Amount", taxLabel, "Total"],

      filtered.map((i) => [

        i.invoice_number,

        i.invoice_date.slice(0, 10),

        i.booking_id,

        i.amount,

        i.tax,

        i.total,

      ]),

    );

  };



  return (

    <ReportShell

      title="Invoices report"

      description="Generated invoices for completed rentals"

      icon={FileText}

      accent="from-indigo-500/20 via-indigo-500/5 to-transparent"

      stats={[

        { label: "Invoices", value: stats.count, icon: FileText },

        { label: "Subtotal", value: formatMoney(stats.subtotal), icon: Banknote },

        { label: taxLabel, value: formatMoney(stats.tax) },

        { label: "Total billed", value: formatMoney(stats.total) },

      ]}

      filters={

        <div className="grid gap-3 sm:grid-cols-2">

          <div>

            <Label className="text-xs">From date</Label>

            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />

          </div>

          <div>

            <Label className="text-xs">To date</Label>

            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />

          </div>

        </div>

      }

      onExport={exportCsv}

      exportDisabled={filtered.length === 0}

    >

      <table className="w-full text-sm">

        <thead className="bg-muted/40 text-muted-foreground border-b">

          <tr className="text-left">

            <th className="px-5 py-3 font-medium">Invoice #</th>

            <th className="px-5 py-3 font-medium">Date</th>

            <th className="px-5 py-3 font-medium">Amount</th>

            <th className="px-5 py-3 font-medium">{taxLabel}</th>

            <th className="px-5 py-3 font-medium">Total</th>

          </tr>

        </thead>

        <tbody>

          {isLoading ? (

            <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">Loading…</td></tr>

          ) : filtered.length === 0 ? (

            <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No invoices for these filters.</td></tr>

          ) : (

            filtered.map((i) => (

              <tr key={i.id} className="border-t">

                <td className="px-5 py-3 font-medium">{i.invoice_number}</td>

                <td className="px-5 py-3">{formatDate(i.invoice_date)}</td>

                <td className="px-5 py-3">{formatMoney(i.amount)}</td>

                <td className="px-5 py-3">{formatMoney(i.tax)}</td>

                <td className="px-5 py-3 font-medium">{formatMoney(i.total)}</td>

              </tr>

            ))

          )}

        </tbody>

      </table>

    </ReportShell>

  );

}

