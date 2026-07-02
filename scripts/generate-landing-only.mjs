/**
 * Generates landing-only translations for all target languages.
 * Run: npx tsx scripts/generate-landing-only.mjs
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { landingEn } from "../src/lib/locale/translations/landing-en.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, "../src/lib/locale/translations/landing-generated.ts");

const TARGETS = {
  it: "it",
  fr: "fr",
  es: "es",
  ru: "ru",
  zh: "zh-CN",
  ja: "ja",
  ta: "ta",
  te: "te",
  bn: "bn",
  mr: "mr",
  kn: "kn",
  ml: "ml",
  gu: "gu",
  pa: "pa",
};

const DELAY_MS = 200;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateText(text, target) {
  const placeholders = [];
  const masked = text.replace(/\{[^}]+\}/g, (m) => {
    const id = `__PH${placeholders.length}__`;
    placeholders.push(m);
    return id;
  });

  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "en");
  url.searchParams.set("tl", target);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", masked);

  const res = await fetch(url);
  const data = await res.json();
  let outText = data[0]?.map((p) => p[0]).join("") ?? masked;
  placeholders.forEach((ph, i) => {
    outText = outText.replace(`__PH${i}__`, ph);
  });
  return outText;
}

async function main() {
  const keys = Object.keys(landingEn);
  const result = {} ;

  for (const [lang, code] of Object.entries(TARGETS)) {
    console.log(`Landing ${lang}...`);
    const block = {};
    for (const key of keys) {
      block[key] = await translateText(landingEn[key], code);
      await sleep(DELAY_MS);
    }
    result[lang] = block;
  }

  const body = `/** Auto-generated landing translations — do not edit by hand. */\nexport const landingGenerated = ${JSON.stringify(result, null, 2)} as const;\n`;
  writeFileSync(out, body, "utf8");
  console.log("Wrote", out);
}

main().catch(console.error);
