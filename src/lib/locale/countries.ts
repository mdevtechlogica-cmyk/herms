export const LANGUAGE_CODES = [
  "en",
  "es",
  "fr",
  "de",
  "pt",
  "it",
  "nl",
  "ru",
  "ar",
  "zh",
  "zh-Hant",
  "ja",
  "ko",
  "hi",
  "tr",
  "id",
  "th",
  "vi",
  "pl",
  "uk",
] as const;

export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export type CountryCode =
  | "IN"
  | "US"
  | "AE"
  | "GB"
  | "SA"
  | "EU"
  | "AU"
  | "CA"
  | "SG"
  | "IT"
  | "FR"
  | "ES"
  | "RU"
  | "CN"
  | "JP"
  | "DE"
  | "BR"
  | "PT"
  | "NL"
  | "KR"
  | "TR"
  | "ID"
  | "TH"
  | "VN"
  | "PL"
  | "UA"
  | "TW";

export interface CountryConfig {
  code: CountryCode;
  name: string;
  currency: string;
  intlLocale: string;
  taxName: string;
  taxRate: number;
  taxIdLabel: string;
  /** E.164 dial prefix, e.g. +91 */
  dialCode: string;
  languages: LanguageCode[];
  defaultLanguage: LanguageCode;
}

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  it: "Italiano",
  nl: "Nederlands",
  ru: "Русский",
  ar: "العربية",
  zh: "中文（简体）",
  "zh-Hant": "中文（繁體）",
  ja: "日本語",
  ko: "한국어",
  hi: "हिन्दी",
  tr: "Türkçe",
  id: "Bahasa Indonesia",
  th: "ไทย",
  vi: "Tiếng Việt",
  pl: "Polski",
  uk: "Українська",
};

/** Map removed Indian regional codes to Hindi for stored preferences. */
const LEGACY_LANGUAGE_ALIASES: Record<string, LanguageCode> = {
  ta: "hi",
  te: "hi",
  bn: "hi",
  mr: "hi",
  kn: "hi",
  ml: "hi",
  gu: "hi",
  pa: "hi",
};

