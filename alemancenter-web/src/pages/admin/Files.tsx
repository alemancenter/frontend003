import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminFilesApi, type FileSortBy } from "@/lib/api/admin";
import { articlesApi, postsApi } from "@/lib/api/content";
import type { FileItem } from "@/lib/api/types";
import { FILE_CATEGORIES, FILE_CATEGORY_LABELS, formatFileSize } from "./articles/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { COUNTRY_META, VALID_COUNTRIES, type CountryCode } from "@/lib/country";
import { useCountry, useCountrySwitcher } from "@/contexts/CountryContext";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  FileIcon,
  FileSpreadsheet,
  FileTextIcon,
  ImageIcon,
  Loader2,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

const PER_PAGE = 20;
const ALL = "all";

// Extension-ish values the backend stores in files.file_type.
const FILE_TYPES = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip", "rar", "jpg", "png"];

const SORT_COLUMNS: { value: FileSortBy; label: string }[] = [
  { value: "created_at", label: "تاريخ الرفع" },
  { value: "file_name", label: "الاسم" },
  { value: "file_size", label: "الحجم" },
  { value: "download_count", label: "التنزيلات" },
  { value: "view_count", label: "المشاهدات" },
];

function fileIcon(type?: string) {
  const value = (type ?? "").toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(value))
    return <ImageIcon className="h-4 w-4 text-blue-500" />;
  if (value === "pdf") return <FileTextIcon className="h-4 w-4 text-red-500" />;
  if (["xls", "xlsx", "csv"].includes(value))
    return <FileSpreadsheet className="h-4 w-4 text-emerald-600" />;
  if (["doc", "docx"].includes(value)) return <FileTextIcon className="h-4 w-4 text-sky-600" />;
  return <FileIcon className="h-4 w-4 text-muted-foreground" />;
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

