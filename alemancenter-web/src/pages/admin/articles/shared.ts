// Shared helpers for the article Create/Edit dashboard pages.

// File categories recognized by the backend public filters
// (see back/internal/repositories/article_repository.go fileCategoryAliases).
export const FILE_CATEGORIES = [
  { value: "study_plan", label: "خطط الدراسة" },
  { value: "worksheet", label: "أوراق عمل" },
  { value: "exam", label: "اختبارات" },
  { value: "book", label: "المقررات الدراسية" },
  { value: "record", label: "السجلات" },
] as const;

export type FileCategoryValue = (typeof FILE_CATEGORIES)[number]["value"];

export const FILE_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  FILE_CATEGORIES.map((c) => [c.value, c.label]),
);

// ─── SEO auto-generation ─────────────────────────────────────────────────────
// When the admin leaves the meta description / keywords empty, derive them
// from the article title and body so no article ships without SEO metadata.

const ARABIC_STOPWORDS = new Set([
  "في", "من", "على", "إلى", "الى", "عن", "مع", "هذا", "هذه", "ذلك", "تلك",
  "التي", "الذي", "الذين", "أو", "او", "ثم", "حتى", "إذا", "اذا", "كان",
  "كانت", "يكون", "تكون", "ما", "لا", "لم", "لن", "قد", "كل", "بعض", "بين",
  "عند", "أن", "ان", "إن", "كما", "لكن", "هو", "هي", "هم", "نحن", "أنت",
  "به", "بها", "له", "لها", "فيه", "فيها", "منه", "منها", "عليه", "عليها",
  "أيضا", "ايضا", "أيضاً", "غير", "بعد", "قبل", "خلال", "حول", "حيث", "لدى",
]);

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function generateMetaDescription(title: string, contentHtml: string): string {
  const text = stripHtml(contentHtml);
  if (!text) return title.trim();
  if (text.length <= 160) return text;
  // Cut at the last word boundary before 157 chars, keeping at least 100 chars.
  const cut = text.slice(0, 157);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 100 ? lastSpace : 157).trim()}…`;
}

export function generateKeywords(title: string, contentHtml: string): string {
  const isUseful = (word: string) => word.length >= 3 && !ARABIC_STOPWORDS.has(word);

  // Title words carry the strongest SEO signal — they come first.
  const titleWords = title.split(/[^\p{L}\p{N}]+/u).filter(isUseful);

  // Then the most frequent meaningful words from the body.
  const freq = new Map<string, number>();
  for (const raw of stripHtml(contentHtml).split(/[^\p{L}\p{N}]+/u)) {
    if (!isUseful(raw)) continue;
    freq.set(raw, (freq.get(raw) ?? 0) + 1);
  }
  const topContentWords = [...freq.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);

  return [...new Set([...titleWords, ...topContentWords])].slice(0, 8).join("، ");
}

export function formatFileSize(bytes?: number | null): string | null {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}
