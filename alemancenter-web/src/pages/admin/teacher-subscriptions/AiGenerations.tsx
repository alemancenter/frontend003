import { useQuery } from "@tanstack/react-query";
import { teacherSubscriptionAdminApi } from "@/lib/api/teacherSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Cpu, User, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function AiGenerations() {
  const { data: generations, isLoading } = useQuery({
    queryKey: ["admin", "ts", "ai-generations"],
    queryFn: () => teacherSubscriptionAdminApi.listAIGenerations(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">سجل توليد AI</h1>
        <p className="text-muted-foreground mt-1">مراقبة استخدام أدوات الذكاء الاصطناعي من قبل المعلمين</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>عمليات التوليد الأخيرة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المعلم</TableHead>
                  <TableHead>نوع الأداة</TableHead>
                  <TableHead>العنوان/الموضوع</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">جاري التحميل...</TableCell>
                  </TableRow>
                ) : generations?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">لا توجد سجلات</TableCell>
                  </TableRow>
                ) : (
                  generations?.map((gen) => (
                    <TableRow key={gen.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="ml-2 h-4 w-4 text-muted-foreground" />
                          {gen.user_id} {/* Ideally teacher name */}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          <Cpu className="ml-1 h-3 w-3" />
                          {gen.tool_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px] truncate font-medium">
                          {gen.title || gen.prompt}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-muted-foreground">
                          <Calendar className="ml-2 h-3 w-3" />
                          {format(new Date(gen.created_at), "PPP", { locale: ar })}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
