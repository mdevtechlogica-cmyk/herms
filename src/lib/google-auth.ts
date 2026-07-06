import { isNativeApp } from "@/lib/native";
import { NATIVE_OAUTH_REDIRECT } from "@/lib/oauth-native";
import { supabase } from "@/lib/db";
import { normalizePublicOrigin } from "@/lib/site-url";

const AUTH_CALLBACK_PATH = "/auth/callback";
const OAUTH_ORIGIN_KEY = "herms_oauth_origin";

function envAppUrl(): string | undefined {
  const raw =
    import.meta.env.VITE_APP_URL?.trim() ||
    import.meta.env.VITE_AUTH_REDIRECT_ORIGIN?.trim() ||
    import.meta.env.VITE_CAPACITOR_SERVER_URL?.trim();
  return raw?.replace(/\/$/, "") || undefined;
}

function isUsableOrigin(origin: string | null | undefined): origin is string {
  if (!origin || origin === "null" || origin === "undefined") return false;
  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== "http:" && protocol !== "https:") return false;
    if (!hostname || hostname === "null") return false;
    return true;
  } catch {
    return false;
  }
}

function readLiveOrigin(): string | undefined {
  if (typeof window === "undefined") return undefined;
  if (isUsableOrigin(window.location.origin)) return window.location.origin;
  try {
    const href = window.location.href;
    if (!href || href === "null" || href.startsWith("null")) return undefined;
    const parsed = new URL(href);
    if (isUsableOrigin(parsed.origin)) return parsed.origin;
  } catch {
    /* ignore */
  }
  return undefined;
}

function readStoredOrigin(): string | undefined {
  if (typeof window === "undefined") return undefined;
  for (const store of [localStorage, sessionStorage]) {
    try {
      const stored = store.getItem(OAUTH_ORIGIN_KEY);
      if (isUsableOrigin(stored)) return stored;
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

function readConfiguredOrigin(): string | undefined {
  const configured = envAppUrl();
  const normalized = normalizePublicOrigin(configured);
  if (normalized && isUsableOrigin(normalized)) return normalized;
  return configured && isUsableOrigin(configured) ? configured : undefined;
}

/** Call on app boot so OAuth never uses WebView origin "null". */
export function seedOAuthOrigin(): void {
  if (typeof window === "undefined") return;
  const seed = readConfiguredOrigin() ?? readLiveOrigin();
  if (!seed) return;
  try {
    localStorage.setItem(OAUTH_ORIGIN_KEY, seed);
    sessionStorage.setItem(OAUTH_ORIGIN_KEY, seed);
  } catch {
    /* ignore */
  }
}

export function getAppOrigin(): string {
  const live = readLiveOrigin();
  if (live) {
    const normalized = normalizePublicOrigin(live);
    return normalized ?? live;
  }
  const stored = readStoredOrigin();
  if (stored) {
    const normalized = normalizePublicOrigin(stored);
    return normalized ?? stored;
  }
  const configured = readConfiguredOrigin();
  if (configured) return configured;
  return "http://localhost:8080";
}

export function rememberOAuthOrigin(): void {
  const origin = isNativeApp ? (readConfiguredOrigin() ?? getAppOrigin()) : getAppOrigin();
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OAUTH_ORIGIN_KEY, origin);
    sessionStorage.setItem(OAUTH_ORIGIN_KEY, origin);
  } catch {
    /* ignore */
  }
}

export function getWebOAuthRedirectUrl(): string {
  return `${getAppOrigin()}${AUTH_CALLBACK_PATH}`;
}

export function getOAuthRedirectUrl(): string {
  if (isNativeApp) return NATIVE_OAUTH_REDIRECT;
  return getWebOAuthRedirectUrl();
}

export type OAuthReturnKind = "callback" | "error" | null;

export function getOAuthReturnKind(search = window.location.search): OAuthReturnKind {
  const params = new URLSearchParams(search);
  if (params.get("code")) return "callback";
  if (params.get("error") || params.get("error_description")) return "error";
  return null;
}

export function readOAuthErrorFromUrl(search = window.location.search): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(search);
  const code = params.get("error_code");
  const raw = params.get("error_description") ?? params.get("error");
  if (!raw) return null;
  const decoded = raw.replace(/\+/g, " ");
  if (code === "bad_oauth_state") {
    return (
      "Google sign-in expired or was opened in a different browser. " +
      "Add this redirect URL in Supabase: " +
      getOAuthRedirectUrl()
    );
  }
  return decoded;
}

export function clearOAuthParamsFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("error") && !url.searchParams.has("code")) return;
    url.search = "";
    window.history.replaceState({}, document.title, url.pathname + url.hash);
  } catch {
    /* ignore invalid WebView URLs */
  }
}

export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  seedOAuthOrigin();
  rememberOAuthOrigin();
  const redirectTo = getOAuthRedirectUrl();

  if (import.meta.env.DEV) {
    console.info("[Google OAuth] redirectTo:", redirectTo);
    console.info("[Google OAuth] native:", isNativeApp);
    console.info("[Google OAuth] origin:", getAppOrigin());
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) return { error: new Error(error.message) };
  if (!data?.url) return { error: new Error("Could not start Google sign-in.") };

  if (isNativeApp) {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: data.url, presentationStyle: "popover" });
    return { error: null };
  }

  window.location.assign(data.url);
  return { error: null };
}

function waitForSession(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      sub.subscription.unsubscribe();
      window.clearTimeout(timer);
      resolve(ok);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) finish(true);
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finish(true);
    });

    const timer = window.setTimeout(() => finish(false), timeoutMs);
  });
}

let exchangeInFlight: Promise<{ error: Error | null }> | null = null;

export async function completeOAuthCallback(search = window.location.search): Promise<{ error: Error | null }> {
  if (exchangeInFlight) return exchangeInFlight;

  exchangeInFlight = (async () => {
    const oauthError = readOAuthErrorFromUrl(search);
    if (oauthError) {
      return { error: new Error(oauthError) };
    }

    const {
      data: { session: existing },
    } = await supabase.auth.getSession();
    if (existing) {
      clearOAuthParamsFromUrl();
      localStorage.removeItem(OAUTH_ORIGIN_KEY);
      sessionStorage.removeItem(OAUTH_ORIGIN_KEY);
      return { error: null };
    }

    const params = new URLSearchParams(search);
    const code = params.get("code");
    if (!code) {
      return { error: new Error("Missing sign-in code. Try Google sign-in again.") };
    }

    clearOAuthParamsFromUrl();

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      localStorage.removeItem(OAUTH_ORIGIN_KEY);
      sessionStorage.removeItem(OAUTH_ORIGIN_KEY);
      return { error: null };
    }

    const signedIn = await waitForSession(2500);
    if (signedIn) {
      localStorage.removeItem(OAUTH_ORIGIN_KEY);
      sessionStorage.removeItem(OAUTH_ORIGIN_KEY);
      return { error: null };
    }

    return {
      error: new Error(
        `${error.message}. Add ${getOAuthRedirectUrl()} to Supabase Redirect URLs.`,
      ),
    };
  })().finally(() => {
    exchangeInFlight = null;
  });

  return exchangeInFlight;
}
