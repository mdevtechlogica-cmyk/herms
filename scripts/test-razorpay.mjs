import { readFileSync } from "node:fs";

const env = readFileSync(".env", "utf8");
const get = (k) => {
  const quoted = env.match(new RegExp(`^${k}="([^"]*)"`, "m"));
  if (quoted) return quoted[1];
  const plain = env.match(new RegExp(`^${k}=([^\\n#]+)`, "m"));
  return plain?.[1]?.trim();
};

const keyId = get("RAZORPAY_KEY_ID");
const keySecret = get("RAZORPAY_KEY_SECRET");

if (!keyId || !keySecret) {
  console.error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in .env");
  process.exit(1);
}

console.log("Key ID:", keyId);
console.log("Secret length:", keySecret.length);

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
    receipt: "herms_test_1",
  }),
});

console.log("HTTP status:", res.status);
const body = await res.text();
console.log("Response:", body);
