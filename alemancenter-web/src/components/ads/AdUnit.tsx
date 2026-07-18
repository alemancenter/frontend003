/**
 * AdUnit — Google AdSense ad placement component.
 *
 * Usage:
 *   <AdUnit page="home" position={1} />
 *   <AdUnit page="article" position={2} className="my-8" />
 *
 * - Renders nothing in production when adsense_client or slot is missing.
 * - Shows a dashed dev-only placeholder otherwise.
 * - Never renders a hidden <ins> element (causes adsbygoogle "No slot size" error).
 *   Instead, uses a media-query hook to pick exactly ONE active slot.
 */

import { useEffect, useRef, useState } from "react";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

export type AdPage =
  | "home"
  | "classes"
  | "subject"
  | "article"
  | "news"
  | "download";

export interface AdUnitProps {
  /** The page context this ad belongs to */
  page: AdPage;
  /** 1 = first placement, 2 = second placement on the same page */
  position?: 1 | 2;
  className?: string;
}

// ─── Internal helpers ──────────────────────────────────────────────────────

const PAGE_KEY: Record<AdPage, string> = {
  home:     "home",
  classes:  "classes",
  subject:  "subject",
  article:  "article",
  news:     "news",
  download: "download",
};

declare global {
  interface Window {
    adsbygoogle: object[];
  }
}

const isDev = import.meta.env.DEV;

interface AdConfig {
  slot: string;
  format: string;
  responsive: boolean;
  layout?: string;
}

// Ad slots are stored in settings in several shapes (legacy). Normalize them to
// a clean { slot, format } so the <ins> always gets a valid numeric data-ad-slot
// — using the raw JSON/HTML string as the slot silently breaks ad serving.
function parseAdConfig(raw: string | undefined): AdConfig | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  // 1) Plain numeric slot id.
  if (/^\d+$/.test(value)) return { slot: value, format: "auto", responsive: true };

  // 2) JSON: {"ad_slot":"123","format":"auto","responsive":true,"ad_layout":"in-article"}
  if (value.startsWith("{")) {
    try {
      const o = JSON.parse(value) as Record<string, unknown>;
      const slot = String(o.ad_slot ?? o.slot ?? "").trim();
      if (/^\d+$/.test(slot)) {
        return {
          slot,
          format: String(o.format ?? "auto"),
          responsive: o.responsive !== false,
          layout: o.ad_layout ? String(o.ad_layout) : undefined,
        };
      }
    } catch {
      /* not valid JSON — fall through */
    }
  }

  // 3) Raw AdSense HTML embed — pull the slot/format out of the <ins> attributes.
  const slotMatch = /data-ad-slot=["']?(\d+)["']?/.exec(value);
  if (slotMatch) {
    const fmt = /data-ad-format=["']?([a-z-]+)["']?/i.exec(value)?.[1] ?? "auto";
    const layout = /data-ad-layout=["']?([a-z-]+)["']?/i.exec(value)?.[1];
    return {
      slot: slotMatch[1],
      format: fmt,
      responsive: /data-full-width-responsive=["']?true/i.test(value),
      layout,
    };
  }

  return null;
}

/** Returns true when viewport width ≥ 768 px (Tailwind md breakpoint). */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState<boolean>(
    () => typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

// ─── Single rendered ins slot ──────────────────────────────────────────────

function AdSlot({ client, config }: { client: string; config: AdConfig }) {
  const pushed = useRef(false);
  const slotRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let retryTimer = 0;
    let observer: ResizeObserver | null = null;

    const pushWhenSized = () => {
      if (cancelled || pushed.current) return;
      const element = slotRef.current;
      if (!element) return;

      const width =
        element.getBoundingClientRect().width ||
        element.offsetWidth ||
        element.parentElement?.getBoundingClientRect().width ||
        0;

      if (width <= 0) {
        retryTimer = window.setTimeout(pushWhenSized, 150);
        return;
      }

      pushed.current = true;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // Script may not be ready yet — harmless
      }
    };

    rafId = window.requestAnimationFrame(pushWhenSized);
    retryTimer = window.setTimeout(pushWhenSized, 300);

    if (typeof ResizeObserver !== "undefined" && slotRef.current) {
      observer = new ResizeObserver(pushWhenSized);
      observer.observe(slotRef.current);
      if (slotRef.current.parentElement) observer.observe(slotRef.current.parentElement);
    }

    window.addEventListener("resize", pushWhenSized);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(retryTimer);
      window.removeEventListener("resize", pushWhenSized);
      observer?.disconnect();
    };
  }, [client, config.slot]);

  const insProps: Record<string, string> = {
    "data-ad-client": client,
    "data-ad-slot": config.slot,
    "data-ad-format": config.format || "auto",
    "data-full-width-responsive": config.responsive ? "true" : "false",
    ...(config.layout ? { "data-ad-layout": config.layout } : {}),
  };

  return (
    <div className="mx-auto w-full max-w-full">
      <ins
        ref={slotRef}
        className="adsbygoogle mx-auto w-full"
        // Reserve vertical space up-front so the ad filling in later does not push
        // page content down (a major source of CLS). minHeight matches the typical
        // responsive ad height; the ad grows into this reserved box.
        style={{ display: "block", width: "100%", minHeight: 100, marginInline: "auto", textAlign: "center" }}
        {...insProps}
      />
    </div>
  );
}

// ─── Dev placeholder ───────────────────────────────────────────────────────

function AdPlaceholder({ label }: { label: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-muted-foreground/15 bg-muted/20 text-muted-foreground/30 select-none py-6"
      style={{ minHeight: 90 }}
    >
      <span className="text-[10px] font-mono uppercase tracking-widest">ad slot</span>
      <span className="text-xs font-bold">{label}</span>
    </div>
  );
}

// ─── Public component ──────────────────────────────────────────────────────

export function AdUnit({ page, position = 1, className }: AdUnitProps) {
  const settings = useSiteSettings();
  const isDesktop = useIsDesktop();

  const client      = settings.adsense_client ?? "";
  const key         = PAGE_KEY[page];
  const suffix      = position === 2 ? "_2" : "";
  const desktopCfg  = parseAdConfig(settings[`google_ads_desktop_${key}${suffix}`]);
  const mobileCfg   = parseAdConfig(settings[`google_ads_mobile_${key}${suffix}`]);

  // Pick exactly one slot to avoid rendering hidden <ins> elements
  // (adsbygoogle throws "No slot size for availableWidth=0" on hidden elements)
  const activeConfig = isDesktop
    ? (desktopCfg || mobileCfg)
    : (mobileCfg || desktopCfg);

  const hasAd = !!client && !!activeConfig;

  if (!hasAd) {
    if (!isDev) return null;
    return (
      <div className={cn("mx-auto flex w-full justify-center py-2 text-center", className)}>
        <AdPlaceholder label={`${page} · pos ${position}`} />
      </div>
    );
  }

  return (
    <div className={cn("mx-auto flex w-full flex-col items-center justify-center overflow-hidden py-2 text-center", className)}>
      <p className="text-center text-[10px] text-muted-foreground/40 mb-1 select-none leading-none">
        إعلان
      </p>
      <AdSlot client={client} config={activeConfig!} />
    </div>
  );
}
