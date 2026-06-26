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

import { Wrench, CalendarClock, Banknote } from "lucide-react";

import type { Equipment, MaintenanceLog, MaintenanceStatus, MaintenanceType } from "@/lib/types";



export const Route = createFileRoute("/_authenticated/admin/reports/maintenance")({

  component: MaintenanceReport,

});



function inDateRange(date: string, from: string, to: string) {

  if (from && date < from) return false;

  if (to && date > to) return false;

  return true;

}



function MaintenanceReport() {

  const { branchId, formatMoney, formatDate, filterByBranch } = useBranchScope();

  const [fromDate, setFromDate] = useState("");

  const [toDate, setToDate] = useState("");

  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | "all">("all");

  const [typeFilter, setTypeFilter] = useState<MaintenanceType | "all">("all");



  const { data: logs = [], isLoading } = useQuery({

    queryKey: ["report-maintenance", branchId],

    queryFn: async () => {

      const equip = filterByBranch(

        ((await db.from("equipment").select("id, branch_id")).data ?? []) as Equipment[],

      );

      const ids = new Set(equip.map((e) => e.id));

      const rows = ((await db

        .from("maintenance_logs")

        .select("*, equipment:equipment(equipment_name)")

        .order("service_date", { ascending: false })

      ).data ?? []) as MaintenanceLog[];

      return rows.filter((l) => ids.has(l.equipment_id));

    },

  });



  const filtered = useMemo(() => {

    return logs.filter((l) => {

      if (!inDateRange(l.service_date, fromDate, toDate)) return false;

      if (statusFilter !== "all" && l.status !== statusFilter) return false;

      if (typeFilter !== "all" && l.maintenance_type !== typeFilter) return false;

      return true;

    });

  }, [logs, fromDate, toDate, statusFilter, typeFilter]);



  const stats = useMemo(() => {

    const totalCost = filtered.reduce((s, l) => s + (l.cost ?? 0), 0);

    const upcoming = filtered.filter((l) => {

      if (!l.next_service_date) return false;

      const days = (new Date(l.next_service_date).getTime() - Date.now()) / 86_400_000;

      return days >= 0 && days <= 30;

    }).length;

    const open = filtered.filter((l) => l.status === "scheduled" || l.status === "in_progress").length;

    return { totalCost, upcoming, open, count: filtered.length };

  }, [filtered]);



  const exportCsv = () => {

    downloadCsv(

      `maintenance-report-${branchId ?? "all"}.csv`,

      ["Equipment", "Type", "Service date", "Next service", "Vendor", "Cost", "Status", "Remarks"],

      filtered.map((l) => [

        l.equipment?.equipment_name ?? "",

        l.maintenance_type,

        l.service_date,

        l.next_service_date ?? "",

        l.vendor ?? "",

        l.cost ?? 0,

        l.status,

        l.remarks ?? "",

      ]),

    );

  };



  return (

    <ReportShell

      title="Maintenance report"

      description="Service logs, costs, and upcoming work for this branch"

      icon={Wrench}

      accent="from-amber-500/20 via-amber-500/5 to-transparent"

      stats={[

        { label: "Total records", value: stats.count, icon: Wrench },

        { label: "Total cost", value: formatMoney(stats.totalCost), icon: Banknote },

        { label: "Open jobs", value: stats.open, icon: Wrench },

        { label: "Due in 30 days", value: stats.upcoming, icon: CalendarClock },

      ]}

      filters={

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <div>

            <Label className="text-xs">From date</Label>

            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />

          </div>

          <div>

            <Label className="text-xs">To date</Label>

            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />

          </div>

          <div>

            <Label className="text-xs">Status</Label>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as MaintenanceStatus | "all")}>

              <SelectTrigger><SelectValue /></SelectTrigger>

              <SelectContent>

                <SelectItem value="all">All statuses</SelectItem>

                {(["scheduled", "in_progress", "completed"] as const).map((s) => (

                  <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>

                ))}

              </SelectContent>

            </Select>

          </div>

          <div>

            <Label className="text-xs">Type</Label>

            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as MaintenanceType | "all")}>

              <SelectTrigger><SelectValue /></SelectTrigger>

              <SelectContent>

                <SelectItem value="all">All types</SelectItem>

                {(["preventive", "breakdown", "scheduled"] as const).map((t) => (

                  <SelectItem key={t} value={t}>{t}</SelectItem>

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

            <th className="px-5 py-3 font-medium">Equipment</th>

            <th className="px-5 py-3 font-medium">Type</th>

            <th className="px-5 py-3 font-medium">Service date</th>

            <th className="px-5 py-3 font-medium">Next service</th>

            <th className="px-5 py-3 font-medium">Vendor</th>

            <th className="px-5 py-3 font-medium">Cost</th>

            <th className="px-5 py-3 font-medium">Status</th>

          </tr>

        </thead>

        <tbody>

          {isLoading ? (

            <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">Loading…</td></tr>

          ) : filtered.length === 0 ? (

            <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">No maintenance records for these filters.</td></tr>

          ) : (

            filtered.map((l) => (

              <tr key={l.id} className="border-t">

                <td className="px-5 py-3 font-medium">{l.equipment?.equipment_name}</td>

                <td className="px-5 py-3 capitalize">{l.maintenance_type}</td>

                <td className="px-5 py-3">{formatDate(l.service_date)}</td>

                <td className="px-5 py-3 text-muted-foreground">{l.next_service_date ? formatDate(l.next_service_date) : "—"}</td>

                <td className="px-5 py-3">{l.vendor ?? "—"}</td>

                <td className="px-5 py-3">{formatMoney(l.cost ?? 0)}</td>

                <td className="px-5 py-3"><StatusBadge status={l.status} /></td>

              </tr>

            ))

          )}

        </tbody>

      </table>

    </ReportShell>

  );

}

