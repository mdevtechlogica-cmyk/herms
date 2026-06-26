import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth-context";
import { toErrorMessage } from "@/lib/errors";
import { usePlan } from "@/lib/plan-context";
import { readLocalePrefs, writeLocalePrefs } from "@/lib/locale/locale-store";
import { COUNTRIES, type CountryCode, isCountryCode } from "@/lib/locale/countries";
import {
  isWithinLimit,
  normalizePlan,
  PLAN_LIMITS,
} from "@/lib/plans";
import { fetchBranchesForOwner, fetchBranchesForStaff, insertBranch } from "@/lib/branches";
import type { AppRole, Branch } from "@/lib/types";

const STORAGE_KEY = "herms_workspace";

interface WorkspaceStorage {
  country: CountryCode;
  branchId: string | null;
}

interface WorkspaceCtx {
  country: CountryCode;
  branch: Branch | null;
  branches: Branch[];
  branchesInCountry: Branch[];
  loading: boolean;
  ready: boolean;
  setCountry: (code: CountryCode) => void;
  setBranch: (branch: Branch) => void;
  refreshBranches: () => Promise<void>;
}

const Ctx = createContext<WorkspaceCtx | null>(null);

function readStorage(): WorkspaceStorage | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { country?: string; branchId?: string | null };
    if (!parsed.country || !isCountryCode(parsed.country)) return null;
    return { country: parsed.country, branchId: parsed.branchId ?? null };
  } catch {
    return null;
  }
}

function writeStorage(country: CountryCode, branchId: string | null) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ country, branchId }));
}

function resolveWorkspaceCountry(
  stored: WorkspaceStorage | null,
  profileCountry?: string | null,
): CountryCode {
  const localeCountry = readLocalePrefs()?.country;
  if (localeCountry) return localeCountry;
  if (stored?.country) return stored.country;
  if (profileCountry && isCountryCode(profileCountry)) return profileCountry;
  return "IN";
}

async function fetchBranches(userId: string, role: AppRole | null): Promise<Branch[]> {
  if (role === "employee") return fetchBranchesForStaff();
  return fetchBranchesForOwner(userId);
}

