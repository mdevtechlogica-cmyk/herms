import { LANGUAGE_LABELS, type LanguageCode } from "@/lib/locale/countries";
import { cn } from "@/lib/utils";

type LanguageSelectProps = {
  value: LanguageCode;
  options: readonly LanguageCode[];
  onChange: (code: LanguageCode) => void;
  variant?: "buttons" | "dropdown";
  className?: string;
  buttonClassName?: string;
};

export function LanguageSelect({
  value,
  options,
  onChange,
  variant = "buttons",
  className,
  buttonClassName,
}: LanguageSelectProps) {
  if (variant === "dropdown") {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as LanguageCode)}
        className={cn(
          "w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
          className,
        )}
      >
        {options.map((code) => (
          <option key={code} value={code}>
            {LANGUAGE_LABELS[code]}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            value === code
              ? "bg-accent text-accent-foreground"
              : "bg-muted text-foreground/75 hover:bg-muted/80",
            buttonClassName,
          )}
        >
          {LANGUAGE_LABELS[code]}
        </button>
      ))}
    </div>
  );
}
