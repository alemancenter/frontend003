import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { postsApi, categoriesApi } from "@/lib/api/content";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CalendarDays,
  ArrowLeft,
  Search,
  Layers,
  BookOpen,
  FlaskConical,
  Calculator,
  Globe2,
  Palette,
  Music,
  Languages,
  Landmark,
  Atom,
  Dumbbell,
  Cpu,
  HeartPulse,
} from "lucide-react";
import { useCountry } from "@/hooks/use-country";
import { routes } from "@/lib/country";
import { useSeo } from "@/lib/seo";
import type { Category } from "@/lib/api/types";
import StaticPageHeader from "@/components/common/StaticPageHeader";

// A rotating palette of icons/gradients so each category reads distinctly even
// when the backend hasn't supplied a specific icon.
const CAT_ICONS = [
  BookOpen, FlaskConical, Calculator, Globe2, Palette, Music,
  Languages, Landmark, Atom, Dumbbell, Cpu, HeartPulse,
];
const CAT_GRADIENTS = [
  ["#3b82f6", "#6366f1"], ["#8b5cf6", "#d946ef"], ["#06b6d4", "#3b82f6"],
  ["#10b981", "#059669"], ["#f59e0b", "#ef4444"], ["#ec4899", "#f43f5e"],
  ["#0ea5e9", "#22d3ee"], ["#a855f7", "#6366f1"],
];

export function CategoryPosts() {
  const country = useCountry();
  const { categoryId } = useParams<{ categoryId: string }>();
  const [filter, setFilter] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", country],
    queryFn: () => categoriesApi.list(country),
  });

  const category = categories.find(
    (c) => String(c.slug) === categoryId || String(c.id) === categoryId,
  );

  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts", "category", country, categoryId],
    queryFn: () => postsApi.list({ category_id: category?.id ?? categoryId, country }),
    enabled: !!categoryId,
  });

  useSeo({
    title: category?.name || "الأقسام التعليمية",
    description: category?.name
      ? `تصفّح جميع منشورات قسم ${category.name} — مقالات ودروس ومحتوى تعليمي منظّم.`
      : "تصفّح الأقسام التعليمية والمحتوى المنظّم حسب الموضوع.",
    countryAlternates: true,
  });

  const isActive = (c: Category) =>
    String(c.slug) === categoryId || String(c.id) === categoryId;

  const filteredCategories = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, filter]);

  // Sidebar list of all categories — the shared browse control (desktop).
  const CategoryList = (
    <nav className="space-y-1.5">
      {filteredCategories.length === 0 ? (
        <p className="px-3 py-4 text-center text-sm text-muted-foreground">لا توجد نتائج</p>
      ) : (
        filteredCategories.map((c, i) => {
          const Icon = CAT_ICONS[i % CAT_ICONS.length];
          const [from, to] = CAT_GRADIENTS[i % CAT_GRADIENTS.length];
          const active = isActive(c);
          return (
            <Link key={c.id} href={routes.postsCategory(country, c.slug || c.id)}>
              <span
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                  style={active ? { background: "rgba(255,255,255,.2)" } : { background: `linear-gradient(135deg,${from},${to})` }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                {active && <ArrowLeft className="h-4 w-4 shrink-0 rtl:rotate-180" />}
              </span>
            </Link>
          );
        })
      )}
    </nav>
  );

  return (
    <div>
      <StaticPageHeader
        title={category?.name || "الأقسام التعليمية"}
        current={category?.name || "الأقسام التعليمية"}
        eyebrow="الأقسام التعليمية"
      />

      <div className="container mx-auto px-4 py-10 md:px-8">
        {/* Mobile: horizontal category chips */}
        <div className="mb-6 lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((c) => {
              const active = isActive(c);
              return (
                <Link key={c.id} href={routes.postsCategory(country, c.slug || c.id)}>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {c.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8">
          {/* Sidebar (desktop) — appears on the right in RTL */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 px-1">
                <Layers className="h-5 w-5 text-primary" />
                <h2 className="text-base font-black">كل الأقسام</h2>
                <span className="ms-auto rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                  {categories.length}
                </span>
              </div>
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث عن قسم..."
                  className="pr-9"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
              <div className="max-h-[70vh] overflow-y-auto pe-1">{CategoryList}</div>
            </div>
          </aside>

          {/* Main: posts of the selected category */}
          <main className="mt-2 lg:mt-0">
            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-56 animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            ) : !posts || posts.length === 0 ? (
              <div className="rounded-3xl border border-dashed bg-muted/30 py-20 text-center">
                <p className="mb-2 text-xl font-bold">لا يوجد محتوى في هذا القسم حالياً</p>
                <p className="mb-4 text-muted-foreground">اختر قسماً آخر من القائمة الجانبية</p>
                <Link href={routes.postsList(country)} className="font-bold text-primary hover:underline">
                  تصفح جميع الأخبار والمقالات
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-5 flex items-center justify-between">
                  <p className="text-sm font-semibold text-muted-foreground">
                    {posts.length} منشور في {category?.name || "هذا القسم"}
                  </p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {posts.map((post) => (
                    <Link key={post.id} href={routes.post(country, post.id)}>
                      <Card className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg">
                        <CardContent className="flex flex-1 flex-col p-6">
                          <div className="mb-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <CalendarDays className="h-4 w-4" />
                            {new Date(post.created_at).toLocaleDateString("ar-JO")}
                          </div>
                          <h3 className="mb-3 line-clamp-2 text-xl font-bold leading-snug text-card-foreground transition-colors group-hover:text-primary">
                            {post.title}
                          </h3>
                          <div className="mt-auto flex items-center pt-4 text-sm font-bold text-primary">
                            اقرأ المزيد
                            <ArrowLeft className="mr-2 h-4 w-4 rtl:rotate-180" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
