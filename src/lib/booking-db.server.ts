import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { getSupabaseAdminIfConfigured } from "@/lib/supabase-admin.server";

export const BOOKING_SERVICE_ROLE_HINT =
  "SUPABASE_SERVICE_ROLE_KEY is not set. On your PC run: npm run setup:book-now — then restart npm run dev.";

/** Service role bypasses RLS — required for reliable Book Now saves on the dev server. */
export function getBookingDbOrThrow(): SupabaseClient<Database> {
  const admin = getSupabaseAdminIfConfigured();
  if (!admin) throw new Error(BOOKING_SERVICE_ROLE_HINT);
  return admin;
}

/** Prefer service role; fall back to the signed-in admin session (may hit RLS without DB policies). */
export function resolveBookingDb(authSupabase: SupabaseClient<Database>) {
  return getSupabaseAdminIfConfigured() ?? authSupabase;
}
