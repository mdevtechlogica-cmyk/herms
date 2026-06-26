import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, db } from "./db";
import { resolveAppRole } from "./auth-access";
import {
  ALL_EMPLOYEE_PERMISSIONS,
  DEFAULT_EMPLOYEE_PERMISSIONS,
  isEmployeePermissionKey,
  normalizePermissions,
  type EmployeePermissionKey,
} from "./employee-permissions";
import type { AppRole, Profile } from "./types";
import type { Session, User } from "@supabase/supabase-js";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  permissions: EmployeePermissionKey[] | null;
  loading: boolean;
  refresh: () => Promise<void>;
  patchProfile: (patch: Partial<Profile>) => void;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

async function loadPermissions(userId: string, role: AppRole): Promise<EmployeePermissionKey[]> {
  if (role === "admin") return [...ALL_EMPLOYEE_PERMISSIONS];
  const { data, error } = await db
    .from("employee_permissions")
    .select("permissions")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (error.message.includes("employee_permissions") || error.code === "42P01") {
      return [...DEFAULT_EMPLOYEE_PERMISSIONS];
    }
    console.warn("[Permissions] load failed:", error.message);
    return [...DEFAULT_EMPLOYEE_PERMISSIONS];
  }
  const raw = (data?.permissions ?? []) as string[];
  return normalizePermissions(raw.filter(isEmployeePermissionKey));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<EmployeePermissionKey[] | null>(null);
  const [loading, setLoading] = useState(true);

  const loadExtras = async (uid: string) => {
    try {
      const [{ data: p }, resolvedRole] = await Promise.all([
        db.from("profiles").select("*").eq("id", uid).maybeSingle(),
        resolveAppRole(uid),
      ]);
      setProfile(p ?? null);
      setRole(resolvedRole);
      const perms = await loadPermissions(uid, resolvedRole);
      setPermissions(perms);
    } catch (error) {
      console.warn("[Auth] profile/role load failed:", error);
      setProfile(null);
      setRole("customer");
      setPermissions(null);
    }
  };

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!active) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        void loadExtras(s.user.id);
      } else {
        setProfile(null);
        setRole(null);
        setPermissions(null);
      }
    });

    const boot = async () => {
      const timeout = window.setTimeout(() => {
        if (active) {
          console.warn("[Auth] session check timed out — continuing without blocking UI");
          setLoading(false);
        }
      }, 12_000);

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.warn("[Auth] getSession error:", error.message);
        if (!active) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
        if (data.session?.user) await loadExtras(data.session.user.id);
      } catch (error) {
        console.warn("[Auth] bootstrap failed:", error);
      } finally {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      }
    };

    void boot();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await loadExtras(session.user.id);
  }, []);

  const patchProfile = (patch: Partial<Profile>) => {
    setProfile((current) => (current ? { ...current, ...patch } : current));
  };

  const signOut = useCallback(async () => {
    await supabase.auth.signOut({ scope: "local" });
  }, []);

  return (
    <Ctx.Provider value={{ user, session, profile, role, permissions, loading, refresh, patchProfile, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
