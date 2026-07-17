import DOMPurify from "dompurify";

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "a", "b", "blockquote", "br", "caption", "cite", "code", "col",
    "colgroup", "dd", "del", "details", "dl", "dt", "em", "figure",
    "figcaption", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i",
    "img", "ins", "kbd", "li", "mark", "ol", "p", "pre", "q", "rp",
    "rt", "ruby", "s", "samp", "small", "span", "strong", "sub",
    "summary", "sup", "table", "tbody", "td", "tfoot", "th", "thead",
    "time", "tr", "u", "ul", "var", "wbr",
  ],
  ALLOWED_ATTR: [
    "alt", "cite", "class", "colspan", "datetime", "dir", "height",
    "href", "id", "lang", "rowspan", "scope", "src", "start",
    "style", "target", "title", "type", "width",
  ],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
  ALLOW_DATA_ATTR: false,
  FORCE_BODY: true,
};

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node instanceof HTMLAnchorElement) {
    const href = node.getAttribute("href") ?? "";
    if (/^javascript:/i.test(href.trim())) {
      node.setAttribute("href", "#");
    }
    if (node.getAttribute("target") === "_blank") {
      node.setAttribute("rel", "noopener noreferrer");
    }
  }

  if (node instanceof HTMLImageElement) {
    const src = node.getAttribute("src") ?? "";
    if (!/^https?:\/\//i.test(src) && !/^\//.test(src) && !/^data:image\//i.test(src)) {
      node.removeAttribute("src");
    }
  }
});

export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";
  return String(DOMPurify.sanitize(dirty, SANITIZE_CONFIG));
}

/**
 * Returns a URL safe to use in an href/src, or null when the scheme is unsafe.
 * React does NOT block `javascript:`/`data:`/`vbscript:` URLs in href, so any
 * user-controlled value (e.g. a contact-form page_url, a profile social link)
 * must pass through this before being rendered as a link — otherwise an admin
 * clicking it executes attacker-controlled script in their session.
 *
 * Allows only http(s), mailto, tel, and same-origin relative paths.
 */
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed === "") return null;
  // Relative/anchor paths are same-origin and safe.
  if (/^(\/|#|\?)/.test(trimmed)) return trimmed;
  // Reject anything whose scheme isn't explicitly allow-listed.
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed);
  if (match) {
    const scheme = match[1].toLowerCase();
    if (!["http", "https", "mailto", "tel"].includes(scheme)) return null;
  }
  return trimmed;
}
