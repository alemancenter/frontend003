import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { postsApi } from "@/lib/api/content";
import { AdUnit } from "@/components/ads/AdUnit";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, ArrowLeft } from "lucide-react";
import { useCountry } from "@/hooks/use-country";
import { routes } from "@/lib/country";

export function Posts() {
  const country = useCountry();
  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts", country],
    queryFn: () => postsApi.list({ country }),
  });

  return (
    <div className="container mx-auto px-4 md:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">الأخبار والمقالات العامة</h1>
        <p className="text-muted-foreground text-lg">آخر الأخبار التعليمية والمقالات الإرشادية</p>
      </div>

      {/* Ad — below page header */}
      <AdUnit page="news" position={1} className="mb-8 rounded-2xl overflow-hidden" />

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : posts?.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-3xl">
          <p className="text-xl font-bold mb-2">لا يوجد أخبار حالياً</p>
        </div>
      ) : (
        <>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts?.map((post) => (
            <Link key={post.id} href={routes.post(country, post.id)}>
              <Card className="h-full hover-elevate cursor-pointer border overflow-hidden rounded-2xl transition-all hover:border-primary/50 group flex flex-col">
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-4 text-xs font-medium text-muted-foreground">
                    <CalendarDays className="w-4 h-4" />
                    {new Date(post.created_at).toLocaleDateString("ar-JO")}
                  </div>
                  <h3 className="text-xl font-bold text-card-foreground mb-3 leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <div className="mt-auto pt-4 flex items-center text-sm font-bold text-primary">
                    اقرأ المزيد
                    <ArrowLeft className="w-4 h-4 mr-2 rtl:rotate-180" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        {/* Ad — below posts grid */}
        <AdUnit page="news" position={2} className="mt-8 rounded-2xl overflow-hidden" />
        </>
      )}
    </div>
  );
}
