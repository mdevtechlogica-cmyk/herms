import { COUNTRIES, COUNTRY_LIST, type CountryCode } from "@/lib/locale/countries";
import { validateNationalPhoneTooLong } from "@/lib/contact-validators";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  countryCode: CountryCode;
  value: string;
  onCountryChange: (code: CountryCode) => void;
  onValueChange: (national: string) => void;
  error?: string | null;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  className?: string;
}

export function PhoneInput({
  countryCode,
  value,
  onCountryChange,
  onValueChange,
  error,
  disabled,
  id,
  placeholder,
  className,
}: PhoneInputProps) {
  const dial = COUNTRIES[countryCode].dialCode;
  const lengthError = validateNationalPhoneTooLong(countryCode, value);
  const displayError = error ?? lengthError;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex gap-2">
        <Select value={countryCode} onValueChange={(v) => onCountryChange(v as CountryCode)} disabled={disabled}>
          <SelectTrigger className="w-[7.5rem] shrink-0" aria-label="Country code">
            <SelectValue>{dial}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_LIST.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.dialCode} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={value}
          disabled={disabled}
          placeholder={placeholder ?? "Mobile number"}
          onChange={(e) => onValueChange(e.target.value.replace(/[^\d\s-]/g, ""))}
          aria-invalid={!!displayError}
          className="flex-1"
        />
      </div>
      {displayError ? <p className="text-xs text-destructive">{displayError}</p> : null}
    </div>
  );
}
