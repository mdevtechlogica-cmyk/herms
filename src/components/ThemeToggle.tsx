import { Check, Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/lib/locale-context";
import { useTheme, type ThemeSetting } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemeSetting; icon: typeof Sun }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
];

type ThemeToggleProps = {
  variant?: "icon" | "sidebar" | "menu";
  className?: string;
};

export function ThemeToggle({ variant = "icon", className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const { t } = useLocale();

  const themeLabels = t.theme ?? {
    appearance: "Appearance",
    light: "Light",
    dark: "Dark",
    system: "System",
  };

  const ActiveIcon = OPTIONS.find((o) => o.value === theme)?.icon ?? Monitor;

  const labelFor = (value: ThemeSetting) => {
    if (value === "light") return themeLabels.light;
    if (value === "dark") return themeLabels.dark;
    return themeLabels.system;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "sidebar" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-primary-foreground hover:bg-sidebar-accent",
              className,
            )}
          >
            <ActiveIcon className="h-4 w-4 mr-2" />
            {themeLabels.appearance}
          </Button>
        ) : (
          <Button
            type="button"
            variant={variant === "menu" ? "ghost" : "outline"}
            size="icon"
            className={cn("h-9 w-9 shrink-0", className)}
            aria-label={themeLabels.appearance}
          >
            <ActiveIcon className="h-4 w-4" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={variant === "sidebar" ? "start" : "end"} className="min-w-[10rem]">
        {OPTIONS.map(({ value, icon: Icon }) => (
          <DropdownMenuItem key={value} onClick={() => setTheme(value)} className="gap-2">
            <Icon className="h-4 w-4" />
            <span className="flex-1">{labelFor(value)}</span>
            {theme === value && <Check className="h-4 w-4 text-accent" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
