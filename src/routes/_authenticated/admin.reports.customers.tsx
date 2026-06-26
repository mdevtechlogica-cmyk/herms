import { createFileRoute } from "@tanstack/react-router";

import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import { db } from "@/lib/db";

import { ReportShell } from "@/components/reports/ReportShell";

import { useBranchScope } from "@/hooks/use-branch-scope";

import { downloadCsv } from "@/lib/export-csv";

import { Users, Phone } from "lucide-react";

import type { Booking, ShopCustomer } from "@/lib/types";



export const Route = createFileRoute("/_authenticated/admin/reports/customers")({

  component: CustomersReport,

});



function CustomersReport() {

  const { branchId, formatDate, formatMoney, filterByBranch } = useBranchScope();



  const { data: customers = [], isLoading } = useQuery({

    queryKey: ["report-customers", branchId],

    queryFn: async () => {

      const rows = ((await db

        .from("shop_customers")

        .select("*")

        .order("created_at", { ascending: false })

      ).data ?? []) as ShopCustomer[];

      if (!branchId) return rows;

      return rows.filter((c) => !c.branch_id || c.branch_id === branchId);

    },

  });



  const { data: bookings = [] } = useQuery({

    queryKey: ["report-customer-bookings", branchId],

    queryFn: async () => {

      const rows = ((await db

        .from("bookings")

        .select("shop_customer_id, total_amount, branch_id")

      ).data ?? []) as Pick<Booking, "shop_customer_id" | "total_amount" | "branch_id">[];

      return filterByBranch(rows);

    },

  });



  const bookingStats = useMemo(() => {

    const byCustomer = new Map<string, { count: number; revenue: number }>();

    for (const b of bookings) {

      if (!b.shop_customer_id) continue;

      const cur = byCustomer.get(b.shop_customer_id) ?? { count: 0, revenue: 0 };

      cur.count += 1;

      cur.revenue += Number(b.total_amount ?? 0);

      byCustomer.set(b.shop_customer_id, cur);

    }

    return byCustomer;

  }, [bookings]);



  const stats = useMemo(() => ({

    total: customers.length,

    withPhone: customers.filter((c) => c.phone).length,

    withBookings: customers.filter((c) => bookingStats.has(c.id)).length,

  }), [customers, bookingStats]);



  const exportCsv = () => {

    downloadCsv(

      `customers-report-${branchId ?? "all"}.csv`,

      ["Name", "Phone", "Email", "Address", "ID type", "ID number", "Bookings", "Total spent", "Joined"],

      customers.map((c) => {

        const b = bookingStats.get(c.id);

        return [

          c.full_name,

          c.phone ?? "",

          c.email ?? "",

          c.address ?? "",

          c.id_document_type ?? "",

          c.id_document_number ?? "",

          b?.count ?? 0,

          b?.revenue ?? 0,

          c.created_at.slice(0, 10),

        ];

      }),

    );

  };



  return (

    <ReportShell

      title="Customers report"

      description="Walk-in customers and their rental activity"

      icon={Users}

      accent="from-rose-500/20 via-rose-500/5 to-transparent"

      stats={[

        { label: "Customers", value: stats.total, icon: Users },

        { label: "With phone", value: stats.withPhone, icon: Phone },

        { label: "With bookings", value: stats.withBookings },

      ]}

      onExport={exportCsv}

      exportDisabled={customers.length === 0}

    >

      <table className="w-full text-sm">

        <thead className="bg-muted/40 text-muted-foreground border-b">

          <tr className="text-left">

            <th className="px-5 py-3 font-medium">Name</th>

            <th className="px-5 py-3 font-medium">Phone</th>

            <th className="px-5 py-3 font-medium">Email</th>

            <th className="px-5 py-3 font-medium">Bookings</th>

            <th className="px-5 py-3 font-medium">Total spent</th>

            <th className="px-5 py-3 font-medium">Joined</th>

          </tr>

        </thead>

        <tbody>

          {isLoading ? (

            <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">Loading…</td></tr>

          ) : customers.length === 0 ? (

            <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No customers for this branch.</td></tr>

          ) : (

            customers.map((c) => {

              const b = bookingStats.get(c.id);

              return (

                <tr key={c.id} className="border-t">

                  <td className="px-5 py-3 font-medium">{c.full_name}</td>

                  <td className="px-5 py-3">{c.phone ?? "—"}</td>

                  <td className="px-5 py-3">{c.email ?? "—"}</td>

                  <td className="px-5 py-3">{b?.count ?? 0}</td>

                  <td className="px-5 py-3">{b ? formatMoney(b.revenue) : "—"}</td>

                  <td className="px-5 py-3 text-muted-foreground">{formatDate(c.created_at)}</td>

                </tr>

              );

            })

          )}

        </tbody>

      </table>

    </ReportShell>

  );

}

