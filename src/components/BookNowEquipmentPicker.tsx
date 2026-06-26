import { useMemo, useState } from "react";
import { Check, Construction, MapPin, Search, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Equipment } from "@/lib/types";

interface BookNowEquipmentPickerProps {
  equipment: Equipment[];
  value: string;
  onChange: (equipmentId: string) => void;
  formatMoney: (amount: number) => string;
  emptyMessage?: React.ReactNode;
}

function EquipmentThumb({
  equipment,
  className,
}: {
  equipment: Equipment;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(equipment.main_image) && !failed;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg bg-muted",
        className,
      )}
    >
      {showImage ? (
        <img
          src={equipment.main_image!}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/40 text-muted-foreground">
          <Construction className="h-7 w-7 opacity-50" />
        </div>
      )}
    </div>
  );
}

export function BookNowEquipmentPicker({
  equipment,
  value,
  onChange,
  formatMoney,
  emptyMessage,
}: BookNowEquipmentPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return equipment;
    return equipment.filter((e) => {
      const haystack = [
        e.equipment_name,
        e.brand,
        e.model,
        e.location,
        e.serial_number,
        e.category?.category_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [equipment, search]);

  if (equipment.length === 0) {
    return emptyMessage ? <>{emptyMessage}</> : null;
  }

  return (
    <div className="rounded-2xl border bg-muted/20 overflow-hidden">
      <div className="border-b bg-card px-3 py-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Truck className="h-4 w-4 text-primary" />
            Select equipment
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {filtered.length} of {equipment.length}
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, brand, model, location…"
            className="pl-9 bg-background border-muted-foreground/20"
            aria-label="Search equipment"
          />
        </div>
      </div>

      <ScrollArea className="h-[min(22rem,50vh)]">
        <div className="p-2 space-y-2">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No equipment matches &ldquo;{search}&rdquo;
            </p>
          ) : (
            filtered.map((e) => {
              const selected = value === e.id;
              const meta = [e.brand, e.model].filter(Boolean).join(" · ");

              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onChange(e.id)}
                  className={cn(
                    "w-full text-left rounded-xl border p-2.5 transition-all",
                    "hover:border-primary/40 hover:bg-card hover:shadow-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                      : "border-transparent bg-card/80",
                  )}
                >
                  <div className="flex gap-3">
                    <EquipmentThumb equipment={e} className="h-16 w-20 sm:h-[4.5rem] sm:w-24" />
                    <div className="min-w-0 flex-1 py-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm leading-snug line-clamp-2">
                          {e.equipment_name}
                        </p>
                        {selected ? (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                        ) : null}
                      </div>
                      {meta ? (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{meta}</p>
                      ) : null}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        <span className="font-medium text-foreground">
                          {formatMoney(e.daily_rate)}
                          <span className="font-normal text-muted-foreground">/day</span>
                        </span>
                        {e.monthly_rate != null && e.monthly_rate > 0 ? (
                          <span className="text-muted-foreground">
                            · {formatMoney(e.monthly_rate)}/mo
                          </span>
                        ) : null}
                      </div>
                      {(e.location) ? (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {e.location}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
