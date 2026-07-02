#!/usr/bin/env node
/**
 * Creates (or reuses) a Firebase web app and prints VITE_FIREBASE_* for .env
 * Prerequisites: firebase login
 *
 * Usage:
 *   node scripts/setup-firebase-web.mjs
 *   node scripts/setup-firebase-web.mjs --project herms-app
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const envPath = resolve(root, ".env");

function run(cmd, args = []) {
  const result = spawnSync(cmd, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${cmd} failed`);
  }
  return result.stdout.trim();
}

function upsertEnv(key, value) {
  let lines = existsSync(envPath) ? readFileSync(envPath, "utf8").split(/\r?\n/) : [];
  const prefix = `${key}=`;
  let found = false;
  lines = lines.map((line) => {
    if (line.startsWith(prefix)) {
      found = true;
      return `${key}="${value}"`;
    }
    return line;
  });
  if (!found) lines.push(`${key}="${value}"`);
  writeFileSync(envPath, `${lines.join("\n").replace(/\n*$/, "")}\n`, "utf8");
}

function parseJson(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

const projectFlag = process.argv.indexOf("--project");
const projectId =
  projectFlag >= 0 ? process.argv[projectFlag + 1] : process.env.FIREBASE_PROJECT_ID ?? "herms-app";

console.log(`Using Firebase project: ${projectId}`);

try {
  execSync("firebase --version", { stdio: "ignore" });
} catch {
  console.error("Install Firebase CLI: npm install -g firebase-tools");
  process.exit(1);
}

try {
  run("firebase", ["projects:list", "--json"]);
} catch {
  console.error("Run: firebase login");
  process.exit(1);
}

try {
  run("firebase", ["use", projectId]);
} catch {
  console.log(`Creating Firebase project ${projectId}...`);
  run("firebase", ["projects:create", projectId, "--display-name", "HERMS"]);
  run("firebase", ["use", projectId]);
}

const appsJson = parseJson(run("firebase", ["apps:list", "WEB", "--project", projectId, "--json"]));
let appId = appsJson?.results?.[0]?.appId;

if (!appId) {
  console.log("Creating Firebase web app HERMS Web...");
  const created = parseJson(
    run("firebase", ["apps:create", "WEB", "HERMS Web", "--project", projectId, "--json"]),
  );
  appId = created?.appId ?? created?.result?.appId;
}

if (!appId) {
  console.error("Could not resolve Firebase web app ID.");
  process.exit(1);
}

const sdk = parseJson(run("firebase", ["apps:sdkconfig", "WEB", appId, "--project", projectId, "--json"]));
const config = sdk?.result?.sdkConfig ?? sdk?.sdkConfig ?? sdk;

if (!config?.apiKey) {
  console.error("Could not read Firebase web SDK config.");
  process.exit(1);
}

upsertEnv("VITE_FIREBASE_API_KEY", config.apiKey);
upsertEnv("VITE_FIREBASE_AUTH_DOMAIN", config.authDomain ?? `${projectId}.firebaseapp.com`);
upsertEnv("VITE_FIREBASE_PROJECT_ID", config.projectId ?? projectId);
upsertEnv("VITE_FIREBASE_STORAGE_BUCKET", config.storageBucket ?? `${projectId}.appspot.com`);
upsertEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", config.messagingSenderId ?? "");
upsertEnv("VITE_FIREBASE_APP_ID", config.appId ?? appId);
if (config.measurementId) upsertEnv("VITE_FIREBASE_MEASUREMENT_ID", config.measurementId);
upsertEnv("VITE_SITE_URL", "https://herms.app");

console.log("\nUpdated .env with Firebase web config.");
console.log("Next:");
console.log("  1. Firebase Console → Cloud Messaging → Web Push → generate key pair");
console.log('  2. Add VITE_FIREBASE_VAPID_KEY="..." to .env');
console.log("  3. npm run sync:firebase-config");
console.log("  4. Add authorized domain: herms.app in Firebase Authentication settings");

execSync("node scripts/sync-firebase-config.mjs", { stdio: "inherit", cwd: root });
