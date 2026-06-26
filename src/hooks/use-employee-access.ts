import { useAuth } from "@/lib/auth-context";
import {
  canAccessRoute,
  hasEmployeePermission,
  type EmployeePermissionKey,
} from "@/lib/employee-permissions";
import { isShopAdmin } from "@/lib/auth-access";

export function useEmployeeAccess() {
  const { role, permissions } = useAuth();
  const isAdmin = isShopAdmin(role);

  return {
    isAdmin,
    permissions: permissions ?? [],
    can: (key: EmployeePermissionKey) => hasEmployeePermission(permissions, key, isAdmin),
    canAccessRoute: (pathname: string) => canAccessRoute(pathname, permissions, isAdmin),
    canAddEquipment: isAdmin || hasEmployeePermission(permissions, "equipment_add", false),
    canAddCategories: isAdmin || hasEmployeePermission(permissions, "categories_add", false),
  };
}
