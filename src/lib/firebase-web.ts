import { Capacitor } from "@capacitor/core";
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from "firebase/analytics";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

import {
  getFirebaseConfig,
  getFirebaseMeasurementId,
  getFirebaseVapidKey,
  isFirebaseConfigured,
} from "@/lib/firebase-config";

let firebaseApp: FirebaseApp | null = null;
let analytics: Analytics | null = null;
let initPromise: Promise<boolean> | null = null;

export function getFirebaseWebApp(): FirebaseApp | null {
  return firebaseApp;
}

export function isFirebaseWebConnected(): boolean {
  return firebaseApp !== null;
}

async function registerWebMessagingServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  try {
    const existing = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
    if (!existing) {
      await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
    }
    await navigator.serviceWorker.ready;
  } catch (error) {
    console.warn("[Firebase] service worker registration failed:", error);
  }
}

async function initAnalytics(app: FirebaseApp): Promise<void> {
  const measurementId = getFirebaseMeasurementId();
  if (!measurementId) return;
  if (!(await isAnalyticsSupported())) return;

  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn("[Firebase] analytics init failed:", error);
  }
}

/** Initialize Firebase for the web app (messaging SW + optional analytics). */
export async function initFirebaseWeb(): Promise<boolean> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (Capacitor.isNativePlatform()) return false;

    const config = getFirebaseConfig();
    if (!config) {
      if (import.meta.env.DEV) {
        console.info("[Firebase] web SDK not configured — add VITE_FIREBASE_* to .env");
      }
      return false;
    }

    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config);

    if (getFirebaseVapidKey()) {
      await registerWebMessagingServiceWorker();
    }

    await initAnalytics(firebaseApp);
    console.info("[Firebase] web connected:", config.projectId);
    return true;
  })();

  return initPromise;
}

export function getFirebaseAnalytics(): Analytics | null {
  return analytics;
}
