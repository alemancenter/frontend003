import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { academicApi } from "@/lib/api/academic";
import { AdUnit } from "@/components/ads/AdUnit";
import { BookOpen, ChevronLeft, House, Search } from "lucide-react";
import { useCountry } from "@/hooks/use-country";
import { routes } from "@/lib/country";

// Same 7-color cycle as the previous frontend, keyed to fully literal Tailwind
// classes (dynamic template strings would be stripped by the JIT scanner).
const CARD_COLORS = [
  { hoverBorder: "hover:border-blue-300", badgeBg: "bg-blue-500/10", badgeText: "text-blue-500" },
  { hoverBorder: "hover:border-purple-300", badgeBg: "bg-purple-500/10", badgeText: "text-purple-500" },
  { hoverBorder: "hover:border-green-300", badgeBg: "bg-green-500/10", badgeText: "text-green-500" },
  { hoverBorder: "hover:border-orange-300", badgeBg: "bg-orange-500/10", badgeText: "text-orange-500" },
  { hoverBorder: "hover:border-red-300", badgeBg: "bg-red-500/10", badgeText: "text-red-500" },
  { hoverBorder: "hover:border-indigo-300", badgeBg: "bg-indigo-500/10", badgeText: "text-indigo-500" },
  { hoverBorder: "hover:border-teal-300", badgeBg: "bg-teal-500/10", badgeText: "text-teal-500" },
] as const;

export function GradeDetail() {
  const country = useCountry();
  const { classId: id } = useParams<{ classId: string }>();

  const { data: grade, isLoading } = useQuery({
    queryKey: ["grade", country, id],
    queryFn: () => academicApi.getGrade(id!, country),
    enabled: !!id,
  });

  const gradeName = grade?.grade_name ?? (isLoading ? "جاري التحميل..." : "الصف غير موجود");

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground">
      {/* Hero */}
      <section className="border-b border-border bg-card pt-28" dir="rtl">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 text-sm font-black text-primary">
                <BookOpen className="h-4 w-4" />
                المحتوى التعليمي
              </div>
              <h1 className="text-2xl font-black leading-9 text-foreground md:text-3xl">{gradeName}</h1>
              <p className="mt-1 max-w-2xl text-sm font-medium leading-7 text-muted-foreground">
                اختر المادة الدراسية المناسبة للوصول إلى الفصول والملفات التعليمية المرتبطة بهذا الصف.
              </p>
            </div>
            <a
              href="/search"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-5 text-sm font-black text-primary transition hover:bg-primary/15"
            >
              <Search className="h-4 w-4" />
              بحث سريع
            </a>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 mt-8">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="rounded-2xl border border-border bg-card/95 p-6 shadow-lg shadow-black/5 backdrop-blur-sm dark:shadow-none">
          <ol className="flex items-center flex-wrap gap-2 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="flex items-center hover:text-blue-600 transition-colors">
                <House className="w-4 h-4 ml-1" />
                <span>الرئيسية</span>
              </Link>
            </li>
            <li>
              <ChevronLeft className="w-4 h-4 text-muted-foreground/50 rtl:rotate-180" />
            </li>
            <li>
              <Link href={routes.lessonList(country)} className="hover:text-blue-600 transition-colors">
                الصفوف الدراسية
              </Link>
            </li>
            <li>
              <ChevronLeft className="w-4 h-4 text-muted-foreground/50 rtl:rotate-180" />
            </li>
            <li className="font-medium text-foreground" aria-current="page">
              {gradeName}
            </li>
          </ol>
        </nav>
      </div>

      <div className="container mx-auto px-4 mt-8">
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-8 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white">
            <BookOpen className="w-4 h-4" />
          </div>
          المواد الدراسية المتاحة
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-6 bg-card/95 backdrop-blur-sm rounded-2xl border border-border shadow-lg shadow-black/5 dark:shadow-none animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-muted shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-6 bg-muted rounded-lg w-3/4" />
                    <div className="h-4 bg-muted rounded-lg w-full" />
                    <div className="h-3 bg-muted rounded-lg w-1/2 mt-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !grade?.subjects || grade.subjects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground">لا يوجد مباحث متاحة حالياً لهذا الصف.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {grade.subjects.map((subject, i) => {
              const color = CARD_COLORS[i % CARD_COLORS.length];
              return (
                <Link
                  key={subject.id}
                  href={routes.subject(country, subject.id)}
                  className={`group block p-6 bg-card/95 backdrop-blur-sm rounded-2xl border border-border ${color.hoverBorder} shadow-lg shadow-black/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 dark:shadow-none dark:hover:border-primary/40`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl ${color.badgeBg} ${color.badgeText} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-md`}
                    >
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-card-foreground mb-2 group-hover:text-primary transition-colors">
                        {subject.subject_name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        تصفح محتوى المادة الدراسية، أوراق العمل، والاختبارات.
                      </p>
                      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{subject.files_count ?? 0} ملف</span>
                        <span>•</span>
                        <span>{subject.articles_count ?? 0} مقال</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <AdUnit page="classes" position={1} className="mt-8 rounded-2xl overflow-hidden" />
      </div>
    </div>
  );
}
