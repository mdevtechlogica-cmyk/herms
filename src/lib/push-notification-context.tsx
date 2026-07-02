import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

import { useAuth } from "@/lib/auth-context";
import { isPushNotificationsEnabled } from "@/lib/firebase-config";
import { initPushNotifications, unregisterPushNotifications } from "@/lib/push-notifications";

const Ctx = createContext({ enabled: isPushNotificationsEnabled() });

export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const enabled = isPushNotificationsEnabled();
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if (user?.id) {
      lastUserId.current = user.id;
      void initPushNotifications(user.id);
      return;
    }

    if (lastUserId.current) {
      void unregisterPushNotifications(lastUserId.current);
      lastUserId.current = null;
    }
  }, [enabled, user?.id]);

  return <Ctx.Provider value={{ enabled }}>{children}</Ctx.Provider>;
}

export function usePushNotifications() {
  return useContext(Ctx);
}
