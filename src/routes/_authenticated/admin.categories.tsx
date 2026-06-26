import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { EquipmentCategory } from "@/lib/types";

import { useEmployeeAccess } from "@/hooks/use-employee-access";

export const Route = createFileRoute("/_authenticated/admin/categories")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const { canAddCategories } = useEmployeeAccess();
  const { data: cats = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => ((await db.from("equipment_categories").select("*").order("category_name")).data ?? []) as EquipmentCategory[],
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentCategory | null>(null);
  const [form, setForm] = useState({ category_name: "", description: "", icon: "" });

  const startNew = () => {
    if (!canAddCategories) {
      toast.error("You do not have permission to add categories.");
      return;
    }
    setEditing(null);
    setForm({ category_name: "", description: "", icon: "" });
    setOpen(true);
  };
  const startEdit = (c: EquipmentCategory) => { setEditing(c); setForm({ category_name: c.category_name, description: c.description || "", icon: c.icon || "" }); setOpen(true); };

  const save = async () => {
    const { error } = editing
      ? await db.from("equipment_categories").update(form).eq("id", editing.id)
      : await db.from("equipment_categories").insert(form);
    if (error) return toast.error(error.message);
    toast.success("Saved"); setOpen(false); qc.invalidateQueries({ queryKey: ["categories"] });
  };
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await db.from("equipment_categories").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["categories"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Categories"
        actions={
          canAddCategories ? (
            <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" /> New category</Button>
          ) : null
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map(c => (
          <div key={c.id} className="rounded-xl border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{c.category_name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{c.description || "—"}</p>
              </div>
              <div className="flex gap-1">
                {canAddCategories ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete category?")) del.mutate(c.id); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.category_name} onChange={(e) => setForm({ ...form, category_name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Icon name (Lucide)</Label><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
