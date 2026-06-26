import {
  AUTH_ACCESS_DENIED_MESSAGE,
  AUTH_SETUP_HINT,
  isAllowedAppUser,
  resolveAppRole,
} from "@/lib/auth-access";
import { supabase } from "@/lib/db";
import type { AppRole } from "@/lib/types";

export type FinishAppAuthResult =
  | { ok: true; role: AppRole }
  | { ok: false; message: string };

/** Resolve role after sign-in/sign-up; returns error if access denied. */
export async function finishAppAuth(userId: string): Promise<FinishAppAuthResult> {
  let role: AppRole;
  try {
    role = await resolveAppRole(userId);
  } catch (err) {
    const message = err instanceof Error ? err.message : AUTH_ACCESS_DENIED_MESSAGE;
    await supabase.auth.signOut({ scope: "local" });
    return { ok: false, message };
  }

  if (!isAllowedAppUser(role)) {
    await supabase.auth.signOut({ scope: "local" });
    return {
      ok: false,
      message: role === "customer" ? AUTH_SETUP_HINT : AUTH_ACCESS_DENIED_MESSAGE,
    };
  }

  return { ok: true, role };
}
