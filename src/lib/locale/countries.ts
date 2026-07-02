export const LANGUAGE_CODES = [
  "en",
  "hi",
  "ar",
  "it",
  "fr",
  "es",
  "ru",
  "zh",
  "ja",
  "ta",
  "te",
  "bn",
  "mr",
  "kn",
  "ml",
  "gu",
  "pa",
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
  | "JP";

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
  hi: "हिन्दी",
  ar: "العربية",
  it: "Italiano",
  fr: "Français",
  es: "Español",
  ru: "Русский",
  zh: "中文",
  ja: "日本語",
  ta: "தமிழ்",
  te: "తెలుగు",
  bn: "বাংলা",
  mr: "मराठी",
  kn: "ಕನ್ನಡ",
  ml: "മലയാളം",
  gu: "ગુજરાતી",
  pa: "ਪੰਜਾਬੀ",
};

const INDIAN_LANGUAGES: LanguageCode[] = ["en", "hi", "ta", "te", "bn", "mr", "kn", "ml", "gu", "pa"];

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
    languages: INDIAN_LANGUAGES,
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
    languages: ["en", "fr", "es", "it"],
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
};

export const COUNTRY_LIST = Object.values(COUNTRIES);

const LANGUAGE_INTL_LOCALE: Partial<Record<LanguageCode, string>> = {
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
  bn: "bn-IN",
  mr: "mr-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  gu: "gu-IN",
  pa: "pa-IN",
  it: "it-IT",
  fr: "fr-FR",
  es: "es-ES",
  ru: "ru-RU",
  zh: "zh-CN",
  ja: "ja-JP",
  ar: "ar",
};

export function isCountryCode(value: string): value is CountryCode {
  return value in COUNTRIES;
}

export function isLanguageCode(value: string): value is LanguageCode {
  return (LANGUAGE_CODES as readonly string[]).includes(value);
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
  const langs = COUNTRIES[countryCode].languages;
  if (preferred && isLanguageCode(preferred) && langs.includes(preferred)) {
    return preferred;
  }
  if (langs.includes(fallback)) return fallback;
  return langs[0];
}

/** Languages available for UI pickers (union of all country languages, deduped). */
export function allAvailableLanguages(): LanguageCode[] {
  const set = new Set<LanguageCode>();
  for (const country of COUNTRY_LIST) {
    for (const lang of country.languages) set.add(lang);
  }
  return LANGUAGE_CODES.filter((code) => set.has(code));
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
