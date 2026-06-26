#!/usr/bin/env node
/**
 * Point Capacitor + OAuth env at this PC's LAN IP and port 8080, then cap sync.
 * Run before testing on a phone/tablet or Android Studio emulator (same Wi‑Fi).
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const PORT = process.env.CAPACITOR_DEV_PORT ?? "8080";

function getLanIp() {
  for (const ifaces of Object.values(networkInterfaces())) {
    for (const net of ifaces ?? []) {
      if (net.family === "IPv4" && !net.internal && !net.address.startsWith("169.254.")) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
}

function upsertEnv(key, value) {
  const line = `${key}="${value}"`;
  if (!existsSync(envPath)) {
    writeFileSync(envPath, `${line}\n`, "utf8");
    return;
  }
  const source = readFileSync(envPath, "utf8");
  const pattern = new RegExp(`^${key}=.*$`, "m");
  const next = pattern.test(source) ? source.replace(pattern, line) : `${source.trimEnd()}\n${line}\n`;
  writeFileSync(envPath, next, "utf8");
}

const ip = getLanIp();
const url = `http://${ip}:${PORT}`;

upsertEnv("CAPACITOR_SERVER_URL", url);
upsertEnv("VITE_CAPACITOR_SERVER_URL", url);
upsertEnv("VITE_APP_URL", url);

console.log("\nHERMS mobile dev URLs updated:");
console.log(`  ${url}`);
console.log("\n1. Start dev server (keep running):  npm run dev");
console.log(`2. Phone browser:                    ${url}/auth`);
console.log("3. Android app: rebuild in Android Studio after this script");
console.log("\nSupabase → Auth → URL config:");
console.log(`  Site URL:      ${url}`);
console.log(`  Redirect URL:  ${url}/auth/callback`);
console.log("  Redirect URL:  com.herms.app://auth/callback\n");

execSync("npx cap sync android", { stdio: "inherit", cwd: root });
execSync("node scripts/patch-android-agp.mjs", { stdio: "inherit", cwd: root });
