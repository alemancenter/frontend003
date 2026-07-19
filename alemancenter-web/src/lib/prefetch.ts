import { academicApi } from "@/lib/api/academic";
import { articlesApi, categoriesApi, postsApi } from "@/lib/api/content";
import { isValidCountry } from "@/lib/country";
import { queryClient } from "@/lib/query-client";

type PrefetchEntry = [(href: string) => boolean, () => Promise<unknown>];

const prefetchedChunks = new Set<string>();
const scheduled = new Map<string, number>();

const PREFETCH_MAP: PrefetchEntry[] = [
  // Public routes
  [(h) => h === "/", () => import("@/pages/public/Home")],
  [(h) => /^\/(jo|sa|eg|ps)\/lesson$/.test(h) || h === "/grades" || h === "/classes", () => import("@/pages/public/GradesIndex")],
  [(h) => /^\/(jo|sa|eg|ps)\/lesson\/articles\/[^/]+$/.test(h) || /^\/articles\/[^/]+$/.test(h), () => import("@/pages/public/ArticleDetail")],
  [(h) => /^\/(jo|sa|eg|ps)\/lesson\/subjects\/[^/]+(?:\/articles\/[^/]+\/[^/]+)?$/.test(h), () => import("@/pages/public/SubjectDetail")],
  [(h) => /^\/(jo|sa|eg|ps)\/lesson\/[^/]+$/.test(h), () => import("@/pages/public/GradeDetail")],
  [(h) => /^\/(jo|sa|eg|ps)\/posts\/category\/[^/]+$/.test(h), () => import("@/pages/public/CategoryPosts")],
  [(h) => /^\/(jo|sa|eg|ps)\/posts\/[^/]+$/.test(h) || /^\/(posts|news)\/[^/]+$/.test(h), () => import("@/pages/public/PostDetail")],
  [(h) => /^\/(jo|sa|eg|ps)\/posts$/.test(h) || h === "/posts" || h === "/news", () => import("@/pages/public/Posts")],
  [(h) => h === "/articles", () => import("@/pages/public/Articles")],
  [(h) => h === "/calendar", () => import("@/pages/public/Calendar")],
  [(h) => h === "/teacher-subscription", () => import("@/pages/public/TeacherSubscriptionPublic")],
  [(h) => h === "/about-us", () => import("@/pages/public/AboutUs")],
  [(h) => h === "/contact-us", () => import("@/pages/public/Contact")],
  [(h) => h === "/faq", () => import("@/pages/public/Faq")],
  [(h) => h.includes("privacy-policy") || h.includes("terms") || h.includes("cookie-policy") || h.includes("disclaimer"), () => import("@/pages/public/LegalPage")],
  [(h) => h === "/login" || h === "/register", () => import("@/pages/public/Auth")],
  [(h) => h === "/search", () => import("@/pages/public/Search")],

  // Admin sidebar
  [(h) => h === "/admin", () => import("@/pages/admin/Dashboard")],
  [(h) => h === "/admin/articles", () => import("@/pages/admin/articles")],
  [(h) => h === "/admin/posts", () => import("@/pages/admin/posts")],
  [(h) => h === "/admin/categories", () => import("@/pages/admin/Categories")],
  [(h) => h === "/admin/comments", () => import("@/pages/admin/Comments")],
  [(h) => h === "/admin/files", () => import("@/pages/admin/Files")],
  [(h) => h === "/admin/academic", () => import("@/pages/admin/Academic")],
  [(h) => h === "/admin/calendar", () => import("@/pages/admin/Calendar")],
  [(h) => h === "/admin/users", () => import("@/pages/admin/users")],
  [(h) => h === "/admin/roles", () => import("@/pages/admin/Roles")],
  [(h) => h === "/admin/permissions", () => import("@/pages/admin/Permissions")],
  [(h) => h === "/admin/teacher-subscriptions", () => import("@/pages/admin/teacher-subscriptions")],
  [(h) => h === "/admin/messages", () => import("@/pages/admin/Messages")],
  [(h) => h === "/admin/contact-messages", () => import("@/pages/admin/ContactMessages")],
  [(h) => h === "/admin/notifications", () => import("@/pages/admin/Notifications")],
  [(h) => h === "/admin/chatbot", () => import("@/pages/admin/Chatbot")],
  [(h) => h === "/admin/analytics", () => import("@/pages/admin/Analytics")],
  [(h) => h === "/admin/monitor", () => import("@/pages/admin/Monitor")],
  [(h) => h === "/admin/performance", () => import("@/pages/admin/Performance")],
  [(h) => h === "/admin/redis", () => import("@/pages/admin/Redis")],
  [(h) => h === "/admin/sitemap", () => import("@/pages/admin/Sitemap")],
  [(h) => h === "/admin/content-audit", () => import("@/pages/admin/ContentAudit")],
  [(h) => h === "/admin/security", () => import("@/pages/admin/security")],
  [(h) => h === "/admin/settings", () => import("@/pages/admin/Settings")],

  // Teacher portal
  [(h) => h === "/teacher", () => import("@/pages/teacher/DashboardPage")],
  [(h) => h === "/teacher/library", () => import("@/pages/teacher/LibraryPage")],
  [(h) => h === "/teacher/my-library", () => import("@/pages/teacher/MyLibraryPage")],
  [(h) => h === "/teacher/ai-studio", () => import("@/pages/teacher/AiStudioPage")],
  [(h) => h === "/teacher/downloads", () => import("@/pages/teacher/DownloadsPage")],
  [(h) => h === "/teacher/devices", () => import("@/pages/teacher/DevicesPage")],
  [(h) => h === "/teacher/notifications", () => import("@/pages/teacher/NotificationsPage")],
  [(h) => h === "/teacher/orders", () => import("@/pages/teacher/OrdersPage")],
];

