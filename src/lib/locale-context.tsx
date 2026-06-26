import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/db";
import { isMissingSchema } from "@/lib/errors";
import {
  COUNTRIES,
  buildIntlLocale,
  type CountryCode,
  type LanguageCode,
} from "@/lib/locale/countries";
import { getTranslations } from "@/lib/locale/translations";
import {
  readLocalePrefs,
  writeLocalePrefs,
  resolveLocalePrefs,
  useLocalePrefs,
  setLocaleUserId,
} from "@/lib/locale/locale-store";
import { calculateTax, formatTaxLabel } from "@/lib/locale/tax";
import { setFormatLocale } from "@/lib/format";

export interface CountryTaxConfig {
  country_code: CountryCode;
  tax_name: string;
  tax_rate: number;
  tax_id_label: string;
  currency_code: string;
}

interface LocaleCtx {
  country: CountryCode;
  language: LanguageCode;
  currency: string;
  intlLocale: string;
  taxName: string;
  taxRate: number;
  taxIdLabel: string;
  taxLabel: string;
  t: ReturnType<typeof getTranslations>;
  setCountry: (code: CountryCode) => void;
  setLanguage: (code: LanguageCode) => void;
  formatMoney: (n: number | null | undefined) => string;
  formatDate: (s: string | Date) => string;
  calculateTaxAmount: (taxable: number) => number;
  taxConfigs: CountryTaxConfig[];
  refreshTaxConfigs: () => Promise<void>;
  saving: boolean;
  savePreferences: (country: CountryCode, language: LanguageCode) => Promise<void>;
}

const Ctx = createContext<LocaleCtx | null>(null);

function resolveTaxConfig(
  country: CountryCode,
  overrides: CountryTaxConfig[],
): Pick<CountryTaxConfig, "tax_name" | "tax_rate" | "tax_id_label" | "currency_code"> {
  const override = overrides.find((c) => c.country_code === country);
  const base = COUNTRIES[country];
  return {
    tax_name: override?.tax_name ?? base.taxName,
    tax_rate: override?.tax_rate ?? base.taxRate,
    tax_id_label: override?.tax_id_label ?? base.taxIdLabel,
    currency_code: override?.currency_code ?? base.currency,
  };
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { profile, patchProfile } = useAuth();
  const stored = useLocalePrefs();

  useEffect(() => {
    setLocaleUserId(profile?.id ?? null);
  }, [profile?.id]);

  const prefs = useMemo(() => {
    if (stored.userSet) return stored;
    if (!profile?.id) return stored;
    return resolveLocalePrefs(profile.country_code, profile.preferred_language);
  }, [stored, profile?.id, profile?.country_code, profile?.preferred_language]);

  const { country, language } = prefs;

  const [taxConfigs, setTaxConfigs] = useState<CountryTaxConfig[]>([]);
  const [saving, setSaving] = useState(false);

  const refreshTaxConfigs = useCallback(async () => {
    const { data } = await db.from("country_tax_configs").select("*");
    if (data) {
      setTaxConfigs(
        data.map((row) => ({
          country_code: row.country_code as CountryCode,
          tax_name: row.tax_name,
          tax_rate: Number(row.tax_rate),
          tax_id_label: row.tax_id_label,
          currency_code: row.currency_code,
        })),
      );
    }
  }, []);

  useEffect(() => {
    void refreshTaxConfigs();
  }, [refreshTaxConfigs]);

  const tax = useMemo(() => resolveTaxConfig(country, taxConfigs), [country, taxConfigs]);
  const intlLocale = buildIntlLocale(language, country);

  useEffect(() => {
    setFormatLocale(intlLocale, tax.currency_code);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [intlLocale, tax.currency_code, language]);

  const formatMoney = useCallback(
    (n: number | null | undefined) => {
      try {
        return new Intl.NumberFormat(intlLocale, {
          style: "currency",
          currency: tax.currency_code,
          maximumFractionDigits: 0,
        }).format(n ?? 0);
      } catch {
        return new Intl.NumberFormat("en", {
          style: "currency",
          currency: tax.currency_code,
          maximumFractionDigits: 0,
        }).format(n ?? 0);
      }
    },
    [intlLocale, tax.currency_code],
  );

  const formatDate = useCallback(
    (s: string | Date) => {
      try {
        return new Date(s).toLocaleDateString(intlLocale, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      } catch {
        return new Date(s).toLocaleDateString("en", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
    },
    [intlLocale],
  );

  const setCountry = useCallback((code: CountryCode) => {
    const current = readLocalePrefs();
    writeLocalePrefs({ country: code, language: current.language, userSet: true });
  }, []);

  const setLanguage = useCallback((code: LanguageCode) => {
    const current = readLocalePrefs();
    writeLocalePrefs({ country: current.country, language: code, userSet: true });
  }, []);

  const savePreferences = useCallback(async (nextCountry: CountryCode, nextLanguage: LanguageCode) => {
    if (!profile) return;
    setSaving(true);
    try {
      writeLocalePrefs({ country: nextCountry, language: nextLanguage, userSet: true });

      const { error } = await db.from("profiles").update({
        country_code: nextCountry,
        preferred_language: nextLanguage,
      }).eq("id", profile.id);

      if (error && !isMissingSchema(error)) {
        throw error;
      }

      patchProfile({
        country_code: nextCountry,
        preferred_language: nextLanguage,
      });
    } finally {
      setSaving(false);
    }
  }, [profile, patchProfile]);

  const value = useMemo<LocaleCtx>(() => ({
    country,
    language,
    currency: tax.currency_code,
    intlLocale,
    taxName: tax.tax_name,
    taxRate: tax.tax_rate,
    taxIdLabel: tax.tax_id_label,
    taxLabel: formatTaxLabel(tax.tax_name, tax.tax_rate),
    t: getTranslations(language),
    setCountry,
    setLanguage,
    formatMoney,
    formatDate,
    calculateTaxAmount: (taxable: number) => calculateTax(taxable, tax.tax_rate),
    taxConfigs,
    refreshTaxConfigs,
    saving,
    savePreferences,
  }), [
    country, language, tax, intlLocale, setCountry, setLanguage,
    formatMoney, formatDate, taxConfigs, refreshTaxConfigs, saving, savePreferences,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLocale must be used inside LocaleProvider");
  return ctx;
}
