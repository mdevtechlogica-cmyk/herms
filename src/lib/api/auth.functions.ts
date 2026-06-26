import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import {
  ensureOwnerAccessWithServiceRole,
  getUserFromBearerToken,
} from "@/lib/ensure-owner-access.server";

export const ensureOwnerAccess = createServerFn({ method: "POST" }).handler(async () => {
  const authHeader = getRequest()?.headers?.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { role: null as const };
  }

  const user = await getUserFromBearerToken(token);
  if (!user) {
    return { role: null as const };
  }

  const role = await ensureOwnerAccessWithServiceRole(user);
  return { role };
});
