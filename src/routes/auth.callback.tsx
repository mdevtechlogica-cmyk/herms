import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { isNativeApp } from "@/lib/native";
import { completeOAuthCallback } from "@/lib/google-auth";
import { getPostLoginPath } from "@/lib/auth-access";
import { finishAppAuth } from "@/lib/finish-app-auth";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/db";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const nav = useNavigate();
  const { refresh } = useAuth();
  const [message, setMessage] = useState("Completing sign-in…");

  useEffect(() => {
    let active = true;

    const finish = async () => {
      const { error } = await completeOAuthCallback();
      if (!active) return;

      if (error) {
        toast.error(error.message);
        nav({ to: "/auth", replace: true });
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Sign-in failed");
        nav({ to: "/auth", replace: true });
        return;
      }

      const result = await finishAppAuth(user.id);
      if (!result.ok) {
        toast.error(result.message);
        nav({ to: "/auth", replace: true });
        return;
      }

      await refresh();

      if (isNativeApp) {
        try {
          const { Browser } = await import("@capacitor/browser");
          await Browser.close();
        } catch {
          /* ignore */
        }
      }

      toast.success("Welcome to HERMS");
      nav({ to: getPostLoginPath(), replace: true });
    };

    void finish().catch((err: unknown) => {
      if (!active) return;
      const msg = err instanceof Error ? err.message : "Sign-in failed";
      setMessage(msg);
      toast.error(msg);
      nav({ to: "/auth", replace: true });
    });

    return () => {
      active = false;
    };
    // One-shot OAuth handler on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="dark min-h-screen grid place-items-center bg-background text-foreground/75 text-sm">
      {message}
    </div>
  );
}
