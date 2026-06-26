import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { CapacitorConfig } from "@capacitor/cli";

function loadEnvValue(key: string): string | undefined {
  if (process.env[key]) return process.env[key];

  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return undefined;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const name = trimmed.slice(0, eq).trim();
    if (name !== key) continue;

    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }

  return undefined;
}

// Set in .env — local dev example: http://192.168.1.5:5173
// Production example: https://your-herms-app.com
const serverUrl = loadEnvValue("CAPACITOR_SERVER_URL");

const config: CapacitorConfig = {
  appId: "com.herms.app",
  appName: "HERMS",
  webDir: "dist",
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith("http://"),
          // Must match HTTP when using LAN dev server; "https" causes a black WebView screen.
          androidScheme: serverUrl.startsWith("https://") ? "https" : "http",
        },
      }
    : {}),
  android: {
    allowMixedContent: true,
  },
};

export default config;
