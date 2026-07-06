import { Building2, Globe } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRY_LIST, type CountryCode } from "@/lib/locale/countries";
import { useLocale } from "@/lib/locale-context";
import { useWorkspace } from "@/lib/workspace-context";
import { cn } from "@/lib/utils";

interface WorkspaceSelectorProps {
  className?: string;
  variant?: "default" | "embedded";
}

export function WorkspaceSelector({ className, variant = "default" }: WorkspaceSelectorProps) {
  const { t } = useLocale();
  const {
    country,
    branch,
    branchesInCountry,
    loading,
    setCountry,
    setBranch,
  } = useWorkspace();

  const embedded = variant === "embedded";

  return (
    <div className={cn(
      embedded
        ? "rounded-xl bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 p-3 sm:p-4"
        : "rounded-xl border border-border bg-card shadow-sm p-4",
      className,
    )}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className={cn(
            "text-xs flex items-center gap-1.5",
            embedded ? "text-primary-foreground/85" : "text-muted-foreground",
          )}>
            <Globe className="h-3.5 w-3.5" />
            {t.dashboard.country}
          </Label>
          <Select
            value={country}
            onValueChange={(v) => setCountry(v as CountryCode)}
            disabled={loading}
          >
            <SelectTrigger className={embedded ? "bg-background border-border text-foreground" : undefined}>
              <SelectValue placeholder={t.dashboard.selectCountry} />
            </SelectTrigger>
            <SelectContent>
              {COUNTRY_LIST.map((c) => (
                <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className={cn(
            "text-xs flex items-center gap-1.5",
            embedded ? "text-primary-foreground/85" : "text-muted-foreground",
          )}>
            <Building2 className="h-3.5 w-3.5" />
            {t.dashboard.branch}
          </Label>
          <Select
            value={branch?.id ?? ""}
            onValueChange={(id) => {
              const picked = branchesInCountry.find((b) => b.id === id);
              if (picked) setBranch(picked);
            }}
            disabled={loading || branchesInCountry.length === 0}
          >
            <SelectTrigger className={embedded ? "bg-background border-border text-foreground" : undefined}>
              <SelectValue placeholder={t.dashboard.selectBranch} />
            </SelectTrigger>
            <SelectContent>
              {branchesInCountry.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
