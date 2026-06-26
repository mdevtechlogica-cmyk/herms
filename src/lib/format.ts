let _intlLocale = "en-IN";
let _currency = "INR";

export function setFormatLocale(intlLocale: string, currency: string) {
  _intlLocale = intlLocale;
  _currency = currency;
}

function safeIntlFormat(
  value: number,
  options: Intl.NumberFormatOptions,
  fallbackLocale = "en",
): string {
  try {
    return new Intl.NumberFormat(_intlLocale, options).format(value);
  } catch {
    try {
      return new Intl.NumberFormat(fallbackLocale, options).format(value);
    } catch {
      return String(value);
    }
  }
}

export const formatMoney = (n: number | null | undefined) =>
  safeIntlFormat(n ?? 0, {
    style: "currency",
    currency: _currency,
    maximumFractionDigits: 0,
  });

/** @deprecated Use formatMoney or useLocale().formatMoney */
export const inr = formatMoney;

export const shortDate = (s: string | Date) => {
  try {
    return new Date(s).toLocaleDateString(_intlLocale, {
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
};

export const daysBetween = (start: string | Date, end: string | Date) => {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
};
