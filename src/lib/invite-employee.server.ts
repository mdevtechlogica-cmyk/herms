import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { getSupabaseAdminIfConfigured } from "@/lib/supabase-admin.server";
import { assertAdminFromRequest } from "@/lib/server-auth";
import {
  DEFAULT_EMPLOYEE_PERMISSIONS,
  isEmployeePermissionKey,
  normalizePermissions,
  type EmployeePermissionKey,
} from "@/lib/employee-permissions";

const SERVICE_ROLE_HINT =
  "Add SUPABASE_SERVICE_ROLE_KEY to .env (run npm run setup:book-now on your PC), restart npm run dev, then retry.";

const INVITE_SQL_HINT =
  "Run supabase/RUN_INVITE_EMPLOYEE.sql in Supabase SQL Editor, then retry.";

function anonSignupClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function saveEmployeePermissions(
  admin: NonNullable<ReturnType<typeof getSupabaseAdminIfConfigured>>,
  userId: string,
  permissions: EmployeePermissionKey[],
) {
  const normalized = normalizePermissions(permissions, DEFAULT_EMPLOYEE_PERMISSIONS);
  const { error } = await admin.from("employee_permissions").upsert({
    user_id: userId,
    permissions: normalized,
    updated_at: new Date().toISOString(),
  });
  if (error && !error.message.includes("employee_permissions")) {
    throw new Error(error.message);
  }
}

async function registerEmployeeViaRpc(
  adminSession: Awaited<ReturnType<typeof assertAdminFromRequest>>,
  userId: string,
  fullName: string,
  email: string,
  permissions: EmployeePermissionKey[],
) {
  const { error } = await adminSession.supabase.rpc("admin_register_employee", {
    target_user_id: userId,
    p_full_name: fullName,
    p_email: email,
    p_permissions: normalizePermissions(permissions, DEFAULT_EMPLOYEE_PERMISSIONS),
  });
  if (error) {
    if (error.message.includes("admin_register_employee")) {
      throw new Error(`Employee setup RPC missing. ${INVITE_SQL_HINT}`);
    }
    throw new Error(error.message);
  }
}

async function inviteWithServiceRole(
  input: {
    email: string;
    password: string;
    full_name: string;
    permissions?: EmployeePermissionKey[];
  },
  admin: NonNullable<ReturnType<typeof getSupabaseAdminIfConfigured>>,
) {
  const email = input.email.trim().toLowerCase();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.full_name.trim(),
      herms_invited_role: "employee",
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Could not create employee account.");
  }

  const userId = data.user.id;

  await admin.from("profiles").upsert({
    id: userId,
    full_name: input.full_name.trim(),
    email,
    trial_ends_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    subscription_active: false,
    subscription_plan: "basic",
  });

  await admin.from("user_roles").delete().eq("user_id", userId);
  const { error: roleError } = await admin.from("user_roles").insert({
    user_id: userId,
    role: "employee",
  });
  if (roleError) throw new Error(roleError.message);

  await saveEmployeePermissions(admin, userId, input.permissions ?? DEFAULT_EMPLOYEE_PERMISSIONS);
  return { userId, email };
}

async function inviteWithSignUpFallback(
  input: {
    email: string;
    password: string;
    full_name: string;
    permissions?: EmployeePermissionKey[];
  },
  adminSession: Awaited<ReturnType<typeof assertAdminFromRequest>>,
) {
  const signup = anonSignupClient();
  if (!signup) {
    throw new Error(`Server not configured. ${SERVICE_ROLE_HINT}`);
  }

  const email = input.email.trim().toLowerCase();
  const { data, error } = await signup.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        full_name: input.full_name.trim(),
        herms_invited_role: "employee",
      },
    },
  });

  if (error) {
    throw new Error(
      error.message.includes("already registered")
        ? "This email is already registered. Use a different work email."
        : `${error.message} — If this persists, ${SERVICE_ROLE_HINT}`,
    );
  }

  const userId = data.user?.id;
  if (!userId) {
    throw new Error(
      `Account may need email confirmation before it can be used. ${SERVICE_ROLE_HINT}`,
    );
  }

  await registerEmployeeViaRpc(
    adminSession,
    userId,
    input.full_name.trim(),
    email,
    input.permissions ?? DEFAULT_EMPLOYEE_PERMISSIONS,
  );

  return { userId, email };
}

export async function inviteShopEmployee(input: {
  email: string;
  password: string;
  full_name: string;
  permissions?: EmployeePermissionKey[];
}) {
  const adminSession = await assertAdminFromRequest();
  const serviceAdmin = getSupabaseAdminIfConfigured();

  if (serviceAdmin) {
    return inviteWithServiceRole(input, serviceAdmin);
  }

  return inviteWithSignUpFallback(input, adminSession);
}

export async function updateEmployeePermissions(
  userId: string,
  permissions: EmployeePermissionKey[],
) {
  const adminSession = await assertAdminFromRequest();
  const serviceAdmin = getSupabaseAdminIfConfigured();
  const valid = permissions.filter(isEmployeePermissionKey);
  const normalized = normalizePermissions(valid, DEFAULT_EMPLOYEE_PERMISSIONS);

  const { data: roleRow } = await adminSession.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "employee")
    .maybeSingle();

  if (!roleRow) {
    throw new Error("Can only update permissions for employee accounts.");
  }

  if (serviceAdmin) {
    await saveEmployeePermissions(serviceAdmin, userId, normalized);
    return { ok: true as const };
  }

  const { error } = await adminSession.supabase
    .from("employee_permissions")
    .upsert({
      user_id: userId,
      permissions: normalized,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    if (error.message.includes("employee_permissions")) {
      throw new Error(`Permissions table missing. Run RUN_EMPLOYEE_PERMISSIONS.sql.`);
    }
    throw new Error(error.message);
  }

  return { ok: true as const };
}

async function listStaffWithSession(
  supabase: Awaited<ReturnType<typeof assertAdminFromRequest>>["supabase"],
) {
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("user_id, role, created_at")
    .in("role", ["admin", "employee"])
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const ids = (roles ?? []).map((r) => r.user_id);
  if (ids.length === 0) return [];

  const [{ data: profiles }, { data: permRows }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").in("id", ids),
    supabase.from("employee_permissions").select("user_id, permissions").in("user_id", ids),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const permsById = new Map(
    (permRows ?? []).map((p) => [
      p.user_id,
      normalizePermissions((p.permissions ?? []) as string[]),
    ]),
  );

  return (roles ?? []).map((r) => ({
    user_id: r.user_id,
    role: r.role as "admin" | "employee",
    full_name: profileById.get(r.user_id)?.full_name ?? "",
    email: profileById.get(r.user_id)?.email ?? "",
    created_at: r.created_at,
    permissions: r.role === "admin"
      ? null
      : permsById.get(r.user_id) ?? [...DEFAULT_EMPLOYEE_PERMISSIONS],
  }));
}

export async function listShopStaff() {
  const adminSession = await assertAdminFromRequest();
  const serviceAdmin = getSupabaseAdminIfConfigured();

  if (serviceAdmin) {
    return listStaffWithSession(serviceAdmin);
  }

  return listStaffWithSession(adminSession.supabase);
}
