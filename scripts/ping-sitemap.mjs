#!/usr/bin/env node
/**
 * Pings search engines after deploy so sitemap is discovered faster.
 * Run: node scripts/ping-sitemap.mjs
 */
const siteUrl = (process.env.VITE_SITE_URL ?? "https://herms.app").replace(/\/$/, "");
const sitemap = `${siteUrl}/sitemap.xml`;

const targets = [
  `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemap)}`,
  `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemap)}`,
];

for (const url of targets) {
  try {
    const res = await fetch(url);
    console.log(`${res.ok ? "OK" : "FAIL"} ${res.status} ${url}`);
  } catch (error) {
    console.warn(`FAIL ${url}`, error.message);
  }
}
