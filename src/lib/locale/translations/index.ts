import type { LanguageCode } from "../countries";
import { ar } from "./ar";
import { en } from "./en";
import { hi } from "./hi";

export const TRANSLATIONS = { en, hi, ar } as const;

export function getTranslations(language: LanguageCode) {
  return TRANSLATIONS[language] ?? TRANSLATIONS.en;
}
