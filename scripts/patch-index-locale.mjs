import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = join(__dirname, "../src/routes/index.tsx");
let s = readFileSync(path, "utf8");

const start = s.indexOf("// Landing page translations");
const end = s.indexOf("function Index()");
if (start === -1 || end === -1) throw new Error("markers not found");
s = s.slice(0, start) + s.slice(end);

s = s.replace(
  "const { country, language, setCountry, setLanguage, formatMoney } = useLocale();",
  "const { country, language, setCountry, setLanguage, formatMoney, t: messages } = useLocale();\n  const t = messages.landing;",
);

s = s.replace(
  /const t = landingTranslations\[language as keyof typeof landingTranslations\] \?\? landingTranslations\.en;\r?\n  const languageOptions = allAvailableLanguages\(\);/,
  "const languageOptions = allAvailableLanguages();",
);

s = s.replaceAll(
  '<label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Language</label>',
  '<label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">{t.languageLabel}</label>',
);

s = s.replaceAll(
  '<label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Region</label>',
  '<label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">{t.regionLabel}</label>',
);

writeFileSync(path, s);
console.log("Updated index.tsx");
