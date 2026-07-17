import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { articlesApi, categoriesApi } from "@/lib/api/content";
import { academicApi } from "@/lib/api/academic";
import { AdUnit } from "@/components/ads/AdUnit";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { useSeo, websiteJsonLd, organizationJsonLd } from "@/lib/seo";
import { imgUrl } from "@/lib/img-url";
import {
  BookOpen,
  ChevronLeft,
  GraduationCap,
  FileText,
  CalendarDays,
  FolderOpen,
  Grid3X3,
  LibraryBig,
  Languages,
  FlaskConical,
  Landmark,
  Newspaper,
  ChartNoAxesColumn,
  Sparkles,
  ArrowLeft,
  Clock,
  Eye,
  Zap,
  Star,
  type LucideIcon,
} from "lucide-react";
import { useCountry } from "@/hooks/use-country";
import { routes } from "@/lib/country";

/* ─── Constants ─────────────────────────────────────────────────────────────── */

const CATEGORY_ICONS: LucideIcon[] = [
  Grid3X3, LibraryBig, ChartNoAxesColumn, Landmark,
  Languages, FlaskConical, BookOpen, Newspaper,
];

const GRADE_GRADIENTS = [
  { from: "#f43f5e", to: "#e11d48" },   // rose
  { from: "#f59e0b", to: "#d97706" },   // amber
  { from: "#0ea5e9", to: "#0284c7" },   // sky
  { from: "#8b5cf6", to: "#7c3aed" },   // violet
  { from: "#10b981", to: "#059669" },   // emerald
  { from: "#3b82f6", to: "#2563eb" },   // blue
  { from: "#f97316", to: "#ea580c" },   // orange
  { from: "#a855f7", to: "#9333ea" },   // purple
  { from: "#06b6d4", to: "#0891b2" },   // cyan
];

const HERO_FEATURES = [
  { icon: FileText,    label: "ملفات دراسية",   sub: "+2400 ملف جاهز للتحميل",  color: "#3b82f6" },
  { icon: GraduationCap, label: "بوابة المعلمين", sub: "أدوات احترافية للتدريس", color: "#8b5cf6" },
  { icon: CalendarDays,  label: "التقويم الدراسي", sub: "مواعيد ودروس منظمة",     color: "#10b981" },
  { icon: Zap,           label: "تحديث فوري",      sub: "محتوى جديد يومياً",       color: "#f59e0b" },
];

const KHADMATK_AD = {
  id: "khadmatak-sponsored-ad",
  name: "خدمتك",
  url: "https://khadmatak.com/",
  headline: "خدمتك - نظام إدارة سجلات الطلبة ومنصة أجيال للمدارس",
  description: "نظام يساعد المدارس والمعلمين على تنظيم سجلات الطلبة والمعلمين، معالجة ملفات Excel من منصة أجيال، وتجهيز تقارير قابلة للطباعة.",
  audience: "المدارس والمعلمون",
  features: ["معالجة ملفات Excel", "نماذج مدرسية منظمة", "تقارير جاهزة للطباعة"],
};

/* ─── Grade number extractor ─────────────────────────────────────────────────── */
function extractGradeNumber(label: string, fallback: number): string {
  const m = label.match(/\d+/);
  if (m) return m[0];
  const words: Record<string, string> = {
    الأول:"1",الثاني:"2",الثالث:"3",الرابع:"4",الخامس:"5",
    السادس:"6",السابع:"7",الثامن:"8",التاسع:"9",العاشر:"10",الحادي:"11",
  };
  const found = Object.entries(words).find(([w]) => label.includes(w));
  return found?.[1] ?? String(fallback + 1);
}

/* ─── Component ──────────────────────────────────────────────────────────────── */

