import { useMemo } from "react";

import { useLocale } from "@/lib/locale-context";
import { matchesBranch, useWorkspace } from "@/lib/workspace-context";

export function useBranchScope() {
  const { branch, country, branches, branchesInCountry } = useWorkspace();
  const locale = useLocale();
  const branchId = branch?.id ?? null;

  const allowedBranchIds = useMemo(
    () => new Set(branchesInCountry.map((b) => b.id)),
    [branchesInCountry],
  );

  const filterByBranch = <T extends { branch_id?: string | null }>(rows: T[]) =>
    rows.filter((row) => {
      if (row.branch_id && !allowedBranchIds.has(row.branch_id)) return false;
      return matchesBranch(row, branchId);
    });

  const branchName = (id: string | null | undefined) =>
    branches.find((b) => b.id === id)?.name ?? "";

  return {
    branchId,
    branch,
    branches,
    branchesInCountry,
    branchName,
    allowedBranchIds,
    country,
    ...locale,
    filterByBranch,
  };
}
