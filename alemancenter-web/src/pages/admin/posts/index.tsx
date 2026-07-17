import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { adminCategoriesApi, adminPostsApi } from "@/lib/api/admin";
import type { Category, Post } from "@/lib/api/types";
import { COUNTRY_META, routes, VALID_COUNTRIES, type CountryCode } from "@/lib/country";
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
  FileText,
  FolderOpen,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";

type StatusFilter = "all" | "1" | "0";
type SelectFilter = "all" | string;
type AdminPost = Post & {
  slug?: string;
  meta_description?: string;
  category?: Category;
  author?: { id?: number; name?: string };
  is_active?: boolean;
  is_featured?: boolean;
  views?: number;
  views_count?: number;
  visit_count?: number;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ar-JO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function postViews(post: AdminPost) {
  return post.views ?? post.views_count ?? post.view_count ?? post.visit_count ?? 0;
}

function isPostActive(post: AdminPost) {
  if (typeof post.is_active === "boolean") return post.is_active;
  return post.status === undefined ? true : Number(post.status) === 1;
}

function createdTime(post: Post) {
  const parsed = Date.parse(post.created_at ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export default function Posts() {
  const country = useCountry();
  const switchCountry = useCountrySwitcher();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [categoryId, setCategoryId] = useState<SelectFilter>("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState("15");

  const normalizedQuery = query.trim();
  const statusParam = status === "all" ? undefined : status;
  const categoryParam = categoryId === "all" ? undefined : categoryId;

  const listQuery = useQuery({
    queryKey: ["admin", "posts", "list", country, normalizedQuery, status, categoryId, page, perPage],
    queryFn: () =>
      adminPostsApi.listWithMeta({
        country,
        page,
        per_page: Number(perPage),
        search: normalizedQuery || undefined,
        is_active: statusParam,
        category_id: categoryParam,
      }),
  });

  const categoriesQuery = useQuery({
    queryKey: ["admin", "posts", "categories", country],
    queryFn: () => adminCategoriesApi.list({ country }),
  });

  const posts = (listQuery.data?.data ?? []) as AdminPost[];
  const categories = categoriesQuery.data ?? [];
  const pagination = listQuery.data?.meta ?? listQuery.data?.pagination;

  const visiblePosts = useMemo(
    () =>
      [...posts].sort((a, b) => {
        const byCreatedAt = createdTime(b) - createdTime(a);
        if (byCreatedAt !== 0) return byCreatedAt;
        return b.id - a.id;
      }),
    [posts],
  );

  const stats = useMemo(() => {
    const total = pagination?.total ?? visiblePosts.length;
    const published = visiblePosts.filter(isPostActive).length;
    const drafts = visiblePosts.length - published;
    const views = visiblePosts.reduce((sum, post) => sum + postViews(post), 0);

    return {
      total: numberValue(total),
      published,
      drafts,
      views,
    };
  }, [pagination?.total, visiblePosts]);

  const total = pagination?.total ?? visiblePosts.length;
  const lastPage = pagination?.last_page ?? 1;
  const displayFrom = pagination?.from ?? (visiblePosts.length ? (page - 1) * Number(perPage) + 1 : 0);
  const displayTo = pagination?.to ?? Math.min(page * Number(perPage), total);

  const invalidatePosts = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "posts"] });
  };

  const toggleStatusMutation = useMutation({
    mutationFn: (id: number) => adminPostsApi.toggleStatus(id, { country }),
    onSuccess: () => {
      toast({ title: "تم تحديث حالة المنشور" });
      invalidatePosts();
    },
    onError: (error: Error) => {
      toast({ title: "تعذر تحديث حالة المنشور", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminPostsApi.delete(id, { country }),
    onSuccess: () => {
      toast({ title: "تم حذف المنشور" });
      invalidatePosts();
      if (visiblePosts.length === 1 && page > 1) {
        setPage((current) => current - 1);
      }
    },
    onError: (error: Error) => {
      toast({ title: "تعذر حذف المنشور", description: error.message, variant: "destructive" });
    },
  });

  const resetToFirstPage = (fn: () => void) => {
    setPage(1);
    fn();
  };

  const resetFilters = () => {
    setPage(1);
    setQuery("");
    setStatus("all");
    setCategoryId("all");
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">المنشورات</h1>
          <p className="mt-1 text-muted-foreground">إدارة منشورات الموقع والأخبار والتصنيفات المرتبطة بها</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={country}
            onValueChange={(value) => {
              setPage(1);
              setCategoryId("all");
              switchCountry(value as CountryCode);
            }}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="قاعدة البيانات" />
            </SelectTrigger>
            <SelectContent>
              {VALID_COUNTRIES.map((code) => (
                <SelectItem key={code} value={code}>
                  {COUNTRY_META[code].name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link href="/admin/posts/new">
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              منشور جديد
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المنشورات</p>
              <p className="mt-1 text-2xl font-black">{stats.total.toLocaleString("ar-JO")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{COUNTRY_META[country].name}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">نشطة</p>
              <p className="mt-1 text-2xl font-black">{stats.published.toLocaleString("ar-JO")}</p>
            </div>
            <ToggleRight className="h-8 w-8 text-emerald-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">معطلة</p>
              <p className="mt-1 text-2xl font-black">{stats.drafts.toLocaleString("ar-JO")}</p>
            </div>
            <ToggleLeft className="h-8 w-8 text-amber-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">مشاهدات الصفحة</p>
              <p className="mt-1 text-2xl font-black">{stats.views.toLocaleString("ar-JO")}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-violet-600" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>قائمة المنشورات</CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-72">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث في المنشورات..."
                  className="pr-9"
                  value={query}
                  onChange={(event) => resetToFirstPage(() => setQuery(event.target.value))}
                />
              </div>
              <Select value={categoryId} onValueChange={(value) => resetToFirstPage(() => setCategoryId(value))}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل التصنيفات</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
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
                  <SelectItem value="1">نشط</SelectItem>
                  <SelectItem value="0">معطل</SelectItem>
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
              {(query || status !== "all" || categoryId !== "all") && (
                <Button variant="outline" onClick={resetFilters}>
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
                  <TableHead>التصنيف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>المشاهدات</TableHead>
                  <TableHead>تاريخ الإنشاء</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : listQuery.isError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-destructive">
                      تعذر تحميل المنشورات.
                    </TableCell>
                  </TableRow>
                ) : visiblePosts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      لم يتم العثور على منشورات.
                    </TableCell>
                  </TableRow>
                ) : (
                  visiblePosts.map((post) => {
                    const active = isPostActive(post);

                    return (
                      <TableRow key={post.id}>
                        <TableCell className="font-medium">{post.id}</TableCell>
                        <TableCell className="min-w-[260px]">
                          <div className="max-w-md">
                            <div className="flex items-center gap-2">
                              <p className="line-clamp-2 font-bold">{post.title}</p>
                              {post.is_featured && <Badge variant="secondary">مميز</Badge>}
                            </div>
                            {(post.meta_description || post.slug) && (
                              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                                {post.meta_description ?? post.slug}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm">
                            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                            {post.category?.name ?? categories.find((category) => category.id === post.category_id)?.name ?? "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={active ? "default" : "secondary"}>{active ? "نشط" : "معطل"}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-sm">
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                            {postViews(post).toLocaleString("ar-JO")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(post.created_at)}
                          </span>
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" title="عرض المنشور" asChild>
                              <a href={routes.post(country, post.id)} target="_blank" rel="noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            <Link href={`/admin/posts/${post.id}/edit`}>
                              <Button variant="ghost" size="icon" title="تعديل">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={active ? "تعطيل" : "تفعيل"}
                              disabled={toggleStatusMutation.isPending}
                              onClick={() => toggleStatusMutation.mutate(post.id)}
                            >
                              {active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive" title="حذف">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent dir="rtl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>حذف المنشور؟</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    سيتم حذف "{post.title}" من لوحة الإدارة. لا يمكن التراجع عن هذه العملية.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => deleteMutation.mutate(post.id)}
                                  >
                                    حذف
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <div>
              عرض {displayFrom} إلى {displayTo} من {total.toLocaleString("ar-JO")} نتيجة
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
