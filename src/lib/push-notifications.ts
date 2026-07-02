import { Capacitor } from "@capacitor/core";
import { PushNotifications, type Token, type ActionPerformed } from "@capacitor/push-notifications";
import { getMessaging, getToken, isSupported, onMessage, type Messaging } from "firebase/messaging";

import { db } from "@/lib/db";
import { getFirebaseVapidKey, isFirebaseConfigured } from "@/lib/firebase-config";
import { getFirebaseWebApp, initFirebaseWeb } from "@/lib/firebase-web";

export type PushPlatform = "android" | "ios" | "web";

let webMessaging: Messaging | null = null;
let nativeListenersAttached = false;

async function savePushToken(userId: string, token: string, platform: PushPlatform) {
  const { error } = await db.from("push_device_tokens").upsert(
    {
      user_id: userId,
      token,
      platform,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,token" },
  );

  if (error) {
    console.warn("[Push] failed to save device token:", error.message);
  }
}

async function initWebPush(userId: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  if (!(await isSupported())) return;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return;

  await initFirebaseWeb();
  const app = getFirebaseWebApp();
  const vapidKey = getFirebaseVapidKey();
  if (!app || !vapidKey) {
    console.warn("[Push] web push needs VITE_FIREBASE_VAPID_KEY");
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  webMessaging = getMessaging(app);
  const token = await getToken(webMessaging, { vapidKey, serviceWorkerRegistration: registration });
  if (token) {
    await savePushToken(userId, token, "web");
  }

  onMessage(webMessaging, (payload) => {
    const title = payload.notification?.title ?? "HERMS";
    const body = payload.notification?.body ?? "";
    if (document.visibilityState === "visible" && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/images/techlogica-logo.png" });
    }
  });
}

async function initNativePush(userId: string): Promise<void> {
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") return;

  if (Capacitor.getPlatform() === "android") {
    await PushNotifications.createChannel({
      id: "herms_default",
      name: "HERMS Notifications",
      description: "Booking, maintenance, and fleet alerts",
      importance: 5,
      visibility: 1,
    });
  }

  if (!nativeListenersAttached) {
    nativeListenersAttached = true;

    await PushNotifications.addListener("registration", (event: Token) => {
      const platform = Capacitor.getPlatform() as PushPlatform;
      void savePushToken(userId, event.value, platform === "ios" ? "ios" : "android");
    });

    await PushNotifications.addListener("registrationError", (error) => {
      console.warn("[Push] native registration failed:", error);
    });

    await PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.info("[Push] received:", notification.title);
    });

    await PushNotifications.addListener("pushNotificationActionPerformed", (action: ActionPerformed) => {
      const data = action.notification.data as Record<string, string> | undefined;
      const path = data?.path;
      if (path && typeof window !== "undefined") {
        window.location.href = path;
      }
    });
  }

  await PushNotifications.register();
}

/** Register Firebase / FCM push for the signed-in user (native + web). */
export async function initPushNotifications(userId: string): Promise<void> {
  if (!isFirebaseConfigured()) return;

  try {
    if (Capacitor.isNativePlatform()) {
      await initNativePush(userId);
      return;
    }
    await initWebPush(userId);
  } catch (error) {
    console.warn("[Push] init failed:", error);
  }
}

export async function unregisterPushNotifications(userId: string): Promise<void> {
  try {
    await db.from("push_device_tokens").delete().eq("user_id", userId);
  } catch {
    /* ignore */
  }

  if (Capacitor.isNativePlatform()) {
    try {
      await PushNotifications.removeAllListeners();
      nativeListenersAttached = false;
    } catch {
      /* ignore */
    }
  }
}
