/**
 * ArticleDownload — /articles/file/:fileId/download
 *
 * AdSense-compliant download page:
 *  - Real, meaningful content (file info + article context)
 *  - Clearly labelled ad slots (handled by AdUnit)
 *  - Single prominent download CTA — not confused with ads
 *  - No deceptive overlays or fake download buttons
 */

import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { filesApi, articlesApi } from "@/lib/api/content";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/hooks/use-toast";
import { AdUnit } from "@/components/ads/AdUnit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { sanitizeHtml } from "@/lib/sanitize";
import {
  Download,
  FileText,
  FileImage,
  File,
  BookOpen,
  Eye,
  Share2,
  ArrowRight,
  GraduationCap,
  Calendar,
  Tag,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

type FileInfo = {
  file: {
    id: number;
    article_id: number;
    file_name: string;
    file_type: string;
    file_category?: string;
    file_size: number;
    mime_type?: string;
    view_count?: number;
    views_count?: number;
    download_count: number;
    is_premium: boolean;
  };
  item: {
    id: number;
    title: string;
    content?: string;
    meta_description?: string;
    grade_level?: string | number | null;
    subject?: { subject_name: string };
    semester?: { semester_name: string };
    visit_count?: number;
  };
  type: string;
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const FILE_TYPE_META: Record<string, { label: string; color: string }> = {
  pdf:  { label: "PDF",  color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
  docx: { label: "Word", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  doc:  { label: "Word", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  xlsx: { label: "Excel", color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
  xls:  { label: "Excel", color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
  pptx: { label: "PowerPoint", color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  jpg:  { label: "صورة", color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
  jpeg: { label: "صورة", color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
  png:  { label: "صورة", color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
};

function FileTypeIcon({ type }: { type: string }) {
  const t = type?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(t)) return <FileImage className="h-14 w-14" />;
  if (["pdf", "docx", "doc", "xlsx", "pptx"].includes(t)) return <FileText className="h-14 w-14" />;
  return <File className="h-14 w-14" />;
}

function DownloadSkeleton() {
  return (
    <div className="min-h-screen" dir="rtl">
      <div className="bg-gradient-to-b from-primary/8 to-background border-b pb-10 pt-8">
        <div className="container mx-auto max-w-5xl px-4 space-y-4">
          <Skeleton className="h-4 w-48 rounded-full" />
          <div className="flex gap-5 items-center mt-6">
            <Skeleton className="h-20 w-20 rounded-2xl shrink-0" />
            <div className="space-y-3 flex-1">
              <Skeleton className="h-7 w-3/4 rounded" />
              <Skeleton className="h-4 w-1/2 rounded" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto max-w-5xl px-4 py-10 grid lg:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 rounded" style={{ width: `${88 - i * 8}%` }} />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ArticleDownload() {
  const { fileId } = useParams<{ fileId: string }>();
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  // Fetches a short-lived signed token, then navigates to the streaming
  // endpoint — the browser saves the real file (Content-Disposition: attachment).
  const handleDownload = async (id: number) => {
    setIsDownloading(true);
    try {
      const { token } = await articlesApi.getDownloadToken(id);
      window.location.assign(articlesApi.signedDownloadUrl(token));
    } catch (err) {
      const isAuth = err instanceof ApiError && (err.status === 401 || err.status === 403);
      toast({
        variant: "destructive",
        title: isAuth ? "يتطلب تسجيل الدخول" : "تعذر التحميل",
        description:
          err instanceof ApiError && err.message
            ? err.message
            : "حدث خطأ أثناء تجهيز رابط التحميل، يرجى المحاولة مجدداً",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const { data: info, isLoading, isError } = useQuery({
    queryKey: ["file-info", fileId],
    queryFn: () => filesApi.info(fileId) as Promise<FileInfo>,
    enabled: !!fileId,
    retry: 1,
  });

  // Track view on mount
  useQuery({
    queryKey: ["file-view", fileId],
    queryFn: () => filesApi.incrementView(fileId),
    enabled: !!fileId,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });

  if (isLoading) return <DownloadSkeleton />;

  if (isError || !info?.file) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4" dir="rtl">
        <AlertCircle className="h-16 w-16 text-destructive/40" />
        <h1 className="text-2xl font-black">الملف غير موجود</h1>
        <p className="text-muted-foreground max-w-sm">
          لم يتم العثور على الملف المطلوب. ربما تم حذفه أو الرابط غير صحيح.
        </p>
        <Button asChild variant="outline" className="rounded-xl mt-2">
          <Link href="/articles">
            <ArrowRight className="h-4 w-4 ml-2 rtl:rotate-180" />
            تصفح المقالات
          </Link>
        </Button>
      </div>
    );
  }

  const { file, item } = info;
  const typeMeta = FILE_TYPE_META[file.file_type?.toLowerCase() ?? ""] ?? { label: file.file_type?.toUpperCase() ?? "ملف", color: "bg-muted text-muted-foreground" };
  const articleHref = `/articles/${item.id}`;
  const viewCount = file.views_count ?? file.view_count ?? 0;

  return (
    <div className="min-h-screen" dir="rtl">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <header className="border-b bg-gradient-to-b from-primary/8 via-background/60 to-background pb-10 pt-7">
        <div className="container mx-auto max-w-5xl px-4">

          {/* Breadcrumb */}
          <nav className="mb-6 flex w-fit items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground shadow-sm">
            <Link href="/" className="transition hover:text-primary">الرئيسية</Link>
            <span className="text-muted-foreground/40">/</span>
            <Link href="/articles" className="transition hover:text-primary">المقالات</Link>
            <span className="text-muted-foreground/40">/</span>
            <Link href={articleHref} className="max-w-[160px] truncate transition hover:text-primary">
              {item.title}
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-primary">تحميل</span>
          </nav>

          {/* File identity */}
          <div className="flex items-start gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border bg-card text-primary shadow-sm">
              <FileTypeIcon type={file.file_type} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2 mb-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${typeMeta.color}`}>
                  {typeMeta.label}
                </span>
                {file.is_premium && (
                  <Badge className="rounded-full text-xs bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-0">
                    مميز
                  </Badge>
                )}
                {file.file_category && (
                  <Badge variant="outline" className="rounded-full text-xs capitalize">
                    {file.file_category}
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-black leading-snug text-foreground sm:text-3xl line-clamp-2">
                {file.file_name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Download className="h-4 w-4" />
                  {file.download_count.toLocaleString("ar-JO")} تحميل
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  {viewCount.toLocaleString("ar-JO")} مشاهدة
                </span>
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  {formatBytes(file.file_size)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Ad slot 1 — below hero, clearly above content ─────────────────── */}
      <div className="container mx-auto max-w-5xl px-4">
        <AdUnit page="download" position={1} className="mt-6 rounded-2xl overflow-hidden" />
      </div>

      {/* ── Main layout ───────────────────────────────────────────────────── */}
      <main className="container mx-auto max-w-5xl px-4 py-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">

        {/* ── Left col: article context ─────────────────────────────────── */}
        <div className="space-y-8">

          {/* Article info card */}
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-6 space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">المحتوى التعليمي</p>
                <h2 className="text-xl font-black leading-snug">
                  <Link href={articleHref} className="hover:text-primary transition-colors">
                    {item.title}
                  </Link>
                </h2>
              </div>

              {/* Meta chips */}
              <div className="flex flex-wrap gap-2">
                {item.grade_level != null && (
                  <div className="flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium">
                    <GraduationCap className="h-3.5 w-3.5 text-primary" />
                    الصف {item.grade_level}
                  </div>
                )}
                {item.subject?.subject_name && (
                  <div className="flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    {item.subject.subject_name}
                  </div>
                )}
                {item.semester?.semester_name && (
                  <div className="flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    {item.semester.semester_name}
                  </div>
                )}
              </div>

              {/* Description */}
              {item.meta_description && (
                <>
                  <Separator />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.meta_description}
                  </p>
                </>
              )}

              <Link
                href={articleHref}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
              >
                <Eye className="h-4 w-4" />
                عرض المقال كاملاً
              </Link>
            </CardContent>
          </Card>

          {/* File use guidelines — adds real content value for AdSense */}
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="h-4 w-4 text-primary" />
                <h3 className="font-black text-sm">إرشادات الاستخدام</h3>
              </div>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {[
                  "الملف مخصص للاستخدام الشخصي والتعليمي.",
                  "يُمنع إعادة نشر الملف أو بيعه دون إذن.",
                  "إذا واجهت مشكلة في التحميل، حاول تعطيل مانع الإعلانات مؤقتاً.",
                  "للإبلاغ عن ملف تالف أو معطوب، تواصل معنا.",
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Ad slot 2 — after article content, naturally placed */}
          <AdUnit page="download" position={2} className="rounded-2xl overflow-hidden" />
        </div>

        {/* ── Right col: download card (sticky) ─────────────────────────── */}
        <aside className="lg:sticky lg:top-24 space-y-4 self-start">

          {/* Primary download card */}
          <Card className="rounded-2xl border-2 border-primary/20 shadow-lg overflow-hidden">
            <div className="bg-primary/8 px-6 pt-6 pb-4 border-b">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">جاهز للتحميل</p>
              <p className="font-black text-lg leading-snug line-clamp-2">{file.file_name}</p>
            </div>
            <CardContent className="p-6 space-y-4">
              {/* File stats */}
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-muted/50 p-3 text-center">
                  <dt className="text-xs text-muted-foreground mb-0.5">الحجم</dt>
                  <dd className="font-black">{formatBytes(file.file_size)}</dd>
                </div>
                <div className="rounded-xl bg-muted/50 p-3 text-center">
                  <dt className="text-xs text-muted-foreground mb-0.5">النوع</dt>
                  <dd className="font-black uppercase">{file.file_type}</dd>
                </div>
                <div className="rounded-xl bg-muted/50 p-3 text-center">
                  <dt className="text-xs text-muted-foreground mb-0.5">تنزيل</dt>
                  <dd className="font-black">{file.download_count.toLocaleString("ar-JO")}</dd>
                </div>
                <div className="rounded-xl bg-muted/50 p-3 text-center">
                  <dt className="text-xs text-muted-foreground mb-0.5">مشاهدة</dt>
                  <dd className="font-black">{viewCount.toLocaleString("ar-JO")}</dd>
                </div>
              </dl>

              {/* Download button — the only, genuine CTA */}
              <button
                type="button"
                onClick={() => handleDownload(file.id)}
                disabled={isDownloading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-black text-primary-foreground shadow-md transition hover:bg-primary/90 active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
              >
                <Download className="h-5 w-5" />
                {isDownloading ? "جاري تجهيز الملف..." : "تحميل الملف"}
              </button>

              {/* Share */}
              <Button
                variant="outline"
                className="w-full rounded-xl gap-2"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: file.file_name, url: window.location.href }).catch(() => null);
                  } else {
                    navigator.clipboard.writeText(window.location.href).catch(() => null);
                  }
                }}
              >
                <Share2 className="h-4 w-4" />
                مشاركة الرابط
              </Button>

              <Separator />

              <Link
                href={articleHref}
                className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                العودة للمقال
              </Link>
            </CardContent>
          </Card>

          {/* Article full content snippet */}
          {item.content && (
            <Card className="rounded-2xl border overflow-hidden">
              <CardContent className="p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">نبذة عن المحتوى</p>
                <div
                  className="text-sm text-muted-foreground leading-relaxed line-clamp-6 prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.content) }}
                />
              </CardContent>
            </Card>
          )}
        </aside>
      </main>
    </div>
  );
}
