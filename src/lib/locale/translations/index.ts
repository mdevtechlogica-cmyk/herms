import type { LanguageCode } from "../countries";
import { ar } from "./ar";
import { en, type TranslationTree } from "./en";
import { hi } from "./hi";
import {
  bn,
  gu,
  kn,
  ml,
  mr,
  pa,
  ta,
  te,
} from "./indian";
import { es, fr, it, ja, ru, zh } from "./western";

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

const fallback: Record<Exclude<LanguageCode, "en" | "hi" | "ar">, TranslationTree> = {
  it,
  fr,
  es,
  ru,
  zh,
  ja,
  ta,
  te,
  bn,
  mr,
  kn,
  ml,
  gu,
  pa,
};

function resolveLocale(code: LanguageCode): TranslationTree {
  if (code === "en" || code === "hi" || code === "ar") {
    return { en, hi, ar }[code];
  }
  return generatedLocale(code) ?? fallback[code];
}

export const TRANSLATIONS = {
  en,
  hi,
  ar,
  it: resolveLocale("it"),
  fr: resolveLocale("fr"),
  es: resolveLocale("es"),
  ru: resolveLocale("ru"),
  zh: resolveLocale("zh"),
  ja: resolveLocale("ja"),
  ta: resolveLocale("ta"),
  te: resolveLocale("te"),
  bn: resolveLocale("bn"),
  mr: resolveLocale("mr"),
  kn: resolveLocale("kn"),
  ml: resolveLocale("ml"),
  gu: resolveLocale("gu"),
  pa: resolveLocale("pa"),
} as const satisfies Record<LanguageCode, TranslationTree>;

export function getTranslations(language: LanguageCode): TranslationTree {
  return TRANSLATIONS[language] ?? TRANSLATIONS.en;
}