export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  IN: {
    code: "IN",
    name: "India",
    currency: "INR",
    intlLocale: "en-IN",
    taxName: "GST",
    taxRate: 0.18,
    taxIdLabel: "GST Number",
    dialCode: "+91",
    languages: ["en", "hi"],
    defaultLanguage: "en",
  },
  US: {
    code: "US",
    name: "United States",
    currency: "USD",
    intlLocale: "en-US",
    taxName: "Sales Tax",
    taxRate: 0.08,
    taxIdLabel: "Tax ID",
    dialCode: "+1",
    languages: ["en", "es"],
    defaultLanguage: "en",
  },
  AE: {
    code: "AE",
    name: "United Arab Emirates",
    currency: "AED",
    intlLocale: "ar-AE",
    taxName: "VAT",
    taxRate: 0.05,
    taxIdLabel: "TRN",
    dialCode: "+971",
    languages: ["en", "ar"],
    defaultLanguage: "en",
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    currency: "GBP",
    intlLocale: "en-GB",
    taxName: "VAT",
    taxRate: 0.2,
    taxIdLabel: "VAT Number",
    dialCode: "+44",
    languages: ["en"],
    defaultLanguage: "en",
  },
  SA: {
    code: "SA",
    name: "Saudi Arabia",
    currency: "SAR",
    intlLocale: "ar-SA",
    taxName: "VAT",
    taxRate: 0.15,
    taxIdLabel: "VAT Number",
    dialCode: "+966",
    languages: ["en", "ar"],
    defaultLanguage: "ar",
  },
  EU: {
    code: "EU",
    name: "Eurozone",
    currency: "EUR",
    intlLocale: "en-EU",
    taxName: "VAT",
    taxRate: 0.19,
    taxIdLabel: "VAT Number",
    dialCode: "+",
    languages: ["en", "fr", "de", "es", "it", "nl", "pl"],
    defaultLanguage: "en",
  },
  AU: {
    code: "AU",
    name: "Australia",
    currency: "AUD",
    intlLocale: "en-AU",
    taxName: "GST",
    taxRate: 0.1,
    taxIdLabel: "GST Number",
    dialCode: "+61",
    languages: ["en"],
    defaultLanguage: "en",
  },
  CA: {
    code: "CA",
    name: "Canada",
    currency: "CAD",
    intlLocale: "en-CA",
    taxName: "HST",
    taxRate: 0.13,
    taxIdLabel: "HST Number",
    dialCode: "+1",
    languages: ["en", "fr"],
    defaultLanguage: "en",
  },
  SG: {
    code: "SG",
    name: "Singapore",
    currency: "SGD",
    intlLocale: "en-SG",
    taxName: "GST",
    taxRate: 0.09,
    taxIdLabel: "GST Number",
    dialCode: "+65",
    languages: ["en", "zh"],
    defaultLanguage: "en",
  },
  IT: {
    code: "IT",
    name: "Italy",
    currency: "EUR",
    intlLocale: "it-IT",
    taxName: "IVA",
    taxRate: 0.22,
    taxIdLabel: "Partita IVA",
    dialCode: "+39",
    languages: ["it", "en"],
    defaultLanguage: "it",
  },
  FR: {
    code: "FR",
    name: "France",
    currency: "EUR",
    intlLocale: "fr-FR",
    taxName: "TVA",
    taxRate: 0.2,
    taxIdLabel: "Numéro de TVA",
    dialCode: "+33",
    languages: ["fr", "en"],
    defaultLanguage: "fr",
  },
  ES: {
    code: "ES",
    name: "Spain",
    currency: "EUR",
    intlLocale: "es-ES",
    taxName: "IVA",
    taxRate: 0.21,
    taxIdLabel: "NIF / CIF",
    dialCode: "+34",
    languages: ["es", "en"],
    defaultLanguage: "es",
  },
  RU: {
    code: "RU",
    name: "Russia",
    currency: "RUB",
    intlLocale: "ru-RU",
    taxName: "НДС",
    taxRate: 0.2,
    taxIdLabel: "ИНН",
    dialCode: "+7",
    languages: ["ru", "en"],
    defaultLanguage: "ru",
  },
  CN: {
    code: "CN",
    name: "China",
    currency: "CNY",
    intlLocale: "zh-CN",
    taxName: "VAT",
    taxRate: 0.13,
    taxIdLabel: "Tax ID",
    dialCode: "+86",
    languages: ["zh", "en"],
    defaultLanguage: "zh",
  },
  JP: {
    code: "JP",
    name: "Japan",
    currency: "JPY",
    intlLocale: "ja-JP",
    taxName: "Consumption Tax",
    taxRate: 0.1,
    taxIdLabel: "Corporate Number",
    dialCode: "+81",
    languages: ["ja", "en"],
    defaultLanguage: "ja",
  },
  DE: {
    code: "DE",
    name: "Germany",
    currency: "EUR",
    intlLocale: "de-DE",
    taxName: "MwSt",
    taxRate: 0.19,
    taxIdLabel: "USt-IdNr",
    dialCode: "+49",
    languages: ["de", "en"],
    defaultLanguage: "de",
  },
  BR: {
    code: "BR",
    name: "Brazil",
    currency: "BRL",
    intlLocale: "pt-BR",
    taxName: "ICMS",
    taxRate: 0.17,
    taxIdLabel: "CNPJ",
    dialCode: "+55",
    languages: ["pt", "en"],
    defaultLanguage: "pt",
  },
  PT: {
    code: "PT",
    name: "Portugal",
    currency: "EUR",
    intlLocale: "pt-PT",
    taxName: "IVA",
    taxRate: 0.23,
    taxIdLabel: "NIF",
    dialCode: "+351",
    languages: ["pt", "en"],
    defaultLanguage: "pt",
  },
  NL: {
    code: "NL",
    name: "Netherlands",
    currency: "EUR",
    intlLocale: "nl-NL",
    taxName: "BTW",
    taxRate: 0.21,
    taxIdLabel: "BTW-nummer",
    dialCode: "+31",
    languages: ["nl", "en"],
    defaultLanguage: "nl",
  },
  KR: {
    code: "KR",
    name: "South Korea",
    currency: "KRW",
    intlLocale: "ko-KR",
    taxName: "VAT",
    taxRate: 0.1,
    taxIdLabel: "Business Registration Number",
    dialCode: "+82",
    languages: ["ko", "en"],
    defaultLanguage: "ko",
  },
  TR: {
    code: "TR",
    name: "Türkiye",
    currency: "TRY",
    intlLocale: "tr-TR",
    taxName: "KDV",
    taxRate: 0.2,
    taxIdLabel: "Vergi No",
    dialCode: "+90",
    languages: ["tr", "en"],
    defaultLanguage: "tr",
  },
  ID: {
    code: "ID",
    name: "Indonesia",
    currency: "IDR",
    intlLocale: "id-ID",
    taxName: "PPN",
    taxRate: 0.11,
    taxIdLabel: "NPWP",
    dialCode: "+62",
    languages: ["id", "en"],
    defaultLanguage: "id",
  },
  TH: {
    code: "TH",
    name: "Thailand",
    currency: "THB",
    intlLocale: "th-TH",
    taxName: "VAT",
    taxRate: 0.07,
    taxIdLabel: "Tax ID",
    dialCode: "+66",
    languages: ["th", "en"],
    defaultLanguage: "th",
  },
  VN: {
    code: "VN",
    name: "Vietnam",
    currency: "VND",
    intlLocale: "vi-VN",
    taxName: "VAT",
    taxRate: 0.1,
    taxIdLabel: "Tax Code",
    dialCode: "+84",
    languages: ["vi", "en"],
    defaultLanguage: "vi",
  },
  PL: {
    code: "PL",
    name: "Poland",
    currency: "PLN",
    intlLocale: "pl-PL",
    taxName: "VAT",
    taxRate: 0.23,
    taxIdLabel: "NIP",
    dialCode: "+48",
    languages: ["pl", "en"],
    defaultLanguage: "pl",
  },
  UA: {
    code: "UA",
    name: "Ukraine",
    currency: "UAH",
    intlLocale: "uk-UA",
    taxName: "ПДВ",
    taxRate: 0.2,
    taxIdLabel: "ЄДРПОУ",
    dialCode: "+380",
    languages: ["uk", "en"],
    defaultLanguage: "uk",
  },
  TW: {
    code: "TW",
    name: "Taiwan",
    currency: "TWD",
    intlLocale: "zh-TW",
    taxName: "VAT",
    taxRate: 0.05,
    taxIdLabel: "Tax ID",
    dialCode: "+886",
    languages: ["zh-Hant", "en"],
    defaultLanguage: "zh-Hant",
  },
};

