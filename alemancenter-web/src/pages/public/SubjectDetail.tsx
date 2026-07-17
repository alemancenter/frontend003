import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { academicApi } from "@/lib/api/academic";
import { articlesApi } from "@/lib/api/content";
import type { Article } from "@/lib/api/types";
import { AdUnit } from "@/components/ads/AdUnit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  BookMarked,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  Eye,
  FileCheck,
  FileText,
  House,
  Layers,
  NotebookTabs,
  Search,
} from "lucide-react";
import { useCountry } from "@/hooks/use-country";
import { routes } from "@/lib/country";

type CategoryKey = "plans" | "papers" | "tests" | "books" | "records";
type PublicArticleFile = NonNullable<Article["files"]>[number] & {
  file_name?: string;
  file_category?: string | null;
  mime_type?: string;
  download_count?: number;
};

const CATEGORIES: Array<{
  key: CategoryKey;
  label: string;
  description: string;
  icon: typeof NotebookTabs;
  aliases: string[];
  classes: string;
}> = [
  {
    key: "plans",
    label: "خطط الدراسة",
    description: "خطط وتحضير ومتابعة",
    icon: NotebookTabs,
    aliases: ["study_plan", "study-plan", "plan", "plans"],
    classes: "bg-blue-50 text-blue-700 border-blue-100 hover:border-blue-300 hover:bg-blue-100/70 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60 dark:hover:bg-blue-900/50 dark:hover:border-blue-700",
  },
  {
    key: "papers",
    label: "أوراق عمل",
    description: "أنشطة وتدريبات",
    icon: FileText,
    aliases: ["worksheet", "worksheets", "papers"],
    classes: "bg-emerald-50 text-emerald-700 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-100/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60 dark:hover:bg-emerald-900/50 dark:hover:border-emerald-700",
  },
  {
    key: "tests",
    label: "اختبارات",
    description: "نماذج وأسئلة تقييم",
    icon: FileCheck,
    aliases: ["exam", "exams", "test", "tests"],
    classes: "bg-rose-50 text-rose-700 border-rose-100 hover:border-rose-300 hover:bg-rose-100/70 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60 dark:hover:bg-rose-900/50 dark:hover:border-rose-700",
  },
  {
    key: "books",
    label: "المقررات الدراسية",
    description: "كتب وملخصات",
    icon: BookMarked,
    aliases: ["book", "books"],
    classes: "bg-amber-50 text-amber-700 border-amber-100 hover:border-amber-300 hover:bg-amber-100/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60 dark:hover:bg-amber-900/50 dark:hover:border-amber-700",
  },
  {
    key: "records",
    label: "السجلات",
    description: "سجلات ونماذج متابعة",
    icon: ClipboardList,
    aliases: ["record", "records"],
    classes: "bg-cyan-50 text-cyan-700 border-cyan-100 hover:border-cyan-300 hover:bg-cyan-100/70 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/60 dark:hover:bg-cyan-900/50 dark:hover:border-cyan-700",
  },
];

