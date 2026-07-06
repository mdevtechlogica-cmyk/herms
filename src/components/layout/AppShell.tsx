import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, type ComponentType } from "react";
import { useAuth } from "@/lib/auth-context";
import { isNativeApp } from "@/lib/native";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  LayoutDashboard, Truck, ClipboardList, Wrench, Tags,
  CreditCard, FileText, User as UserIcon, LogOut, Construction, X,
  MapPin, Crown, BarChart3, Users, PackageCheck, Info, CalendarPlus,
} from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { isShopAdmin } from "@/lib/auth-access";
import { canAccessRoute } from "@/lib/employee-permissions";
import { TrialBanner } from "@/components/TrialBanner";
import { TechlogicaAbout } from "@/components/TechlogicaAbout";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { TranslationTree } from "@/lib/locale/translations/en";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

type NavKey = keyof TranslationTree["nav"];
type NavGroupKey =
  | "navGroupOverview"
  | "navGroupOperations"
  | "navGroupFleet"
  | "navGroupFinance"
  | "navGroupOrganization"
  | "navGroupAccount";

type NavItemDef = {
  to: string;
  navKey: NavKey;
  icon: ComponentType<{ className?: string }>;
  adminOnly?: true;
};

type NavGroupDef = {
  id: string;
  labelKey: NavGroupKey;
  items: NavItemDef[];
};

const ADMIN_ONLY_PATHS = new Set(["/admin/subscription"]);

const NAV_GROUPS: NavGroupDef[] = [
  {
    id: "overview",
    labelKey: "navGroupOverview",
    items: [
      { to: "/admin/dashboard", navKey: "adminDashboard", icon: LayoutDashboard },
    ],
  },
  {
    id: "operations",
    labelKey: "navGroupOperations",
    items: [
      { to: "/admin/branches", navKey: "adminBranches", icon: MapPin },
      { to: "/admin/bookings", navKey: "adminBookings", icon: ClipboardList },
      { to: "/admin/book-now", navKey: "adminBookNow", icon: CalendarPlus },
      { to: "/admin/collect-equipment", navKey: "adminCollect", icon: PackageCheck },
    ],
  },
  {
    id: "fleet",
    labelKey: "navGroupFleet",
    items: [
      { to: "/admin/equipment", navKey: "adminEquipment", icon: Truck },
      { to: "/admin/categories", navKey: "adminCategories", icon: Tags },
      { to: "/admin/maintenance", navKey: "adminMaintenance", icon: Wrench },
    ],
  },
  {
    id: "finance",
    labelKey: "navGroupFinance",
    items: [
      { to: "/admin/payments", navKey: "adminPayments", icon: CreditCard },
      { to: "/admin/invoices", navKey: "adminInvoices", icon: FileText },
      { to: "/admin/reports", navKey: "adminReports", icon: BarChart3 },
    ],
  },
  {
    id: "organization",
    labelKey: "navGroupOrganization",
    items: [
      { to: "/admin/team", navKey: "adminTeam", icon: Users },
      { to: "/admin/subscription", navKey: "adminSubscription", icon: Crown, adminOnly: true },
    ],
  },
  {
    id: "account",
    labelKey: "navGroupAccount",
    items: [
      { to: "/profile", navKey: "profile", icon: UserIcon },
      { to: "/about", navKey: "adminAbout", icon: Info },
    ],
  },
];

const NATIVE_BOTTOM_NAV: NavItemDef[] = [
  { to: "/admin/dashboard", navKey: "adminDashboard", icon: LayoutDashboard },
  { to: "/admin/equipment", navKey: "adminEquipment", icon: Truck },
  { to: "/admin/bookings", navKey: "adminBookings", icon: ClipboardList },
  { to: "/profile", navKey: "profile", icon: UserIcon },
];

function filterNavItem(
  item: NavItemDef,
  shopAdmin: boolean,
  permissions: ReturnType<typeof useAuth>["permissions"],
): boolean {
  if (item.adminOnly && !shopAdmin) return false;
  if (item.to === "/admin/dashboard" || item.to === "/profile" || item.to === "/about") return true;
  return canAccessRoute(item.to, permissions, shopAdmin);
}

