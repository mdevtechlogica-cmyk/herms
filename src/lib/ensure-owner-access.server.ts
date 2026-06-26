import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { getSupabaseAdminIfConfigured } from "@/lib/supabase-admin.server";
import type { AppRole } from "@/lib/types";

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

function displayName(user: AuthUser): string {
  const meta = user.user_metadata ?? {};
  const name = meta.full_name ?? meta.name;
  return typeof name === "string" ? name : "";
}

export async function ensureOwnerAccessWithServiceRole(user: AuthUser): Promise<AppRole | null> {
  const admin = getSupabaseAdminIfConfigured();
  if (!admin) return null;

  const { data: myRoles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const roles = (myRoles ?? []).map((row) => row.role);
  if (roles.includes("admin")) return "admin";
  if (roles.includes("employee")) return "employee";

  await admin.from("profiles").upsert(
    {
      id: user.id,
      full_name: displayName(user),
      email: user.email ?? "",
      trial_ends_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      subscription_active: false,
      subscription_plan: "basic",
    },
    { onConflict: "id" },
  );

  await admin.from("user_roles").delete().eq("user_id", user.id);
  const { error } = await admin.from("user_roles").insert({
    user_id: user.id,
    role: "admin",
  });

  if (error) {
    console.warn("[Auth] ensureOwnerAccessWithServiceRole:", error.message);
    return null;
  }

  return "admin";
}

export async function getUserFromBearerToken(token: string): Promise<AuthUser | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const client = createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email,
    user_metadata: data.user.user_metadata,
  };
}
