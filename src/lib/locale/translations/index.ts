import { LANGUAGE_CODES, type LanguageCode } from "../countries";
import { ar } from "./ar";
import { en, type TranslationTree } from "./en";
import { hi } from "./hi";
import {
  de,
  es,
  fr,
  id,
  it,
  ja,
  ko,
  nl,
  pl,
  pt,
  ru,
  th,
  tr,
  uk,
  vi,
  zh,
  zhHant,
} from "./western";

/** Languages with completed generated/*.json files (run scripts/generate-locale-translations.mjs). */
const GENERATED_LOCALE_IMPORTS = import.meta.glob<TranslationTree>("./generated/*.json", {
  eager: true,
  import: "default",
});

function isValidGeneratedTree(value: unknown): value is TranslationTree {
  if (!value || typeof value !== "object") return false;
  const tree = value as TranslationTree;
  return Boolean(tree.nav?.profile && tree.landing?.heroTitle);
}

function generatedLocale(code: string): TranslationTree | null {
  const mod = GENERATED_LOCALE_IMPORTS[`./generated/${code}.json`];
  return isValidGeneratedTree(mod) ? mod : null;
}

const HAND_WRITTEN = { en, hi, ar } as const satisfies Record<"en" | "hi" | "ar", TranslationTree>;

const PARTIAL: Partial<Record<LanguageCode, TranslationTree>> = {
  es,
  fr,
  de,
  pt,
  it,
  nl,
  ru,
  zh,
  "zh-Hant": zhHant,
  ja,
  ko,
  tr,
  id,
  th,
  vi,
  pl,
  uk,
};

function resolveLocale(code: LanguageCode): TranslationTree {
  if (code in HAND_WRITTEN) return HAND_WRITTEN[code as keyof typeof HAND_WRITTEN];
  return generatedLocale(code) ?? PARTIAL[code] ?? en;
}

export const TRANSLATIONS = Object.fromEntries(
  LANGUAGE_CODES.map((code) => [code, resolveLocale(code)]),
) as Record<LanguageCode, TranslationTree>;

export function getTranslations(language: LanguageCode): TranslationTree {
  return TRANSLATIONS[language] ?? TRANSLATIONS.en;
}
