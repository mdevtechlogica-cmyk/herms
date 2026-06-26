import { createFileRoute } from "@tanstack/react-router";

import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import { db } from "@/lib/db";

import { ReportShell } from "@/components/reports/ReportShell";

import { StatusBadge } from "@/components/StatusBadge";

import { useBranchScope } from "@/hooks/use-branch-scope";

import { downloadCsv } from "@/lib/export-csv";

import { Truck } from "lucide-react";

import type { Equipment, EquipmentStatus } from "@/lib/types";



export const Route = createFileRoute("/_authenticated/admin/reports/equipment")({

  component: EquipmentReport,

});



const STATUSES: EquipmentStatus[] = ["available", "booked", "under_maintenance", "out_of_service"];



function EquipmentReport() {

  const { branchId, formatMoney, filterByBranch } = useBranchScope();



  const { data: equipment = [], isLoading } = useQuery({

    queryKey: ["report-equipment", branchId],

    queryFn: async () => {

      const rows = ((await db

        .from("equipment")

        .select("*, category:equipment_categories(category_name)")

        .order("equipment_name")

      ).data ?? []) as Equipment[];

      return filterByBranch(rows);

    },

  });



  const stats = useMemo(() => {

    const byStatus = Object.fromEntries(

      STATUSES.map((s) => [s, equipment.filter((e) => e.status === s).length]),

    ) as Record<EquipmentStatus, number>;

    const fleetValue = equipment.reduce((s, e) => s + (e.daily_rate ?? 0), 0);

    return { total: equipment.length, byStatus, fleetValue };

  }, [equipment]);



  const exportCsv = () => {

    downloadCsv(

      `equipment-report-${branchId ?? "all"}.csv`,

      ["Name", "Category", "Brand", "Model", "Status", "Daily rate", "Location"],

      equipment.map((e) => [

        e.equipment_name,

        e.category?.category_name ?? "",

        e.brand ?? "",

        e.model ?? "",

        e.status,

        e.daily_rate,

        e.location ?? "",

      ]),

    );

  };



  return (

    <ReportShell

      title="Equipment report"

      description="Fleet overview and availability for this branch"

      icon={Truck}

      accent="from-violet-500/20 via-violet-500/5 to-transparent"

      stats={[

        { label: "Total fleet", value: stats.total, icon: Truck },

        { label: "Available", value: stats.byStatus.available },

        { label: "Daily rate (list)", value: formatMoney(stats.fleetValue), hint: "Combined daily rates" },

      ]}

      onExport={exportCsv}

      exportDisabled={equipment.length === 0}

    >

      <table className="w-full text-sm">

        <thead className="bg-muted/40 text-muted-foreground border-b">

          <tr className="text-left">

            <th className="px-5 py-3 font-medium">Equipment</th>

            <th className="px-5 py-3 font-medium">Category</th>

            <th className="px-5 py-3 font-medium">Brand / Model</th>

            <th className="px-5 py-3 font-medium">Daily rate</th>

            <th className="px-5 py-3 font-medium">Location</th>

            <th className="px-5 py-3 font-medium">Status</th>

          </tr>

        </thead>

        <tbody>

          {isLoading ? (

            <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">Loading…</td></tr>

          ) : equipment.length === 0 ? (

            <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No equipment in this branch.</td></tr>

          ) : (

            equipment.map((e) => (

              <tr key={e.id} className="border-t">

                <td className="px-5 py-3 font-medium">{e.equipment_name}</td>

                <td className="px-5 py-3">{e.category?.category_name ?? "—"}</td>

                <td className="px-5 py-3 text-muted-foreground">

                  {[e.brand, e.model].filter(Boolean).join(" ") || "—"}

                </td>

                <td className="px-5 py-3">{formatMoney(e.daily_rate)}</td>

                <td className="px-5 py-3">{e.location ?? "—"}</td>

                <td className="px-5 py-3"><StatusBadge status={e.status} /></td>

              </tr>

            ))

          )}

        </tbody>

      </table>

    </ReportShell>

  );

}

