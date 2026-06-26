#!/usr/bin/env node
/**
 * Applies supabase/RUN_BOOKINGS_RLS_ONLY.sql to the HERMS database.
 *
 * Usage:
 *   npm run apply:bookings-sql
 *   npm run apply:bookings-sql -- --file=supabase/SYNC_LOVABLE_TO_HERMS.sql
 *
 * Get the database password from Lovable → your HERMS project → Cloud → Secrets
 * (look for SUPABASE_DB_URL, password is after postgres: and before @)
 */
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fileArg = process.argv.find((a) => a.startsWith("--file="))?.slice("--file=".length)?.trim();
const sqlPath = fileArg
  ? join(root, fileArg.replace(/^[/\\]/, ""))
  : join(root, "supabase", "RUN_BOOKINGS_RLS_ONLY.sql");
const envPath = join(root, ".env");

const passwordArg = process.argv.find((a) => a.startsWith("--password="))?.slice("--password=".length)?.trim();
const dbUrlArg = process.argv.find((a) => a.startsWith("--db-url="))?.slice("--db-url=".length)?.trim();

function projectRefFromEnv(envText) {
  return envText.match(/^SUPABASE_URL="https:\/\/([^.]+)\.supabase\.co"/m)?.[1] ?? "nafiagoakklihweizces";
}

function dbUrlFromEnv(envText) {
  const quoted = envText.match(/^SUPABASE_DB_URL="([^"]+)"/m)?.[1];
  if (quoted?.trim()) return quoted.trim();
  const unquoted = envText.match(/^SUPABASE_DB_URL=([^\s#]+)/m)?.[1];
  return unquoted?.trim() || undefined;
}

function stripSqlComments(sql) {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
}

function buildConnectionCandidates(projectRef, password) {
  const enc = encodeURIComponent(password);
  return [
  // Direct connection — works for all regions (preferred)
    `postgresql://postgres:${enc}@db.${projectRef}.supabase.co:5432/postgres`,
    // Session pooler (common regions)
    `postgresql://postgres.${projectRef}:${enc}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${projectRef}:${enc}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${projectRef}:${enc}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${projectRef}:${enc}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${projectRef}:${enc}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`,
  ];
}

async function connectWithFallback(candidates) {
  let lastErr;
  for (const connectionString of candidates) {
    const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      return client;
    } catch (err) {
      lastErr = err;
      await client.end().catch(() => {});
    }
  }
  throw lastErr ?? new Error("Could not connect to database");
}

async function main() {
  const env = await readFile(envPath, "utf8").catch(() => "");
  const projectRef = projectRefFromEnv(env);

  console.log(`\nHERMS — apply Book Now database fix`);
  console.log(`Project: ${projectRef}\n`);

  let connectionString = dbUrlArg || dbUrlFromEnv(env);
  let client;

  if (connectionString) {
    console.log("Connecting to database (SUPABASE_DB_URL)...");
    client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();
  } else {
    let password = passwordArg;
    if (!password) {
      console.log("Need your database password (not the anon or service_role API key).");
      console.log("Supabase → Project Settings → Database → Database password");
      console.log("Or paste the full connection string in .env as SUPABASE_DB_URL=...\n");
      const rl = createInterface({ input, output });
      password = await rl.question("Database password: ");
      rl.close();
    }
    password = password.trim();
    if (!password) {
      console.error("No password provided.\n");
      process.exit(1);
    }

    const candidates = buildConnectionCandidates(projectRef, password);
    console.log("Connecting to database...");
    client = await connectWithFallback(candidates);
  }

  const sql = stripSqlComments(await readFile(sqlPath, "utf8"));

  try {
    console.log("Running SQL fix...");
    await client.query(sql);
    console.log("\nDone! Book Now database fix applied.");
    console.log("Restart npm run dev if it is running, then retry Book Now on your tablet.\n");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  if (/password authentication failed/i.test(err.message)) {
    console.error("Wrong database password. Reset it in Supabase → Settings → Database.\n");
  } else if (/ENOTFOUND|tenant\/user/i.test(err.message)) {
    console.error(
      "Could not reach the database. Easiest fix: open Supabase SQL Editor and paste supabase/RUN_WALKIN_BOOKING_FIX.sql manually.\n",
    );
  }
  process.exit(1);
});
