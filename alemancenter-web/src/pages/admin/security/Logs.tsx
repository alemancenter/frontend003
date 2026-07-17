import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminCountrySelect } from "@/components/admin/AdminCountrySelect";
import { adminSecurityApi } from "@/lib/api/admin";
import { useCountry } from "@/contexts/CountryContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Shield, ShieldAlert, CheckCircle, Trash2, Search, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SecurityLogs() {
  const country = useCountry();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin", "security", "logs", country, page, search],
    queryFn: () => adminSecurityApi.logs({ page, per_page: 20, query: search, country }),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: number | string) => adminSecurityApi.resolveLog(id, { country }),
    onSuccess: () => {
      toast.success("تم حل السجل بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin", "security"] });
    },
    onError: () => toast.error("فشل في حل السجل"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => adminSecurityApi.deleteLog(id, { country }),
    onSuccess: () => {
      toast.success("تم حذف السجل بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin", "security"] });
    },
    onError: () => toast.error("فشل في حذف السجل"),
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => adminSecurityApi.deleteAllLogs({ country }),
    onSuccess: () => {
      toast.success("تم حذف جميع السجلات بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin", "security"] });
    },
    onError: () => toast.error("فشل في حذف السجلات"),
  });

  const getLevelBadge = (level?: string) => {
    switch (level?.toLowerCase()) {
      case "high":
        return <Badge variant="destructive">عالي</Badge>;
      case "medium":
        return <Badge className="bg-orange-500 text-white hover:bg-orange-600">متوسط</Badge>;
      case "low":
        return <Badge variant="secondary">منخفض</Badge>;
      default:
        return <Badge variant="outline">عادي</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-right">سجلات الأمان</h1>
          <p className="text-muted-foreground mt-1 text-right">سجل شامل لجميع الأحداث الأمنية والنشاطات</p>
        </div>
        <div className="flex items-center gap-2">
          <AdminCountrySelect />
           <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 ml-2" />
                حذف الكل
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                <AlertDialogDescription>
                  سيؤدي هذا الإجراء إلى حذف جميع سجلات الأمان بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteAllMutation.mutate()} className="bg-destructive text-destructive-foreground">
                  تأكيد الحذف
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث في السجلات..."
                className="pr-10 text-right"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المستوى</TableHead>
                  <TableHead className="text-right">الحدث</TableHead>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">عنوان IP</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : logs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      لا توجد سجلات مطابقة للبحث
                    </TableCell>
                  </TableRow>
                ) : (
                  logs?.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>{getLevelBadge(log.level)}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{log.event || log.action}</span>
                          {log.details && (
                            <span className="text-xs text-muted-foreground font-normal">
                              {log.details}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.user ? (
                          <div className="flex flex-col">
                            <span>{log.user.name}</span>
                            <span className="text-xs text-muted-foreground">{log.user.email}</span>
                          </div>
                        ) : log.user_id ? (
                          `مستخدم #${log.user_id}`
                        ) : (
                          <span className="text-muted-foreground">ضيف</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted px-1 rounded text-xs" dir="ltr">{log.ip_address}</code>
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(log.created_at).toLocaleString("ar-EG")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {!log.resolved_at && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => resolveMutation.mutate(log.id)}
                              disabled={resolveMutation.isPending}
                              title="تحديد كمحلول"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("هل أنت متأكد من حذف هذا السجل؟")) {
                                deleteMutation.mutate(log.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination could be added here */}
        </CardContent>
      </Card>
    </div>
  );
}
