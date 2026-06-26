import { db, supabase } from "@/lib/db";
import { isMissingSchema, toErrorMessage } from "@/lib/errors";
import type { CountryCode } from "@/lib/locale/countries";
import type { Branch } from "@/lib/types";

export interface CreateBranchInput {
  owner_id: string;
  name: string;
  country_code: CountryCode;
  address?: string | null;
  phone?: string | null;
}

export const BRANCHES_MIGRATION_HINT =
  "Open Supabase → SQL Editor → paste and run supabase/RUN_BRANCHES_FIX_ALL.sql, then sign out and sign in.";

export const BRANCHES_RLS_HINT =
  "Run supabase/RUN_BRANCHES_RLS_FIX.sql in Supabase SQL Editor, then try again.";

const OPTIONAL_INSERT_KEYS = ["phone", "address", "country_code", "owner_id"] as const;

export function normalizeBranch(row: Record<string, unknown>): Branch {
  return {
    id: String(row.id),
    owner_id: String(row.owner_id ?? ""),
    name: String(row.name ?? ""),
    country_code: String(row.country_code ?? "IN"),
    address: (row.address as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    is_active: row.is_active !== false,
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

function isRlsError(error: unknown): boolean {
  const msg = toErrorMessage(error).toLowerCase();
  return (
    msg.includes("row-level security") ||
    msg.includes("row level security") ||
    (typeof error === "object" && (error as { code?: string }).code === "42501")
  );
}

function missingColumnFromError(error: unknown): string | null {
  const msg = toErrorMessage(error);
  const patterns = [
    /could not find the ['"]?(\w+)['"]? column/i,
    /column ['"]?(\w+)['"]? of ['"]?branches/i,
    /['"]?(\w+)['"]? column.*schema cache/i,
  ];
  for (const re of patterns) {
    const m = msg.match(re);
    if (m?.[1]) return m[1].toLowerCase();
  }
  return null;
}

async function resolveAuthUserId(fallbackId: string): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return fallbackId;
  return data.user.id;
}

/** All shop branches visible to staff (admin-created branches, not owned by the employee). */
export async function fetchBranchesForStaff(): Promise<Branch[]> {
  const queries = [
    () => db.from("branches").select("*").eq("is_active", true).order("name"),
    () => db.from("branches").select("*").order("name"),
  ];

  for (const run of queries) {
    const { data, error } = await run();
    if (!error) {
      return (data ?? []).map((row) => normalizeBranch(row as Record<string, unknown>));
    }
    if (!isMissingSchema(error) && error.code !== "42P01" && error.code !== "PGRST205") {
      console.warn("[Branches] staff fetch:", error.message);
    }
  }

  return [];
}

export async function fetchBranchesForOwner(ownerId: string): Promise<Branch[]> {
  const authOwnerId = await resolveAuthUserId(ownerId);

  const queries = [
    () => db.from("branches").select("*").eq("owner_id", authOwnerId).eq("is_active", true).order("name"),
    () => db.from("branches").select("*").eq("owner_id", authOwnerId).order("name"),
    () => db.from("branches").select("*").order("name"),
  ];

  for (const run of queries) {
    const { data, error } = await run();
    if (!error) {
      return (data ?? []).map((row) => normalizeBranch(row as Record<string, unknown>));
    }
    if (!isMissingSchema(error) && error.code !== "42P01" && error.code !== "PGRST205") {
      console.warn("[Branches] fetch:", error.message);
    }
  }

  return [];
}

export async function insertBranch(input: CreateBranchInput): Promise<{
  usedFallback: boolean;
  migrationRequired: boolean;
}> {
  const ownerId = await resolveAuthUserId(input.owner_id);

  const payload: Record<string, unknown> = {
    owner_id: ownerId,
    name: input.name.trim(),
    country_code: input.country_code,
  };
  if (input.address?.trim()) payload.address = input.address.trim();
  if (input.phone?.trim()) payload.phone = input.phone.trim();

  let stripped = 0;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 10; attempt++) {
    const { error } = await db.from("branches").insert({ ...payload });
    if (!error) {
      return {
        usedFallback: stripped > 0,
        migrationRequired: stripped > 0,
      };
    }

    lastError = error;
    if (isRlsError(error)) {
      throw new Error(`${toErrorMessage(error)} ${BRANCHES_RLS_HINT}`);
    }

    if (!isMissingSchema(error)) throw error;

    const missing = missingColumnFromError(error);
    if (missing && missing in payload) {
      delete payload[missing];
      stripped++;
      continue;
    }

    const nextOptional = OPTIONAL_INSERT_KEYS.find((k) => k in payload);
    if (nextOptional) {
      delete payload[nextOptional];
      stripped++;
      continue;
    }

    break;
  }

  throw new Error(`${toErrorMessage(lastError)} ${BRANCHES_MIGRATION_HINT}`);
}
