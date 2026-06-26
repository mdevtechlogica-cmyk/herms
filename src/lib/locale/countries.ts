export type CountryCode = "IN" | "US" | "AE" | "GB" | "SA" | "EU" | "AU" | "CA" | "SG";
export type LanguageCode = "en" | "hi" | "ar";

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
    languages: ["en"],
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
    languages: ["en"],
    defaultLanguage: "en",
  },
  AU: {
    code: "AU",
    name: "Australia",
    currency: "AUD",
    intlLocale: "en-AU",
    taxName: "GST",
    taxRate: 0.10,
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
    languages: ["en"],
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
    languages: ["en"],
    defaultLanguage: "en",
  },
};

export const COUNTRY_LIST = Object.values(COUNTRIES);

export function isCountryCode(value: string): value is CountryCode {
  return value in COUNTRIES;
}

export function isLanguageCode(value: string): value is LanguageCode {
  return value === "en" || value === "hi" || value === "ar";
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

/** Build a BCP-47 tag that Intl APIs accept for the chosen language + country. */
export function buildIntlLocale(language: LanguageCode, country: CountryCode): string {
  const base = COUNTRIES[country].intlLocale;
  if (language === "ar") return base;
  const tag = `${language}-${country}`;
  try {
    if (Intl.getCanonicalLocales(tag).length > 0) return tag;
  } catch {
    // fall through
  }
  return base;
}
