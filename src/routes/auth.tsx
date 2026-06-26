import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout shell — child routes: `/auth/` (sign-in) and `/auth/callback` (OAuth). */
export const Route = createFileRoute("/auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return <Outlet />;
}
