import { Capacitor } from "@capacitor/core";

export const isNativeApp = Capacitor.isNativePlatform();

const NATIVE_VIEWPORT =
  "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";

export function configureNativeViewport() {
  if (!isNativeApp) return;

  document.documentElement.classList.add("native-app");

  let meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "viewport";
    document.head.appendChild(meta);
  }
  meta.content = NATIVE_VIEWPORT;
}
