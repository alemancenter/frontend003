import {
  VALID_COUNTRIES,
  COUNTRY_META,
  type CountryCode,
} from "@/lib/country";
import { useCountry, useCountrySwitcher } from "@/contexts/CountryContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

export function CountrySwitcher({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const country = useCountry();
  const switchCountry = useCountrySwitcher();
  const current = COUNTRY_META[country];

  function handleSelect(code: CountryCode) {
    switchCountry(code);
  }

  if (variant === "mobile") {
    return (
      <div className="flex flex-col gap-1">
        <p className="px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
          الدولة
        </p>
        {VALID_COUNTRIES.map((code) => {
          const meta = COUNTRY_META[code];
          const active = code === country;
          return (
            <button
              key={code}
              onClick={() => handleSelect(code)}
              className={`flex h-10 items-center gap-3 rounded-xl px-4 text-sm font-bold transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              <span className="text-base leading-none">{meta.flag}</span>
              {meta.name}
              {active && (
                <span className="mr-auto text-[10px] rounded-full bg-blue-100 dark:bg-blue-900 px-2 py-0.5">
                  محدد
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          aria-label="تغيير الدولة"
        >
          <span className="text-base leading-none">{current.flag}</span>
          <span className="hidden sm:inline">{current.name}</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {VALID_COUNTRIES.map((code) => {
          const meta = COUNTRY_META[code];
          const active = code === country;
          return (
            <DropdownMenuItem
              key={code}
              onClick={() => handleSelect(code)}
              className={`flex items-center gap-3 font-bold cursor-pointer ${
                active ? "text-blue-700 dark:text-blue-400" : ""
              }`}
            >
              <span className="text-base leading-none">{meta.flag}</span>
              {meta.name}
              {active && (
                <span className="mr-auto text-[10px] rounded-full bg-blue-100 dark:bg-blue-900 px-2 py-0.5 text-blue-700 dark:text-blue-400">
                  ✓
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
