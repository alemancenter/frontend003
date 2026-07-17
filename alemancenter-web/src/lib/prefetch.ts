type PrefetchEntry = [(href: string) => boolean, () => Promise<unknown>];

const prefetched = new Set<string>();

const PREFETCH_MAP: PrefetchEntry[] = [
  // ── Public: main nav ─────────────────────────────────────────────────────
  [(h) => h === "/", () => import("@/pages/public/Home")],
  [(h) => /\/lesson$/.test(h), () => import("@/pages/public/GradesIndex")],
  [(h) => /\/posts$/.test(h), () => import("@/pages/public/Posts")],
  [(h) => h === "/calendar", () => import("@/pages/public/Calendar")],
  [
    (h) => h === "/teacher-subscription",
    () => import("@/pages/public/TeacherSubscriptionPublic"),
  ],

  // ── Public: top utility bar ───────────────────────────────────────────────
  [(h) => h === "/about-us", () => import("@/pages/public/AboutUs")],
  [(h) => h === "/contact-us", () => import("@/pages/public/Contact")],
  [(h) => h === "/faq", () => import("@/pages/public/Faq")],
  [(h) => h.includes("privacy-policy"), () => import("@/pages/public/LegalPage")],
  [(h) => h.includes("terms"), () => import("@/pages/public/LegalPage")],
  [(h) => h.includes("cookie-policy"), () => import("@/pages/public/LegalPage")],
  [(h) => h === "/login" || h === "/register", () => import("@/pages/public/Auth")],

  // ── Admin: sidebar ────────────────────────────────────────────────────────
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
  [
    (h) => h === "/admin/teacher-subscriptions",
    () => import("@/pages/admin/teacher-subscriptions"),
  ],
  [(h) => h === "/admin/messages", () => import("@/pages/admin/Messages")],
  [
    (h) => h === "/admin/contact-messages",
    () => import("@/pages/admin/ContactMessages"),
  ],
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

  // ── Teacher portal: sidebar ───────────────────────────────────────────────
  [
    (h) => h === "/teacher",
    () => import("@/pages/teacher/DashboardPage"),
  ],
  [(h) => h === "/teacher/library", () => import("@/pages/teacher/LibraryPage")],
  [
    (h) => h === "/teacher/my-library",
    () => import("@/pages/teacher/MyLibraryPage"),
  ],
  [
    (h) => h === "/teacher/ai-studio",
    () => import("@/pages/teacher/AiStudioPage"),
  ],
  [
    (h) => h === "/teacher/downloads",
    () => import("@/pages/teacher/DownloadsPage"),
  ],
  [(h) => h === "/teacher/devices", () => import("@/pages/teacher/DevicesPage")],
  [
    (h) => h === "/teacher/notifications",
    () => import("@/pages/teacher/NotificationsPage"),
  ],
  [(h) => h === "/teacher/orders", () => import("@/pages/teacher/OrdersPage")],
];

function runPrefetch(href: string): void {
  if (prefetched.has(href)) return;
  prefetched.add(href);

  for (const [matches, load] of PREFETCH_MAP) {
    if (matches(href)) {
      load().catch(() => {
        prefetched.delete(href);
      });
      return;
    }
  }
}

export function prefetchRoute(href: string): void {
  if (typeof window === "undefined") return;

  if ("requestIdleCallback" in window) {
    (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(
      () => runPrefetch(href),
    );
  } else {
    setTimeout(() => runPrefetch(href), 0);
  }
}
