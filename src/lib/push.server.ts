import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging, type MulticastMessage } from "firebase-admin/messaging";

import type { PushPlatform } from "@/lib/push-notifications";

export interface PushPayload {
  title: string;
  body: string;
  path?: string;
  data?: Record<string, string>;
}

let adminApp: App | null | undefined;

function loadServiceAccountJson(): string | null {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (inline) return inline;

  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  if (!path) return null;

  try {
    const filePath = isAbsolute(path) ? path : resolve(process.cwd(), path);
    return readFileSync(filePath, "utf8");
  } catch (error) {
    console.warn("[Push] could not read FIREBASE_SERVICE_ACCOUNT_PATH:", error);
    return null;
  }
}

function getFirebaseAdmin(): App | null {
  if (adminApp !== undefined) return adminApp;

  const raw = loadServiceAccountJson();
  if (!raw) {
    adminApp = null;
    return adminApp;
  }

  try {
    const credential = JSON.parse(raw) as Parameters<typeof cert>[0];
    adminApp = getApps().length > 0 ? getApps()[0]! : initializeApp({ credential: cert(credential) });
  } catch (error) {
    console.warn("[Push] Firebase Admin init failed:", error);
    adminApp = null;
  }

  return adminApp;
}

export function isPushSendingConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
    || process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim(),
  );
}

export async function sendPushToTokens(
  tokens: string[],
  payload: PushPayload,
): Promise<{ success: number; failure: number }> {
  const app = getFirebaseAdmin();
  if (!app || tokens.length === 0) {
    return { success: 0, failure: tokens.length };
  }

  const message: MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      ...(payload.data ?? {}),
      ...(payload.path ? { path: payload.path } : {}),
    },
    webpush: payload.path ? { fcmOptions: { link: payload.path } } : undefined,
    android: {
      priority: "high",
      notification: {
        channelId: "herms_default",
      },
    },
  };

  const result = await getMessaging(app).sendEachForMulticast(message);
  return { success: result.successCount, failure: result.failureCount };
}

export async function sendPushToUser(
  _userId: string,
  tokens: { token: string; platform: PushPlatform }[],
  payload: PushPayload,
): Promise<{ success: number; failure: number }> {
  if (!tokens.length) return { success: 0, failure: 0 };
  return sendPushToTokens(
    tokens.map((row) => row.token),
    payload,
  );
}