async function ensureBranchForCountry(
  ownerId: string,
  countryCode: CountryCode,
  allBranches?: Branch[],
  subscriptionPlan?: string | null,
): Promise<Branch | null> {
  const existing = allBranches ?? await fetchBranches(ownerId);
  const inCountry = existing.filter((b) => b.country_code === countryCode);
  if (inCountry.length > 0) return inCountry[0];

  const plan = normalizePlan(subscriptionPlan);
  const activeCount = existing.filter((b) => b.is_active).length;
  if (!isWithinLimit(activeCount, PLAN_LIMITS[plan].branches)) {
    console.warn("[Workspace] branch limit reached for plan:", plan);
    return null;
  }

  try {
    const { usedFallback } = await insertBranch({
      owner_id: ownerId,
      name: "Main Branch",
      country_code: countryCode,
    });
    if (usedFallback) {
      console.warn("[Workspace] branch saved without country_code — run supabase/RUN_BRANCHES_FIX.sql");
    }
    const list = await fetchBranches(ownerId);
    return list.find((b) => b.country_code === countryCode) ?? list[list.length - 1] ?? null;
  } catch (error) {
    console.warn("[Workspace] could not create branch:", toErrorMessage(error));
    return null;
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, profile, role } = useAuth();
  const { effectivePlan: subscriptionPlan } = usePlan();
  const qc = useQueryClient();
  const stored = readStorage();

  const defaultCountry = resolveWorkspaceCountry(stored, profile?.country_code);

  const [country, setCountryState] = useState<CountryCode>(defaultCountry);
  const [branchId, setBranchId] = useState<string | null>(stored?.branchId ?? null);
  const [initialized, setInitialized] = useState(false);

  const isEmployee = role === "employee";

  const { data: branches = [], isLoading, refetch, isFetched } = useQuery({
    queryKey: ["workspace-branches", user?.id, role],
    queryFn: async () => {
      if (!user) return [];
      return fetchBranches(user.id, role);
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const branchesInCountry = useMemo(
    () => branches.filter((b) => b.country_code === country),
    [branches, country],
  );

  const branch = useMemo(() => {
    if (branchId) {
      const picked = branches.find((b) => b.id === branchId);
      if (picked) return picked;
    }
    return branchesInCountry[0] ?? null;
  }, [branches, branchId, branchesInCountry]);

  // Bootstrap branches once per session (never block the app forever)
  useEffect(() => {
    if (!user || initialized) return;

    const finish = () => setInitialized(true);
    const safety = window.setTimeout(finish, 4000);

    if (!isFetched) return () => window.clearTimeout(safety);

    void (async () => {
      try {
        let list = branches;
        if (!isEmployee) {
          if (list.length === 0) {
            const created = await ensureBranchForCountry(user.id, country, undefined, subscriptionPlan);
            if (created) {
              await refetch();
              list = await fetchBranches(user.id, role);
            }
          } else if (branchesInCountry.length === 0) {
            const created = await ensureBranchForCountry(user.id, country, list, subscriptionPlan);
            if (created) {
              await refetch();
              list = await fetchBranches(user.id, role);
            }
          }
        }

        const inCountry = list.filter((b) => b.country_code === country);
        const picked =
          (branchId ? list.find((b) => b.id === branchId) : null) ??
          inCountry[0] ??
          null;
        setBranchId(picked?.id ?? null);
        writeStorage(country, picked?.id ?? null);
      } finally {
        window.clearTimeout(safety);
        finish();
      }
    })();

    return () => window.clearTimeout(safety);
  }, [user, initialized, isFetched, branches, branchesInCountry.length, country, branchId, refetch, subscriptionPlan, isEmployee, role]);

  // Keep workspace storage in sync when branch resolves (does NOT touch locale/language).
  useEffect(() => {
    if (!initialized || !user) return;
    const activeCountry =
      branch?.country_code && isCountryCode(branch.country_code) ? branch.country_code : country;
    if (branch && branchId !== branch.id) setBranchId(branch.id);
    writeStorage(activeCountry, branch?.id ?? null);
  }, [branch, branchId, country, initialized, user]);

  const setCountry = useCallback((code: CountryCode) => {
    setCountryState(code);
    const current = readLocalePrefs();
    writeLocalePrefs({ country: code, language: current.language, userSet: true });
    void (async () => {
      let next = branches.filter((b) => b.country_code === code);
      if (next.length === 0 && user && !isEmployee) {
        const created = await ensureBranchForCountry(user.id, code, branches, subscriptionPlan);
        if (created) {
          await refetch();
          next = [created];
        }
      }
      const picked = next[0] ?? null;
      setBranchId(picked?.id ?? null);
      writeStorage(code, picked?.id ?? null);
      void qc.invalidateQueries();
    })();
  }, [branches, user, refetch, qc, subscriptionPlan, isEmployee]);

  const setBranch = useCallback((next: Branch) => {
    const code = isCountryCode(next.country_code) ? next.country_code : country;
    setCountryState(code);
    setBranchId(next.id);
    writeStorage(code, next.id);
    void qc.invalidateQueries();
  }, [country, qc]);

  const refreshBranches = useCallback(async () => {
    await refetch();
    await qc.invalidateQueries();
  }, [refetch, qc]);

  const ready = !!user && initialized;

  const value = useMemo<WorkspaceCtx>(() => ({
    country: branch?.country_code && isCountryCode(branch.country_code)
      ? branch.country_code
      : country,
    branch,
    branches,
    branchesInCountry,
    loading: isLoading && !initialized,
    ready,
    setCountry,
    setBranch,
    refreshBranches,
  }), [
    country, branch, branches, branchesInCountry, isLoading, initialized,
    ready, setCountry, setBranch, refreshBranches,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}

/** Filter rows that belong to the active branch (includes legacy rows with no branch_id). */
export function matchesBranch<T extends { branch_id?: string | null }>(
  row: T,
  branchId: string | null | undefined,
): boolean {
  if (!branchId) return true;
  return !row.branch_id || row.branch_id === branchId;
}

export function countryLabel(code: CountryCode): string {
  return COUNTRIES[code].name;
}
