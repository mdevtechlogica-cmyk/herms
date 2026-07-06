#!/usr/bin/env node
/**
 * HERMS smoke test: auth, API data, route loading, validations.
 * Usage: node scripts/e2e-smoke-test.mjs
 */
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.HERMS_BASE_URL ?? "http://localhost:8080";
const EMAIL = process.env.HERMS_TEST_EMAIL ?? "test@gmail.com";
const PASSWORD = process.env.HERMS_TEST_PASSWORD ?? "Test123!";

const PUBLIC_ROUTES = ["/", "/auth", "/auth?mode=signup"];
const APP_ROUTES = [
  "/admin/dashboard",
  "/admin/branches",
  "/admin/bookings",
  "/admin/book-now",
  "/admin/collect-equipment",
  "/admin/equipment",
  "/admin/categories",
  "/admin/maintenance",
  "/admin/payments",
  "/admin/invoices",
  "/admin/reports",
  "/admin/reports/bookings",
  "/admin/reports/equipment",
  "/admin/reports/customers",
  "/admin/reports/invoices",
  "/admin/reports/maintenance",
  "/admin/reports/payments",
  "/admin/reports/revenue",
  "/admin/team",
  "/admin/subscription",
  "/admin/customers",
  "/admin/tax",
  "/profile",
  "/about",
];

function parseEnv(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=["']?([^"'\n#]+)["']?/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

async function loadEnv() {
  try {
    const raw = await readFile(join(root, ".env"), "utf8");
    return parseEnv(raw);
  } catch {
    return {};
  }
}

function pass(msg) {
  console.log(`  ✓ ${msg}`);
  return true;
}

function fail(msg, detail) {
  console.log(`  ✗ ${msg}`);
  if (detail) console.log(`    ${detail}`);
  return false;
}

async function fetchRoute(path) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { Accept: "text/html" },
    redirect: "manual",
  });
  const text = await res.text();
  return { url, status: res.status, text, location: res.headers.get("location") };
}

function hasErrorBoundary(text) {
  return (
    text.includes("This page didn't load") ||
    text.includes("Something went wrong") ||
    text.includes("HTTPError") ||
    /status["']?\s*:\s*500/.test(text)
  );
}

async function supabaseSignIn(url, anonKey) {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error_description || body.msg || body.message || `Auth failed (${res.status})`);
  }
  return body;
}

async function supabaseGet(url, anonKey, token, table, query = "") {
  const res = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`${table}: ${body.message || res.status}`);
  }
  return body;
}

