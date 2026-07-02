import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { initFirebaseWeb, isFirebaseWebConnected } from "@/lib/firebase-web";
import { isFirebaseConfigured } from "@/lib/firebase-config";

interface FirebaseWebState {
  configured: boolean;
  connected: boolean;
}

const Ctx = createContext<FirebaseWebState>({
  configured: isFirebaseConfigured(),
  connected: false,
});

export function FirebaseWebProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FirebaseWebState>({
    configured: isFirebaseConfigured(),
    connected: isFirebaseWebConnected(),
  });

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    void initFirebaseWeb().then((connected) => {
      setState({ configured: true, connected });
    });
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useFirebaseWeb() {
  return useContext(Ctx);
}
