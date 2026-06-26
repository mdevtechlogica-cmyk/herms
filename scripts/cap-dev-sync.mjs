import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { resolve } from "node:path";
import { ensureProjectRoot } from "./project-root.mjs";

const ROOT = ensureProjectRoot();
const PORT = process.env.CAPACITOR_DEV_PORT ?? "8080";
const envPath = resolve(ROOT, ".env");

function getLanIp() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
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
  const next = pattern.test(source)
    ? source.replace(pattern, line)
    : `${source.trimEnd()}\n${line}\n`;
  writeFileSync(envPath, next, "utf8");
}

const ip = getLanIp();
const url = `http://${ip}:${PORT}`;
upsertEnv("CAPACITOR_SERVER_URL", url);

console.log(`CAPACITOR_SERVER_URL set to ${url}`);
console.log("For mobile app testing, prefer production preview (works best in WebView):");
console.log("  1. npm run build");
console.log("  2. npm run preview:mobile   (must show Network: " + url + ")");
console.log("  3. Rebuild and run in Android Studio");
console.log("");
console.log("Or use dev:mobile for live reload (may show black screen on some devices).");

execSync("npx cap sync", { stdio: "inherit" });
execSync("node scripts/patch-android-agp.mjs", { stdio: "inherit" });
