export const EMPLOYEE_PERMISSION_KEYS = [
  "branches",
  "equipment",
  "equipment_add",
  "categories",
  "categories_add",
  "bookings",
  "book_now",
  "collect",
  "maintenance",
  "payments",
  "invoices",
  "reports",
  "team",
] as const;

export type EmployeePermissionKey = (typeof EMPLOYEE_PERMISSION_KEYS)[number];

export interface EmployeePermissionOption {
  key: EmployeePermissionKey;
  label: string;
  description: string;
  group: "operations" | "fleet" | "finance" | "admin";
}

export const EMPLOYEE_PERMISSION_OPTIONS: EmployeePermissionOption[] = [
  { key: "branches", label: "Branches", description: "View and manage rental locations", group: "operations" },
  { key: "bookings", label: "Bookings", description: "View rental bookings and status", group: "operations" },
  { key: "book_now", label: "Book now", description: "Create walk-in rentals", group: "operations" },
  { key: "collect", label: "Collect equipment", description: "Process returns and collection", group: "operations" },
  { key: "equipment", label: "Equipment", description: "View fleet list and details", group: "fleet" },
  { key: "equipment_add", label: "Add equipment", description: "Create and edit equipment", group: "fleet" },
  { key: "categories", label: "Categories", description: "View equipment categories", group: "fleet" },
  { key: "categories_add", label: "Add categories", description: "Create and edit categories", group: "fleet" },
  { key: "maintenance", label: "Maintenance", description: "Service logs and schedules", group: "fleet" },
  { key: "payments", label: "Payments", description: "Payment records", group: "finance" },
  { key: "invoices", label: "Invoices", description: "Billing and invoices", group: "finance" },
  { key: "reports", label: "Reports", description: "Analytics and CSV exports", group: "finance" },
  { key: "team", label: "Team", description: "View team members (no invite)", group: "admin" },
];

export const EMPLOYEE_PERMISSION_GROUPS = [
  { id: "operations" as const, label: "Operations" },
  { id: "fleet" as const, label: "Fleet" },
  { id: "finance" as const, label: "Finance" },
  { id: "admin" as const, label: "Administration" },
];

/** Sensible defaults when admin does not pick any boxes */
export const DEFAULT_EMPLOYEE_PERMISSIONS: EmployeePermissionKey[] = [
  "bookings",
  "book_now",
  "collect",
  "equipment",
];

export const ALL_EMPLOYEE_PERMISSIONS: EmployeePermissionKey[] = [...EMPLOYEE_PERMISSION_KEYS];

export function isEmployeePermissionKey(value: string): value is EmployeePermissionKey {
  return (EMPLOYEE_PERMISSION_KEYS as readonly string[]).includes(value);
}

export function normalizePermissions(
  raw: string[] | null | undefined,
  fallback: EmployeePermissionKey[] = DEFAULT_EMPLOYEE_PERMISSIONS,
): EmployeePermissionKey[] {
  if (!raw?.length) return [...fallback];
  const valid = raw.filter(isEmployeePermissionKey);
  return valid.length ? valid : [...fallback];
}

/** Nav / route → required permission (admin-only routes use null + adminOnly flag) */
export const ROUTE_PERMISSION_MAP: Record<string, EmployeePermissionKey | null> = {
  "/admin/dashboard": null,
  "/admin/branches": "branches",
  "/admin/equipment": "equipment",
  "/admin/categories": "categories",
  "/admin/bookings": "bookings",
  "/admin/collect-equipment": "collect",
  "/admin/maintenance": "maintenance",
  "/admin/payments": "payments",
  "/admin/reports": "reports",
  "/admin/invoices": "invoices",
  "/admin/book-now": "book_now",
  "/admin/team": "team",
  "/profile": null,
  "/about": null,
};

export function routeRequiresPermission(pathname: string): EmployeePermissionKey | null {
  const exact = ROUTE_PERMISSION_MAP[pathname];
  if (exact !== undefined) return exact;
  for (const [route, perm] of Object.entries(ROUTE_PERMISSION_MAP)) {
    if (route !== "/admin/dashboard" && pathname.startsWith(route + "/")) {
      return perm;
    }
  }
  return null;
}

export function hasEmployeePermission(
  permissions: EmployeePermissionKey[] | null | undefined,
  key: EmployeePermissionKey,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  return (permissions ?? []).includes(key);
}

export function canAccessRoute(
  pathname: string,
  permissions: EmployeePermissionKey[] | null | undefined,
  isAdmin: boolean,
): boolean {
  const required = routeRequiresPermission(pathname);
  if (!required) return true;
  return hasEmployeePermission(permissions, required, isAdmin);
}

export function formatPermissionLabels(keys: EmployeePermissionKey[]): string {
  if (!keys.length) return "No access";
  const labels = EMPLOYEE_PERMISSION_OPTIONS.filter((o) => keys.includes(o.key)).map((o) => o.label);
  if (labels.length <= 3) return labels.join(", ");
  return `${labels.slice(0, 3).join(", ")} +${labels.length - 3}`;
}
