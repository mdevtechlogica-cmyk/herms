#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const EMAIL = "test@gmail.com";
const PASSWORD = "Test123!";

function parseEnv(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=["']?([^"'\n#]+)["']?/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

async function signIn(url, key, email, password) {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return { ok: res.ok, body: await res.json() };
}

async function rpc(url, key, token, name, payload) {
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload }),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text };
}

async function get(url, key, token, path) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  });
  return res.json();
}

const env = parseEnv(await readFile(join(root, ".env"), "utf8"));
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log("── Auth validation ──");
const bad = await signIn(url, key, EMAIL, "wrongpassword");
console.log(bad.ok ? "✗ Bad password should fail" : "✓ Bad password rejected");

const good = await signIn(url, key, EMAIL, PASSWORD);
if (!good.ok) {
  console.error("✗ Sign-in failed:", good.body);
  process.exit(1);
}
console.log("✓ Sign-in OK");
const token = good.body.access_token;
const uid = good.body.user.id;

console.log("\n── Book Now RPC flow ──");
const branches = await get(url, key, token, `branches?owner_id=eq.${uid}&select=id,name&limit=1`);
const branch = branches[0];
if (!branch) {
  console.log("✗ No branch found");
  process.exit(1);
}
console.log(`✓ Branch: ${branch.name}`);

const equipment = await get(
  url,
  key,
  token,
  `equipment?branch_id=eq.${branch.id}&status=eq.available&select=id,equipment_name&limit=1`,
);
const equip = equipment[0];
if (!equip) {
  console.log("⚠ No available equipment — skipping booking create");
  process.exit(0);
}
console.log(`✓ Available equipment: ${equip.equipment_name}`);

const cust = await rpc(url, key, token, "admin_create_walk_in_shop_customer", {
  branch_id: branch.id,
  full_name: "Smoke Walk-in Customer",
  phone: "+919988776655",
  email: `walkin+${Date.now()}@test.com`,
  address: "123 Test Street",
  id_document_type: "Aadhaar",
  id_document_number: "123456789012",
});
if (!cust.ok) {
  console.log("✗ Create shop customer failed:", cust.body);
  process.exit(1);
}
const custId = JSON.parse(cust.body);
console.log(`✓ Shop customer created: ${custId}`);

const start = new Date();
const end = new Date();
end.setDate(end.getDate() + 3);
const book = await rpc(url, key, token, "admin_create_walk_in_booking", {
  equipment_id: equip.id,
  shop_customer_id: custId,
  branch_id: branch.id,
  start_date: start.toISOString().slice(0, 10),
  end_date: end.toISOString().slice(0, 10),
  number_of_days: 3,
  insurance_required: false,
  delivery_address: "Test delivery",
  subtotal: 15000,
  insurance_cost: 0,
  transport_cost: 2000,
  tax: 2700,
  total_amount: 19700,
  advance_amount: 5000,
  advance_paid: 5000,
  payment_method: "cash",
  booking_status: "approved",
  payment_status: "pending",
  rental_type: "daily",
  custom_rent_amount: null,
  notes: "E2E smoke test booking",
  id_document_url: null,
  handover_photo_url: null,
  customer_signature_url: null,
  customer_label: "Smoke Walk-in Customer",
});
if (!book.ok) {
  console.log("✗ Create booking failed:", book.body);
  process.exit(1);
}
console.log(`✓ Booking created: ${book.body.slice(0, 120)}`);
console.log("\nBook Now flow: PASS");
