import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { articlesApi } from "@/lib/api/content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Clock, Eye, Hash, Home } from "lucide-react";
import { useCountry } from "@/hooks/use-country";
import { routes } from "@/lib/country";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-JO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function readingMinutes(html: string): number {
  const text = html.replace(/<[^>]*>/g, "");
  return Math.max(1, Math.round(text.trim().split(/\s+/).length / 200));
}

export function KeywordDetail() {
  const country = useCountry();
  const { keyword } = useParams<{ keyword: string }>();
  const decodedKeyword = decodeURIComponent(keyword ?? "");

  const { data: articles, isLoading } = useQuery({
    queryKey: ["keyword-articles", country, decodedKeyword],
    queryFn: () => articlesApi.byKeyword(decodedKeyword, { per_page: 50, country }),
    enabled: !!decodedKeyword,
  });

  return (
    <div>
      {/* Hero */}
      <header className="border-b bg-gradient-to-b from-primary/8 via-background/60 to-background">
        <div className="container mx-auto max-w-5xl px-4 pb-10 pt-6">

          {/* Breadcrumb */}
          <nav className="mb-6 flex w-fit items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground shadow-sm">
            <Link href="/" className="flex items-center gap-1 transition hover:text-primary">
              <Home className="h-3.5 w-3.5" />
              الرئيسية
            </Link>
            <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/40 rtl:rotate-180" />
            <Link href="/articles" className="transition hover:text-primary">
              المقالات
            </Link>
            <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/40 rtl:rotate-180" />
            <span className="max-w-[180px] truncate text-primary">#{decodedKeyword}</span>
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Hash className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-foreground">{decodedKeyword}</h1>
              {!isLoading && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {articles?.length ?? 0} مقال مرتبط بهذه الكلمة
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl px-4 py-10">
        {isLoading && (
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-card p-5">
                <div className="mb-2 h-5 w-2/3 rounded bg-muted" />
                <div className="h-4 w-full rounded bg-muted" />
                <div className="mt-2 h-4 w-4/5 rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && (!articles || articles.length === 0) && (
          <div className="flex flex-col items-center gap-5 py-24 text-center">
            <Hash className="h-16 w-16 text-muted-foreground/20" />
            <div>
              <p className="text-xl font-bold text-muted-foreground">لا توجد مقالات لهذه الكلمة المفتاحية</p>
              <p className="mt-1 text-sm text-muted-foreground">جرب البحث بكلمة مفتاحية أخرى</p>
            </div>
            <Link href="/articles">
              <Button variant="outline">تصفح جميع المقالات</Button>
            </Link>
          </div>
        )}

        {articles && articles.length > 0 && (
          <div className="space-y-4">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={routes.article(country, article.id)}
                className="group block rounded-2xl border bg-card p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
              >
                {/* Badges */}
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {article.grade_level && (
                    <Badge variant="secondary" className="rounded-full text-xs font-bold">
                      {article.grade_level}
                    </Badge>
                  )}
                  {article.subject?.subject_name && (
                    <Badge className="rounded-full text-xs font-bold">
                      {article.subject.subject_name}
                    </Badge>
                  )}
                  {article.semester?.semester_name && (
                    <Badge variant="outline" className="rounded-full text-xs font-bold">
                      {article.semester.semester_name}
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <h2 className="mb-1 text-base font-bold text-foreground transition group-hover:text-primary">
                  {article.title}
                </h2>

                {/* Description */}
                {article.meta_description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{article.meta_description}</p>
                )}

                {/* Stats */}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {readingMinutes(article.content)} دقيقة قراءة
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {article.visit_count.toLocaleString("ar-EG")} مشاهدة
                  </span>
                  <span>{formatDate(article.published_at ?? article.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
