import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { articlesApi, commentsApi } from "@/lib/api/content";
import { useCountry } from "@/hooks/use-country";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { useSeo, toMetaText, articleJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { sanitizeHtml } from "@/lib/sanitize";
import { AdUnit } from "@/components/ads/AdUnit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
  Hash,
  Home,
  Link as LinkIcon,
  MessageSquare,
  User,
} from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

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

// ─── Loading skeleton ────────────────────────────────────────────────────────

function ArticleSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="border-b bg-gradient-to-b from-primary/8 to-background px-4 py-10">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-6 h-5 w-40 rounded-full bg-muted" />
          <div className="mb-4 flex gap-2">
            <div className="h-6 w-20 rounded-full bg-primary/20" />
            <div className="h-6 w-20 rounded-full bg-primary/20" />
          </div>
          <div className="mb-3 h-10 w-3/4 rounded-lg bg-muted" />
          <div className="h-6 w-1/2 rounded-lg bg-muted" />
          <div className="mt-6 flex gap-6">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="h-4 w-24 rounded bg-muted" />
          </div>
        </div>
      </div>
      <div className="container mx-auto mt-10 max-w-6xl px-4">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-4 rounded bg-muted" style={{ width: `${85 + (i % 3) * 5}%` }} />
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-40 rounded-2xl bg-muted" />
            <div className="h-32 rounded-2xl bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function ArticleDetail() {
  const { articleId: id } = useParams<{ articleId: string }>();
  const country = useCountry();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [commentBody, setCommentBody] = useState("");
  const [readProgress, setReadProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // ── data ──────────────────────────────────────────────────────────────────

  const { data: article, isLoading } = useQuery({
    queryKey: ["article", id],
    queryFn: () => articlesApi.show(id!),
    enabled: !!id,
  });

  const settings = useSiteSettings();
  const siteName = settings.site_name || "موقع الإيمان التعليمي";

  // Per-page SEO: unique title/description, canonical, article + breadcrumb
  // structured data, country hreflang alternates.
  const seoImage = article?.content ? /<img[^>]+src=["']([^"']+)["']/i.exec(article.content)?.[1] : undefined;
  const pageUrl = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
  useSeo({
    title: article?.title,
    description: article?.meta_description || toMetaText(article?.content) || article?.title,
    type: "article",
    image: seoImage,
    keywords: article?.keywords_rel?.map((k) => k.keyword).filter(Boolean).join("، "),
    publishedTime: article?.published_at ?? article?.created_at,
    modifiedTime: article?.updated_at,
    countryAlternates: true,
    jsonLd: article
      ? [
          articleJsonLd({
            headline: article.title,
            description: article.meta_description || toMetaText(article.content) || article.title,
            url: pageUrl,
            image: seoImage,
            datePublished: article.published_at ?? article.created_at,
            dateModified: article.updated_at,
            siteName,
          }),
          breadcrumbJsonLd([
            { name: "الرئيسية", url: `${typeof window !== "undefined" ? window.location.origin : ""}/${country}` },
            { name: "الأخبار والمقالات", url: `${typeof window !== "undefined" ? window.location.origin : ""}/${country}/articles` },
            { name: article.title, url: pageUrl },
          ]),
        ]
      : undefined,
  });

  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ["article-comments", country, id],
    queryFn: () => commentsApi.list(country, "articles", { commentable_id: Number(id) }),
    enabled: Boolean(article && id),
  });

  const submitComment = useMutation({
    mutationFn: () =>
      commentsApi.create(country, "articles", {
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

  // ── reading progress ──────────────────────────────────────────────────────

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

  // ── render ────────────────────────────────────────────────────────────────

  if (isLoading) return <ArticleSkeleton />;

  if (!article)
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <BookOpen className="h-16 w-16 text-muted-foreground/30" />
        <p className="text-xl font-bold text-muted-foreground">المقال غير موجود</p>
        <Link href="/articles">
          <Button variant="outline">العودة للمقالات</Button>
        </Link>
      </div>
    );

  const mins = readingMinutes(article.content);
  const dateStr = formatDate(article.published_at ?? article.created_at);

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
            <Link href="/articles" className="transition hover:text-primary">
              المقالات
            </Link>
            <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/40 rtl:rotate-180" />
            <span className="max-w-[180px] truncate text-primary">{article.title}</span>
          </nav>

          {/* Badges */}
          <div className="mb-4 flex flex-wrap gap-2">
            {article.grade_level && (
              <Badge variant="secondary" className="rounded-full font-bold">
                {article.grade_level}
              </Badge>
            )}
            {article.subject?.subject_name && (
              <Badge className="rounded-full font-bold">
                {article.subject.subject_name}
              </Badge>
            )}
            {article.semester?.semester_name && (
              <Badge variant="outline" className="rounded-full font-bold">
                {article.semester.semester_name}
              </Badge>
            )}
          </div>

          {/* Title */}
          <h1 className="mb-4 text-3xl font-black leading-snug text-foreground sm:text-4xl lg:text-5xl">
            {article.title}
          </h1>

          {/* Meta description */}
          {article.meta_description && (
            <p className="mb-5 max-w-2xl text-base text-muted-foreground leading-relaxed">
              {article.meta_description}
            </p>
          )}

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary/70" />
              {dateStr}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-primary/70" />
              {article.visit_count.toLocaleString("ar-EG")} مشاهدة
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
            <AdUnit page="article" position={1} className="mb-8 overflow-hidden rounded-2xl" />

            {/* Article body */}
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
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
            />

            {/* Ad after body */}
            <AdUnit page="article" position={2} className="mt-10 overflow-hidden rounded-2xl" />

            {/* Keywords */}
            {article.keywords_rel && article.keywords_rel.length > 0 && (
              <div className="mt-10 flex flex-wrap items-center gap-2">
                <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
                {article.keywords_rel.map((k) => (
                  <Link
                    key={k.id}
                    href={`/keywords/${encodeURIComponent(k.keyword)}`}
                    className="rounded-full border bg-muted/60 px-3 py-1 text-xs font-bold text-muted-foreground transition hover:bg-primary hover:text-primary-foreground"
                  >
                    {k.keyword}
                  </Link>
                ))}
              </div>
            )}

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
                      {/* Avatar */}
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

            {/* Article info card */}
            <Card className="overflow-hidden rounded-2xl shadow-sm">
              <CardHeader className="border-b bg-muted/40 px-5 py-4">
                <p className="flex items-center gap-2 text-sm font-black">
                  <BookOpen className="h-4 w-4 text-primary" />
                  معلومات المقال
                </p>
              </CardHeader>
              <CardContent className="divide-y px-5 py-0 text-sm">
                {article.grade_level && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-muted-foreground">الصف الدراسي</span>
                    <span className="font-bold">{article.grade_level}</span>
                  </div>
                )}
                {article.subject?.subject_name && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-muted-foreground">المادة</span>
                    <span className="font-bold">{article.subject.subject_name}</span>
                  </div>
                )}
                {article.semester?.semester_name && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-muted-foreground">الفصل</span>
                    <span className="font-bold">{article.semester.semester_name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-3">
                  <span className="text-muted-foreground">تاريخ النشر</span>
                  <span className="font-bold">{dateStr}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-muted-foreground">المشاهدات</span>
                  <span className="font-bold">{article.visit_count.toLocaleString("ar-EG")}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-muted-foreground">وقت القراءة</span>
                  <span className="font-bold">{mins} دقيقة</span>
                </div>
              </CardContent>
            </Card>

            {/* Files card */}
            {article.files && article.files.length > 0 && (
              <Card className="overflow-hidden rounded-2xl shadow-sm">
                <CardHeader className="border-b bg-muted/40 px-5 py-4">
                  <p className="flex items-center gap-2 text-sm font-black">
                    <FileText className="h-4 w-4 text-primary" />
                    الملفات المرفقة
                    <span className="ms-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-black text-primary">
                      {article.files.length}
                    </span>
                  </p>
                </CardHeader>
                <CardContent className="space-y-2 p-3">
                  {article.files.map((file) => (
                    <a
                      key={file.id}
                      href={articlesApi.downloadUrl(file.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/10 hover:shadow-md"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition group-hover:scale-105">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-bold leading-snug" dir="ltr">
                          {file.file_name ?? `ملف ${file.id}`}
                        </p>
                        {file.file_size && (
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.file_size)}
                          </p>
                        )}
                      </div>
                      <span className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground shadow-sm transition group-hover:bg-primary/90">
                        <Download className="h-4 w-4" />
                        تحميل
                      </span>
                    </a>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Share card */}
            <Card className="overflow-hidden rounded-2xl shadow-sm">
              <CardContent className="p-4">
                <button
                  type="button"
                  onClick={copyLink}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition hover:bg-muted"
                >
                  <LinkIcon className="h-4 w-4" />
                  نسخ رابط المقال
                </button>
              </CardContent>
            </Card>

          </aside>
        </div>
      </div>
    </>
  );
}
