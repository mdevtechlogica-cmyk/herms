/**
 * Generates full locale JSON files from English source.
 * Run: node scripts/generate-locale-translations.mjs
 */
import { writeFileSync, mkdirSync, readFileSync, unlinkSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "src/lib/locale/translations/generated");

const TARGETS = {
  es: "es",
  fr: "fr",
  de: "de",
  pt: "pt",
  it: "it",
  nl: "nl",
  ru: "ru",
  zh: "zh-CN",
  "zh-Hant": "zh-TW",
  ja: "ja",
  ko: "ko",
  tr: "tr",
  id: "id",
  th: "th",
  vi: "vi",
  pl: "pl",
  uk: "uk",
};

const DELAY_MS = 350;
const MAX_RETRIES = 4;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function collectStrings(obj, path = "") {
  const entries = [];
  for (const [key, value] of Object.entries(obj)) {
    const p = path ? `${path}.${key}` : key;
    if (value && typeof value === "object") {
      entries.push(...collectStrings(value, p));
    } else if (typeof value === "string") {
      entries.push({ path: p, text: value });
    }
  }
  return entries;
}

function setByPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (!cur[k] || typeof cur[k] !== "object") cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

function isComplete(lang, en, outPath) {
  if (!existsSync(outPath)) return false;
  try {
    const data = JSON.parse(readFileSync(outPath, "utf8"));
    const enFeatures = en.landing?.navFeatures;
    const localized = data.landing?.navFeatures;
    return Boolean(localized && localized !== enFeatures);
  } catch {
    return false;
  }
}

async function translateText(text, target) {
  if (!text.trim()) return text;

  const placeholders = [];
  const masked = text.replace(/\{[^}]+\}/g, (m) => {
    const id = `__PH${placeholders.length}__`;
    placeholders.push(m);
    return id;
  });

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const url = new URL("https://translate.googleapis.com/translate_a/single");
      url.searchParams.set("client", "gtx");
      url.searchParams.set("sl", "en");
      url.searchParams.set("tl", target);
      url.searchParams.set("dt", "t");
      url.searchParams.set("q", masked);

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      let out = data[0]?.map((part) => part[0]).join("") ?? masked;

      placeholders.forEach((ph, i) => {
        out = out.replace(`__PH${i}__`, ph).replace(`__ ph${i} __`, ph);
      });

      return out;
    } catch (err) {
      lastError = err;
      await sleep(DELAY_MS * attempt);
    }
  }

  throw lastError;
}

async function main() {
  const enPath = join(root, "src/lib/locale/translations/source-en.json");
  if (!existsSync(enPath)) {
    throw new Error("Run: npx tsx scripts/export-source-en.mjs first");
  }
  const en = JSON.parse(readFileSync(enPath, "utf8"));
  const entries = collectStrings(en);

  mkdirSync(outDir, { recursive: true });

  for (const [lang, googleCode] of Object.entries(TARGETS)) {
    const outPath = join(outDir, `${lang}.json`);
    if (isComplete(lang, en, outPath)) {
      console.log(`Skip ${lang} (already translated)`);
      continue;
    }

    console.log(`Translating ${lang} (${entries.length} strings)...`);
    const result = structuredClone(en);

    for (let i = 0; i < entries.length; i++) {
      const { path, text } = entries[i];
      try {
        const translated = await translateText(text, googleCode);
        setByPath(result, path, translated);
      } catch (err) {
        console.warn(`  skip ${path}:`, err.message);
        setByPath(result, path, text);
      }
      if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${entries.length}`);
      await sleep(DELAY_MS);
    }

    const tmpPath = join(outDir, `${lang}.json.tmp`);
    writeFileSync(tmpPath, JSON.stringify(result, null, 2), "utf8");
    writeFileSync(outPath, readFileSync(tmpPath, "utf8"), "utf8");
    try { unlinkSync(tmpPath); } catch { /* ignore */ }
    console.log(`  wrote ${lang}.json`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
