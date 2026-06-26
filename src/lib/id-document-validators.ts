export const ID_DOCUMENT_TYPES = [
  "Aadhaar",
  "PAN",
  "Driving License",
  "Passport",
  "Voter ID",
] as const;

export type IdDocumentType = (typeof ID_DOCUMENT_TYPES)[number];

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Format value while the user types (display-friendly spacing). */
export function formatIdDocumentInput(type: string, raw: string): string {
  switch (type) {
    case "Aadhaar": {
      const digits = raw.replace(/\D/g, "").slice(0, 12);
      return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
    }
    case "PAN": {
      return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
    }
    case "Voter ID": {
      const cleaned = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
      if (cleaned.length <= 3) return cleaned;
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`.trim();
    }
    case "Passport": {
      return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 12);
    }
    case "Driving License": {
      const upper = raw.toUpperCase().replace(/[^A-Z0-9\s-]/g, "");
      return collapseSpaces(upper).slice(0, 20);
    }
    default:
      return collapseSpaces(raw).slice(0, 30);
  }
}

/** Compact value saved to the database. */
export function normalizeIdDocumentForStorage(type: string, value: string): string {
  const trimmed = value.trim();
  switch (type) {
    case "Aadhaar":
      return trimmed.replace(/\D/g, "");
    case "PAN":
    case "Passport":
      return trimmed.replace(/\s/g, "").toUpperCase();
    case "Voter ID":
      return trimmed.replace(/\s/g, "").toUpperCase();
    case "Driving License":
      return collapseSpaces(trimmed);
    default:
      return collapseSpaces(trimmed);
  }
}

export function idDocumentPlaceholder(type: string): string {
  switch (type) {
    case "Aadhaar":
      return "1234 5678 9012";
    case "PAN":
      return "ABCDE1234F";
    case "Driving License":
      return "MH-12-2019-0012345";
    case "Passport":
      return "A1234567";
    case "Voter ID":
      return "ABC 1234567";
    default:
      return "Enter ID number";
  }
}

export function validateIdDocumentNumber(type: string, value: string): string | null {
  const stored = normalizeIdDocumentForStorage(type, value);
  if (!stored) return "ID number is required";

  switch (type) {
    case "Aadhaar":
      if (!/^\d{12}$/.test(stored)) {
        return stored.length < 12
          ? "Aadhaar must be 12 digits"
          : "Enter a valid 12-digit Aadhaar number";
      }
      if (stored.startsWith("0") || stored.startsWith("1")) {
        return "Enter a valid Aadhaar number";
      }
      return null;
    case "PAN":
      if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(stored)) {
        return stored.length < 10
          ? "PAN must be 10 characters (e.g. ABCDE1234F)"
          : "Enter a valid PAN (5 letters, 4 digits, 1 letter)";
      }
      return null;
    case "Voter ID":
      if (!/^[A-Z]{3}\d{7}$/.test(stored)) {
        return stored.length < 10
          ? "Voter ID must be 3 letters + 7 digits (e.g. ABC1234567)"
          : "Enter a valid Voter ID (e.g. ABC1234567)";
      }
      return null;
    case "Passport":
      if (!/^[A-Z][1-9]\d{6}$/.test(stored) && !/^[A-Z0-9]{6,12}$/.test(stored)) {
        return stored.length < 6
          ? "Passport number must be at least 6 characters"
          : "Enter a valid passport number";
      }
      return null;
    case "Driving License": {
      const compact = stored.replace(/[\s-]/g, "");
      if (compact.length < 5) {
        return "Driving license number is too short";
      }
      if (!/^[A-Z0-9]+$/.test(compact)) {
        return "Use letters, numbers, spaces, or hyphens only";
      }
      return null;
    }
    default:
      return stored.length < 2 ? "ID number is required" : null;
  }
}

/** Live validation while typing — only show format errors once enough characters are entered. */
export function validateIdDocumentNumberLive(type: string, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const stored = normalizeIdDocumentForStorage(type, trimmed);
  switch (type) {
    case "Aadhaar":
      if (stored.length >= 12) return validateIdDocumentNumber(type, value);
      return null;
    case "PAN":
      if (stored.length >= 10) return validateIdDocumentNumber(type, value);
      return null;
    case "Voter ID":
      if (stored.length >= 10) return validateIdDocumentNumber(type, value);
      return null;
    case "Passport":
      if (stored.length >= 8) return validateIdDocumentNumber(type, value);
      return null;
    case "Driving License":
      if (stored.replace(/[\s-]/g, "").length >= 5) {
        return validateIdDocumentNumber(type, value);
      }
      return null;
    default:
      return null;
  }
}
