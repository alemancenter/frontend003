import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { academicApi } from "@/lib/api/academic";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";
import { useCountry } from "@/hooks/use-country";
import { routes } from "@/lib/country";

export function GradesIndex() {
  const country = useCountry();
  const { data: grades, isLoading } = useQuery({
    queryKey: ["grades", country],
    queryFn: () => academicApi.listGrades(country),
  });

  return (
    <div className="container mx-auto px-4 md:px-8 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">الصفوف الدراسية</h1>
        <p className="text-muted-foreground text-lg">اختر صفك الدراسي لتصفح المباحث والمواد المتعلقة به</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : grades?.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-xl text-muted-foreground">لا يوجد صفوف دراسية حالياً.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {grades?.map((grade) => (
            <Link key={grade.id} href={routes.lessonDetail(country, grade.id)}>
              <Card className="hover-elevate cursor-pointer border-transparent bg-primary/5 hover:bg-primary/10 transition-colors rounded-2xl overflow-hidden group">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3 h-full">
                  <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <span className="font-bold text-foreground line-clamp-2">{grade.grade_name}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
