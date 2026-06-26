import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BRANCHES_MIGRATION_HINT, insertBranch } from "@/lib/branches";
import { toErrorMessage } from "@/lib/errors";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";
import { usePlan, planLimitMessage } from "@/lib/plan-context";
import { PlanUsageBanner } from "@/components/PlanUsageBanner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { COUNTRIES, COUNTRY_LIST, isCountryCode, type CountryCode } from "@/lib/locale/countries";
import { Plus, MapPin } from "lucide-react";
import { toast } from "sonner";
import type { Branch } from "@/lib/types";
import {
  formatPhoneE164,
  validateNationalPhone,
} from "@/lib/contact-validators";
import { PhoneInput } from "@/components/PhoneInput";

export const Route = createFileRoute("/_authenticated/admin/branches")({
  component: AdminBranches,
});

function AdminBranches() {
  const { user } = useAuth();
  const { branches, refreshBranches } = useWorkspace();
  const { plan, canAddBranch, refresh: refreshPlan } = usePlan();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    country_code: "IN" as CountryCode,
    address: "",
    phone_country: "IN" as CountryCode,
    phone: "",
  });
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const createBranch = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!form.name.trim()) throw new Error("Branch name is required");

      const phoneValidation = form.phone.trim()
        ? validateNationalPhone(form.phone_country, form.phone)
        : null;
      if (phoneValidation) throw new Error(phoneValidation);

      const phone = form.phone.trim()
        ? formatPhoneE164(form.phone_country, form.phone)
        : null;

      return insertBranch({
        owner_id: user.id,
        name: form.name.trim(),
        country_code: form.country_code,
        address: form.address.trim() || null,
        phone,
      });
    },
    onSuccess: async (result) => {
      toast.success("Branch added");
      if (result?.migrationRequired) {
        toast.warning(BRANCHES_MIGRATION_HINT, { duration: 12000 });
      }
      setOpen(false);
      setForm({ name: "", country_code: "IN", address: "", phone_country: "IN", phone: "" });
      setPhoneError(null);
      await refreshBranches();
      await refreshPlan();
      await qc.invalidateQueries({ queryKey: ["workspace-branches"] });
    },
    onError: (e: Error) => toast.error(toErrorMessage(e)),
  });

  const handleAddClick = () => {
    if (!canAddBranch) {
      toast.error(planLimitMessage("branch", plan));
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Branches"
        description="Manage your rental locations across countries"
        actions={
          <Button onClick={handleAddClick} disabled={!canAddBranch}>
            <Plus className="h-4 w-4 mr-1" /> Add branch
          </Button>
        }
      />

      <div className="space-y-4 mb-6">
        <PlanUsageBanner kind="branch" />
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr className="text-left">
              <th className="px-5 py-3 font-medium">Branch</th>
              <th className="px-5 py-3 font-medium">Country</th>
              <th className="px-5 py-3 font-medium">Address</th>
              <th className="px-5 py-3 font-medium">Phone</th>
            </tr>
          </thead>
          <tbody>
            {branches.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                  No branches yet.{" "}
                  {canAddBranch ? (
                    <button type="button" className="text-primary underline" onClick={handleAddClick}>
                      Add your first branch
                    </button>
                  ) : (
                    <Link to="/admin/subscription" className="text-primary underline">Upgrade plan</Link>
                  )}
                </td>
              </tr>
            ) : (
              branches.map((b: Branch) => (
                <tr key={b.id} className="border-t">
                  <td className="px-5 py-3 font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {b.name}
                  </td>
                  <td className="px-5 py-3">
                    {isCountryCode(b.country_code) ? COUNTRIES[b.country_code].name : b.country_code}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{b.address || "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{b.phone || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add branch</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Branch name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Mumbai Depot"
              />
            </div>
            <div>
              <Label>Country</Label>
              <Select
                value={form.country_code}
                onValueChange={(v) => {
                  const code = v as CountryCode;
                  setForm({ ...form, country_code: code, phone_country: code });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRY_LIST.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Street, city"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <PhoneInput
                countryCode={form.phone_country}
                value={form.phone}
                onCountryChange={(code) => setForm({ ...form, phone_country: code })}
                onValueChange={(phone) => {
                  setForm({ ...form, phone });
                  if (phoneError) setPhoneError(null);
                }}
                error={phoneError}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (form.phone.trim()) {
                  const err = validateNationalPhone(form.phone_country, form.phone);
                  if (err) {
                    setPhoneError(err);
                    return;
                  }
                }
                setPhoneError(null);
                createBranch.mutate();
              }}
              disabled={createBranch.isPending || !canAddBranch}
            >
              {createBranch.isPending ? "Saving…" : "Save branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