export const COUNTRY_LIST = Object.values(COUNTRIES);

const LANGUAGE_INTL_LOCALE: Partial<Record<LanguageCode, string>> = {
  hi: "hi-IN",
  it: "it-IT",
  fr: "fr-FR",
  es: "es-ES",
  de: "de-DE",
  pt: "pt-BR",
  nl: "nl-NL",
  ru: "ru-RU",
  zh: "zh-CN",
  "zh-Hant": "zh-TW",
  ja: "ja-JP",
  ko: "ko-KR",
  ar: "ar",
  tr: "tr-TR",
  id: "id-ID",
  th: "th-TH",
  vi: "vi-VN",
  pl: "pl-PL",
  uk: "uk-UA",
};

export function isCountryCode(value: string): value is CountryCode {
  return value in COUNTRIES;
}

export function isLanguageCode(value: string): value is LanguageCode {
  return (LANGUAGE_CODES as readonly string[]).includes(value);
}

export function normalizeLanguageCode(value: string | null | undefined): LanguageCode | null {
  if (!value) return null;
  if (isLanguageCode(value)) return value;
  return LEGACY_LANGUAGE_ALIASES[value] ?? null;
}

export function resolveCountryCode(
  value: string | null | undefined,
  fallback: CountryCode,
): CountryCode {
  if (value && isCountryCode(value)) return value;
  return fallback;
}

export function resolveLanguageForCountry(
  countryCode: CountryCode,
  preferred: string | null | undefined,
  fallback: LanguageCode,
): LanguageCode {
  const normalized = normalizeLanguageCode(preferred);
  const langs = COUNTRIES[countryCode].languages;
  if (normalized && langs.includes(normalized)) {
    return normalized;
  }
  if (langs.includes(fallback)) return fallback;
  return langs[0];
}

/** All supported UI languages (fixed global list). */
export function allAvailableLanguages(): LanguageCode[] {
  return [...LANGUAGE_CODES];
}

/** Build a BCP-47 tag that Intl APIs accept for the chosen language + country. */
export function buildIntlLocale(language: LanguageCode, country: CountryCode): string {
  const base = COUNTRIES[country].intlLocale;

  if (language === "en") return base;

  if (language === "ar") {
    return base.startsWith("ar") ? base : "ar-SA";
  }

  const mapped = LANGUAGE_INTL_LOCALE[language];
  if (mapped) {
    try {
      if (Intl.getCanonicalLocales(mapped).length > 0) return mapped;
    } catch {
      // fall through
    }
  }

  const tag = `${language}-${country}`;
  try {
    if (Intl.getCanonicalLocales(tag).length > 0) return tag;
  } catch {
    // fall through
  }

  return base;
}

export function isRtlLanguage(language: LanguageCode): boolean {
  return language === "ar";
}