function formatDate(value?: string | null) {
  if (!value) return "غير محدد";
  return new Date(value).toLocaleDateString("ar-JO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function fileName(file: PublicArticleFile) {
  return file.file_name ?? `ملف ${file.id}`;
}

function filesForCategory(files: Article["files"] | undefined, category: (typeof CATEGORIES)[number]) {
  if (!files?.length) return [];

  return (files as PublicArticleFile[]).filter((file) => {
    const value = file.file_category?.trim();
    return !value || category.aliases.includes(value);
  });
}

function SubjectSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      <div className="h-64 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

export function SubjectDetail() {
  const country = useCountry();
  const { subjectId, semesterId, categoryId } = useParams<{
    subjectId: string;
    semesterId?: string;
    categoryId?: string;
  }>();

  const selectedCategory = CATEGORIES.find((cat) => cat.key === categoryId);
  const isCategoryView = Boolean(semesterId && categoryId);

  const {
    data: semestersData,
    isLoading: isLoadingSemesters,
    isError: isSemestersError,
  } = useQuery({
    queryKey: ["semesters", country, subjectId],
    queryFn: () => academicApi.listSemesters(subjectId!, country),
    enabled: !!subjectId,
  });

  const subject = semestersData?.subject;
  const semesters = semestersData?.semesters ?? [];
  const gradeId = semestersData?.class_id ?? subject?.grade_level;
  const selectedSemester = semesters.find((semester) => String(semester.id) === String(semesterId));

  const { data: grade } = useQuery({
    queryKey: ["grade", country, gradeId],
    queryFn: () => academicApi.getGrade(gradeId!, country),
    enabled: !!gradeId,
  });

  const {
    data: articles = [],
    isLoading: isLoadingArticles,
    isError: isArticlesError,
  } = useQuery({
    queryKey: ["subject-category-articles", country, subjectId, semesterId, categoryId],
    queryFn: () =>
      articlesApi.list({
        country,
        subject_id: Number(subjectId),
        semester_id: Number(semesterId),
        file_category: selectedCategory!.key,
        per_page: 500,
      }),
    enabled: Boolean(subjectId && semesterId && selectedCategory),
  });

  const subjectName = subject?.subject_name ?? (isLoadingSemesters ? "جاري التحميل..." : "المادة غير موجودة");
  const pageTitle = isCategoryView && selectedCategory ? selectedCategory.label : subjectName;
  const pageDescription =
    isCategoryView && selectedCategory
      ? `ملفات ${selectedCategory.label} لمادة ${subjectName}${selectedSemester ? ` - ${selectedSemester.semester_name}` : ""}.`
      : "اختر الفصل الدراسي والتصنيف المطلوب للوصول إلى الخطط، أوراق العمل، الاختبارات، والملفات التعليمية.";

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground" dir="rtl">
      <section className="border-b border-border bg-card pt-28">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 text-sm font-black text-primary">
                <Layers className="h-4 w-4" />
                {isCategoryView ? "ملفات المادة" : "الفصول والتصنيفات"}
              </div>
              <h1 className="text-2xl font-black leading-9 text-foreground md:text-3xl">{pageTitle}</h1>
              <p className="mt-1 max-w-2xl text-sm font-medium leading-7 text-muted-foreground">{pageDescription}</p>
            </div>
            <a
              href="/search"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-5 text-sm font-black text-primary transition hover:bg-primary/15"
            >
              <Search className="h-4 w-4" />
              ابحث في الملفات
            </a>
          </div>
        </div>
      </section>

      <div className="container mx-auto mt-8 px-4">
        <nav aria-label="breadcrumb" className="rounded-lg border border-border bg-card p-4 shadow-sm shadow-black/5 dark:shadow-none">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="flex items-center transition-colors hover:text-blue-600">
                <House className="ml-1 h-4 w-4" />
                <span>الرئيسية</span>
              </Link>
            </li>
            <li>
              <ChevronLeft className="h-4 w-4 text-muted-foreground/50 rtl:rotate-180" />
            </li>
            <li>
              <Link href={routes.lessonList(country)} className="transition-colors hover:text-blue-600">
                الصفوف الدراسية
              </Link>
            </li>
            {gradeId && (
              <>
                <li>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground/50 rtl:rotate-180" />
                </li>
                <li>
                  <Link href={routes.lessonDetail(country, gradeId)} className="transition-colors hover:text-blue-600">
                    {grade?.grade_name ?? "..."}
                  </Link>
                </li>
              </>
            )}
            <li>
              <ChevronLeft className="h-4 w-4 text-muted-foreground/50 rtl:rotate-180" />
            </li>
            <li>
              {isCategoryView ? (
                <Link href={routes.subject(country, subjectId!)} className="transition-colors hover:text-blue-600">
                  {subjectName}
                </Link>
              ) : (
                <span className="flex items-center font-medium text-foreground" aria-current="page">
                  <BookOpen className="ml-1 h-4 w-4 text-primary" />
                  {subjectName}
                </span>
              )}
            </li>
            {isCategoryView && (
              <>
                <li>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground/50 rtl:rotate-180" />
                </li>
                <li className="font-medium text-foreground" aria-current="page">
                  {selectedCategory?.label ?? "تصنيف غير معروف"}
                </li>
              </>
            )}
          </ol>
        </nav>
      </div>

      <main className="container mx-auto mt-8 px-4">
        {isSemestersError ? (
          <div className="rounded-2xl border border-destructive/30 bg-card p-10 text-center text-destructive shadow-sm shadow-black/5 dark:shadow-none">
            تعذر تحميل بيانات المادة. تأكد من الرابط أو حاول مرة أخرى لاحقاً.
          </div>
        ) : isLoadingSemesters ? (
          <SubjectSkeleton />
        ) : !subject ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-sm shadow-black/5 dark:shadow-none">
            <AlertCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-bold text-muted-foreground">المادة غير موجودة</p>
          </div>
        ) : isCategoryView ? (
          <section className="space-y-6">
            {!selectedCategory ? (
              <div className="rounded-2xl border border-amber-200 bg-card p-10 text-center text-amber-700 shadow-sm shadow-black/5 dark:border-amber-900/60 dark:text-amber-300 dark:shadow-none">
                التصنيف المطلوب غير معروف.
              </div>
            ) : !selectedSemester ? (
              <div className="rounded-2xl border border-amber-200 bg-card p-10 text-center text-amber-700 shadow-sm shadow-black/5 dark:border-amber-900/60 dark:text-amber-300 dark:shadow-none">
                الفصل الدراسي المطلوب غير موجود لهذه المادة.
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-black/5 dark:shadow-none md:p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <Badge variant="secondary" className="rounded-full">
                        {selectedSemester.semester_name}
                      </Badge>
                      <h2 className="mt-3 text-xl font-black text-foreground md:text-2xl">
                        {selectedCategory.label}
                      </h2>
                      <p className="mt-1 text-sm leading-7 text-muted-foreground">{selectedCategory.description}</p>
                    </div>
                    <Link href={routes.subject(country, subjectId!)}>
                      <Button variant="outline" className="rounded-xl">
                        العودة للتصنيفات
                      </Button>
                    </Link>
                  </div>
                </div>

                {isArticlesError ? (
                  <div className="rounded-2xl border border-destructive/30 bg-card p-10 text-center text-destructive shadow-sm shadow-black/5 dark:shadow-none">
                    تعذر تحميل الملفات لهذا التصنيف.
                  </div>
                ) : isLoadingArticles ? (
                  <SubjectSkeleton />
                ) : articles.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm shadow-black/5 dark:shadow-none">
                    <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                    <p className="text-lg font-bold text-muted-foreground">لا توجد ملفات متاحة حالياً لهذا التصنيف.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {articles.map((article) => {
                      const matchingFiles = filesForCategory(article.files, selectedCategory);
                      return (
                        <article
                          key={article.id}
                          className="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-black/5 transition hover:border-primary/40 hover:shadow-md dark:shadow-none"
                        >
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/15">
                              {subjectName}
                            </Badge>
                            {article.semester?.semester_name && (
                              <Badge variant="outline" className="rounded-full">
                                {article.semester.semester_name}
                              </Badge>
                            )}
                          </div>

                          <Link href={routes.article(country, article.id)} className="group block">
                            <h3 className="line-clamp-2 text-lg font-black leading-8 text-foreground transition group-hover:text-primary">
                              {article.title}
                            </h3>
                          </Link>

                          {article.meta_description && (
                            <p className="mt-2 line-clamp-2 text-sm leading-7 text-muted-foreground">
                              {article.meta_description}
                            </p>
                          )}

                          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {formatDate(article.published_at ?? article.created_at)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Eye className="h-3.5 w-3.5" />
                              {(article.visit_count ?? 0).toLocaleString("ar-JO")} مشاهدة
                            </span>
                          </div>

                          {matchingFiles.length > 0 && (
                            <div className="mt-4 space-y-2">
                              {matchingFiles.map((file) => (
                                <Link
                                  key={file.id}
                                  href={routes.article(country, article.id)}
                                  className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3 text-sm transition hover:border-primary/30 hover:bg-primary/10"
                                >
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card text-primary">
                                    <FileText className="h-4 w-4" />
                                  </span>
                                  <span className="min-w-0 flex-1 truncate font-bold text-foreground">
                                    {fileName(file)}
                                  </span>
                                  <span className="shrink-0 text-xs font-black text-primary">عرض المقالة</span>
                                </Link>
                              ))}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        ) : semesters.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-xl text-muted-foreground">لا توجد فصول دراسية متاحة حالياً لهذه المادة.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {semesters.map((semester) => (
              <section
                key={semester.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm shadow-black/5 transition hover:border-primary/30 hover:shadow-xl hover:shadow-blue-900/5 dark:shadow-none"
              >
                <div className="border-b border-border bg-gradient-to-l from-primary/10 via-card to-muted/40 p-5 md:p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                        <BookMarked className="h-4 w-4" />
                        {subjectName}
                      </div>
                      <h2 className="mt-3 text-xl font-black text-foreground md:text-2xl">{semester.semester_name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">اختر نوع المحتوى الذي تريد تصفحه لهذا الفصل.</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold text-muted-foreground shadow-sm shadow-black/5 dark:shadow-none">
                      {CATEGORIES.length} تصنيفات متاحة
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 md:p-6 lg:grid-cols-5">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <Link
                        key={cat.key}
                        href={routes.subjectCategory(country, subjectId!, semester.id, cat.key)}
                        className={`group rounded-2xl border p-4 text-center transition-all ${cat.classes}`}
                      >
                        <Icon className="mx-auto mb-3 h-7 w-7 transition group-hover:scale-110" />
                        <div className="text-sm font-black">{cat.label}</div>
                        <div className="mt-1 text-xs opacity-75">عرض الملفات</div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        <AdUnit page="subject" position={1} className="mt-8 overflow-hidden rounded-2xl" />
      </main>
    </div>
  );
}