async function supabasePatch(url, anonKey, token, table, id, patch) {
  const res = await fetch(`${url}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`${table} patch: ${body.message || res.status}`);
  }
  return body;
}

async function supabaseInsert(url, anonKey, token, table, row) {
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`${table} insert: ${body.message || JSON.stringify(body)}`);
  }
  return body;
}

async function testValidations() {
  console.log("\n── Validation logic (inline) ──");
  let ok = 0;
  let total = 0;

  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const pwOk = (v) => v.length >= 6;

  total++;
  if (!emailOk("not-an-email")) ok++, pass("Invalid email rejected");
  else fail("Invalid email should be rejected");

  total++;
  if (!pwOk("123")) ok++, pass("Short password rejected");
  else fail("Short password should be rejected");

  total++;
  if (emailOk(EMAIL) && pwOk(PASSWORD)) ok++, pass("Test credentials pass basic validation");
  else fail("Test credentials should pass validation");

  // Indian phone: 10 digits
  const phoneOk = (national) => /^\d{10}$/.test(national.replace(/\D/g, ""));
  total++;
  if (phoneOk("9876543210")) ok++, pass("10-digit Indian phone valid");
  else fail("10-digit phone should be valid");

  total++;
  if (!phoneOk("12345")) ok++, pass("5-digit phone invalid");
  else fail("5-digit phone should be invalid");

  return { ok, total };
}

async function seedMinimalData(url, anonKey, token, userId) {
  console.log("\n── Dummy data (API) ──");
  const results = [];

  const branches = await supabaseGet(url, anonKey, token, "branches", `owner_id=eq.${userId}&select=id,name`);
  if (branches.length === 0) {
    try {
      const inserted = await supabaseInsert(url, anonKey, token, "branches", {
        owner_id: userId,
        name: "Smoke Test Branch",
        country_code: "IN",
        address: "123 Test Street, Mumbai",
        phone: "+919876543210",
        is_active: true,
      });
      results.push(pass(`Created branch: ${inserted[0]?.name}`));
    } catch (e) {
      results.push(fail("Could not create branch", e.message));
    }
  } else {
    results.push(pass(`Branches exist (${branches.length}): ${branches.map((b) => b.name).join(", ")}`));
  }

  const categories = await supabaseGet(url, anonKey, token, "equipment_categories", "select=id,category_name&limit=5");
  if (categories.length === 0) {
    try {
      await supabaseInsert(url, anonKey, token, "equipment_categories", {
        category_name: "Smoke Test Excavators",
        description: "E2E test category",
        icon: "excavator",
      });
      results.push(pass("Created test equipment category"));
    } catch (e) {
      results.push(fail("Could not create category", e.message));
    }
  } else {
    results.push(pass(`Categories exist (${categories.length}+)`));
  }

  const freshBranches = await supabaseGet(url, anonKey, token, "branches", `owner_id=eq.${userId}&select=id,name&limit=1`);
  const freshCats = await supabaseGet(url, anonKey, token, "equipment_categories", "select=id&limit=1");
  const equipment = await supabaseGet(
    url,
    anonKey,
    token,
    "equipment",
    `branch_id=eq.${freshBranches[0]?.id}&select=id,equipment_name&limit=5`,
  );

  if (equipment.length === 0 && freshBranches[0] && freshCats[0]) {
    try {
      const inserted = await supabaseInsert(url, anonKey, token, "equipment", {
        equipment_name: "Smoke Test JCB 3DX",
        category_id: freshCats[0].id,
        branch_id: freshBranches[0].id,
        brand: "JCB",
        model: "3DX",
        manufacture_year: 2022,
        serial_number: `SMOKE-${Date.now()}`,
        registration_number: "MH-TEST-001",
        daily_rate: 5000,
        weekly_rate: 30000,
        monthly_rate: 100000,
        operator_charge: 1500,
        transport_charge: 2000,
        fuel_type: "Diesel",
        capacity: "1.1 cu.m",
        status: "available",
        location: freshBranches[0].name,
      });
      results.push(pass(`Created equipment: ${inserted[0]?.equipment_name}`));
    } catch (e) {
      results.push(fail("Could not create equipment", e.message));
    }
  } else {
    results.push(pass(`Equipment exists (${equipment.length}+ on first branch)`));
  }

  try {
    const updated = await supabasePatch(url, anonKey, token, "profiles", userId, {
      full_name: "Test User (E2E)",
      company_name: "HERMS Demo Rentals",
      phone: "+919876543210",
      address: "Mumbai, India",
      country_code: "IN",
      preferred_language: "en",
    });
    results.push(pass(`Profile updated: ${updated[0]?.full_name}`));
  } catch (e) {
    results.push(fail("Profile update failed", e.message));
  }

  return results;
}

async function main() {
  console.log("HERMS E2E Smoke Test");
  console.log(`Base URL: ${BASE}`);
  console.log(`Test user: ${EMAIL}`);

  const env = await loadEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;

  let routePass = 0;
  let routeFail = 0;
  const routeIssues = [];

  console.log("\n── Public routes (SSR/HTML) ──");
  for (const path of PUBLIC_ROUTES) {
    try {
      const { status, text } = await fetchRoute(path);
      if (status >= 500 || hasErrorBoundary(text)) {
        routeFail++;
        routeIssues.push(`${path}: HTTP ${status} or error boundary`);
        fail(`${path} → ${status}`, hasErrorBoundary(text) ? "error boundary in HTML" : undefined);
      } else {
        routePass++;
        pass(`${path} → ${status}`);
      }
    } catch (e) {
      routeFail++;
      routeIssues.push(`${path}: ${e.message}`);
      fail(`${path}`, e.message);
    }
  }

  console.log("\n── App routes (SSR shell — auth is client-side) ──");
  for (const path of APP_ROUTES) {
    try {
      const { status, text } = await fetchRoute(path);
      if (status >= 500 || hasErrorBoundary(text)) {
        routeFail++;
        routeIssues.push(`${path}: HTTP ${status} or error boundary`);
        fail(`${path} → ${status}`, hasErrorBoundary(text) ? "error boundary" : undefined);
      } else if (status === 404) {
        routeFail++;
        routeIssues.push(`${path}: 404`);
        fail(`${path} → 404`);
      } else {
        routePass++;
        pass(`${path} → ${status}`);
      }
    } catch (e) {
      routeFail++;
      fail(`${path}`, e.message);
    }
  }

  let authOk = false;
  let role = null;
  let userId = null;

  if (!supabaseUrl || !anonKey) {
    fail("Supabase env missing — skipping API/auth tests");
  } else {
    console.log("\n── Auth & API ──");
    try {
      const session = await supabaseSignIn(supabaseUrl, anonKey);
      userId = session.user?.id;
      pass(`Sign-in OK (user ${userId?.slice(0, 8)}…)`);
      authOk = true;

      const roles = await supabaseGet(
        supabaseUrl,
        anonKey,
        session.access_token,
        "user_roles",
        `user_id=eq.${userId}&select=role`,
      );
      role = roles[0]?.role ?? "none";
      if (role === "admin" || role === "employee") pass(`Role: ${role}`);
      else fail(`Role is "${role}" — admin/employee required for full app access`);

      const profile = await supabaseGet(
        supabaseUrl,
        anonKey,
        session.access_token,
        "profiles",
        `id=eq.${userId}&select=full_name,email,subscription_plan,subscription_active`,
      );
      if (profile[0]) {
        pass(`Profile: ${profile[0].full_name || "(no name)"} <${profile[0].email}>`);
      } else {
        fail("No profile row for user");
      }

      await seedMinimalData(supabaseUrl, anonKey, session.access_token, userId);

      const bookings = await supabaseGet(
        supabaseUrl,
        anonKey,
        session.access_token,
        "bookings",
        `select=id,booking_status&limit=3`,
      );
      pass(`Bookings readable (${bookings.length} sample)`);

      const tableQueries = [
        ["equipment", "select=id,equipment_name,status&limit=5"],
        ["maintenance_records", "select=id&limit=3"],
        ["payments", "select=id&limit=3"],
        ["invoices", "select=id&limit=3"],
        ["shop_customers", "select=id,full_name&limit=3"],
        ["operators", "select=id&limit=3"],
        ["country_tax_config", "select=country_code&limit=3"],
      ];
      for (const [table, query] of tableQueries) {
        try {
          const rows = await supabaseGet(supabaseUrl, anonKey, session.access_token, table, query);
          pass(`${table}: ${rows.length} row(s)`);
        } catch (e) {
          fail(`${table} query failed`, e.message);
        }
      }
    } catch (e) {
      fail("Auth/API", e.message);
    }
  }

  const validation = await testValidations();

  console.log("\n══════════════════════════════════════");
  console.log("SUMMARY");
  console.log(`  Routes: ${routePass} passed, ${routeFail} failed`);
  console.log(`  Auth:   ${authOk ? "OK" : "FAILED"}${role ? ` (${role})` : ""}`);
  console.log(`  Validations: ${validation.ok}/${validation.total}`);
  if (routeIssues.length) {
    console.log("\n  Route issues:");
    routeIssues.forEach((i) => console.log(`    - ${i}`));
  }
  console.log("══════════════════════════════════════\n");

  process.exit(routeFail > 0 || !authOk ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
