import { z } from "zod";

import { ensureOwnerAccess } from "@/lib/api/auth.functions";
import { db, supabase } from "@/lib/db";
import type { AppRole } from "@/lib/types";

export const AUTH_ACCESS_DENIED_MESSAGE = "Could not complete sign-in. Please try again.";

export const AUTH_SETUP_HINT =
  "Your account could not be set up automatically. Run supabase/RUN_SIGNUP_ACCESS_FIX.sql in Supabase SQL Editor, then sign in again.";

export const DB_SETUP_MESSAGE =
  "HERMS sign-in is not set up in the database. Open Supabase → SQL Editor, run supabase/RUN_SIGNUP_ACCESS_FIX.sql, then sign in again.";

/** @deprecated use AUTH_ACCESS_DENIED_MESSAGE */
export const STAFF_BLOCK_MESSAGE = AUTH_ACCESS_DENIED_MESSAGE;

/** @deprecated use AUTH_ACCESS_DENIED_MESSAGE */
export const NON_ADMIN_BLOCK_MESSAGE = AUTH_ACCESS_DENIED_MESSAGE;

export const signInSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signUpSchema = signInSchema.extend({
  full_name: z.string().trim().min(1, "Full name is required"),
});

const STAFF_ROLES: AppRole[] = ["admin", "employee"];

function isMissingBootstrapRpc(error: { message?: string } | null): boolean {
  const msg = error?.message ?? "";
  return msg.includes("bootstrap_app_access") && msg.includes("Could not find the function");
}

export async function fetchUserRole(userId: string): Promise<AppRole> {
  const { data } = await db.from("user_roles").select("role").eq("user_id", userId);
  const roles: AppRole[] = (data ?? []).map((x: { role: AppRole }) => x.role);
  if (roles.includes("admin")) return "admin";
  if (roles.includes("employee")) return "employee";
  return "customer";
}

export async function bootstrapAppAccess(userId: string): Promise<AppRole> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Session not ready. Please try again.");
  }

  const callBootstrap = () => db.rpc("bootstrap_app_access");

  let { data, error } = await callBootstrap();

  // JWT can lag behind sign-in by a tick — retry once
  if (error?.message?.includes("Not authenticated")) {
    await new Promise((r) => window.setTimeout(r, 400));
    ({ data, error } = await callBootstrap());
  }

  if (!error && data && STAFF_ROLES.includes(data as AppRole)) {
    return data as AppRole;
  }
  if (error) {
    console.warn("[Auth] bootstrap_app_access:", error.message);
    if (isMissingBootstrapRpc(error)) {
      throw new Error(DB_SETUP_MESSAGE);
    }
  }

  try {
    const result = await ensureOwnerAccess();
    if (result.role && STAFF_ROLES.includes(result.role as AppRole)) {
      return result.role as AppRole;
    }
  } catch (serverError) {
    if (import.meta.env.DEV) {
      console.warn("[Auth] ensureOwnerAccess:", serverError);
    }
    if (isMissingBootstrapRpc(error)) {
      throw new Error(DB_SETUP_MESSAGE);
    }
  }

  const role = await fetchUserRole(userId);
  return role;
}

export async function resolveAppRole(userId: string): Promise<AppRole> {
  const role = await fetchUserRole(userId);
  if (isAllowedAppUser(role)) return role;
  return bootstrapAppAccess(userId);
}

export function isAllowedAppUser(role: AppRole | null): boolean {
  return role === "admin" || role === "employee";
}

export function isShopAdmin(role: AppRole | null): boolean {
  return role === "admin";
}

export function getPostLoginPath(): "/admin/dashboard" {
  return "/admin/dashboard";
}
