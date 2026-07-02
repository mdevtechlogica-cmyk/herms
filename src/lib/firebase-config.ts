export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

function env(name: string): string {
  return (import.meta.env[name] as string | undefined)?.trim() ?? "";
}

export function getFirebaseConfig(): FirebaseClientConfig | null {
  const config: FirebaseClientConfig = {
    apiKey: env("VITE_FIREBASE_API_KEY"),
    authDomain: env("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: env("VITE_FIREBASE_PROJECT_ID"),
    storageBucket: env("VITE_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: env("VITE_FIREBASE_MESSAGING_SENDER_ID"),
    appId: env("VITE_FIREBASE_APP_ID"),
  };

  if (!config.apiKey || !config.projectId || !config.messagingSenderId || !config.appId) {
    return null;
  }

  return config;
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseConfig() !== null;
}

export function getFirebaseVapidKey(): string | null {
  const key = env("VITE_FIREBASE_VAPID_KEY");
  return key || null;
}

export function getFirebaseMeasurementId(): string | null {
  const id = env("VITE_FIREBASE_MEASUREMENT_ID");
  return id || null;
}

export function isPushNotificationsEnabled(): boolean {
  return isFirebaseConfigured();
}
