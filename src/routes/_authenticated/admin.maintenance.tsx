import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Equipment, MaintenanceLog, MaintenanceType, MaintenanceStatus } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/maintenance")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const { branchId, formatMoney, formatDate, filterByBranch } = useBranchScope();
  const { data: equipment = [] } = useQuery({
    queryKey: ["equipment-min", branchId],
    queryFn: async () => {
      const rows = ((await db.from("equipment").select("id, equipment_name, branch_id").order("equipment_name")).data ?? []) as Equipment[];
      return filterByBranch(rows);
    },
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["maintenance", branchId],
    queryFn: async () => {
      const equip = filterByBranch(
        ((await db.from("equipment").select("id, branch_id")).data ?? []) as Equipment[],
      );
      const ids = new Set(equip.map((e) => e.id));
      const rows = ((await db.from("maintenance_logs").select("*, equipment:equipment(equipment_name)").order("service_date", { ascending: false })).data ?? []) as MaintenanceLog[];
      return rows.filter((l) => ids.has(l.equipment_id));
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<MaintenanceLog>>({ maintenance_type: "preventive", status: "scheduled" });

  const save = async () => {
    const payload = {
      equipment_id: form.equipment_id, service_date: form.service_date,
      maintenance_type: form.maintenance_type, vendor: form.vendor,
      cost: form.cost ? Number(form.cost) : 0, remarks: form.remarks,
      next_service_date: form.next_service_date || null, status: form.status ?? "scheduled",
    };
    const { error } = await db.from("maintenance_logs").insert(payload);
    if (error) return toast.error(error.message);
    // also mark equipment under maintenance if scheduled/in_progress
    if (payload.status !== "completed" && payload.equipment_id) {
      await db.from("equipment").update({ status: "under_maintenance" }).eq("id", payload.equipment_id);
    }
    toast.success("Scheduled"); setOpen(false); qc.invalidateQueries({ queryKey: ["maintenance"] });
  };

  return (
    <>
      <PageHeader title="Maintenance" actions={<Button onClick={() => { setForm({ maintenance_type: "preventive", status: "scheduled" }); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Schedule</Button>} />
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground"><tr className="text-left">
            <th className="px-5 py-3 font-medium">Equipment</th>
            <th className="px-5 py-3 font-medium">Type</th>
            <th className="px-5 py-3 font-medium">Service date</th>
            <th className="px-5 py-3 font-medium">Next service</th>
            <th className="px-5 py-3 font-medium">Vendor</th>
            <th className="px-5 py-3 font-medium">Cost</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr></thead>
          <tbody>{logs.map(l => (
            <tr key={l.id} className="border-t">
              <td className="px-5 py-3 font-medium">{l.equipment?.equipment_name}</td>
              <td className="px-5 py-3 capitalize">{l.maintenance_type}</td>
              <td className="px-5 py-3">{formatDate(l.service_date)}</td>
              <td className="px-5 py-3 text-muted-foreground">{l.next_service_date ? formatDate(l.next_service_date) : "—"}</td>
              <td className="px-5 py-3">{l.vendor}</td>
              <td className="px-5 py-3">{formatMoney(l.cost ?? 0)}</td>
              <td className="px-5 py-3"><StatusBadge status={l.status} /></td>
            </tr>
          ))}{logs.length === 0 && (<tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">No maintenance logs.</td></tr>)}</tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule maintenance</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Equipment</Label>
              <Select value={form.equipment_id ?? ""} onValueChange={(v) => setForm({ ...form, equipment_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.equipment_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Type</Label>
              <Select value={form.maintenance_type ?? "preventive"} onValueChange={(v) => setForm({ ...form, maintenance_type: v as MaintenanceType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(["preventive","breakdown","scheduled"] as const).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status ?? "scheduled"} onValueChange={(v) => setForm({ ...form, status: v as MaintenanceStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(["scheduled","in_progress","completed"] as const).map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Service date</Label><Input type="date" value={form.service_date ?? ""} onChange={(e) => setForm({ ...form, service_date: e.target.value })} /></div>
            <div><Label>Next service</Label><Input type="date" value={form.next_service_date ?? ""} onChange={(e) => setForm({ ...form, next_service_date: e.target.value })} /></div>
            <div><Label>Vendor</Label><Input value={form.vendor ?? ""} onChange={(e) => setForm({ ...form, vendor: e.target.value })} /></div>
            <div><Label>Cost</Label><Input type="number" value={form.cost ?? ""} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} /></div>
            <div className="col-span-2"><Label>Remarks</Label><Textarea value={form.remarks ?? ""} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Schedule</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
