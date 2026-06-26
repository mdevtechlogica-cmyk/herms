#!/usr/bin/env node
/**
 * Prints Book Now RLS fix instructions and copies SQL path.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sqlPath = join(root, "supabase", "RUN_BOOKINGS_RLS_ONLY.sql");

const sql = await readFile(sqlPath, "utf8");

console.log(`
HERMS — fix Book Now "row level security" error

OPTION A (easiest on your dev PC)
  1. npm run setup:book-now
  2. Paste service_role key from:
     https://supabase.com/dashboard/project/nafiagoakklihweizces/settings/api
  3. Restart: npm run dev
  4. Retry Book Now on tablet

OPTION B (one-time in Supabase dashboard)
  1. Open: https://supabase.com/dashboard/project/nafiagoakklihweizces/sql
  2. Paste the contents of: supabase/RUN_BOOKINGS_RLS_ONLY.sql
  3. Click Run
  4. Retry Book Now

SQL file: ${sqlPath}
(${sql.split("\n").length} lines)
`);
