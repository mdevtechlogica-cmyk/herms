const PRODUCTION_HOSTS = new Set(["herms.app", "www.herms.app"]);

/** True for localhost and private LAN IPs used during dev. */
export function isLocalDevHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  return false;
}

/** Force HTTPS for public production hosts; keep HTTP for local dev. */
export function normalizePublicOrigin(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  try {
    const url = new URL(raw.trim());
    if (!url.protocol.startsWith("http")) return null;

    const isProduction =
      PRODUCTION_HOSTS.has(url.hostname) || url.hostname.endsWith(".herms.app");

    if (isProduction) {
      url.protocol = "https:";
      url.port = "";
    } else if (!isLocalDevHost(url.hostname) && url.protocol === "http:") {
      // Custom domains in staging should still use HTTPS.
      url.protocol = "https:";
      url.port = "";
    }

    return url.origin;
  } catch {
    return null;
  }
}

export function isSecurePageContext(): boolean {
  if (typeof window === "undefined") return true;
  if (window.location.protocol === "https:") return true;
  return isLocalDevHost(window.location.hostname);
}
