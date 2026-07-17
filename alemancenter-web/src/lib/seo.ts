import { useEffect } from "react";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { imgUrl } from "@/lib/img-url";

// ─── Per-page SEO head manager ────────────────────────────────────────────────
// React 18 has no native document-metadata hoisting, so this hook imperatively
// manages the <head> for the current route: unique title, description, canonical,
// Open Graph / Twitter cards, hreflang alternates, robots, and JSON-LD.
//
// It runs in the browser AND during dynamic rendering (the bot prerenderer
// executes JS), so crawlers receive a fully-populated, page-specific <head>.
// Every element it creates is tagged data-seo so it can be cleanly replaced on
// navigation and removed on unmount (restoring the static index.html defaults).

const COUNTRIES = ["jo", "sa", "eg", "ps"] as const;

export interface SeoJsonLd {
  [key: string]: unknown;
}

export interface SeoOptions {
  /** Page-specific title; composed as "title | siteName". Omit for the home page. */
  title?: string;
  description?: string;
  /** Absolute URL or path; defaults to the current location. */
  canonical?: string;
  /** OG/Twitter image (absolute URL, storage path, or /public asset). */
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
  keywords?: string;
  publishedTime?: string;
  modifiedTime?: string;
  /** When true, emit hreflang alternates for all country variants of this path. */
  countryAlternates?: boolean;
  /** One JSON-LD object or an array of them. */
  jsonLd?: SeoJsonLd | SeoJsonLd[];
}

function origin(): string {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "";
}

function absolute(pathOrUrl: string): string {
  if (!pathOrUrl) return origin();
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return origin() + (pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`);
}

// Upsert a singleton meta tag: update the existing one (including the static
// defaults shipped in index.html) IN PLACE rather than appending a duplicate.
function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!content) {
    // If this page has no value, drop only a previously page-managed tag.
    if (el?.getAttribute("data-seo") === "1") el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    el.setAttribute("data-seo", "1");
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

// Upsert the canonical link in place.
function upsertCanonical(href: string) {
  if (!href) return;
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

// Page-specific repeatable tags (hreflang, article:*, JSON-LD) are tagged
// data-seo-page and fully rebuilt on every navigation.
function addPageTag(el: HTMLElement) {
  el.setAttribute("data-seo-page", "1");
  document.head.appendChild(el);
}

function clearPageTags() {
  document.head.querySelectorAll("[data-seo-page]").forEach((el) => el.remove());
}

/** Strip HTML and collapse whitespace, then clamp to a meta-description length. */
export function toMetaText(html: string | null | undefined, max = 160): string {
  if (!html) return "";
  const text = String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return text.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

export function useSeo(options: SeoOptions) {
  const settings = useSiteSettings();
  const siteName = settings.site_name || "موقع الإيمان التعليمي";
  const defaultDescription = settings.site_description || "";
  // Default share image is driven by the backend settings (admin-configurable),
  // not a hardcoded link: the dedicated OG image if set, otherwise the site logo.
  const defaultImage = settings.site_og_image || settings.site_logo || "";

  // Serialize deps so the effect re-runs only on meaningful change.
  const key = JSON.stringify({ options, siteName, defaultDescription });

  useEffect(() => {
    const title = options.title ? `${options.title} | ${siteName}` : siteName;
    const description = (options.description || defaultDescription || "").trim();
    const path = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
    const canonical = absolute(options.canonical || path);
    // Resolve the share image: page-specific image, else the settings default.
    // Storage paths are turned into absolute URLs via imgUrl; already-absolute
    // URLs pass through unchanged.
    const rawImage = options.image || defaultImage;
    const image = rawImage ? absolute(imgUrl(rawImage, 1200) ?? rawImage) : "";
    const type = options.type || "website";

    // Singletons — updated in place (reusing the static index.html defaults).
    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("name", "keywords", options.keywords || "");
    upsertMeta("name", "robots", options.noindex ? "noindex, nofollow" : "index, follow");
    upsertCanonical(canonical);

    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", image);
    upsertMeta("property", "og:site_name", siteName);
    upsertMeta("property", "og:locale", "ar_AR");

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", image);

    // Page-specific repeatable tags — fully rebuilt each navigation.
    clearPageTags();

    if (type === "article") {
      if (options.publishedTime) {
        const el = document.createElement("meta");
        el.setAttribute("property", "article:published_time");
        el.setAttribute("content", options.publishedTime);
        addPageTag(el);
      }
      if (options.modifiedTime) {
        const el = document.createElement("meta");
        el.setAttribute("property", "article:modified_time");
        el.setAttribute("content", options.modifiedTime);
        addPageTag(el);
      }
    }

    // hreflang alternates for country-scoped pages (/{country}/...)
    if (options.countryAlternates) {
      const m = /^\/(jo|sa|eg|ps)(\/.*)?$/.exec(path);
      if (m) {
        const rest = m[2] || "";
        const langOf: Record<string, string> = { jo: "ar-JO", sa: "ar-SA", eg: "ar-EG", ps: "ar-PS" };
        for (const c of COUNTRIES) {
          const el = document.createElement("link");
          el.setAttribute("rel", "alternate");
          el.setAttribute("hreflang", langOf[c]);
          el.setAttribute("href", absolute(`/${c}${rest}`));
          addPageTag(el);
        }
        const xd = document.createElement("link");
        xd.setAttribute("rel", "alternate");
        xd.setAttribute("hreflang", "x-default");
        xd.setAttribute("href", absolute(`/jo${rest}`));
        addPageTag(xd);
      }
    }

    // JSON-LD structured data
    const blocks = options.jsonLd
      ? Array.isArray(options.jsonLd)
        ? options.jsonLd
        : [options.jsonLd]
      : [];
    for (const block of blocks) {
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.textContent = JSON.stringify(block);
      addPageTag(s);
    }

    return () => clearPageTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

// ─── JSON-LD builders ─────────────────────────────────────────────────────────

export function organizationJsonLd(siteName: string, url: string, logo?: string): SeoJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url,
    ...(logo ? { logo } : {}),
  };
}

export function websiteJsonLd(siteName: string, url: string): SeoJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${url}/search?query={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]): SeoJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function articleJsonLd(input: {
  headline: string;
  description: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
  siteName: string;
}): SeoJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    mainEntityOfPage: input.url,
    ...(input.image ? { image: [input.image] } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    author: { "@type": input.authorName ? "Person" : "Organization", name: input.authorName || input.siteName },
    publisher: { "@type": "Organization", name: input.siteName },
  };
}
