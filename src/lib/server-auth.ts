import { getRequest } from "@tanstack/react-start/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export interface StaffRequestContext {
  userId: string;
  role: "admin" | "employee";
  supabase: SupabaseClient<Database>;
}

export type AdminRequestContext = StaffRequestContext;

async function getStaffFromToken(): Promise<StaffRequestContext> {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Server Supabase config missing.");
  }

  const request = getRequest();
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized: sign in again and retry.");
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    throw new Error("Unauthorized: session expired. Sign in again.");
  }

  const userId = userData.user.id;
  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (roleError) {
    throw new Error(roleError.message);
  }

  const roleList = (roles ?? []).map((row) => row.role);
  if (roleList.includes("admin")) {
    return { userId, role: "admin", supabase };
  }
  if (roleList.includes("employee")) {
    return { userId, role: "employee", supabase };
  }

  throw new Error("Forbidden: shop staff access required.");
}

export async function assertStaffFromRequest(): Promise<StaffRequestContext> {
  return getStaffFromToken();
}

export async function assertAdminFromRequest(): Promise<AdminRequestContext> {
  const ctx = await getStaffFromToken();
  if (ctx.role !== "admin") {
    throw new Error("Forbidden: shop admin access required.");
  }
  return ctx;
}