function AppSidebar({
  groups,
  pathname,
  onSignOut,
  profile,
  roleLabel,
  navLabels,
  signOutLabel,
}: {
  groups: NavGroupDef[];
  pathname: string;
  onSignOut: () => void;
  profile: { full_name?: string; email?: string; company_name?: string | null } | null;
  roleLabel: string;
  navLabels: TranslationTree["nav"];
  signOutLabel: string;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (!isMobile) return;
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;
    setOpenMobile(false);
  }, [pathname, isMobile, setOpenMobile]);

  return (
    <>
      <SidebarHeader className="shrink-0 border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center justify-between gap-2 pr-8">
          <div className="flex items-center gap-2 min-w-0">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Construction className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold font-heading tracking-tight">HERMS</div>
              <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider truncate">
                {roleLabel}
              </div>
            </div>
          </div>
          {isMobile && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setOpenMobile(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">
        {groups.map((group) => (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50">
              {navLabels[group.labelKey]}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((it) => {
                  const active = pathname === it.to || pathname.startsWith(it.to + "/");
                  return (
                    <SidebarMenuItem key={it.to}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link to={it.to} onClick={() => isMobile && setOpenMobile(false)}>
                          <it.icon className="h-4 w-4" />
                          <span>{navLabels[it.navKey]}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="shrink-0 border-t border-sidebar-border p-4">
        <div className="text-sm font-medium truncate">{profile?.full_name || profile?.email}</div>
        <div className="text-xs text-sidebar-foreground/60 truncate">{profile?.company_name || "—"}</div>
        <ThemeToggle variant="sidebar" className="mt-3" />
        <Button
          onClick={onSignOut}
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-primary-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4 mr-2" /> {signOutLabel}
        </Button>
      </SidebarFooter>
    </>
  );
}

function ShellHeader() {
  const isMobile = useIsMobile();
  if (!isMobile) return null;

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center gap-2 px-4">
        <SidebarTrigger className="h-9 w-9" />
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <Construction className="h-4 w-4" />
          </div>
          <span className="font-bold font-heading truncate">HERMS</span>
        </div>
        <ThemeToggle variant="menu" />
      </div>
    </header>
  );
}

function NativeBottomNav({ pathname, navLabels }: { pathname: string; navLabels: TranslationTree["nav"] }) {
  const isMobile = useIsMobile();
  if (!isNativeApp && !isMobile) return null;

  return (
    <nav
      className={cn(
        "fixed bottom-0 inset-x-0 z-40 flex border-t bg-background pb-[env(safe-area-inset-bottom)]",
        !isNativeApp && "md:hidden",
      )}
    >
      {NATIVE_BOTTOM_NAV.map((it) => {
        const active = pathname === it.to || pathname.startsWith(it.to + "/");
        return (
          <Link
            key={it.to}
            to={it.to}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <it.icon className={cn("h-5 w-5", active && "text-primary")} />
            <span>{navLabels[it.navKey]}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell() {
  const { profile, role, permissions, signOut } = useAuth();
  const { t } = useLocale();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nativeApp = isNativeApp;
  const isMobile = useIsMobile();
  const showBottomNav = nativeApp || isMobile;
  const shopAdmin = isShopAdmin(role);

  const navGroups = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => filterNavItem(item, shopAdmin, permissions)),
      })).filter((group) => group.items.length > 0),
    [shopAdmin, permissions],
  );

  useEffect(() => {
    if (shopAdmin) return;
    if (ADMIN_ONLY_PATHS.has(pathname)) {
      nav({ to: "/admin/dashboard", replace: true });
      return;
    }
    if (!canAccessRoute(pathname, permissions, false)) {
      nav({ to: "/admin/dashboard", replace: true });
    }
  }, [shopAdmin, pathname, nav, permissions]);

  const roleLabel =
    role === "admin" ? t.nav.roleAdmin : role === "employee" ? t.nav.roleEmployee : t.nav.adminConsole;

  const handleSignOut = async () => {
    await signOut();
    nav({ to: "/auth", replace: true });
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <AppSidebar
          groups={navGroups}
          pathname={pathname}
          onSignOut={handleSignOut}
          profile={profile}
          roleLabel={roleLabel}
          navLabels={t.nav}
          signOutLabel={t.common.signOut}
        />
      </Sidebar>
      <SidebarInset className="bg-muted/30 min-w-0 w-full max-w-full h-svh max-h-svh flex flex-col overflow-hidden">
        <ShellHeader />
        <div
          className={cn(
            "flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain",
            "p-3 sm:p-4 md:p-8 w-full max-w-full min-w-0 mx-auto",
            nativeApp && "pb-20",
            !nativeApp && showBottomNav && "pb-20 md:pb-0",
          )}
        >
          <TrialBanner />
          <Outlet />
          <TechlogicaAbout variant="compact" className="mt-10 pb-2" />
        </div>
        <NativeBottomNav pathname={pathname} navLabels={t.nav} />
      </SidebarInset>
    </SidebarProvider>
  );
}