export default function Files() {
  const country = useCountry();
  const switchCountry = useCountrySwitcher();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState<string>(ALL);
  const [category, setCategory] = useState<string>(ALL);
  const [sortBy, setSortBy] = useState<FileSortBy>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string>(FILE_CATEGORIES[0].value);
  const [uploadArticleId, setUploadArticleId] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, type, category, sortBy, sortDir, country]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "files", country, debouncedSearch, type, category, sortBy, sortDir, page],
    queryFn: () =>
      adminFilesApi.listWithMeta({
        country,
        q: debouncedSearch || undefined,
        type: type === ALL ? undefined : type,
        file_category: category === ALL ? undefined : category,
        sort_by: sortBy,
        sort_dir: sortDir,
        page,
        per_page: PER_PAGE,
      }),
  });

  const files = data?.data ?? [];
  const meta = data?.meta ?? data?.pagination;
  const total = meta?.total ?? files.length;
  const lastPage = meta?.last_page ?? 1;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "files"] });

  const deleteMutation = useMutation({
    mutationFn: (file: FileItem) => adminFilesApi.delete(file.id, { country }),
    onSuccess: () => {
      toast({ title: "تم حذف الملف" });
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: "فشل حذف الملف", description: error.message, variant: "destructive" }),
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile) throw new Error("لم يتم اختيار ملف");
      const payload = new FormData();
      payload.append("file", uploadFile);
      payload.append("file_category", uploadCategory);
      if (uploadArticleId.trim()) payload.append("article_id", uploadArticleId.trim());
      return adminFilesApi.upload(payload, { country });
    },
    onSuccess: () => {
      toast({ title: "تم رفع الملف بنجاح" });
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadArticleId("");
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: "فشل رفع الملف", description: error.message, variant: "destructive" }),
  });

  // Downloads go through the signed-token flow — the same one the public pages
  // use — so the file streams with its real name instead of an HTML page.
  const downloadFile = async (file: FileItem) => {
    setDownloadingId(file.id);
    try {
      const api = file.post_id ? postsApi : articlesApi;
      const { token } = await api.getDownloadToken(file.id);
      window.location.assign(api.signedDownloadUrl(token));
    } catch (error) {
      toast({
        title: "تعذر تنزيل الملف",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // Clicking a column header sorts by it; clicking the active one flips direction.
  const toggleSort = (column: FileSortBy) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("desc");
    }
  };

  const SortableHead = ({ column, children, className }: { column: FileSortBy; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => toggleSort(column)}
        className="flex items-center gap-1 font-medium transition hover:text-foreground"
      >
        {children}
        {sortBy === column &&
          (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </TableHead>
  );

  const hasFilters = debouncedSearch !== "" || type !== ALL || category !== ALL;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة الملفات</h1>
          <p className="mt-1 text-muted-foreground">تصفح الملفات المرفوعة وفلترتها وفرزها وتنزيلها</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsUploadOpen(true)}>
            <Upload className="ml-2 h-4 w-4" />
            رفع ملف
          </Button>
          <Select value={country} onValueChange={(value) => switchCountry(value as CountryCode)}>
            <SelectTrigger className="w-[160px]">
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
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div>
            <CardTitle>
              مستودع الملفات
              <span className="ms-2 text-sm font-normal text-muted-foreground">({total} ملف)</span>
            </CardTitle>
            <CardDescription>اضغط على عنوان أي عمود لفرز النتائج تصاعديًا أو تنازليًا.</CardDescription>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative w-full lg:w-64">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث باسم الملف..."
                className="pr-8"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="نوع الملف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>كل الأنواع</SelectItem>
                {FILE_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue placeholder="التصنيف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>كل التصنيفات</SelectItem>
                {FILE_CATEGORIES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as FileSortBy)}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_COLUMNS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    فرز: {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              title={sortDir === "asc" ? "تصاعدي" : "تنازلي"}
              onClick={() => setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}
            >
              {sortDir === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </Button>

            {hasFilters && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch("");
                  setType(ALL);
                  setCategory(ALL);
                }}
              >
                مسح الفلاتر
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <SortableHead column="file_name">الاسم</SortableHead>
                  <TableHead className="w-[80px]">النوع</TableHead>
                  <TableHead className="w-[130px]">التصنيف</TableHead>
                  <SortableHead column="file_size" className="w-[100px]">
                    الحجم
                  </SortableHead>
                  <SortableHead column="download_count" className="w-[100px]">
                    التنزيلات
                  </SortableHead>
                  <SortableHead column="view_count" className="w-[100px]">
                    المشاهدات
                  </SortableHead>
                  <SortableHead column="created_at" className="w-[120px]">
                    تاريخ الرفع
                  </SortableHead>
                  <TableHead className="w-[100px] text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : files.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                      {hasFilters ? "لا توجد ملفات مطابقة للفلاتر" : "لا توجد ملفات"}
                    </TableCell>
                  </TableRow>
                ) : (
                  files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>{fileIcon(file.file_type)}</TableCell>
                      <TableCell className="max-w-[260px] font-medium">
                        <p className="truncate" title={file.file_name}>
                          {file.file_name || `ملف ${file.id}`}
                        </p>
                        {file.article_id && (
                          <span className="text-xs text-muted-foreground">مقالة #{file.article_id}</span>
                        )}
                        {file.post_id && (
                          <span className="text-xs text-muted-foreground">منشور #{file.post_id}</span>
                        )}
                      </TableCell>
                      <TableCell dir="ltr" className="text-start text-xs uppercase text-muted-foreground">
                        {file.file_type || "—"}
                      </TableCell>
                      <TableCell>
                        {file.file_category ? (
                          <Badge variant="outline">
                            {FILE_CATEGORY_LABELS[file.file_category] ?? file.file_category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{formatFileSize(file.file_size) ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        {(file.download_count ?? 0).toLocaleString("ar-EG")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {(file.views ?? file.view_count ?? 0).toLocaleString("ar-EG")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(file.created_at)}
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            title="تنزيل"
                            onClick={() => downloadFile(file)}
                            disabled={downloadingId === file.id}
                          >
                            {downloadingId === file.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10"
                            title="حذف"
                            onClick={() => setDeleteTarget(file)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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

      {/* Upload dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader className="text-right">
            <DialogTitle>رفع ملف جديد</DialogTitle>
            <DialogDescription>
              يُرفع الملف إلى قاعدة بيانات {COUNTRY_META[country as CountryCode]?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upload-file">الملف</Label>
              <Input
                id="upload-file"
                type="file"
                onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
              />
              {uploadFile && (
                <p className="text-xs text-muted-foreground">
                  {uploadFile.name} — {formatFileSize(uploadFile.size)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>التصنيف</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILE_CATEGORIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-article">معرّف المقالة (اختياري)</Label>
              <Input
                id="upload-article"
                inputMode="numeric"
                value={uploadArticleId}
                onChange={(event) => setUploadArticleId(event.target.value.replace(/\D/g, ""))}
                placeholder="اربط الملف بمقالة، مثل: 2284"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={() => uploadMutation.mutate()} disabled={!uploadFile || uploadMutation.isPending}>
              {uploadMutation.isPending ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="ml-2 h-4 w-4" />
              )}
              رفع
            </Button>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>حذف الملف</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف «{deleteTarget?.file_name}» نهائيًا من الخادم ولن يعود متاحًا للتنزيل. لا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
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
    </div>
  );
}
