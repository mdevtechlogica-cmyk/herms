import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { inviteShopEmployee, listShopStaff, updateEmployeePermissions } from "@/lib/invite-employee.server";
import { isEmployeePermissionKey } from "@/lib/employee-permissions";

const permissionsSchema = z
  .array(z.string())
  .default([])
  .transform((arr) => arr.filter(isEmployeePermissionKey));

const inviteInput = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().trim().min(1),
  permissions: permissionsSchema,
});

const updatePermissionsInput = z.object({
  user_id: z.string().uuid(),
  permissions: permissionsSchema,
});

export const inviteEmployee = createServerFn({ method: "POST" })
  .validator(inviteInput)
  .handler(async ({ data }) => inviteShopEmployee(data));

export const updateEmployeePermissionsFn = createServerFn({ method: "POST" })
  .validator(updatePermissionsInput)
  .handler(async ({ data }) => updateEmployeePermissions(data.user_id, data.permissions));

export const fetchShopStaff = createServerFn({ method: "GET" }).handler(async () => listShopStaff());
