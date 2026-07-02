#!/usr/bin/env node
/**
 * Writes Google Search Console HTML verification file to public/.
 * Set VITE_GOOGLE_SITE_VERIFICATION_HTML=google1234567890abcdef
 * Run: node scripts/write-google-verification.mjs
 */
import { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const envPath = resolve(root, ".env");
const publicDir = resolve(root, "public");

function loadEnvFile() {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const raw = process.env.VITE_GOOGLE_SITE_VERIFICATION_HTML?.trim() ?? "";
const filename = raw.endsWith(".html") ? raw : raw ? `${raw}.html` : "";

for (const file of readdirSync(publicDir)) {
  if (file.startsWith("google") && file.endsWith(".html") && file !== filename) {
    unlinkSync(resolve(publicDir, file));
  }
}

if (!filename || !filename.startsWith("google")) {
  console.log("Skip Google HTML verification file (VITE_GOOGLE_SITE_VERIFICATION_HTML not set)");
  process.exit(0);
}

const outPath = resolve(publicDir, filename);
writeFileSync(outPath, `google-site-verification: ${filename}\n`, "utf8");
console.log(`Wrote ${outPath}`);
