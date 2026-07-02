import { z } from "zod";

import { COUNTRY_LIST, COUNTRIES, isCountryCode, type CountryCode } from "@/lib/locale/countries";

export const emailRequiredSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address");

export const emailOptionalSchema = z.union([
  z.literal(""),
  z.string().trim().email("Enter a valid email address"),
]);

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Min/max national digits (without country dial code) per supported country. */
export function phoneNationalDigitLimits(countryCode: CountryCode): { min: number; max: number } {
  switch (countryCode) {
    case "IN":
      return { min: 10, max: 10 };
    case "US":
      return { min: 10, max: 10 };
    case "AE":
      return { min: 8, max: 9 };
    case "GB":
      return { min: 10, max: 11 };
    case "SA":
      return { min: 9, max: 9 };
    case "IT":
      return { min: 9, max: 10 };
    case "FR":
      return { min: 9, max: 9 };
    case "ES":
      return { min: 9, max: 9 };
    case "RU":
      return { min: 10, max: 10 };
    case "CN":
      return { min: 11, max: 11 };
    case "JP":
      return { min: 10, max: 10 };
    default:
      return { min: 7, max: 15 };
  }
}

/** Live check while typing — returns an error when digits exceed the country limit. */
export function validateNationalPhoneTooLong(
  countryCode: CountryCode,
  national: string,
): string | null {
  const digits = digitsOnly(national);
  const { max } = phoneNationalDigitLimits(countryCode);
  if (digits.length <= max) return null;

  const countryName = COUNTRIES[countryCode].name;
  if (max === phoneNationalDigitLimits(countryCode).min) {
    return `Phone number must be ${max} digits for ${countryName}`;
  }
  return `Phone number cannot exceed ${max} digits for ${countryName}`;
}

export function formatPhoneE164(countryCode: CountryCode, national: string): string {
  const dial = COUNTRIES[countryCode].dialCode;
  return `${dial}${digitsOnly(national)}`;
}

/** Split a stored phone (+91…) into country + national digits. */
export function parseStoredPhone(
  stored: string,
  fallbackCountry: CountryCode = "IN",
): { countryCode: CountryCode; national: string } {
  const trimmed = stored.trim();
  if (!trimmed) {
    return { countryCode: fallbackCountry, national: "" };
  }

  const dialCodes = [...COUNTRY_LIST]
    .map((c) => ({ code: c.code, dial: c.dialCode }))
    .sort((a, b) => b.dial.length - a.dial.length);

  if (trimmed.startsWith("+")) {
    for (const { code, dial } of dialCodes) {
      if (trimmed.startsWith(dial)) {
        return { countryCode: code, national: digitsOnly(trimmed.slice(dial.length)) };
      }
    }
  }

  return { countryCode: fallbackCountry, national: digitsOnly(trimmed) };
}

export function validateNationalPhone(
  countryCode: CountryCode,
  national: string,
  { required = true }: { required?: boolean } = {},
): string | null {
  const digits = digitsOnly(national);
  if (!digits) {
    return required ? "Phone number is required" : null;
  }

  const tooLong = validateNationalPhoneTooLong(countryCode, national);
  if (tooLong) return tooLong;

  const { min } = phoneNationalDigitLimits(countryCode);

  switch (countryCode) {
    case "IN":
      if (!/^[6-9]\d{9}$/.test(digits)) {
        return digits.length < min
          ? `Enter a valid ${min}-digit Indian mobile number`
          : "Enter a valid 10-digit Indian mobile number";
      }
      break;
    case "US":
      if (!/^\d{10}$/.test(digits)) {
        return digits.length < min
          ? `Enter a valid ${min}-digit US phone number`
          : "Enter a valid 10-digit US phone number";
      }
      break;
    case "AE":
      if (!/^\d{8,9}$/.test(digits)) {
        return digits.length < min
          ? `Enter a valid UAE phone number (${min}–9 digits)`
          : "Enter a valid UAE phone number";
      }
      break;
    case "GB":
      if (!/^\d{10,11}$/.test(digits)) {
        return digits.length < min
          ? `Enter a valid UK phone number (${min}–11 digits)`
          : "Enter a valid UK phone number";
      }
      break;
    case "SA":
      if (!/^5\d{8}$/.test(digits)) {
        return digits.length < min
          ? "Enter a valid 9-digit Saudi mobile number starting with 5"
          : "Enter a valid Saudi mobile number (9 digits starting with 5)";
      }
      break;
    default:
      if (digits.length < min) {
        return "Enter a valid phone number";
      }
  }

  return null;
}

export function validateE164Phone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return "Phone number is required";
  if (!/^\+\d{7,15}$/.test(trimmed)) {
    return "Enter a valid phone number with country code";
  }
  return null;
}

export function validateOptionalEmail(email: string): string | null {
  const result = emailOptionalSchema.safeParse(email);
  return result.success ? null : result.error.issues[0]?.message ?? "Invalid email";
}

export function validateRequiredEmail(email: string): string | null {
  const result = emailRequiredSchema.safeParse(email);
  return result.success ? null : result.error.issues[0]?.message ?? "Invalid email";
}

export function countryFromDialPrefix(prefix: string): CountryCode | null {
  const normalized = prefix.startsWith("+") ? prefix : `+${digitsOnly(prefix)}`;
  const match = COUNTRY_LIST.find((c) => c.dialCode === normalized);
  return match?.code ?? null;
}

export function resolveCountryCode(value: string | null | undefined, fallback: CountryCode): CountryCode {
  if (value && isCountryCode(value)) return value;
  return fallback;
}
