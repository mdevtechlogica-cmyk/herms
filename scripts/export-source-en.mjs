import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { en } from "../src/lib/locale/translations/en.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, "../src/lib/locale/translations/source-en.json");
writeFileSync(out, JSON.stringify(en, null, 2), "utf8");
console.log("Wrote", out);
