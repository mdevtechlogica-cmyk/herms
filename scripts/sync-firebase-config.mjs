#!/usr/bin/env node
/**
 * Writes public/firebase-config.json from VITE_FIREBASE_* env vars.
 * Run: node scripts/sync-firebase-config.mjs
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const envPath = resolve(root, ".env");
const outPath = resolve(root, "public/firebase-config.json");

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

const config = {
  apiKey: process.env.VITE_FIREBASE_API_KEY?.trim() ?? "",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() ?? "",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID?.trim() ?? "",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() ?? "",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? "",
  appId: process.env.VITE_FIREBASE_APP_ID?.trim() ?? "",
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID?.trim() ?? "",
};

writeFileSync(outPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
console.log(`Wrote ${outPath}`);