function normalizeHref(href: string): string | null {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return null;
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return url.pathname || "/";
  } catch {
    return null;
  }
}

function parseCountry(pathname: string): string | null {
  const segment = pathname.split("/").filter(Boolean)[0];
  return isValidCountry(segment) ? segment : null;
}

function prefetchData(pathname: string): void {
  const country = parseCountry(pathname);

  if (pathname === "/") {
    // Default/home country is not encoded in the URL. Home itself will fetch
    // immediately; avoid guessing a user's saved country here.
    return;
  }

  if (!country) return;

  if (/^\/(jo|sa|eg|ps)\/lesson$/.test(pathname)) {
    void queryClient.prefetchQuery({
      queryKey: ["grades", country],
      queryFn: () => academicApi.listGrades(country),
      staleTime: 30 * 60 * 1000,
    });
    return;
  }

  let match = pathname.match(/^\/(jo|sa|eg|ps)\/lesson\/articles\/([^/]+)$/);
  if (match) {
    const id = match[2];
    void queryClient.prefetchQuery({
      queryKey: ["article", id],
      queryFn: () => articlesApi.show(id),
      staleTime: 5 * 60 * 1000,
    });
    return;
  }

  match = pathname.match(/^\/(jo|sa|eg|ps)\/lesson\/subjects\/([^/]+)\/articles\/([^/]+)\/([^/]+)$/);
  if (match) {
    const [, c, subjectId, semesterId, categoryId] = match;
    void queryClient.prefetchQuery({
      queryKey: ["semesters", c, subjectId],
      queryFn: () => academicApi.listSemesters(subjectId, c),
      staleTime: 30 * 60 * 1000,
    });
    void queryClient.prefetchQuery({
      queryKey: ["subject-category-articles", c, subjectId, semesterId, categoryId],
      queryFn: () => articlesApi.list({
        country: c,
        subject_id: Number(subjectId),
        semester_id: Number(semesterId),
        file_category: categoryId,
        per_page: 500,
      }),
      staleTime: 5 * 60 * 1000,
    });
    return;
  }

  match = pathname.match(/^\/(jo|sa|eg|ps)\/lesson\/subjects\/([^/]+)$/);
  if (match) {
    const [, c, subjectId] = match;
    void queryClient.prefetchQuery({
      queryKey: ["semesters", c, subjectId],
      queryFn: () => academicApi.listSemesters(subjectId, c),
      staleTime: 30 * 60 * 1000,
    });
    return;
  }

  match = pathname.match(/^\/(jo|sa|eg|ps)\/lesson\/([^/]+)$/);
  if (match) {
    const [, c, gradeId] = match;
    void queryClient.prefetchQuery({
      queryKey: ["grade", c, gradeId],
      queryFn: () => academicApi.getGrade(gradeId, c),
      staleTime: 30 * 60 * 1000,
    });
    return;
  }

  if (/^\/(jo|sa|eg|ps)\/posts$/.test(pathname)) {
    void queryClient.prefetchQuery({
      queryKey: ["posts", country],
      queryFn: () => postsApi.list({ country }),
      staleTime: 3 * 60 * 1000,
    });
    return;
  }

  match = pathname.match(/^\/(jo|sa|eg|ps)\/posts\/category\/([^/]+)$/);
  if (match) {
    const categoryId = match[2];
    // Resolve a slug to the numeric backend id before prefetching posts. The
    // visible route supports both forms, while the API may only accept ids.
    void queryClient.fetchQuery({
      queryKey: ["categories", country],
      queryFn: () => categoriesApi.list(country),
      staleTime: 15 * 60 * 1000,
    }).then((categories) => {
      const category = categories.find(
        (item) => String(item.slug) === categoryId || String(item.id) === categoryId,
      );
      return queryClient.prefetchQuery({
        queryKey: ["posts", "category", country, categoryId],
        queryFn: () => postsApi.list({ category_id: category?.id ?? categoryId, country }),
        staleTime: 3 * 60 * 1000,
      });
    }).catch(() => undefined);
    return;
  }

  match = pathname.match(/^\/(jo|sa|eg|ps)\/posts\/([^/]+)$/);
  if (match) {
    const id = match[2];
    void queryClient.prefetchQuery({
      queryKey: ["post", id],
      queryFn: () => postsApi.show(id),
      staleTime: 3 * 60 * 1000,
    });
  }
}

function runPrefetch(pathname: string): void {
  if (!prefetchedChunks.has(pathname)) {
    for (const [matches, load] of PREFETCH_MAP) {
      if (matches(pathname)) {
        prefetchedChunks.add(pathname);
        load().catch(() => prefetchedChunks.delete(pathname));
        break;
      }
    }
  }
  prefetchData(pathname);
}

export function prefetchRoute(href: string): void {
  if (typeof window === "undefined") return;
  const pathname = normalizeHref(href);
  if (!pathname || pathname === window.location.pathname || scheduled.has(pathname)) return;

  // A tiny delay prevents accidental pointer flyovers from generating traffic,
  // while still completing most prefetches before an intentional click.
  const timer = window.setTimeout(() => {
    scheduled.delete(pathname);
    runPrefetch(pathname);
  }, 60);
  scheduled.set(pathname, timer);
}

export function cancelPrefetch(href: string): void {
  if (typeof window === "undefined") return;
  const pathname = normalizeHref(href);
  if (!pathname) return;
  const timer = scheduled.get(pathname);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    scheduled.delete(pathname);
  }
}
