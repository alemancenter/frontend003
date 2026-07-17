import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { prefetchRoute } from "@/lib/prefetch";
import { imgUrl, imgSrcSet } from "@/lib/img-url";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import {
  BookOpen,
  LogOut,
  Menu,
  User,
  Phone,
  Moon,
  Sun,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  const { user, isAuthenticated, logout, canAccessPrivilegedAdmin, isTeacher } = useAuth();
  const [location] = useLocation();
  const country = useCountry();
  const settings = useSiteSettings();
  const [isDark, setIsDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const siteName = settings.site_name || "موقع الإيمان التعليمي";
  // Use the first clause of the description as a tagline. Never hard-slice by
  // character count — that cuts words mid-letter; let CSS ellipsis handle overflow.
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

  return (
    <header className="sticky top-0 z-50 w-full" dir="rtl">
      {/* ── Dark top utility bar (desktop only) ──────────────────────────── */}
      <div className="hidden lg:block bg-[#061a3a]">
        <div className="mx-auto flex h-10 max-w-[1540px] items-center justify-between px-6 text-[13px] font-semibold">
          {/* Left: contact + dark toggle */}
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
              onClick={toggleDark}
              aria-label="تبديل الوضع الليلي"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              {isDark ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
              {isDark ? "فاتح" : "داكن"}
            </button>
          </div>

          {/* Right: utility links */}
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

      {/* ── Main navigation bar ──────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white/95 shadow-sm shadow-slate-100/80 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95 dark:shadow-slate-900/40">
        <div className="mx-auto flex h-[70px] max-w-[1540px] items-center justify-between gap-4 px-4 sm:px-6">
          {/* Logo */}
          <Link
            href="/"
            className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 lg:flex-none"
          >
            {logoPath ? (
              <>
                <img
                  src={logoPath}
                  srcSet={imgSrcSet(settings.site_logo, 48)}
                  sizes="48px"
                  alt={siteName}
                  className="h-10 w-10 rounded-2xl object-contain sm:h-12 sm:w-12"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                    const fb = e.currentTarget.nextSibling as HTMLElement | null;
                    if (fb) fb.style.display = "flex";
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
              <p className="hidden truncate text-[12px] font-semibold leading-tight text-slate-400 dark:text-slate-400 sm:block">
                {siteSubtitle}
              </p>
            </div>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-1">
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

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Country switcher — desktop */}
            <div className="hidden sm:block">
              <CountrySwitcher variant="desktop" />
            </div>

            {/* Dark toggle on mobile */}
            <button
              onClick={toggleDark}
              aria-label="تبديل الوضع الليلي"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {isAuthenticated ? (
              <DropdownMenu dir="rtl">
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 rounded-full border-slate-200 px-4 font-bold dark:border-slate-700"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline-block max-w-[90px] truncate text-sm">
                      {user?.name}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-sm font-bold leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="w-full cursor-pointer">
                      الملف الشخصي
                    </Link>
                  </DropdownMenuItem>
                  {canAccessPrivilegedAdmin ? (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="w-full cursor-pointer">
                        لوحة التحكم
                      </Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="w-full cursor-pointer">
                        لوحة العضو
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isTeacher && (
                    <DropdownMenuItem asChild>
                      <Link href="/teacher" className="w-full cursor-pointer">
                        بوابة المعلم
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="text-destructive focus:bg-destructive/10 cursor-pointer"
                  >
                    <LogOut className="ml-2 h-4 w-4" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
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

            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[380px]" dir="rtl">
                <div className="flex flex-col gap-1 mt-8">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onMouseEnter={() => prefetchRoute(link.href)}
                      onFocus={() => prefetchRoute(link.href)}
                    >
                      <span
                        onClick={() => setMobileOpen(false)}
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

                  {!isAuthenticated && (
                    <div className="flex flex-col gap-2 mt-6 pt-6 border-t">
                      <Link href="/login">
                        <Button
                          variant="outline"
                          className="w-full rounded-xl font-bold"
                          onClick={() => setMobileOpen(false)}
                        >
                          تسجيل الدخول
                        </Button>
                      </Link>
                      <Link href="/register">
                        <Button
                          className="w-full rounded-xl bg-blue-700 font-black hover:bg-blue-800 shadow-lg shadow-blue-700/20"
                          onClick={() => setMobileOpen(false)}
                        >
                          حساب جديد
                        </Button>
                      </Link>
                    </div>
                  )}

                  <div className="mt-6 pt-6 border-t">
                    <div onClick={() => setMobileOpen(false)}>
                      <CountrySwitcher variant="mobile" />
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex flex-col gap-1">
                    {TOP_LINKS.map((link) => (
                      <Link key={link.href} href={link.href}>
                        <span
                          onClick={() => setMobileOpen(false)}
                          className="flex h-9 items-center rounded-xl px-4 text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          {link.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
