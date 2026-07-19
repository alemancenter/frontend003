import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { prefetchRoute } from "@/lib/prefetch";
import { imgUrl, imgSrcSet } from "@/lib/img-url";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { BookOpen, LogOut, Menu, Moon, Phone, Sun, User, X } from "lucide-react";
import { useCountry } from "@/hooks/use-country";
import { routes } from "@/lib/country";
import { CountrySwitcher } from "@/components/layout/CountrySwitcher";

const TOP_LINKS = [
  { href: "/about-us", label: "من نحن" },
  { href: "/contact-us", label: "اتصل بنا" },
  { href: "/faq", label: "الأسئلة الشائعة" },
  { href: "/privacy-policy", label: "الخصوصية" },
];

export function Navbar() {
  const { user, isAuthenticated, isLoading: isAuthLoading, hasCheckedAuth, logout, canAccessPrivilegedAdmin, isTeacher } = useAuth();
  const [location] = useLocation();
  const country = useCountry();
  const settings = useSiteSettings();
  const [isDark, setIsDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const siteName = settings.site_name || "موقع الإيمان التعليمي";
  const siteSubtitle = settings.site_description
    ? settings.site_description.split("،")[0].trim()
    : "بوابة المستقبل التعليمية";
  const logoPath = imgUrl(settings.site_logo, 112);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = saved === "dark" || (!saved && prefersDark);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) setUserMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setUserMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const toggleDark = () => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };

  const navLinks = [
    { href: "/", label: "الرئيسية" },
    { href: routes.lessonList(country), label: "الدروس والمواد" },
    { href: routes.postsList(country), label: "الأخبار" },
    { href: "/calendar", label: "التقويم الدراسي" },
    { href: "/teacher-subscription", label: "المعلمين" },
  ];

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full" dir="rtl">
      <div className="hidden bg-[#061a3a] lg:block">
        <div className="mx-auto flex h-10 max-w-[1540px] items-center justify-between px-6 text-[13px] font-semibold">
          <div className="flex items-center gap-4">
            <Link
              href="/contact-us"
              className="inline-flex items-center gap-1.5 text-white/80 transition hover:text-white"
            >
              <Phone className="h-3.5 w-3.5" />
              تواصل معنا
            </Link>
            <span className="h-4 w-px bg-white/20" />
            <button
              type="button"
              onClick={toggleDark}
              aria-label="تبديل الوضع الليلي"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {isDark ? "فاتح" : "داكن"}
            </button>
          </div>

          <nav className="flex items-center gap-5">
            {TOP_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-white/75 transition hover:text-white"
                onMouseEnter={() => prefetchRoute(link.href)}
                onFocus={() => prefetchRoute(link.href)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white/95 shadow-sm shadow-slate-100/80 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95 dark:shadow-slate-900/40">
        <div className="mx-auto flex h-[70px] max-w-[1540px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 lg:flex-none">
            {logoPath ? (
              <>
                <img
                  src={logoPath}
                  srcSet={imgSrcSet(settings.site_logo, 48)}
                  sizes="48px"
                  // Decorative: the site name text sits right beside it in the same
                  // link, so an alt would be read out twice by screen readers.
                  alt=""
                  className="h-10 w-10 rounded-2xl object-contain sm:h-12 sm:w-12"
                  width={48}
                  height={48}
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                    const fallback = event.currentTarget.nextSibling as HTMLElement | null;
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
                <div
                  className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white sm:h-12 sm:w-12"
                  aria-hidden
                >
                  <BookOpen className="h-6 w-6" />
                </div>
              </>
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30 sm:h-12 sm:w-12">
                <BookOpen className="h-6 w-6" />
              </div>
            )}
            <div className="block min-w-0 max-w-[140px] sm:max-w-[240px]">
              <p className="truncate text-base font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-[22px]">
                {siteName}
              </p>
              <p className="hidden truncate text-[12px] font-semibold leading-tight text-slate-600 dark:text-slate-300 sm:block">
                {siteSubtitle}
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onMouseEnter={() => prefetchRoute(link.href)}
                onFocus={() => prefetchRoute(link.href)}
              >
                <span
                  className={`inline-flex h-9 items-center rounded-xl px-4 text-[14px] font-bold transition-colors ${
                    isActive(link.href)
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
                >
                  {link.label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <CountrySwitcher variant="desktop" />
            </div>

            <button
              type="button"
              onClick={toggleDark}
              aria-label="تبديل الوضع الليلي"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {isAuthLoading || !hasCheckedAuth ? (
              <>
                <div
                  className="hidden h-9 w-28 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800 sm:block"
                  aria-label="جارٍ التحقق من جلسة الدخول"
                />
                <div
                  className="h-9 w-9 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800 sm:hidden"
                  aria-label="جارٍ التحقق من جلسة الدخول"
                />
              </>
            ) : isAuthenticated ? (
              <>
                <Link
                  href="/profile"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:hidden"
                  aria-label={`حساب ${user?.name || "المستخدم"}`}
                  title={user?.name || "حساب المستخدم"}
                >
                  <User className="h-4 w-4" />
                </Link>
                <div ref={userMenuRef} className="relative hidden sm:block">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 rounded-full border-slate-200 px-4 font-bold dark:border-slate-700"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  onClick={() => setUserMenuOpen((value) => !value)}
                >
                  <User className="h-4 w-4" />
                  <span className="max-w-[90px] truncate text-sm">{user?.name}</span>
                </Button>
                {userMenuOpen && (
                  <div
                    className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900"
                    role="menu"
                  >
                    <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                      <p className="font-bold leading-none">{user?.name}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <Link href="/profile" className="block rounded-lg px-3 py-2 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setUserMenuOpen(false)}>
                      الملف الشخصي
                    </Link>
                    <Link
                      href={canAccessPrivilegedAdmin ? "/admin" : "/dashboard"}
                      className="block rounded-lg px-3 py-2 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      {canAccessPrivilegedAdmin ? "لوحة التحكم" : "لوحة العضو"}
                    </Link>
                    {isTeacher && (
                      <Link href="/teacher" className="block rounded-lg px-3 py-2 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setUserMenuOpen(false)}>
                        بوابة المعلم
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        void logout();
                      }}
                      className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-slate-100 px-3 py-2 text-right font-semibold text-destructive hover:bg-destructive/10 dark:border-slate-800"
                    >
                      <LogOut className="h-4 w-4" />
                      تسجيل الخروج
                    </button>
                  </div>
                )}
              </div>
              </>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link href="/login">
                  <span className="inline-flex h-9 items-center rounded-xl px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                    تسجيل الدخول
                  </span>
                </Link>
                <Link href="/register">
                  <span className="inline-flex h-9 items-center rounded-xl bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-700/25 transition hover:bg-blue-800 hover:shadow-blue-800/25">
                    حساب جديد
                  </span>
                </Link>
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-xl lg:hidden"
              aria-label="فتح قائمة التنقل"
              title="فتح قائمة التنقل"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">فتح قائمة التنقل</span>
            </Button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="قائمة التنقل">
          <button
            type="button"
            aria-label="إغلاق قائمة التنقل"
            className="absolute inset-0 bg-black/55"
            onClick={closeMobile}
          />
          <aside className="absolute right-0 top-0 flex h-[100dvh] max-h-[100dvh] w-[300px] max-w-[86vw] flex-col overflow-hidden bg-background shadow-2xl sm:w-[380px]">
            <div className="flex shrink-0 items-center justify-between border-b px-5 py-4 sm:px-6">
              <p className="text-base font-black text-foreground">القائمة</p>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="إغلاق قائمة التنقل"
                onClick={closeMobile}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
              {isAuthLoading || !hasCheckedAuth ? (
                <div className="mb-4 animate-pulse rounded-2xl border p-4">
                  <div className="mb-2 h-4 w-28 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-40 rounded bg-slate-100 dark:bg-slate-800" />
                </div>
              ) : isAuthenticated ? (
                <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-foreground">{user?.name || "المستخدم"}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Link href="/profile">
                      <span onClick={closeMobile} className="flex h-9 items-center justify-center rounded-xl border bg-background px-2 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800">
                        الملف الشخصي
                      </span>
                    </Link>
                    <Link href={canAccessPrivilegedAdmin ? "/admin" : "/dashboard"}>
                      <span onClick={closeMobile} className="flex h-9 items-center justify-center rounded-xl border bg-background px-2 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800">
                        {canAccessPrivilegedAdmin ? "لوحة التحكم" : "لوحة العضو"}
                      </span>
                    </Link>
                  </div>
                  {isTeacher && (
                    <Link href="/teacher">
                      <span onClick={closeMobile} className="mt-2 flex h-9 items-center justify-center rounded-xl border bg-background px-2 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800">
                        بوابة المعلم
                      </span>
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      closeMobile();
                      void logout();
                    }}
                    className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    تسجيل الخروج
                  </button>
                </div>
              ) : null}

              <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <span
                    onClick={closeMobile}
                    className={`flex h-11 items-center rounded-xl px-4 text-base font-bold transition-colors ${
                      isActive(link.href)
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    {link.label}
                  </span>
                </Link>
              ))}

              {!isAuthLoading && hasCheckedAuth && !isAuthenticated && (
                <div className="mt-6 flex flex-col gap-2 border-t pt-6">
                  <Link href="/login">
                    <Button variant="outline" className="w-full rounded-xl font-bold" onClick={closeMobile}>
                      تسجيل الدخول
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button className="w-full rounded-xl bg-blue-700 font-black shadow-lg shadow-blue-700/20 hover:bg-blue-800" onClick={closeMobile}>
                      حساب جديد
                    </Button>
                  </Link>
                </div>
              )}

              <div className="mt-6 border-t pt-6" onClick={closeMobile}>
                <CountrySwitcher variant="mobile" />
              </div>

              <div className="mt-4 flex flex-col gap-1 border-t pt-4">
                {TOP_LINKS.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <span
                      onClick={closeMobile}
                      className="flex h-9 items-center rounded-xl px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {link.label}
                    </span>
                  </Link>
                ))}
              </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
