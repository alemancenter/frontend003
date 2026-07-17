import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  isValidCountry,
  DEFAULT_COUNTRY,
  switchCountryInPath,
  type CountryCode,
} from "@/lib/country";

const STORAGE_KEY = "preferred_country";

function readStorage(): CountryCode {
  try {
    const v = localStorage.getItem(STORAGE_KEY) ?? undefined;
    return isValidCountry(v) ? v : DEFAULT_COUNTRY;
  } catch {
    return DEFAULT_COUNTRY;
  }
}

function writeStorage(c: CountryCode) {
  try {
    localStorage.setItem(STORAGE_KEY, c);
  } catch {
    // ignore
  }
}

function countryFromPath(path: string): CountryCode | null {
  const seg = path.split("/").filter(Boolean)[0];
  return isValidCountry(seg) ? seg : null;
}

interface CountryContextValue {
  country: CountryCode;
  /** Call this from UI — handles navigation + state + storage atomically */
  switchCountry: (code: CountryCode) => void;
}

const CountryContext = createContext<CountryContextValue>({
  country: DEFAULT_COUNTRY,
  switchCountry: () => {},
});

export function CountryProvider({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();

  const [country, setCountry] = useState<CountryCode>(() => {
    return countryFromPath(location) ?? readStorage();
  });

  useEffect(() => {
    const urlCountry = countryFromPath(location);
    if (urlCountry && urlCountry !== country) {
      setCountry(urlCountry);
      writeStorage(urlCountry);
    }
  }, [location]);

  const switchCountry = useCallback(
    (code: CountryCode) => {
      if (code === country) return;

      setCountry(code);
      writeStorage(code);

      const next = switchCountryInPath(location, code);
      if (next !== location) {
        navigate(next);
      }
    },
    [country, location, navigate],
  );

  return (
    <CountryContext.Provider value={{ country, switchCountry }}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry(): CountryCode {
  return useContext(CountryContext).country;
}

export function useCountrySwitcher(): (code: CountryCode) => void {
  return useContext(CountryContext).switchCountry;
}
