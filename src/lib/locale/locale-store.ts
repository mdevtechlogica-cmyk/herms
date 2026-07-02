import { useSyncExternalStore } from "react";
import {
  COUNTRIES,
  type CountryCode,
  type LanguageCode,
  isCountryCode,
  normalizeLanguageCode,
} from "@/lib/locale/countries";

export const LOCALE_STORAGE_KEY = "herms_locale_prefs_v2";

export interface LocalePrefs {
  country: CountryCode;
  language: LanguageCode;
  /** True after the user explicitly chose language/country in Profile. */
  userSet: boolean;
}

const DEFAULT_PREFS: LocalePrefs = { country: "IN", language: "en", userSet: false };

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: LocalePrefs | null = null;
let activeUserId: string | null = null;

function storageKey(): string {
  return activeUserId ? `${LOCALE_STORAGE_KEY}_${activeUserId}` : LOCALE_STORAGE_KEY;
}

function notify() {
  listeners.forEach((fn) => fn());
}

function parseStored(raw: string | null): LocalePrefs | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      country?: string;
      language?: string;
      userSet?: boolean;
    };
    const country =
      parsed.country && isCountryCode(parsed.country) ? parsed.country : "IN";
    const language =
      normalizeLanguageCode(parsed.language) ?? COUNTRIES[country].defaultLanguage;
    return { country, language, userSet: Boolean(parsed.userSet) };
  } catch {
    return null;
  }
}

function readFromStorage(): LocalePrefs | null {
  try {
    const keyed = parseStored(localStorage.getItem(storageKey()));
    if (keyed) return keyed;
    if (activeUserId) {
      const global = parseStored(localStorage.getItem(LOCALE_STORAGE_KEY));
      if (global) return global;
    }
    return parseStored(localStorage.getItem("herms_locale_prefs"));
  } catch {
    return null;
  }
}

function persistToStorage(prefs: LocalePrefs) {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(prefs));
    if (activeUserId) {
      localStorage.setItem(LOCALE_STORAGE_KEY, JSON.stringify(prefs));
    }
  } catch (error) {
    console.warn("[Locale] could not persist preferences:", error);
  }
}

/** Call when auth user changes so prefs are scoped per account. */
export function setLocaleUserId(userId: string | null) {
  if (activeUserId === userId) return;
  activeUserId = userId;
  cache = null;
  notify();
}

export function readLocalePrefs(): LocalePrefs {
  if (cache) return cache;
  const stored = readFromStorage();
  if (stored) {
    cache = stored;
    return stored;
  }
  cache = DEFAULT_PREFS;
  return DEFAULT_PREFS;
}

export function writeLocalePrefs(prefs: LocalePrefs, userSet?: boolean) {
  const current = cache ?? readFromStorage() ?? DEFAULT_PREFS;
  const requestedUserSet = userSet ?? prefs.userSet;
  const next: LocalePrefs = {
    country: prefs.country,
    language: prefs.language,
    // Once the user chose a locale, never downgrade back to profile defaults.
    userSet: current.userSet || requestedUserSet,
  };
  cache = next;
  persistToStorage(next);
  notify();
}

export function subscribeLocalePrefs(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resolveLocalePrefs(
  profileCountry?: string | null,
  profileLanguage?: string | null,
): LocalePrefs {
  const stored = readLocalePrefs();
  if (stored.userSet) return stored;

  const country =
    (profileCountry && isCountryCode(profileCountry) ? profileCountry : null)
    ?? stored.country;

  const profileLang = normalizeLanguageCode(profileLanguage);

  const language = profileLang ?? stored.language ?? COUNTRIES[country].defaultLanguage;
  return { country, language, userSet: false };
}

export function useLocalePrefs(): LocalePrefs {
  return useSyncExternalStore(subscribeLocalePrefs, readLocalePrefs, () => DEFAULT_PREFS);
}
