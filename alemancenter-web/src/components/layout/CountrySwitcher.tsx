import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  VALID_COUNTRIES,
  COUNTRY_META,
  type CountryCode,
} from "@/lib/country";
import { useCountry, useCountrySwitcher } from "@/contexts/CountryContext";

export function CountrySwitcher({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const country = useCountry();
  const switchCountry = useCountrySwitcher();
  const current = COUNTRY_META[country];
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  function handleSelect(code: CountryCode) {
    switchCountry(code);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (variant === "mobile") {
    return (
      <div className="flex flex-col gap-1">
        <p className="mb-1 px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          الدولة
        </p>
        {VALID_COUNTRIES.map((code) => {
          const meta = COUNTRY_META[code];
          const active = code === country;
          return (
            <button
              key={code}
              type="button"
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
                <span className="mr-auto rounded-full bg-blue-100 px-2 py-0.5 text-[10px] dark:bg-blue-900">
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
    <div ref={rootRef} className="relative" dir="rtl">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        aria-label="تغيير الدولة"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:inline">{current.name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-2 min-w-[160px] rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
          role="menu"
        >
          {VALID_COUNTRIES.map((code) => {
            const meta = COUNTRY_META[code];
            const active = code === country;
            return (
              <button
                key={code}
                type="button"
                onClick={() => handleSelect(code)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
                  active ? "text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-200"
                }`}
                role="menuitem"
              >
                <span className="text-base leading-none">{meta.flag}</span>
                {meta.name}
                {active && (
                  <span className="mr-auto rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700 dark:bg-blue-900 dark:text-blue-400">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
