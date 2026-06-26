import { App } from "@capacitor/app";

import { isNativeApp } from "@/lib/native";

export const NATIVE_OAUTH_REDIRECT = "com.herms.app://auth/callback";

export function parseOAuthReturnSearch(url: string): string | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (!lower.includes("auth/callback") && !lower.includes("auth%2fcallback")) return null;

  const query = url.indexOf("?");
  if (query >= 0) return url.slice(query);

  const hash = url.indexOf("#");
  if (hash >= 0) {
    const fragment = url.slice(hash + 1);
    return fragment ? `?${fragment}` : null;
  }
  return null;
}

async function closeOAuthBrowser() {
  if (!isNativeApp) return;
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    /* ignore */
  }
}

export function initNativeOAuthListener(onReturn: (search: string) => void): () => void {
  if (!isNativeApp) return () => undefined;

  let handle: { remove: () => void } | undefined;

  const deliver = (search: string) => {
    void closeOAuthBrowser();
    onReturn(search);
  };

  void App.getLaunchUrl().then((result) => {
    const search = result?.url ? parseOAuthReturnSearch(result.url) : null;
    if (search) deliver(search);
  });

  void App.addListener("appUrlOpen", (event) => {
    const search = parseOAuthReturnSearch(event.url);
    if (search) deliver(search);
  }).then((h) => {
    handle = h;
  });

  return () => handle?.remove();
}
