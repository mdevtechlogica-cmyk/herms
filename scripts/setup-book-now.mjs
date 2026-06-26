#!/usr/bin/env node
/**
 * Adds SUPABASE_SERVICE_ROLE_KEY to .env so Book Now can save bookings (bypasses RLS).
 *
 * Usage:
 *   npm run setup:book-now
 *   npm run setup:book-now -- --key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */
import { createInterface } from "node:readline/promises";
import { readFile, writeFile } from "node:fs/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");

const keyArg = process.argv.find((a) => a.startsWith("--key="))?.slice("--key=".length)?.trim();

const rl = createInterface({ input, output });

try {
  console.log("\nHERMS server setup (Book Now + Team)\n");
  console.log("Needs the service_role key for the SAME Supabase project as HERMS.\n");

  let env = "";
  try {
    env = await readFile(envPath, "utf8");
  } catch {
    env = "";
  }
  const envRef = env.match(/^SUPABASE_URL="https:\/\/([^.]+)\.supabase\.co"/m)?.[1] ?? "nafiagoakklihweizces";

  console.log(`HERMS is connected to Supabase project: ${envRef}`);
  console.log("(This may be Lovable Cloud — not the project in your personal Supabase org.)\n");
  console.log(`1. Open: https://supabase.com/dashboard/project/${envRef}/settings/api-keys/legacy`);
  console.log("   If that link fails, open your Lovable project → Cloud → Supabase → API keys");
  console.log("2. On the service_role row (labeled secret), click Reveal — NOT the anon public key\n");

  let key = keyArg;
  if (!key) {
    key = await rl.question("Paste service_role key here: ");
  }
  rl.close();

  key = key.trim().replace(/^["']|["']$/g, "");
  if (!key || key.length < 20) {
    console.error("\nInvalid key. Copy the full service_role JWT from Supabase API settings.\n");
    process.exit(1);
  }

  if (key.startsWith("sb_publishable_")) {
    console.error("\nThat is a publishable (anon) key, not service_role.");
    console.error("Open the tab: Legacy anon, service_role API keys");
    console.error("Click Reveal on the service_role row (labeled secret), not the anon public row.\n");
    process.exit(1);
  }

  if (key.split(".").length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString());
      if (payload.role !== "service_role") {
        console.error(`\nThat key has role "${payload.role}" — you need service_role.`);
        console.error("Click Reveal on the service_role row (secret), not anon (public).\n");
        process.exit(1);
      }
      if (envRef && payload.ref && payload.ref !== envRef) {
        console.error(`\nWrong Supabase project. This key is for "${payload.ref}".`);
        console.error(`HERMS .env uses project "${envRef}".`);
        console.error(`Your personal Supabase org may show a different project — that key will not work.`);
        console.error(`Open: https://supabase.com/dashboard/project/${envRef}/settings/api-keys/legacy`);
        console.error(`Or Lovable → Cloud → Supabase → service_role for project ${envRef}\n`);
        process.exit(1);
      }
    } catch {
      // not a JWT — allow if long enough
    }
  }

  const line = `SUPABASE_SERVICE_ROLE_KEY="${key}"`;
  if (/^SUPABASE_SERVICE_ROLE_KEY=/m.test(env)) {
    env = env.replace(/^SUPABASE_SERVICE_ROLE_KEY=.*$/m, line);
  } else {
    env = env.trimEnd() + (env.endsWith("\n") || env === "" ? "" : "\n") + `\n${line}\n`;
  }

  await writeFile(envPath, env, "utf8");
  console.log("\nSaved SUPABASE_SERVICE_ROLE_KEY to .env");
  console.log("Restart the dev server: npm run dev");
  console.log("Then try Book Now or Create employee again.\n");
} catch (err) {
  rl.close();
  console.error(err);
  process.exit(1);
}
