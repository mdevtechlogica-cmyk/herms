import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
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
import { useEmployeeAccess } from "@/hooks/use-employee-access";
import { usePlan, planLimitMessage } from "@/lib/plan-context";
import { PlanUsageBanner } from "@/components/PlanUsageBanner";
import { Plus, Pencil, Trash2, Construction, MapPin, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { EQUIPMENT_STATUSES, updateEquipmentStatus } from "@/lib/equipment-status";
import type { SubscriptionPlan } from "@/lib/plans";
import type { TranslationTree } from "@/lib/locale/translations/en";
import type { Equipment, EquipmentCategory, EquipmentStatus } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/equipment")({
  component: AdminEquipment,
});

function AdminEquipment() {
  const qc = useQueryClient();
  const { branchId, branchName, branchesInCountry, formatMoney, filterByBranch, t } = useBranchScope();
  const { plan, canAddEquipment, refresh: refreshPlan } = usePlan();
  const { canAddEquipment: employeeCanAdd } = useEmployeeAccess();
  const allowAddEquipment = canAddEquipment && employeeCanAdd;
  const branchScopeKey = useMemo(
    () => branchesInCountry.map((b) => b.id).sort().join(","),
    [branchesInCountry],
  );
  const { data: equipment = [] } = useQuery({
    queryKey: ["admin-equipment-list", branchId, branchScopeKey],
    queryFn: async () => {
      const rows = ((await db.from("equipment").select("*, category:equipment_categories(*)").order("equipment_name")).data ?? []) as Equipment[];
      return filterByBranch(rows);
    },
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => ((await db.from("equipment_categories").select("*")).data ?? []) as EquipmentCategory[],
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [viewing, setViewing] = useState<Equipment | null>(null);
  const [search, setSearch] = useState("");

  const filteredEquipment = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return equipment;
    return equipment.filter((e) => {
      const haystack = [
        e.equipment_name,
        e.category?.category_name,
        e.brand,
        e.model,
        e.location,
        e.fuel_type,
        e.capacity,
        e.description,
        e.status?.replace(/_/g, " "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [equipment, search]);

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await db.from("equipment").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success(t.equipment.deleted); qc.invalidateQueries({ queryKey: ["admin-equipment-list"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EquipmentStatus }) => {
      await updateEquipmentStatus(id, status);
    },
    onSuccess: (_data, { id, status }) => {
      toast.success(t.equipment.statusUpdated);
      setViewing((current) => (current?.id === id ? { ...current, status } : current));
      void qc.invalidateQueries({ queryKey: ["admin-equipment-list"] });
      void qc.invalidateQueries({ queryKey: ["book-now-equipment"] });
      void qc.invalidateQueries({ queryKey: ["admin-equipment"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleStatusChange = (id: string, status: EquipmentStatus) => {
    statusMutation.mutate({ id, status });
  };

  const openAdd = () => {
    if (!allowAddEquipment) {
      toast.error(employeeCanAdd ? planLimitMessage("equipment", plan) : "You do not have permission to add equipment.");
      return;
    }
    setEditing(null);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title={t.equipment.title}
        description={
          search.trim()
            ? t.equipment.unitsFiltered
                .replace("{filtered}", String(filteredEquipment.length))
                .replace("{total}", String(equipment.length))
            : t.equipment.unitsInBranch.replace("{count}", String(equipment.length))
        }
        actions={
          <Button onClick={openAdd} disabled={!allowAddEquipment}><Plus className="h-4 w-4 mr-1" /> {t.equipment.addEquipment}</Button>
        }
      />
      <div className="mb-4">
        <PlanUsageBanner kind="equipment" />
      </div>
      {equipment.length > 0 && (
        <EquipmentStatusSection
          equipment={equipment}
          t={t}
          onStatusChange={handleStatusChange}
          statusChangingId={statusMutation.isPending ? statusMutation.variables?.id : undefined}
        />
      )}
      {equipment.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.equipment.searchPlaceholder}
            className="pl-9"
          />
        </div>
      )}
      <div className="rounded-xl border bg-card overflow-x-auto">
        {equipment.length === 0 ? (
          <div className="px-5 py-16 text-center text-muted-foreground">
            {t.equipment.emptyBranch}
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div className="px-5 py-16 text-center text-muted-foreground">
            {t.equipment.noMatches.replace("{query}", search.trim())}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4">
            {filteredEquipment.map((e) => (
              <EquipmentCard
                key={e.id}
                equipment={e}
                formatMoney={formatMoney}
                branchLabel={e.branch_id ? branchName(e.branch_id) : undefined}
                t={t}
                onSelect={() => setViewing(e)}
                onEdit={() => { setEditing(e); setOpen(true); }}
                onDelete={() => { if (confirm(t.equipment.deleteConfirm)) del.mutate(e.id); }}
                onStatusChange={handleStatusChange}
                statusChanging={statusMutation.isPending && statusMutation.variables?.id === e.id}
              />
            ))}
          </div>
        )}
      </div>
      <EquipmentDetailDialog
        equipment={viewing}
        formatMoney={formatMoney}
        t={t}
        onClose={() => setViewing(null)}
        onStatusChange={handleStatusChange}
        statusChanging={statusMutation.isPending && statusMutation.variables?.id === viewing?.id}
        onEdit={(item) => {
          setViewing(null);
          setEditing(item);
          setOpen(true);
        }}
      />
      <EquipmentDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        categories={categories}
        branchId={branchId}
        canAddEquipment={allowAddEquipment}
        plan={plan}
        t={t}
        onDone={async () => {
          qc.invalidateQueries({ queryKey: ["admin-equipment-list"] });
          await refreshPlan();
        }}
      />
    </>
  );
}

function EquipmentStatusSelect({
  value,
  onChange,
  t,
  disabled,
  compact,
}: {
  value: EquipmentStatus;
  onChange: (status: EquipmentStatus) => void;
  t: TranslationTree;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as EquipmentStatus)} disabled={disabled}>
      <SelectTrigger className={compact ? "h-8 text-xs" : undefined}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {EQUIPMENT_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>{t.status[s]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function EquipmentStatusSection({
  equipment,
  t,
  onStatusChange,
  statusChangingId,
}: {
  equipment: Equipment[];
  t: TranslationTree;
  onStatusChange: (id: string, status: EquipmentStatus) => void;
  statusChangingId?: string;
}) {
  const counts = useMemo(
    () => Object.fromEntries(
      EQUIPMENT_STATUSES.map((s) => [s, equipment.filter((e) => e.status === s).length]),
    ) as Record<EquipmentStatus, number>,
    [equipment],
  );

  return (
    <div className="mb-4 rounded-xl border bg-card p-4 space-y-4">
      <div>
        <h2 className="font-semibold text-sm">{t.equipment.statusSectionTitle}</h2>
        <p className="text-xs text-muted-foreground mt-1">{t.equipment.statusSectionHint}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {EQUIPMENT_STATUSES.map((s) => (
          <div key={s} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5 text-sm">
            <StatusBadge status={s} />
            <span className="font-semibold tabular-nums">{counts[s]}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{t.equipment.changeStatus}</p>
        <div className="divide-y rounded-lg border overflow-hidden">
          {equipment.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-3 py-2.5 bg-background">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{e.equipment_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {[e.brand, e.model].filter(Boolean).join(" · ") || t.equipment.uncategorized}
                </p>
              </div>
              <div className="w-[9.5rem] shrink-0">
                <EquipmentStatusSelect
                  value={e.status}
                  onChange={(status) => onStatusChange(e.id, status)}
                  t={t}
                  disabled={statusChangingId === e.id}
                  compact
                />
              </div>
              {statusChangingId === e.id ? (
                <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <StatusBadge status={e.status} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EquipmentCard({
  equipment: e,
  formatMoney,
  branchLabel,
  t,
  onSelect,
  onEdit,
  onDelete,
  onStatusChange,
  statusChanging,
}: {
  equipment: Equipment;
  formatMoney: (amount: number) => string;
  branchLabel?: string;
  t: TranslationTree;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (id: string, status: EquipmentStatus) => void;
  statusChanging?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(e.main_image) && !imageFailed;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onSelect(); } }}
      className="group rounded-xl border bg-background overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {showImage ? (
          <img
            src={e.main_image!}
            alt={e.equipment_name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground bg-muted/60">
            <Construction className="h-10 w-10 opacity-40" />
            <span className="text-xs">{t.equipment.noImage}</span>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <StatusBadge status={e.status} />
        </div>
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 shadow-sm"
            onClick={(ev) => { ev.stopPropagation(); onEdit(); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 shadow-sm"
            onClick={(ev) => { ev.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>
      <div className="p-4 space-y-2">
        <div>
          <h3 className="font-semibold leading-tight line-clamp-2">{e.equipment_name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {[e.category?.category_name, e.brand, e.model].filter(Boolean).join(" · ") || t.equipment.uncategorized}
          </p>
        </div>
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <div>
            <span className="font-semibold">{formatMoney(e.daily_rate)}</span>
            <span className="text-muted-foreground text-xs">{t.equipment.perDay}</span>
          </div>
          {e.monthly_rate != null && e.monthly_rate > 0 && (
            <div className="text-xs text-muted-foreground">
              {formatMoney(e.monthly_rate)}{t.equipment.perMonth}
            </div>
          )}
        </div>
        {branchLabel && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            {branchLabel}
          </p>
        )}
        {e.location && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            {e.location}
          </p>
        )}
        <div
          className="pt-1"
          onClick={(ev) => ev.stopPropagation()}
          onKeyDown={(ev) => ev.stopPropagation()}
        >
          <Label className="text-[10px] text-muted-foreground">{t.equipment.status}</Label>
          <EquipmentStatusSelect
            value={e.status}
            onChange={(status) => onStatusChange(e.id, status)}
            t={t}
            disabled={statusChanging}
            compact
          />
        </div>
        <div className="flex gap-2 pt-1 sm:hidden">
          <Button size="sm" variant="outline" className="flex-1 h-8" onClick={(ev) => { ev.stopPropagation(); onEdit(); }}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> {t.equipment.edit}
          </Button>
          <Button size="sm" variant="outline" className="h-8" onClick={(ev) => { ev.stopPropagation(); onDelete(); }}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>
    </article>
  );
}

function EquipmentDetailDialog({
  equipment,
  formatMoney,
  t,
  onClose,
  onEdit,
  onStatusChange,
  statusChanging,
}: {
  equipment: Equipment | null;
  formatMoney: (amount: number) => string;
  t: TranslationTree;
  onClose: () => void;
  onEdit: (item: Equipment) => void;
  onStatusChange: (id: string, status: EquipmentStatus) => void;
  statusChanging?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [equipment?.id]);

  if (!equipment) return null;

  const e = equipment;
  const showImage = Boolean(e.main_image) && !imageFailed;

  return (
    <Dialog open={Boolean(equipment)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg sm:max-w-2xl p-0 gap-0 overflow-hidden">
        <div className="relative aspect-[16/10] sm:aspect-[16/9] bg-muted">
          {showImage ? (
            <img
              src={e.main_image!}
              alt={e.equipment_name}
              className="h-full w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <Construction className="h-16 w-16 opacity-40" />
              <span className="text-sm">{t.equipment.noImage}</span>
            </div>
          )}
          <div className="absolute top-3 left-3">
            <StatusBadge status={e.status} />
          </div>
        </div>
        <div className="p-5 sm:p-6 space-y-4">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-xl sm:text-2xl">{e.equipment_name}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {[e.category?.category_name, e.brand, e.model].filter(Boolean).join(" · ") || t.equipment.uncategorized}
            </p>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{t.equipment.dailyRate}</p>
              <p className="font-semibold">{formatMoney(e.daily_rate)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{t.equipment.monthlyRate}</p>
              <p className="font-semibold">{e.monthly_rate ? formatMoney(e.monthly_rate) : "—"}</p>
            </div>
            {e.location && (
              <div className="rounded-lg bg-muted/50 p-3 col-span-2">
                <p className="text-xs text-muted-foreground">{t.equipment.location}</p>
                <p className="font-medium flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{e.location}</p>
              </div>
            )}
            {e.manufacture_year && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">{t.equipment.year}</p>
                <p className="font-medium">{e.manufacture_year}</p>
              </div>
            )}
            {e.capacity && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">{t.equipment.capacity}</p>
                <p className="font-medium">{e.capacity}</p>
              </div>
            )}
            {e.fuel_type && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">{t.equipment.fuel}</p>
                <p className="font-medium">{e.fuel_type}</p>
              </div>
            )}
            {e.transport_charge > 0 && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">{t.equipment.transport}</p>
                <p className="font-medium">{formatMoney(e.transport_charge)}</p>
              </div>
            )}
          </div>

          {e.description && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t.equipment.description}</p>
              <p className="text-sm leading-relaxed">{e.description}</p>
            </div>
          )}

          <div className="rounded-xl border p-4 space-y-2">
            <p className="text-sm font-medium">{t.equipment.changeStatus}</p>
            <p className="text-xs text-muted-foreground">{t.equipment.statusSectionHint}</p>
            <EquipmentStatusSelect
              value={e.status}
              onChange={(status) => onStatusChange(e.id, status)}
              t={t}
              disabled={statusChanging}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={onClose}>{t.equipment.close}</Button>
            <Button onClick={() => onEdit(e)}>
              <Pencil className="h-4 w-4 mr-1" /> {t.equipment.edit}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EquipmentDialog({ open, onOpenChange, editing, categories, branchId, canAddEquipment, plan, t, onDone }: {
  open: boolean; onOpenChange: (v: boolean) => void; editing: Equipment | null;
  categories: EquipmentCategory[]; branchId: string | null;
  canAddEquipment: boolean; plan: SubscriptionPlan;
  t: TranslationTree;
  onDone: () => void;
}) {
  const [form, setForm] = useState<Partial<Equipment>>({});
  useState(() => { setForm(editing ?? { status: "available" }); return null; });
  // Reset on open change
  if (open && editing && form.id !== editing.id) setForm(editing);
  if (open && !editing && form.id) setForm({ status: "available" });

  const save = async () => {
    if (!editing && !canAddEquipment) {
      toast.error(planLimitMessage("equipment", plan));
      return;
    }
    const payload = {
      equipment_name: form.equipment_name, category_id: form.category_id, brand: form.brand,
      model: form.model, manufacture_year: form.manufacture_year ? Number(form.manufacture_year) : null,
      daily_rate: Number(form.daily_rate) || 0, weekly_rate: form.weekly_rate ? Number(form.weekly_rate) : null,
      monthly_rate: form.monthly_rate ? Number(form.monthly_rate) : null,
      operator_charge: 0, transport_charge: Number(form.transport_charge) || 0,
      fuel_type: form.fuel_type, capacity: form.capacity, description: form.description,
      location: form.location, status: form.status || "available", main_image: form.main_image,
      ...(branchId && !editing ? { branch_id: branchId } : {}),
    };
    const { error } = editing
      ? await db.from("equipment").update(payload).eq("id", editing.id)
      : await db.from("equipment").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(editing ? t.equipment.updated : t.equipment.created); onOpenChange(false); onDone(); }
  };

  const upd = <K extends keyof Equipment>(k: K, v: Equipment[K]) => setForm({ ...form, [k]: v });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? t.equipment.editEquipment : t.equipment.addEquipmentTitle}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>{t.equipment.name} *</Label><Input value={form.equipment_name ?? ""} onChange={(e) => upd("equipment_name", e.target.value)} /></div>
          <div>
            <Label>{t.equipment.category}</Label>
            <Select value={form.category_id ?? ""} onValueChange={(v) => upd("category_id", v)}>
              <SelectTrigger><SelectValue placeholder={t.equipment.selectPlaceholder} /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.category_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t.equipment.status}</Label>
            <Select value={form.status ?? "available"} onValueChange={(v) => upd("status", v as EquipmentStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["available","booked","under_maintenance","out_of_service"] as const).map(s => (
                  <SelectItem key={s} value={s}>{t.status[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>{t.equipment.brand}</Label><Input value={form.brand ?? ""} onChange={(e) => upd("brand", e.target.value)} /></div>
          <div><Label>{t.equipment.model}</Label><Input value={form.model ?? ""} onChange={(e) => upd("model", e.target.value)} /></div>
          <div><Label>{t.equipment.year}</Label><Input type="number" value={form.manufacture_year ?? ""} onChange={(e) => upd("manufacture_year", Number(e.target.value))} /></div>
          <div><Label>{t.equipment.location}</Label><Input value={form.location ?? ""} onChange={(e) => upd("location", e.target.value)} /></div>
          <div><Label>{t.equipment.dailyRate} *</Label><Input type="number" min={0} value={form.daily_rate ?? ""} onChange={(e) => upd("daily_rate", Number(e.target.value))} /></div>
          <div><Label>{t.equipment.monthlyRate}</Label><Input type="number" min={0} value={form.monthly_rate ?? ""} onChange={(e) => upd("monthly_rate", Number(e.target.value))} placeholder={t.equipment.monthlyRatePlaceholder} /></div>
          <div><Label>{t.equipment.transportCharge}</Label><Input type="number" value={form.transport_charge ?? ""} onChange={(e) => upd("transport_charge", Number(e.target.value))} /></div>
          <div><Label>{t.equipment.fuelType}</Label><Input value={form.fuel_type ?? ""} onChange={(e) => upd("fuel_type", e.target.value)} /></div>
          <div><Label>{t.equipment.capacity}</Label><Input value={form.capacity ?? ""} onChange={(e) => upd("capacity", e.target.value)} /></div>
          <div className="col-span-2"><Label>{t.equipment.imageUrl}</Label><Input value={form.main_image ?? ""} onChange={(e) => upd("main_image", e.target.value)} /></div>
          <div className="col-span-2"><Label>{t.equipment.description}</Label><Textarea value={form.description ?? ""} onChange={(e) => upd("description", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button onClick={save}>{t.equipment.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
