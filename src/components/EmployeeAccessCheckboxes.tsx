import { Checkbox } from "@/components/ui/checkbox";
import {
  EMPLOYEE_PERMISSION_GROUPS,
  EMPLOYEE_PERMISSION_OPTIONS,
  type EmployeePermissionKey,
} from "@/lib/employee-permissions";
import { cn } from "@/lib/utils";

interface EmployeeAccessCheckboxesProps {
  value: EmployeePermissionKey[];
  onChange: (next: EmployeePermissionKey[]) => void;
  disabled?: boolean;
  className?: string;
}

export function EmployeeAccessCheckboxes({
  value,
  onChange,
  disabled,
  className,
}: EmployeeAccessCheckboxesProps) {
  const toggle = (key: EmployeePermissionKey, checked: boolean) => {
    if (checked) {
      onChange([...new Set([...value, key])]);
      return;
    }
    onChange(value.filter((k) => k !== key));
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <p className="text-sm font-medium">Access permissions</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Choose what this employee can see and do. Admins always have full access.
        </p>
      </div>
      {EMPLOYEE_PERMISSION_GROUPS.map((group) => {
        const options = EMPLOYEE_PERMISSION_OPTIONS.filter((o) => o.group === group.id);
        return (
          <div key={group.id} className="rounded-xl border bg-muted/20 p-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {options.map((opt) => {
                const checked = value.includes(opt.key);
                return (
                  <label
                    key={opt.key}
                    className={cn(
                      "flex items-start gap-2.5 rounded-lg border bg-card p-2.5 cursor-pointer transition-colors",
                      checked && "border-primary/40 bg-primary/5",
                      disabled && "opacity-60 cursor-not-allowed",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={(v) => toggle(opt.key, v === true)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <span className="text-sm font-medium leading-none">{opt.label}</span>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                        {opt.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          className="text-xs text-primary underline-offset-2 hover:underline disabled:opacity-50"
          onClick={() => onChange(EMPLOYEE_PERMISSION_OPTIONS.map((o) => o.key))}
        >
          Select all
        </button>
        <button
          type="button"
          disabled={disabled}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
          onClick={() => onChange([])}
        >
          Clear all
        </button>
      </div>
    </div>
  );
}
