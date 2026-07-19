import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { systemApi, type FrontSettings } from "@/lib/api/system";
import { imgUrl } from "@/lib/img-url";

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULTS: FrontSettings = {
  site_name: "موقع الإيمان التعليمي",
  site_description:
    "المنصة التعليمية الأولى في الأردن والشرق الأوسط، نقدم محتوى تعليمي موثوق وملفات دراسية ومقالات تهم الطالب والمعلم وولي الأمر، لنرتقي معاً بالتعليم.",
  site_url: "",
  site_logo: "",
  site_favicon: "",
  contact_email: "",
  contact_phone: "",
  contact_address: "",
  primary_color: "",
  secondary_color: "",
  social_facebook: "",
  social_twitter: "",
  social_youtube: "",
  social_instagram: "",
  social_whatsapp: "",
  social_tiktok: "",
  social_linkedin: "",
  social_snapchat: "",
  google_analytics_id: "",
  facebook_pixel_id: "",
};

// ─── Context ─────────────────────────────────────────────────────────────────

const SiteSettingsContext = createContext<FrontSettings>(DEFAULTS);
const SETTINGS_CACHE_KEY = "alemancenter.front-settings.v1";

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Convert #rrggbb → "h s% l%" suitable for CSS HSL variables */
function hexToHslParts(hex: string): string | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  let r = parseInt(m[1], 16) / 255;
  let g = parseInt(m[2], 16) / 255;
  let b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Apply a primary hex color to --primary CSS variable */
function applyCssColor(key: string, hex: string) {
  const hsl = hexToHslParts(hex);
  if (!hsl) return;
  document.documentElement.style.setProperty(`--${key}`, hsl);
  // Also update foreground to white for dark enough colors (l < 60%)
  const lMatch = hsl.match(/(\d+)%\s*$/);
  if (lMatch && key === "primary") {
    const l = parseInt(lMatch[1]);
    const fgHsl = l < 60 ? "0 0% 100%" : "0 0% 0%";
    document.documentElement.style.setProperty("--primary-foreground", fgHsl);
  }
}

/** Inject Google Analytics gtag script (idempotent) */
function injectGoogleAnalytics(id: string) {
  if (!id) return;
  if (document.getElementById("gtag-script")) return;

  const s1 = document.createElement("script");
  s1.id = "gtag-script";
  s1.async = true;
  s1.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s1);

  const s2 = document.createElement("script");
  s2.id = "gtag-config";
  s2.textContent = [
    "window.dataLayer = window.dataLayer || [];",
    "function gtag(){dataLayer.push(arguments);}",
    "gtag('js', new Date());",
    `gtag('config', '${id}');`,
  ].join("\n");
  document.head.appendChild(s2);
}

/** Inject Facebook Pixel script (idempotent) */
function injectFbPixel(id: string) {
  if (!id) return;
  if (document.getElementById("fb-pixel-script")) return;

  const s = document.createElement("script");
  s.id = "fb-pixel-script";
  s.textContent = `
!function(f,b,e,v,n,t,s){
  if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window,document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${id}');
fbq('track','PageView');
`.trim();
  document.head.appendChild(s);
}

/** Set / update favicon link tag */
function applyFavicon(path: string) {
  if (!path) return;
  const url = imgUrl(path, 64) ?? (path.startsWith("http") ? path : `/storage/${path}`);
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url;
}

function readCachedSettings(): Partial<FrontSettings> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function deferUntilAfterFirstPaint(callback: () => void): () => void {
  let idleCleanup: (() => void) | undefined;
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    idleCleanup?.();
    callback();
  };

  const events = ["pointerdown", "keydown", "touchstart"] as const;
  events.forEach((event) => window.addEventListener(event, run, { once: true, passive: true }));

  const timer = window.setTimeout(() => {
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(run, { timeout: 10000 });
      idleCleanup = () => w.cancelIdleCallback?.(id);
      return;
    }
    const fallback = window.setTimeout(run, 1000);
    idleCleanup = () => window.clearTimeout(fallback);
  }, 5000);

  return () => {
    window.clearTimeout(timer);
    events.forEach((event) => window.removeEventListener(event, run));
    idleCleanup?.();
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [canLoadSettings, setCanLoadSettings] = useState(false);
  const [cachedSettings] = useState<Partial<FrontSettings> | null>(() => readCachedSettings());

  useEffect(() => deferUntilAfterFirstPaint(() => setCanLoadSettings(true)), []);

  const { data } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => systemApi.getPublicSettings(),
    enabled: canLoadSettings,
    staleTime: 5 * 60 * 1000, // 5 min — settings rarely change mid-session
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });

  const settings = useMemo<FrontSettings>(
    () => ({ ...DEFAULTS, ...(cachedSettings ?? {}), ...(data ?? {}) }),
    [cachedSettings, data],
  );

  useEffect(() => {
    if (!data) return;
    try {
      window.localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(data));
    } catch {
      // Settings can still be fetched next time if storage is unavailable.
    }
  }, [data]);

  // ── Side effects whenever settings change ────────────────────────────────

  useEffect(() => {
    // Page title
    if (settings.site_name) {
      document.title = settings.site_name;
    }
  }, [settings.site_name]);

  useEffect(() => {
    // Favicon
    if (settings.site_favicon) {
      applyFavicon(settings.site_favicon);
    }
  }, [settings.site_favicon]);

  useEffect(() => {
    // Primary brand color
    if (settings.primary_color) {
      applyCssColor("primary", settings.primary_color);
    }
  }, [settings.primary_color]);

  useEffect(() => {
    // Secondary brand color
    if (settings.secondary_color) {
      applyCssColor("secondary", settings.secondary_color);
    }
  }, [settings.secondary_color]);

  // Third-party marketing/analytics tags are deferred until the browser is idle
  // so they never contend with the critical render (LCP/FCP). AdSense is loaded
  // by AdUnit only when an ad slot approaches the viewport.
  useEffect(() => {
    const gaId = settings.google_analytics_id ?? "";
    const fbId = settings.facebook_pixel_id ?? "";
    if (!gaId && !fbId) return;

    const run = () => {
      injectGoogleAnalytics(gaId);
      injectFbPixel(fbId);
    };

    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(run, { timeout: 8000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(run, 6000);
    return () => window.clearTimeout(t);
  }, [settings.google_analytics_id, settings.facebook_pixel_id]);

  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  );
}
