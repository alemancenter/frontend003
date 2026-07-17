import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { articlesApi } from "@/lib/api/content";
import { postsApi } from "@/lib/api/content";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search as SearchIcon, BookOpen, Newspaper, Clock, Eye, AlertCircle } from "lucide-react";
import { useCountry } from "@/hooks/use-country";
import { routes } from "@/lib/country";

function getSearchQuery(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-JO", { year: "numeric", month: "short", day: "numeric" });
}

function readingMinutes(html: string): number {
  const text = html.replace(/<[^>]*>/g, "");
  return Math.max(1, Math.round(text.trim().split(/\s+/).length / 200));
}

export function Search() {
  const country = useCountry();
  const [, setLocation] = useLocation();
  const initialQ = getSearchQuery();
  const [input, setInput] = useState(initialQ);
  const [q, setQ] = useState(initialQ);

  useEffect(() => {
    const fromUrl = getSearchQuery();
    setInput(fromUrl);
    setQ(fromUrl);
  }, []);

  const enabled = q.trim().length >= 2;

  const { data: articles, isLoading: loadingArticles } = useQuery({
    queryKey: ["search-articles", country, q],
    queryFn: () => articlesApi.list({ q: q.trim(), per_page: 20, country }),
    enabled,
  });

  const { data: posts, isLoading: loadingPosts } = useQuery({
    queryKey: ["search-posts", country, q],
    queryFn: () => postsApi.list({ q: q.trim(), per_page: 20, country }),
    enabled,
  });

  const isLoading = loadingArticles || loadingPosts;
  const totalResults = (articles?.length ?? 0) + (posts?.length ?? 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setQ(trimmed);
    setLocation(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">

      {/* Search header */}
      <div className="mb-10">
        <h1 className="mb-2 text-3xl font-black text-foreground">البحث في الموقع</h1>
        <p className="mb-6 text-sm text-muted-foreground">ابحث في المقالات والأخبار والمواد التعليمية</p>

        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب ما تبحث عنه..."
              className="rounded-xl py-6 pr-10 text-base"
              autoFocus
            />
          </div>
          <Button type="submit" className="rounded-xl px-6 py-6 text-base" disabled={!input.trim()}>
            بحث
          </Button>
        </form>
      </div>

      {/* Results */}
      {!enabled && (
        <div className="flex flex-col items-center gap-4 py-20 text-center text-muted-foreground">
          <SearchIcon className="h-14 w-14 opacity-20" />
          <p className="text-lg font-bold">اكتب كلمتين على الأقل للبحث</p>
        </div>
      )}

      {enabled && isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border bg-card p-5">
              <div className="mb-2 h-5 w-2/3 rounded bg-muted" />
              <div className="h-4 w-full rounded bg-muted" />
              <div className="mt-2 h-4 w-4/5 rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {enabled && !isLoading && totalResults === 0 && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <AlertCircle className="h-14 w-14 text-muted-foreground/30" />
          <p className="text-lg font-bold text-muted-foreground">لا توجد نتائج لـ "{q}"</p>
          <p className="text-sm text-muted-foreground">جرب كلمات مختلفة أو أقصر</p>
        </div>
      )}

      {enabled && !isLoading && totalResults > 0 && (
        <div>
          <p className="mb-6 text-sm text-muted-foreground">
            <span className="font-bold text-foreground">{totalResults}</span> نتيجة لـ "
            <span className="font-bold text-primary">{q}</span>"
          </p>

          {/* Articles results */}
          {articles && articles.length > 0 && (
            <section className="mb-10">
              <div className="mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-black">المقالات التعليمية</h2>
                <Badge variant="secondary" className="rounded-full font-bold">{articles.length}</Badge>
              </div>
              <div className="space-y-3">
                {articles.map((article) => (
                  <Link
                    key={article.id}
                    href={routes.article(country, article.id)}
                    className="group block rounded-2xl border bg-card p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2">
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
                    </div>
                    <h3 className="mb-1 font-bold text-foreground transition group-hover:text-primary">
                      {article.title}
                    </h3>
                    {article.meta_description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">{article.meta_description}</p>
                    )}
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
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
            </section>
          )}

          {articles && articles.length > 0 && posts && posts.length > 0 && (
            <Separator className="my-8" />
          )}

          {/* Posts results */}
          {posts && posts.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-black">الأخبار والمنشورات</h2>
                <Badge variant="secondary" className="rounded-full font-bold">{posts.length}</Badge>
              </div>
              <div className="space-y-3">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={routes.post(country, post.id)}
                    className="group block rounded-2xl border bg-card p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
                  >
                    <h3 className="mb-1 font-bold text-foreground transition group-hover:text-primary">
                      {post.title}
                    </h3>
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {readingMinutes(post.content)} دقيقة قراءة
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {(post.view_count ?? 0).toLocaleString("ar-EG")} مشاهدة
                      </span>
                      <span>{formatDate(post.created_at)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

    </div>
  );
}
