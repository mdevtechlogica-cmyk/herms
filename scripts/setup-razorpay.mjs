#!/usr/bin/env node
/**
 * Validates and saves Razorpay API keys to .env.
 *
 * Usage:
 *   npm run setup:razorpay
 *   npm run setup:razorpay -- --id=rzp_test_xxx --secret=your_secret
 */
import { createInterface } from "node:readline/promises";
import { readFile, writeFile } from "node:fs/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");

const idArg = process.argv.find((a) => a.startsWith("--id="))?.slice("--id=".length)?.trim();
const secretArg = process.argv
  .find((a) => a.startsWith("--secret="))
  ?.slice("--secret=".length)
  ?.trim();

const rl = createInterface({ input, output });

async function testKeys(keyId, keySecret) {
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: 10000,
      currency: "INR",
      receipt: "herms_setup_test",
    }),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

function clean(value) {
  return value.trim().replace(/^["']|["']$/g, "");
}

try {
  console.log("\nHERMS Razorpay setup\n");
  console.log("1. Open https://dashboard.razorpay.com/app/keys");
  console.log("2. Turn Test Mode ON (top-right) while testing");
  console.log("3. Copy Key ID (rzp_test_...) and Key Secret from the SAME row\n");
  console.log("Important: paste the full secret — it is usually 24–32 characters.\n");

  let keyId = idArg ? clean(idArg) : await rl.question("Key ID (rzp_test_...): ");
  let keySecret = secretArg ? clean(secretArg) : await rl.question("Key Secret: ");
  if (!secretArg && !idArg) rl.close();
  else rl.close();

  keyId = clean(keyId);
  keySecret = clean(keySecret);

  if (!keyId.startsWith("rzp_test_") && !keyId.startsWith("rzp_live_")) {
    console.error("\nKey ID must start with rzp_test_ or rzp_live_.\n");
    process.exit(1);
  }
  if (keySecret.length < 20) {
    console.error("\nKey Secret looks too short. Copy the full secret from Razorpay.\n");
    process.exit(1);
  }

  console.log("\nTesting keys against Razorpay API...");
  const result = await testKeys(keyId, keySecret);
  if (!result.ok) {
    console.error(`\nAuthentication failed (HTTP ${result.status}).`);
    console.error(result.body);
    console.error(
      "\nKey ID and Secret must be from the same dashboard row. If you regenerated keys, use the new pair.\n",
    );
    process.exit(1);
  }

  let env = "";
  try {
    env = await readFile(envPath, "utf8");
  } catch {
    env = "";
  }

  const idLine = `RAZORPAY_KEY_ID="${keyId}"`;
  const secretLine = `RAZORPAY_KEY_SECRET="${keySecret}"`;

  if (/^RAZORPAY_KEY_ID=/m.test(env)) {
    env = env.replace(/^RAZORPAY_KEY_ID=.*$/m, idLine);
  } else {
    env = env.trimEnd() + (env.endsWith("\n") || env === "" ? "" : "\n") + `\n${idLine}\n`;
  }

  if (/^RAZORPAY_KEY_SECRET=/m.test(env)) {
    env = env.replace(/^RAZORPAY_KEY_SECRET=.*$/m, secretLine);
  } else {
    env = env.trimEnd() + `\n${secretLine}\n`;
  }

  await writeFile(envPath, env.endsWith("\n") ? env : `${env}\n`, "utf8");

  console.log("\nRazorpay keys saved to .env and verified.");
  console.log("Restart the dev server (npm run dev) if it is already running.\n");
} catch (err) {
  rl.close();
  console.error(err);
  process.exit(1);
}
