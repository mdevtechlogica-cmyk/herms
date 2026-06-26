import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { isShopAdmin } from "@/lib/auth-access";
import { fetchShopStaff, inviteEmployee, updateEmployeePermissionsFn } from "@/lib/api/team.functions";
import { EmployeeAccessCheckboxes } from "@/components/EmployeeAccessCheckboxes";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Badge } from "@/components/ui/badge";
import { toErrorMessage } from "@/lib/errors";
import { toast } from "sonner";
import { Pencil, Shield, Users } from "lucide-react";
import { validateRequiredEmail } from "@/lib/contact-validators";
import {
  DEFAULT_EMPLOYEE_PERMISSIONS,
  formatPermissionLabels,
  type EmployeePermissionKey,
} from "@/lib/employee-permissions";
import { useEmployeeAccess } from "@/hooks/use-employee-access";

export const Route = createFileRoute("/_authenticated/admin/team")({
  component: TeamPage,
});

function TeamPage() {
  const { role } = useAuth();
  const { can } = useEmployeeAccess();
  const nav = useNavigate();
  const qc = useQueryClient();
  const shopAdmin = isShopAdmin(role);
  const canView = shopAdmin || can("team");

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    permissions: [...DEFAULT_EMPLOYEE_PERMISSIONS] as EmployeePermissionKey[],
  });
  const [editPermissions, setEditPermissions] = useState<EmployeePermissionKey[]>([]);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (!canView) {
      nav({ to: "/admin/dashboard", replace: true });
    }
  }, [canView, nav]);

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["shop-staff"],
    queryFn: () => fetchShopStaff(),
    enabled: canView && shopAdmin,
  });

  if (!canView) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailValidation = validateRequiredEmail(form.email);
    if (emailValidation) {
      setEmailError(emailValidation);
      return;
    }
    setEmailError(null);
    setSaving(true);
    try {
      await inviteEmployee({
        data: {
          ...form,
          permissions: form.permissions,
        },
      });
      toast.success(`Employee created: ${form.email}`);
      setForm({
        full_name: "",
        email: "",
        password: "",
        permissions: [...DEFAULT_EMPLOYEE_PERMISSIONS],
      });
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["shop-staff"] });
    } catch (err) {
      toast.error(toErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const savePermissions = async (userId: string) => {
    setSaving(true);
    try {
      await updateEmployeePermissionsFn({
        data: { user_id: userId, permissions: editPermissions },
      });
      toast.success("Access updated");
      setEditingId(null);
      await qc.invalidateQueries({ queryKey: ["shop-staff"] });
    } catch (err) {
      toast.error(toErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Team"
        description="Manage employees and what they can access in HERMS."
        actions={
          shopAdmin ? (
            <Button onClick={() => setOpen((v) => !v)}>
              <Users className="h-4 w-4 mr-1" />
              {open ? "Cancel" : "Add employee"}
            </Button>
          ) : null
        }
      />

      {!shopAdmin ? (
        <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground text-center">
          You can view team info. Only shop admins can add employees or change access.
        </div>
      ) : null}

      {open && shopAdmin ? (
        <form onSubmit={submit} className="rounded-2xl border bg-card p-5 sm:p-6 space-y-5 shadow-sm">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              New employee account
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Creates sign-in credentials. Share the email and temporary password with your staff.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Full name</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Work email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  if (emailError) setEmailError(null);
                }}
                required
                aria-invalid={!!emailError}
              />
              {emailError ? <p className="text-xs text-destructive">{emailError}</p> : null}
            </div>
            <div className="space-y-2">
              <Label>Temporary password</Label>
              <PasswordInput
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
          </div>

          <EmployeeAccessCheckboxes
            value={form.permissions}
            onChange={(permissions) => setForm({ ...form, permissions })}
          />

          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create employee account"}
          </Button>
        </form>
      ) : null}

      {shopAdmin ? (
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading team…</p>
          ) : staff.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center rounded-xl border border-dashed">
              No team members yet.
            </p>
          ) : (
            staff.map((member) => (
              <div key={member.user_id} className="rounded-xl border bg-card overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{member.full_name || "—"}</p>
                      <Badge variant={member.role === "admin" ? "default" : "secondary"} className="capitalize">
                        {member.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                    {member.role === "employee" && member.permissions ? (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Access: {formatPermissionLabels(member.permissions)}
                      </p>
                    ) : member.role === "admin" ? (
                      <p className="text-xs text-muted-foreground mt-1.5">Full access</p>
                    ) : null}
                  </div>
                  {member.role === "employee" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingId(editingId === member.user_id ? null : member.user_id);
                        setEditPermissions(member.permissions ?? [...DEFAULT_EMPLOYEE_PERMISSIONS]);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      {editingId === member.user_id ? "Close" : "Edit access"}
                    </Button>
                  ) : null}
                </div>
                {editingId === member.user_id && member.role === "employee" ? (
                  <div className="border-t bg-muted/20 p-4 space-y-4">
                    <EmployeeAccessCheckboxes
                      value={editPermissions}
                      onChange={setEditPermissions}
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving}
                      onClick={() => savePermissions(member.user_id)}
                    >
                      {saving ? "Saving…" : "Save access"}
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