export function Home() {
  const country  = useCountry();
  const settings = useSiteSettings();
  const siteName = settings.site_name || "موقع الإيمان التعليمي";

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  useSeo({
    // Home keeps the bare site name as its title (no "page | site" suffix).
    description: settings.site_description,
    canonical: "/",
    jsonLd: [
      websiteJsonLd(siteName, siteUrl),
      organizationJsonLd(siteName, siteUrl, settings.site_logo ? imgUrl(settings.site_logo, 512) ?? undefined : undefined),
      {
        "@context": "https://schema.org",
        "@type": "WPAdBlock",
        "@id": `${siteUrl}/#${KHADMATK_AD.id}`,
        name: KHADMATK_AD.headline,
        description: KHADMATK_AD.description,
        url: KHADMATK_AD.url,
        isPartOf: {
          "@type": "WebPage",
          "@id": `${siteUrl}/#home`,
          url: siteUrl,
          name: siteName,
        },
        about: {
          "@type": "Service",
          name: KHADMATK_AD.name,
          url: KHADMATK_AD.url,
          serviceType: "إدارة سجلات الطلبة والمدارس",
          audience: {
            "@type": "Audience",
            audienceType: KHADMATK_AD.audience,
          },
          provider: {
            "@type": "Organization",
            name: KHADMATK_AD.name,
            url: KHADMATK_AD.url,
          },
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "خدمات خدمتك للمدارس والمعلمين",
            itemListElement: KHADMATK_AD.features.map((feature, index) => ({
              "@type": "Offer",
              position: index + 1,
              itemOffered: {
                "@type": "Service",
                name: feature,
              },
            })),
          },
        },
        potentialAction: {
          "@type": "ViewAction",
          target: KHADMATK_AD.url,
          name: "زيارة موقع خدمتك",
        },
      },
    ],
  });

  const { data: articles,   isLoading: loadingArticles   } = useQuery({ queryKey: ["latest-articles", country], queryFn: () => articlesApi.list({ per_page: 6, country }) });
  const { data: grades,     isLoading: loadingGrades     } = useQuery({ queryKey: ["grades",          country], queryFn: () => academicApi.listGrades(country) });
  const { data: categories, isLoading: loadingCategories } = useQuery({ queryKey: ["categories",      country], queryFn: () => categoriesApi.list(country) });

  return (
    <div className="flex flex-col" dir="rtl">

      {/* ═══════════════════════════ HERO ════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg,#07194d 0%,#0d2860 40%,#0a1e55 70%,#0c1640 100%)" }}>
        {/* Gradient blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full opacity-30" style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)", filter: "blur(80px)" }} />
          <div className="absolute -left-16 bottom-0 h-[400px] w-[400px] rounded-full opacity-20" style={{ background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)", filter: "blur(80px)" }} />
          <div className="absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full opacity-15" style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)", filter: "blur(60px)" }} />
        </div>

        {/* Dot grid overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

        <div className="relative z-10 mx-auto grid max-w-[1540px] items-center gap-10 px-4 pb-20 pt-14 sm:px-6 md:px-8 lg:grid-cols-[1fr_440px] lg:gap-16 lg:py-24">

          {/* ── Left: Text ── */}
          <div className="flex flex-col gap-6">
            {/* Badge */}
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-bold text-white/90 backdrop-blur-sm">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              المنصة التعليمية الأولى في الأردن والشرق الأوسط
            </div>

            {/* Heading */}
            <h1 className="text-4xl font-black leading-[1.15] text-white sm:text-5xl lg:text-6xl xl:text-7xl">
              {siteName}
              <span className="mt-3 block text-2xl sm:text-3xl lg:text-4xl" style={{ background: "linear-gradient(135deg,#60a5fa,#a78bfa,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                عالم المعلم العربي في موقع واحد
              </span>
            </h1>

            {/* Sub */}
            <p className="max-w-lg text-base font-semibold leading-8 text-white/70 sm:text-lg">
              آلاف الملفات الدراسية، الملخصات، الاختبارات وأوراق العمل — منظمة حسب الصف والمادة والدولة، جاهزة للتحميل في ثوانٍ.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <Link href={routes.lessonList(country)}>
                <span className="inline-flex h-13 items-center gap-2.5 rounded-2xl px-7 py-3.5 text-base font-black text-white shadow-xl transition hover:-translate-y-0.5 active:translate-y-0" style={{ background: "linear-gradient(135deg,#3b82f6,#6366f1)", boxShadow: "0 8px 32px rgba(99,102,241,0.4)" }}>
                  <Sparkles className="h-5 w-5" />
                  استكشف المحتوى
                </span>
              </Link>
              <Link href="/grades">
                <span className="inline-flex h-13 items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-7 py-3.5 text-base font-black text-white backdrop-blur-sm transition hover:bg-white/15 active:scale-95">
                  <GraduationCap className="h-5 w-5" />
                  اختر صفك الدراسي
                </span>
              </Link>
            </div>

            {/* Inline stats */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 pt-2">
              {[
                { n: "+2400", l: "ملف تعليمي" },
                { n: "+50K",  l: "طالب ومعلم" },
                { n: "+18",   l: "قسم دراسي"  },
                { n: "24/7",  l: "دعم مستمر"  },
              ].map(({ n, l }) => (
                <div key={l} className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-white">{n}</span>
                  <span className="text-sm font-semibold text-white/60">{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Feature cards grid ── */}
          <div className="hidden grid-cols-2 gap-4 lg:grid">
            {HERO_FEATURES.map(({ icon: Ico, label, sub, color }) => (
              <div
                key={label}
                className="group rounded-2xl border border-white/10 bg-white/8 p-5 backdrop-blur-md transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/12"
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${color}22` }}>
                  <Ico className="h-5 w-5" style={{ color }} />
                </div>
                <p className="mb-1 font-black text-white">{label}</p>
                <p className="text-xs font-semibold text-white/50">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-12 w-full" preserveAspectRatio="none">
            <path d="M0 48L1440 48L1440 24C1200 48 960 0 720 24C480 48 240 0 0 24L0 48Z" className="fill-[hsl(210,60%,99%)] dark:fill-[hsl(217,81%,8%)]" />
          </svg>
        </div>
      </section>

      {/* ══════════════════════ GRADES SECTION ═══════════════════════════════════ */}
      <section className="mx-auto w-full max-w-[1540px] px-4 pt-12 sm:px-6 md:px-8">
        {/* Header */}
        <div className="mb-7 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
              تصفح حسب الصف الدراسي
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              ابدأ من صفك للوصول إلى جميع المواد المتاحة
            </p>
          </div>
          <Link href="/grades">
            <span className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-blue-100 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 sm:flex">
              عرض الكل <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            </span>
          </Link>
        </div>

        {loadingGrades ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-[110px] rounded-2xl bg-slate-100 animate-pulse dark:bg-slate-800" />
            ))}
          </div>
        ) : grades && grades.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9">
            {grades.slice(0, 18).map((grade, i) => {
              const g = GRADE_GRADIENTS[i % GRADE_GRADIENTS.length];
              const num = extractGradeNumber(grade.grade_name, i);
              return (
                <Link key={grade.id} href={`/grades/${grade.id}`}>
                  <div
                    className="group relative flex min-h-[110px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl px-2 py-4 text-center shadow-sm transition-all active:scale-[0.97] lg:hover:-translate-y-1 lg:hover:shadow-xl"
                    style={{ background: `linear-gradient(145deg,${g.from},${g.to})` }}
                  >
                    {/* Circle number */}
                    <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg font-black text-white shadow-inner backdrop-blur-sm">
                      {num}
                    </span>
                    <span className="line-clamp-2 min-h-[36px] text-[12px] font-black leading-5 text-white sm:text-[13px]">
                      {grade.grade_name}
                    </span>
                    {/* Shine effect */}
                    <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity group-hover:opacity-100" style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.15),transparent 60%)" }} />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center text-slate-500 dark:border-slate-700">
            لا توجد صفوف متاحة حالياً
          </div>
        )}
      </section>

      {/* Ad */}
      <div className="mx-auto w-full max-w-[1540px] px-4 pt-10 sm:px-6 md:px-8">
        <AdUnit page="home" position={1} className="rounded-2xl overflow-hidden" />
      </div>

      {/* ══════════════════════ CATEGORIES ═══════════════════════════════════════ */}
      <section className="mx-auto w-full max-w-[1540px] px-4 pt-14 sm:px-6 md:px-8">
        <div className="mb-7 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
              الأقسام التعليمية
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              تصفح المحتوى حسب الموضوع أو المادة
            </p>
          </div>
          <Link
            href={
              categories && categories.length > 0
                ? routes.postsCategory(country, categories[0].slug || categories[0].id)
                : routes.postsList(country)
            }
          >
            <span className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-blue-100 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 sm:flex">
              جميع الأقسام <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            </span>
          </Link>
        </div>

        {loadingCategories ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse dark:bg-slate-800" />
            ))}
          </div>
        ) : categories && categories.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((cat, i) => {
              const Icon = CATEGORY_ICONS[i % CATEGORY_ICONS.length];
              const g = GRADE_GRADIENTS[(i * 2) % GRADE_GRADIENTS.length];
              return (
                <Link key={cat.id} href={routes.postsCategory(country, cat.slug || cat.id)}>
                  <div className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    {/* Gradient top band */}
                    <div
                      className="flex h-14 items-center justify-center"
                      style={{ background: `linear-gradient(135deg,${g.from}22,${g.to}44)` }}
                    >
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm"
                        style={{ background: `linear-gradient(135deg,${g.from},${g.to})` }}
                      >
                        <Icon className="h-4.5 w-4.5 text-white" />
                      </div>
                    </div>
                    {/* Content */}
                    <div className="px-4 py-3">
                      <p className="font-black text-slate-900 transition-colors group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-400 line-clamp-1 text-sm sm:text-base">
                        {cat.name}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center text-slate-500 dark:border-slate-700">
            لا توجد أقسام متاحة حالياً
          </div>
        )}
      </section>

      {/* Ad */}
      <div className="mx-auto w-full max-w-[1540px] px-4 pt-10 sm:px-6 md:px-8">
        <AdUnit page="home" position={2} className="rounded-2xl overflow-hidden" />
      </div>

      {/* ══════════════════════ KHADMATK PROMO ═══════════════════════════════ */}
      <section
        id={KHADMATK_AD.id}
        className="mx-auto mt-14 w-full max-w-[1540px] px-4 sm:px-6 md:px-8"
        aria-labelledby={`${KHADMATK_AD.id}-title`}
      >
        <a
          href={KHADMATK_AD.url}
          target="_blank"
          rel="sponsored noopener noreferrer"
          title={KHADMATK_AD.headline}
          className="group block overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-xl dark:border-emerald-900/60 dark:bg-slate-900"
          aria-label={`زيارة موقع ${KHADMATK_AD.name}: ${KHADMATK_AD.description}`}
        >
          <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_360px] lg:items-center lg:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_32%)]" />

            <div className="relative z-10">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                  إعلان مميز
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                  للمدارس والمعلمين
                </span>
              </div>

              <h2 id={`${KHADMATK_AD.id}-title`} className="text-2xl font-black leading-tight text-slate-950 dark:text-white sm:text-3xl lg:text-4xl">
                {KHADMATK_AD.name}
                <span className="block text-emerald-700 dark:text-emerald-300">
                  نظام إدارة سجلات الطلبة ومنصة أجيال للمدارس
                </span>
              </h2>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                {KHADMATK_AD.description}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: FileText, label: KHADMATK_AD.features[0] },
                  { icon: Landmark, label: KHADMATK_AD.features[1] },
                  { icon: ChartNoAxesColumn, label: KHADMATK_AD.features[2] },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm font-black text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200">
                    <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-600 to-blue-700 p-5 text-white shadow-lg dark:border-white/10">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white/70">khadmatak.com</p>
                  <p className="mt-1 text-xl font-black">ابدأ تنظيم ملفات المدرسة</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  <FolderOpen className="h-6 w-6" />
                </div>
              </div>
              <div className="space-y-2 rounded-2xl bg-white/10 p-4 text-sm font-bold">
                <div className="flex items-center justify-between">
                  <span>سجلات الطلبة</span>
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">جاهز</span>
                </div>
                <div className="h-2 rounded-full bg-white/15">
                  <div className="h-2 w-10/12 rounded-full bg-white" />
                </div>
                <div className="flex items-center justify-between text-white/80">
                  <span>تصدير وطباعة</span>
                  <span>Excel</span>
                </div>
              </div>
              <span className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-black text-emerald-700 transition group-hover:bg-emerald-50">
                زيارة الموقع
                <ArrowLeft className="h-4 w-4" />
              </span>
            </div>
          </div>
        </a>
      </section>

      {/* ══════════════════════ ARTICLES (magazine style) ════════════════════════ */}
      <section className="mx-auto w-full max-w-[1540px] px-4 py-14 sm:px-6 md:px-8">
        <div className="mb-7 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
              أحدث المقالات والملفات
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              محتوى جديد يُضاف يومياً من أفضل المعلمين
            </p>
          </div>
          <Link href="/articles">
            <span className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-blue-100 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 sm:flex">
              تصفح المزيد <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            </span>
          </Link>
        </div>

        {loadingArticles ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 rounded-2xl bg-slate-100 animate-pulse dark:bg-slate-800" />
            ))}
          </div>
        ) : articles && articles.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article, i) => {
              const g = GRADE_GRADIENTS[i % GRADE_GRADIENTS.length];
              return (
                <Link key={article.id} href={`/articles/${article.id}`}>
                  <div className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-slate-200 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    {/* Gradient header strip */}
                    <div
                      className="flex h-2 w-full shrink-0"
                      style={{ background: `linear-gradient(90deg,${g.from},${g.to})` }}
                    />

                    <div className="flex flex-1 flex-col gap-3 p-5">
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {article.grade_level && (
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            {article.grade_level}
                          </span>
                        )}
                        {article.subject?.subject_name && (
                          <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {article.subject.subject_name}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-[15px] font-black leading-snug text-slate-900 transition-colors group-hover:text-blue-700 line-clamp-2 dark:text-white dark:group-hover:text-blue-400 sm:text-base">
                        {article.title}
                      </h3>

                      {/* Excerpt */}
                      <p className="flex-1 text-[13px] font-semibold leading-relaxed text-slate-500 line-clamp-2 dark:text-slate-400">
                        {article.meta_description || "اقرأ المقال لمزيد من التفاصيل حول هذا الموضوع التعليمي."}
                      </p>

                      {/* Footer meta */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-400 dark:border-slate-700 dark:text-slate-500">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {article.visit_count?.toLocaleString("ar-JO")} مشاهدة
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(article.created_at).toLocaleDateString("ar-JO")}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center text-slate-500 dark:border-slate-700">
            لا توجد مقالات حالياً
          </div>
        )}

        {/* View all button (mobile) */}
        <div className="mt-6 sm:hidden">
          <Link href="/articles">
            <Button className="w-full rounded-2xl bg-blue-700 font-black hover:bg-blue-800">
              تصفح جميع المقالات
            </Button>
          </Link>
        </div>
      </section>

      {/* ══════════════════════ CTA BANNER ════════════════════════════════════ */}
      <section className="mx-4 mb-16 overflow-hidden rounded-3xl sm:mx-6 md:mx-8 lg:mx-auto lg:max-w-[1540px]" style={{ background: "linear-gradient(135deg,#3b82f6 0%,#6366f1 50%,#8b5cf6 100%)" }}>
        <div className="relative px-8 py-12 text-center">
          <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          <div className="relative z-10">
            <h2 className="mb-3 text-2xl font-black text-white sm:text-3xl lg:text-4xl">
              هل أنت معلم؟ انضم إلينا اليوم
            </h2>
            <p className="mb-6 text-sm font-semibold text-white/75 sm:text-base">
              شارك خبرتك، أنشئ محتوى تعليمياً، وصل لآلاف الطلاب في الأردن والشرق الأوسط
            </p>
            <Link href="/teacher-subscription">
              <span className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-8 text-sm font-black text-indigo-700 shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl sm:text-base">
                <GraduationCap className="h-5 w-5" />
                ابدأ كمعلم الآن
              </span>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
