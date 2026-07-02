import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { isAllowedAppUser, AUTH_ACCESS_DENIED_MESSAGE } from "@/lib/auth-access";
import { usePlan } from "@/lib/plan-context";
import { AppShell } from "@/components/layout/AppShell";
import { buildPageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  head: () =>
    buildPageHead({
      title: "Dashboard — HERMS",
      description: "HERMS rental fleet management dashboard.",
      noindex: true,
    }),
  component: Layout,
});

function Layout() {
  const { user, role, loading, signOut } = useAuth();
  const { loading: planLoading } = usePlan();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth", replace: true });
  }, [user, loading, nav]);

  useEffect(() => {
    if (loading || !user || role === null) return;
    if (!isAllowedAppUser(role)) {
      void signOut().then(() => {
        toast.error(AUTH_ACCESS_DENIED_MESSAGE);
        nav({ to: "/auth", replace: true });
      });
    }
  }, [user, role, loading, signOut, nav]);

  if (loading || planLoading || !user || (user && role === null)) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">Loading…</div>;
  }

  if (!isAllowedAppUser(role)) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">Signing out…</div>;
  }

  return <AppShell />;
}
