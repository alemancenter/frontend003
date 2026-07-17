import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { postsApi, commentsApi } from "@/lib/api/content";
import { ApiError } from "@/lib/api/client";
import { routes } from "@/lib/country";
import { useCountry } from "@/hooks/use-country";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { useSeo, toMetaText, articleJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { sanitizeHtml } from "@/lib/sanitize";
import { imgUrl } from "@/lib/img-url";
import { AdUnit } from "@/components/ads/AdUnit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  Clock,
  Download,
  Eye,
  FileText,
  Home,
  Link as LinkIcon,
  MessageSquare,
  Newspaper,
  Paperclip,
} from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────

function readingMinutes(html: string): number {
  const text = html.replace(/<[^>]*>/g, "");
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-JO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatBytes(bytes?: number): string | null {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`;
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function PostSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="border-b bg-gradient-to-b from-primary/8 to-background px-4 py-10">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-6 h-5 w-40 rounded-full bg-muted" />
          <div className="mb-3 h-10 w-3/4 rounded-lg bg-muted" />
          <div className="mt-6 flex gap-6">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="h-4 w-24 rounded bg-muted" />
          </div>
        </div>
      </div>
      <div className="container mx-auto mt-10 max-w-6xl px-4">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-4 rounded bg-muted" style={{ width: `${85 + (i % 3) * 5}%` }} />
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-40 rounded-2xl bg-muted" />
            <div className="h-16 rounded-2xl bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function PostDetail() {
  const { postId: id } = useParams<{ postId: string }>();
  const country = useCountry();
  const postsUrl = routes.postsList(country);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [commentBody, setCommentBody] = useState("");
  const [readProgress, setReadProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // ── data ──────────────────────────────────────────────────────────────────

  const { data: post, isLoading } = useQuery({
    queryKey: ["post", id],
    queryFn: () => postsApi.show(id!),
    enabled: !!id,
  });

  const settings = useSiteSettings();
  const siteName = settings.site_name || "موقع الإيمان التعليمي";
  const postImage = post?.image_url || post?.image || undefined;
  const postPageUrl = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
  useSeo({
    title: post?.title,
    description: toMetaText(post?.content) || post?.title,
    type: "article",
    image: postImage,
    modifiedTime: post?.updated_at,
    publishedTime: post?.created_at,
    countryAlternates: true,
    jsonLd: post
      ? [
          articleJsonLd({
            headline: post.title,
            description: toMetaText(post.content) || post.title,
            url: postPageUrl,
            image: postImage,
            datePublished: post.created_at,
            dateModified: post.updated_at,
            siteName,
          }),
          breadcrumbJsonLd([
            { name: "الرئيسية", url: `${typeof window !== "undefined" ? window.location.origin : ""}/${country}` },
            { name: "الأخبار", url: `${typeof window !== "undefined" ? window.location.origin : ""}${postsUrl}` },
            { name: post.title, url: postPageUrl },
          ]),
        ]
      : undefined,
  });

  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ["post-comments", country, id],
    queryFn: () => commentsApi.list(country, "posts", { commentable_id: Number(id) }),
    enabled: !!id,
  });

  const incrementView = useMutation({
    mutationFn: () => postsApi.incrementView(id!),
  });

  const submitComment = useMutation({
    mutationFn: () =>
      commentsApi.create(country, "posts", {
        body: commentBody,
        commentable_id: Number(id),
      }),
    onSuccess: () => {
      toast({ title: "تم إضافة التعليق بنجاح" });
      setCommentBody("");
      refetchComments();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "حدث خطأ";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    },
  });

  // ── side effects ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (id) incrementView.mutate();
  }, [id]);

  useEffect(() => {
    const onScroll = () => {
      const el = contentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight;
      const scrolled = Math.max(0, -rect.top + window.innerHeight * 0.2);
      setReadProgress(Math.min(100, Math.round((scrolled / total) * 100)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── copy link ─────────────────────────────────────────────────────────────

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() =>
      toast({ title: "تم نسخ الرابط" })
    );
  };

  // ── file download (signed-token flow, same as article files) ─────────────

  const [downloadingFileId, setDownloadingFileId] = useState<number | null>(null);

  const downloadFile = async (fileId: number) => {
    setDownloadingFileId(fileId);
    try {
      const { token } = await postsApi.getDownloadToken(fileId);
      window.location.assign(postsApi.signedDownloadUrl(token));
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
      setDownloadingFileId(null);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────

  if (isLoading) return <PostSkeleton />;

  if (!post)
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Newspaper className="h-16 w-16 text-muted-foreground/30" />
        <p className="text-xl font-bold text-muted-foreground">المنشور غير موجود</p>
        <Link href={postsUrl}>
          <Button variant="outline">العودة للأخبار</Button>
        </Link>
      </div>
    );

  const mins = readingMinutes(post.content);
  const dateStr = formatDate(post.created_at);
  const viewCount = post.views ?? post.view_count ?? 0;
  // 800 = the img endpoint's MAX_WIDTH; larger values are clamped server-side.
  const heroImage = imgUrl(post.image ?? post.image_url, 800);
  const attachments = post.files ?? [];

  return (
    <>
      {/* ── Reading progress bar ── */}
      <div
        className="fixed inset-x-0 top-0 z-50 h-0.5 origin-right bg-primary transition-transform duration-150"
        style={{ transform: `scaleX(${readProgress / 100})` }}
        aria-hidden
      />

      {/* ── Hero header ── */}
      <header className="border-b bg-gradient-to-b from-primary/8 via-background/60 to-background">
        <div className="container mx-auto max-w-6xl px-4 pb-10 pt-6">

          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="mb-6 flex w-fit items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground shadow-sm"
          >
            <Link href="/" className="flex items-center gap-1 transition hover:text-primary">
              <Home className="h-3.5 w-3.5" />
              الرئيسية
            </Link>
            <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/40 rtl:rotate-180" />
            <Link href={postsUrl} className="transition hover:text-primary">
              الأخبار
            </Link>
            <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/40 rtl:rotate-180" />
            <span className="max-w-[180px] truncate text-primary">{post.title}</span>
          </nav>

          {/* Title */}
          <h1 className="mb-5 text-3xl font-black leading-snug text-foreground sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary/70" />
              {dateStr}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-primary/70" />
              {viewCount.toLocaleString("ar-EG")} مشاهدة
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary/70" />
              {mins} دقيقة قراءة
            </span>
            {comments !== undefined && (
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-primary/70" />
                {comments.length} تعليق
              </span>
            )}
            <button
              type="button"
              onClick={copyLink}
              className="ms-auto flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition hover:bg-muted"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              نسخ الرابط
            </button>
          </div>
        </div>
      </header>

      {/* ── Body: two-column layout ── */}
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_300px]">

          {/* ── Main column ── */}
          <main ref={contentRef} className="min-w-0">

            {/* Ad before body */}
            <AdUnit page="news" position={1} className="mb-8 overflow-hidden rounded-2xl" />

            {/* Featured image */}
            {heroImage && (
              <figure className="mb-8 overflow-hidden rounded-2xl border shadow-md">
                <img
                  src={heroImage}
                  alt={post.alt ?? post.title}
                  className="w-full object-cover"
                  loading="eager"
                />
              </figure>
            )}

            {/* Post body */}
            <article
              className="prose prose-base prose-zinc dark:prose-invert max-w-none
                prose-headings:font-black prose-headings:text-foreground
                prose-p:leading-loose prose-p:text-foreground/85
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                prose-img:rounded-2xl prose-img:shadow-md
                prose-blockquote:border-primary prose-blockquote:bg-primary/5
                prose-blockquote:rounded-e-xl prose-blockquote:py-0.5
                prose-pre:rounded-xl prose-pre:shadow-inner
                prose-table:rounded-xl prose-th:bg-muted"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
            />

            {/* Attachments */}
            {attachments.length > 0 && (
              <section className="mt-10">
                <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
                  <Paperclip className="h-5 w-5 text-primary" />
                  الملفات المرفقة
                  <span className="ms-1 rounded-full bg-muted px-2.5 py-0.5 text-sm font-bold text-muted-foreground">
                    {attachments.length}
                  </span>
                </h2>
                <div className="space-y-2">
                  {attachments.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 rounded-xl border bg-card p-3 text-sm shadow-sm"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold leading-snug">
                          {file.file_name ?? `ملف ${file.id}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[file.file_type?.toUpperCase(), formatBytes(file.file_size)]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <Button
                        onClick={() => downloadFile(file.id)}
                        disabled={downloadingFileId === file.id}
                        className="shrink-0 rounded-xl gap-1.5"
                      >
                        <Download className="h-4 w-4" />
                        {downloadingFileId === file.id ? "جاري التجهيز..." : "تحميل"}
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Ad after body */}
            <AdUnit page="news" position={2} className="mt-10 overflow-hidden rounded-2xl" />

            <Separator className="my-12" />

            {/* Comments */}
            <section>
              <h2 className="mb-8 flex items-center gap-2 text-2xl font-black">
                <MessageSquare className="h-6 w-6 text-primary" />
                التعليقات
                <span className="ms-1 rounded-full bg-muted px-2.5 py-0.5 text-base font-bold text-muted-foreground">
                  {comments?.length ?? 0}
                </span>
              </h2>

              {/* Comment form */}
              {isAuthenticated ? (
                <div className="mb-10 rounded-2xl border bg-card p-5 shadow-sm">
                  <p className="mb-3 text-sm font-bold text-muted-foreground">أضف تعليقك</p>
                  <Textarea
                    placeholder="شارك رأيك أو اطرح سؤالك..."
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    className="mb-3 min-h-[90px] resize-none rounded-xl"
                    maxLength={1000}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {commentBody.length}/1000
                    </span>
                    <Button
                      onClick={() => submitComment.mutate()}
                      disabled={!commentBody.trim() || submitComment.isPending}
                      className="rounded-xl"
                    >
                      {submitComment.isPending ? "جاري الإرسال..." : "نشر التعليق"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mb-10 flex flex-col items-center gap-4 rounded-2xl border bg-muted/30 p-8 text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
                  <p className="font-bold text-muted-foreground">
                    سجّل دخولك للمشاركة في النقاش
                  </p>
                  <Link href="/login">
                    <Button variant="outline" className="rounded-xl">
                      تسجيل الدخول
                    </Button>
                  </Link>
                </div>
              )}

              {/* Comments list */}
              {comments && comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="flex gap-3 rounded-2xl border bg-card p-5 shadow-sm transition hover:shadow-md"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">
                        {(comment.user?.name ?? "م").charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-sm font-bold">
                            {comment.user?.name ?? "مستخدم"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString("ar-JO")}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-foreground/80">
                          {comment.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  لا توجد تعليقات بعد — كن أول من يعلّق!
                </div>
              )}
            </section>
          </main>

          {/* ── Sidebar ── */}
          <aside className="space-y-5 lg:self-start lg:sticky lg:top-6">

            {/* Post info card */}
            <Card className="overflow-hidden rounded-2xl shadow-sm">
              <CardHeader className="border-b bg-muted/40 px-5 py-4">
                <p className="flex items-center gap-2 text-sm font-black">
                  <BookOpen className="h-4 w-4 text-primary" />
                  معلومات المنشور
                </p>
              </CardHeader>
              <CardContent className="divide-y px-5 py-0 text-sm">
                <div className="flex items-center justify-between py-3">
                  <span className="text-muted-foreground">تاريخ النشر</span>
                  <span className="font-bold">{dateStr}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-muted-foreground">المشاهدات</span>
                  <span className="font-bold">{viewCount.toLocaleString("ar-EG")}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-muted-foreground">وقت القراءة</span>
                  <span className="font-bold">{mins} دقيقة</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-muted-foreground">التعليقات</span>
                  <span className="font-bold">{comments?.length ?? 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* Share card */}
            <Card className="overflow-hidden rounded-2xl shadow-sm">
              <CardContent className="p-4">
                <button
                  type="button"
                  onClick={copyLink}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition hover:bg-muted"
                >
                  <LinkIcon className="h-4 w-4" />
                  نسخ رابط المنشور
                </button>
              </CardContent>
            </Card>

          </aside>
        </div>
      </div>
    </>
  );
}
