import { useQuery } from "@tanstack/react-query";
import { teacherSubscriptionAdminApi } from "@/lib/api/teacherSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download as DownloadIcon, User, FileText, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function DownloadsAudit() {
  const { data: downloads, isLoading } = useQuery({
    queryKey: ["admin", "ts", "downloads"],
    queryFn: () => teacherSubscriptionAdminApi.listDownloads(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">سجل التنزيلات</h1>
        <p className="text-muted-foreground mt-1">مراقبة عمليات تنزيل الملفات المميزة من قبل المعلمين</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>عمليات التنزيل الأخيرة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المعلم</TableHead>
                  <TableHead>الملف</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">جاري التحميل...</TableCell>
                  </TableRow>
                ) : downloads?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">لا توجد عمليات تنزيل مسجلة</TableCell>
                  </TableRow>
                ) : (
                  downloads?.map((dl: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="ml-2 h-4 w-4 text-muted-foreground" />
                          {dl.user?.name || `مستخدم #${dl.user_id}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center font-medium">
                          <FileText className="ml-2 h-4 w-4 text-muted-foreground" />
                          {dl.file?.title || `ملف #${dl.file_id}`}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{dl.ip_address}</TableCell>
                      <TableCell>
                        <div className="flex items-center text-muted-foreground">
                          <Calendar className="ml-2 h-3 w-3" />
                          {format(new Date(dl.downloaded_at), "PPP p", { locale: ar })}
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
