import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { articlesApi } from "@/lib/api/content";
import { academicApi } from "@/lib/api/academic";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Search, X, GraduationCap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountry } from "@/hooks/use-country";
import { routes } from "@/lib/country";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function Articles() {
  const country = useCountry();
  const [rawQuery, setRawQuery] = useState("");
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  const q = useDebounce(rawQuery.trim(), 350);

  const { data: grades = [] } = useQuery({
    queryKey: ["grades", country],
    queryFn: () => academicApi.listGrades(country),
  });

  const { data: articles, isLoading, isFetching } = useQuery({
    queryKey: ["articles", country, q, selectedGradeLevel],
    queryFn: () => {
      if (selectedGradeLevel !== "all") {
        return articlesApi.byClass(selectedGradeLevel, q ? { q, country } : { country });
      }
      return articlesApi.list(q ? { q, country } : { country });
    },
  });

  const selectedGrade = grades.find(
    (g) => g.grade_level.toString() === selectedGradeLevel,
  );

  const busy = isLoading || isFetching;

  return (
    <div className="container mx-auto max-w-7xl px-4 md:px-8 py-10" dir="rtl">
      {/* ── Header ── */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-4 mb-4">
          <BookOpen className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-4xl font-black mb-2">المقالات والمواد الدراسية</h1>
        <p className="text-muted-foreground text-lg">تصفح آلاف الملفات والمقالات المفيدة</p>
      </div>

      {/* ── Filter bar ── */}
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur border-b pb-4 mb-8 -mx-4 px-4 md:-mx-8 md:px-8">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              placeholder="ابحث عن مادة أو موضوع..."
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              className="pr-10 pl-9 rounded-xl"
            />
            {rawQuery && (
              <button
                onClick={() => { setRawQuery(""); inputRef.current?.focus(); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="مسح البحث"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Grade filter */}
          <Select value={selectedGradeLevel} onValueChange={setSelectedGradeLevel}>
            <SelectTrigger className="w-full sm:w-52 rounded-xl">
              <GraduationCap className="h-4 w-4 ml-2 text-muted-foreground" />
              <SelectValue placeholder="اختر الصف الدراسي" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">جميع الصفوف</SelectItem>
              {grades.map((g) => (
                <SelectItem key={g.id} value={g.grade_level.toString()}>
                  {g.grade_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear filters */}
          {(rawQuery || selectedGradeLevel !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl shrink-0"
              onClick={() => { setRawQuery(""); setSelectedGradeLevel("all"); }}
            >
              <X className="h-4 w-4 ml-1" />
              مسح الفلتر
            </Button>
          )}
        </div>

        {/* Active filter chips */}
        {(q || selectedGrade) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {selectedGrade && (
              <Badge variant="secondary" className="gap-1 rounded-full">
                <GraduationCap className="h-3 w-3" />
                {selectedGrade.grade_name}
                <button onClick={() => setSelectedGradeLevel("all")} className="mr-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {q && (
              <Badge variant="secondary" className="gap-1 rounded-full">
                <Search className="h-3 w-3" />
                "{q}"
                <button onClick={() => setRawQuery("")} className="mr-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {!busy && articles !== undefined && (
              <span className="text-xs text-muted-foreground flex items-center">
                {articles.length} نتيجة
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Results ── */}
      {busy ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : articles?.length === 0 ? (
        <div className="text-center py-24 bg-muted/30 rounded-3xl">
          <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
          <h3 className="text-xl font-bold mb-2">لا توجد نتائج</h3>
          <p className="text-muted-foreground text-sm mb-6">
            {selectedGrade && q
              ? `لا يوجد محتوى لـ "${selectedGrade.grade_name}" يطابق "${q}"`
              : selectedGrade
              ? `لا يوجد محتوى لـ "${selectedGrade.grade_name}" حتى الآن`
              : `لا يوجد نتائج للبحث عن "${q}"`}
          </p>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => { setRawQuery(""); setSelectedGradeLevel("all"); }}
          >
            عرض جميع المقالات
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles?.map((article) => (
            <Link key={article.id} href={routes.article(country, article.id)}>
              <Card className="h-full cursor-pointer border rounded-2xl transition-all hover:border-primary/50 hover:shadow-md group flex flex-col">
                <CardContent className="p-6 flex-1 flex flex-col">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {article.grade_level != null && (
                      <Badge variant="outline" className="text-xs rounded-full">
                        <GraduationCap className="h-3 w-3 ml-1" />
                        {grades.find((g) => g.grade_level.toString() === String(article.grade_level))?.grade_name ?? `الصف ${article.grade_level}`}
                      </Badge>
                    )}
                    {article.subject?.subject_name && (
                      <Badge className="text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20 border-0">
                        {article.subject.subject_name}
                      </Badge>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-card-foreground mb-3 leading-snug group-hover:text-primary transition-colors line-clamp-2 flex-1">
                    {article.title}
                  </h3>

                  {/* Description */}
                  {article.meta_description && (
                    <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                      {article.meta_description}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t mt-auto">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {article.visit_count?.toLocaleString("ar-JO") ?? 0} مشاهدة
                    </span>
                    <span>
                      {new Date(article.created_at).toLocaleDateString("ar-JO")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
