import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminCommentsApi } from "@/lib/api/admin";
import { COMMENTABLE_TYPES, type CommentableKind } from "@/lib/api/content";
import type { Comment, CommentStatus } from "@/lib/api/types";
import { routes } from "@/lib/country";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { COUNTRY_META, VALID_COUNTRIES, type CountryCode } from "@/lib/country";
import { useCountry, useCountrySwitcher } from "@/contexts/CountryContext";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  MessageSquare,
  Search,
  Trash2,
  X,
} from "lucide-react";

const PER_PAGE = 20;
const ALL_STATUSES = "all";

const STATUS_META: Record<CommentStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  approved: { label: "مقبول", variant: "default" },
  pending: { label: "قيد المراجعة", variant: "secondary" },
  rejected: { label: "مرفوض", variant: "destructive" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function Comments() {
  const country = useCountry();
  const switchCountry = useCountrySwitcher();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [kind, setKind] = useState<CommentableKind>("articles");
  const [status, setStatus] = useState<string>(ALL_STATUSES);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  // Any filter change resets paging and the selection (which is page-scoped).
  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [kind, status, debouncedSearch, country]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "comments", country, kind, status, debouncedSearch, page],
    queryFn: () =>
      adminCommentsApi.listWithMeta(country, {
        commentable_type: COMMENTABLE_TYPES[kind],
        status: status === ALL_STATUSES ? undefined : status,
        q: debouncedSearch || undefined,
        page,
        per_page: PER_PAGE,
      }),
  });

  const comments = data?.data ?? [];
  const meta = data?.meta ?? data?.pagination;
  const total = meta?.total ?? comments.length;
  const lastPage = meta?.last_page ?? 1;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "comments"] });
    // Public pages read the same comments — keep them in sync.
    queryClient.invalidateQueries({ queryKey: ["article-comments"] });
    queryClient.invalidateQueries({ queryKey: ["post-comments"] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: number) => adminCommentsApi.approve(country, id),
    onSuccess: () => {
      toast({ title: "تمت الموافقة على التعليق" });
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: "فشل قبول التعليق", description: error.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => adminCommentsApi.reject(country, id),
    onSuccess: () => {
      toast({ title: "تم رفض التعليق" });
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: "فشل رفض التعليق", description: error.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminCommentsApi.delete(country, id),
    onSuccess: () => {
      toast({ title: "تم حذف التعليق" });
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: "فشل حذف التعليق", description: error.message, variant: "destructive" }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => adminCommentsApi.bulkDelete(country, ids),
    onSuccess: (_data, ids) => {
      toast({ title: `تم حذف ${ids.length} تعليق` });
      setSelected([]);
      setIsBulkDeleteOpen(false);
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: "فشل الحذف الجماعي", description: error.message, variant: "destructive" }),
  });

  const allSelected = comments.length > 0 && selected.length === comments.length;

  const toggleAll = () => setSelected(allSelected ? [] : comments.map((comment) => comment.id));

  const toggleOne = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));

  const pendingCount = useMemo(
    () => comments.filter((comment) => comment.status === "pending").length,
    [comments],
  );

  const targetHref = (comment: Comment) =>
    comment.commentable_id
      ? kind === "articles"
        ? routes.article(country as CountryCode, comment.commentable_id)
        : routes.post(country as CountryCode, comment.commentable_id)
      : null;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">التعليقات والمراجعة</h1>
          <p className="mt-1 text-muted-foreground">
            راجع التعليقات ووافق عليها قبل ظهورها للزوار
            {pendingCount > 0 && (
              <span className="ms-2 font-bold text-amber-600">({pendingCount} بانتظار المراجعة في هذه الصفحة)</span>
            )}
          </p>
        </div>
        <Select value={country} onValueChange={(value) => switchCountry(value as CountryCode)}>
          <SelectTrigger className="w-[180px]">
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
      </div>

      <Tabs value={kind} onValueChange={(value) => setKind(value as CommentableKind)}>
        <TabsList>
          <TabsTrigger value="articles">تعليقات المقالات</TabsTrigger>
          <TabsTrigger value="posts">تعليقات المنشورات</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>
                {kind === "articles" ? "تعليقات المقالات" : "تعليقات المنشورات"}
                <span className="ms-2 text-sm font-normal text-muted-foreground">({total} تعليق)</span>
              </CardTitle>
              <CardDescription>الموافقة تجعل التعليق ظاهرًا للعامة، والرفض يخفيه دون حذفه.</CardDescription>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-56">
                <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث في نص التعليق..."
                  className="pr-8"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATUSES}>كل الحالات</SelectItem>
                  <SelectItem value="pending">قيد المراجعة</SelectItem>
                  <SelectItem value="approved">مقبول</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selected.length > 0 && (
            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
              <span className="text-sm font-medium">{selected.length} تعليق محدد</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsBulkDeleteOpen(true)}
                disabled={bulkDeleteMutation.isPending}
              >
                <Trash2 className="ml-2 h-4 w-4" />
                حذف المحدد
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44px]">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="تحديد الكل"
                      disabled={comments.length === 0}
                    />
                  </TableHead>
                  <TableHead className="w-[60px]">المعرف</TableHead>
                  <TableHead className="w-[150px]">المستخدم</TableHead>
                  <TableHead>التعليق</TableHead>
                  <TableHead className="w-[110px]">المحتوى</TableHead>
                  <TableHead className="w-[110px]">التاريخ</TableHead>
                  <TableHead className="w-[110px]">الحالة</TableHead>
                  <TableHead className="w-[130px] text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : comments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground/50" />
                        <span>
                          {debouncedSearch || status !== ALL_STATUSES
                            ? "لا توجد تعليقات مطابقة للفلاتر"
                            : "لا توجد تعليقات"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  comments.map((comment) => {
                    const statusMeta = STATUS_META[comment.status ?? "pending"];
                    const href = targetHref(comment);
                    return (
                      <TableRow key={comment.id} data-state={selected.includes(comment.id) ? "selected" : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={selected.includes(comment.id)}
                            onCheckedChange={() => toggleOne(comment.id)}
                            aria-label={`تحديد التعليق ${comment.id}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{comment.id}</TableCell>
                        <TableCell className="truncate">{comment.user?.name || "زائر"}</TableCell>
                        <TableCell className="max-w-md">
                          <p className="line-clamp-2 whitespace-pre-wrap leading-relaxed">{comment.body}</p>
                        </TableCell>
                        <TableCell>
                          {href ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              #{comment.commentable_id}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(comment.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex items-center justify-end gap-1">
                            {comment.status !== "approved" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-emerald-600 hover:bg-emerald-600/10"
                                title="موافقة"
                                onClick={() => approveMutation.mutate(comment.id)}
                                disabled={approveMutation.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            {comment.status !== "rejected" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-orange-500 hover:bg-orange-500/10"
                                title="رفض"
                                onClick={() => rejectMutation.mutate(comment.id)}
                                disabled={rejectMutation.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:bg-destructive/10"
                              title="حذف"
                              onClick={() => setDeleteTarget(comment)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {lastPage > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                صفحة {page} من {lastPage}
                {isFetching && <Loader2 className="ms-2 inline h-3 w-3 animate-spin" />}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1 || isFetching}
                >
                  <ChevronRight className="h-4 w-4" />
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.min(lastPage, prev + 1))}
                  disabled={page >= lastPage || isFetching}
                >
                  التالي
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>حذف التعليق</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف التعليق نهائيًا ولا يمكن التراجع. للإخفاء دون حذف استخدم «رفض» بدلًا من ذلك.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حذف نهائيًا
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>حذف {selected.length} تعليق</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف التعليقات المحددة نهائيًا ولا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(selected)}
              disabled={bulkDeleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حذف نهائيًا
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
