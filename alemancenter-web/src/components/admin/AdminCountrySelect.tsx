import { useCountry, useCountrySwitcher } from "@/contexts/CountryContext";
import { COUNTRY_META, VALID_COUNTRIES, type CountryCode } from "@/lib/country";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AdminCountrySelect({ className = "w-full sm:w-[180px]" }: { className?: string }) {
  const country = useCountry();
  const switchCountry = useCountrySwitcher();

  return (
    <Select value={country} onValueChange={(value) => switchCountry(value as CountryCode)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="قاعدة البيانات" />
      </SelectTrigger>
      <SelectContent>
        {VALID_COUNTRIES.map((code) => (
          <SelectItem key={code} value={code}>
            {COUNTRY_META[code].name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
