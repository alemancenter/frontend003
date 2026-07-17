import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { adminArticlesApi } from "@/lib/api/admin";
import { academicApi } from "@/lib/api/academic";
import type { Article, SchoolClass } from "@/lib/api/types";
import { routes, VALID_COUNTRIES, type CountryCode } from "@/lib/country";
import { useCountry, useCountrySwitcher } from "@/contexts/CountryContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  BarChart3,
  Calendar,
  Edit,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
} from "lucide-react";

type StatusFilter = "all" | "1" | "0";
type AcademicFilter = "all" | string;

const COUNTRY_LABELS: Record<CountryCode, string> = {
  jo: "الأردن",
  sa: "السعودية",
  eg: "مصر",
  ps: "فلسطين",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ar-JO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function articleViews(article: Article & { views?: number; views_count?: number; view_count?: number }) {
  return article.views ?? article.views_count ?? article.view_count ?? article.visit_count ?? 0;
}

function articleCreatedTime(article: Article) {
  const parsed = Date.parse(article.created_at ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function matchesClass(article: Article, classId: AcademicFilter, classes: SchoolClass[]) {
  if (classId === "all") return true;

  const selectedClass = classes.find((cls) => String(cls.id) === classId);
  const acceptedValues = new Set([classId]);
  if (selectedClass) {
    acceptedValues.add(String(selectedClass.grade_level));
  }

  const articleGrade = article.grade_level == null ? "" : String(article.grade_level);
  const articleSubjectGrade = article.subject?.grade_level == null ? "" : String(article.subject.grade_level);

  return acceptedValues.has(articleGrade) || acceptedValues.has(articleSubjectGrade);
}

function matchesSubject(article: Article, subjectId: AcademicFilter) {
  if (subjectId === "all") return true;
  return String(article.subject_id ?? article.subject?.id ?? "") === subjectId;
}

function matchesSemester(article: Article, semesterId: AcademicFilter) {
  if (semesterId === "all") return true;
  return String(article.semester_id ?? article.semester?.id ?? "") === semesterId;
}

export default function Articles() {
  const country = useCountry();
  const switchCountry = useCountrySwitcher();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState("15");
  const [selectedClassId, setSelectedClassId] = useState<AcademicFilter>("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState<AcademicFilter>("all");
  const [selectedSemesterId, setSelectedSemesterId] = useState<AcademicFilter>("all");

  const normalizedQuery = query.trim();
  const statusParam = status === "all" ? undefined : Number(status);
  const hasAcademicFilters =
    selectedClassId !== "all" || selectedSubjectId !== "all" || selectedSemesterId !== "all";

  const listQuery = useQuery({
    queryKey: [
      "admin",
      "articles",
      "list",
      country,
      normalizedQuery,
      status,
      page,
      perPage,
      selectedClassId,
      selectedSubjectId,
      selectedSemesterId,
    ],
    queryFn: () =>
      adminArticlesApi.listWithMeta({
        country,
        page: hasAcademicFilters ? 1 : page,
        per_page: hasAcademicFilters ? 1000 : Number(perPage),
        status: statusParam,
        q: normalizedQuery || undefined,
      }),
  });

  const classesQuery = useQuery({
    queryKey: ["admin", "articles", "filter-classes", country],
    queryFn: () => adminArticlesApi.createData({ country }) as Promise<{ classes?: SchoolClass[] }>,
  });

  const subjectsQuery = useQuery({
    queryKey: ["admin", "articles", "filter-subjects", country, selectedClassId],
    queryFn: () => academicApi.listSubjects(selectedClassId, country),
    enabled: selectedClassId !== "all",
  });

  const semestersQuery = useQuery({
    queryKey: ["admin", "articles", "filter-semesters", country, selectedSubjectId],
    queryFn: () => academicApi.listSemesters(selectedSubjectId, country),
    enabled: selectedSubjectId !== "all",
  });

  const statsQuery = useQuery({
    queryKey: ["admin", "articles", "stats", country],
    queryFn: () => adminArticlesApi.stats({ country }),
  });

  const articles = listQuery.data?.data ?? [];
  const classes = classesQuery.data?.classes ?? [];
  const subjects = subjectsQuery.data ?? [];
  const semesters = semestersQuery.data?.semesters ?? [];

  const sortedArticles = useMemo(
    () =>
      [...articles].sort((a, b) => {
        const byCreatedAt = articleCreatedTime(b) - articleCreatedTime(a);
        if (byCreatedAt !== 0) return byCreatedAt;
        return b.id - a.id;
      }),
    [articles],
  );
  const filteredArticles = useMemo(
    () =>
      sortedArticles.filter(
        (article) =>
          matchesClass(article, selectedClassId, classes) &&
          matchesSubject(article, selectedSubjectId) &&
          matchesSemester(article, selectedSemesterId),
      ),
    [classes, selectedClassId, selectedSemesterId, selectedSubjectId, sortedArticles],
  );
  const visibleArticles = useMemo(() => {
    if (!hasAcademicFilters) return filteredArticles;
    const start = (page - 1) * Number(perPage);
    return filteredArticles.slice(start, start + Number(perPage));
  }, [filteredArticles, hasAcademicFilters, page, perPage]);

  const pagination = listQuery.data?.meta ?? listQuery.data?.pagination;
  const total = hasAcademicFilters ? filteredArticles.length : pagination?.total ?? filteredArticles.length;
  const lastPage = hasAcademicFilters
    ? Math.max(1, Math.ceil(total / Number(perPage)))
    : pagination?.last_page ?? 1;
  const displayFrom = hasAcademicFilters
    ? total === 0
      ? 0
      : (page - 1) * Number(perPage) + 1
    : pagination?.from ?? (visibleArticles.length ? 1 : 0);
  const displayTo = hasAcademicFilters
    ? Math.min(page * Number(perPage), total)
    : pagination?.to ?? visibleArticles.length;

  const stats = useMemo(() => {
    const raw = statsQuery.data ?? {};
    return {
      total: numberValue(raw.total),
      published: numberValue(raw.published),
      drafts: numberValue(raw.drafts),
      views: numberValue(raw.views),
    };
  }, [statsQuery.data]);

  const invalidateArticles = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "articles"] });
  };

  const publishMutation = useMutation({
    mutationFn: (id: number) => adminArticlesApi.publish(id, { country }),
    onSuccess: () => {
      toast({ title: "تم نشر المقالة" });
      invalidateArticles();
    },
    onError: (error: Error) => {
      toast({ title: "تعذر نشر المقالة", description: error.message, variant: "destructive" });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: number) => adminArticlesApi.unpublish(id, { country }),
    onSuccess: () => {
      toast({ title: "تم إلغاء نشر المقالة" });
      invalidateArticles();
    },
    onError: (error: Error) => {
      toast({ title: "تعذر إلغاء النشر", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminArticlesApi.delete(id, { country }),
    onSuccess: () => {
      toast({ title: "تم حذف المقالة" });
      invalidateArticles();
    },
    onError: (error: Error) => {
      toast({ title: "تعذر حذف المقالة", description: error.message, variant: "destructive" });
    },
  });

  const resetToFirstPage = (fn: () => void) => {
    setPage(1);
    fn();
  };

  const handleClassChange = (value: AcademicFilter) => {
    setPage(1);
    setSelectedClassId(value);
    setSelectedSubjectId("all");
    setSelectedSemesterId("all");
  };

  const handleSubjectChange = (value: AcademicFilter) => {
    setPage(1);
    setSelectedSubjectId(value);
    setSelectedSemesterId("all");
  };

  const handleSemesterChange = (value: AcademicFilter) => {
    setPage(1);
    setSelectedSemesterId(value);
  };

  const resetAcademicFilters = () => {
    setPage(1);
    setSelectedClassId("all");
    setSelectedSubjectId("all");
    setSelectedSemesterId("all");
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">المقالات</h1>
          <p className="mt-1 text-muted-foreground">إدارة المحتوى التعليمي والمقالات والملفات المرتبطة بها</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={country}
            onValueChange={(value) => {
              setPage(1);
              setSelectedClassId("all");
              setSelectedSubjectId("all");
              setSelectedSemesterId("all");
              switchCountry(value as CountryCode);
            }}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="قاعدة البيانات" />
            </SelectTrigger>
            <SelectContent>
              {VALID_COUNTRIES.map((code) => (
                <SelectItem key={code} value={code}>
                  {COUNTRY_LABELS[code]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link href="/admin/articles/new">
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              مقالة جديدة
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المقالات</p>
              <p className="mt-1 text-2xl font-black">{stats.total.toLocaleString("ar-JO")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{COUNTRY_LABELS[country]}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">منشورة</p>
              <p className="mt-1 text-2xl font-black">{stats.published.toLocaleString("ar-JO")}</p>
            </div>
            <Send className="h-8 w-8 text-emerald-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">مسودات</p>
              <p className="mt-1 text-2xl font-black">{stats.drafts.toLocaleString("ar-JO")}</p>
            </div>
            <EyeOff className="h-8 w-8 text-amber-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">المشاهدات</p>
              <p className="mt-1 text-2xl font-black">{stats.views.toLocaleString("ar-JO")}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-violet-600" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>قائمة المقالات</CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-72">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث في المقالات..."
                  className="pr-9"
                  value={query}
                  onChange={(event) => resetToFirstPage(() => setQuery(event.target.value))}
                />
              </div>
              <Select value={selectedClassId} onValueChange={(value) => handleClassChange(value as AcademicFilter)}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="الصف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الصفوف</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={String(cls.id)}>
                      {cls.grade_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedSubjectId}
                onValueChange={(value) => handleSubjectChange(value as AcademicFilter)}
                disabled={selectedClassId === "all" || subjectsQuery.isLoading}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder={selectedClassId === "all" ? "اختر الصف أولاً" : "المادة"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المواد</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={String(subject.id)}>
                      {subject.subject_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedSemesterId}
                onValueChange={(value) => handleSemesterChange(value as AcademicFilter)}
                disabled={selectedSubjectId === "all" || semestersQuery.isLoading}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder={selectedSubjectId === "all" ? "اختر المادة أولاً" : "الفصل"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الفصول</SelectItem>
                  {semesters.map((semester) => (
                    <SelectItem key={semester.id} value={String(semester.id)}>
                      {semester.semester_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={(value) => resetToFirstPage(() => setStatus(value as StatusFilter))}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="1">منشور</SelectItem>
                  <SelectItem value="0">مسودة</SelectItem>
                </SelectContent>
              </Select>
              <Select value={perPage} onValueChange={(value) => resetToFirstPage(() => setPerPage(value))}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="العدد" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              {hasAcademicFilters && (
                <Button variant="outline" onClick={resetAcademicFilters}>
                  مسح الفلاتر
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={() => listQuery.refetch()} disabled={listQuery.isFetching}>
                <RefreshCw className={`h-4 w-4 ${listQuery.isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[72px]">المعرف</TableHead>
                  <TableHead>العنوان</TableHead>
                  <TableHead>التصنيف التعليمي</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الملفات</TableHead>
                  <TableHead>المشاهدات</TableHead>
                  <TableHead>تاريخ النشر</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : listQuery.isError ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-destructive">
                      تعذر تحميل المقالات.
                    </TableCell>
                  </TableRow>
                ) : visibleArticles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      لم يتم العثور على مقالات.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleArticles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell className="font-medium">{article.id}</TableCell>
                      <TableCell className="min-w-[260px]">
                        <div className="max-w-md">
                          <p className="line-clamp-2 font-bold">{article.title}</p>
                          {article.meta_description && (
                            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{article.meta_description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <p>{article.subject?.subject_name ?? article.grade_level ?? "-"}</p>
                          {article.semester?.semester_name && (
                            <p className="text-xs text-muted-foreground">{article.semester.semester_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={article.status === 1 ? "default" : "secondary"}>
                          {article.status === 1 ? "منشور" : "مسودة"}
                        </Badge>
                      </TableCell>
                      <TableCell>{(article.files?.length ?? 0).toLocaleString("ar-JO")}</TableCell>
                      <TableCell>{articleViews(article).toLocaleString("ar-JO")}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(article.published_at ?? article.created_at)}
                        </span>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" title="عرض المقالة" asChild>
                            <a href={routes.article(country, article.id)} target="_blank" rel="noreferrer">
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                          <Link href={`/admin/articles/${article.id}/edit`}>
                            <Button variant="ghost" size="icon" title="تعديل">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          {article.status === 1 ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="إلغاء النشر"
                              disabled={unpublishMutation.isPending}
                              onClick={() => unpublishMutation.mutate(article.id)}
                            >
                              <EyeOff className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="نشر"
                              disabled={publishMutation.isPending}
                              onClick={() => publishMutation.mutate(article.id)}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive" title="حذف">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent dir="rtl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>حذف المقالة؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                  سيتم حذف "{article.title}" من لوحة الإدارة. لا يمكن التراجع عن هذه العملية.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => deleteMutation.mutate(article.id)}
                                >
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <div>
              عرض {displayFrom} إلى {displayTo} من{" "}
              {total.toLocaleString("ar-JO")} نتيجة
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1 || listQuery.isFetching} onClick={() => setPage((p) => p - 1)}>
                السابق
              </Button>
              <span className="min-w-24 text-center">
                صفحة {page.toLocaleString("ar-JO")} من {lastPage.toLocaleString("ar-JO")}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= lastPage || listQuery.isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                التالي
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
